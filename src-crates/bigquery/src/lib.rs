use base64::prelude::{BASE64_STANDARD, Engine as _};
use google_cloud_bigquery::client::google_cloud_auth::credentials::CredentialsFile;
use google_cloud_bigquery::client::{ChannelConfig, Client, ClientConfig, StreamingWriteConfig};
use google_cloud_bigquery::http::dataset::DatasetReference;
use google_cloud_bigquery::http::job::query::QueryRequest;
use google_cloud_bigquery::http::table::{TableFieldSchema, TableFieldType};
use google_cloud_bigquery::http::tabledata::list::Value as BigQueryValue;
use query::{Query, QueryColumn, QueryValueExt, Value};
use std::sync::Arc;
use std::time::Instant;

type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Auth error: {0}")]
    Auth(#[from] google_cloud_bigquery::client::google_cloud_auth::error::Error),
    #[error("Client error: {0}")]
    Client(#[from] google_cloud_gax::conn::Error),
    #[error("{0}")]
    Http(#[from] google_cloud_bigquery::http::error::Error),
    #[error(
        "Missing 'project_id': Please provide a 'Project ID' in the connection options, or ensure your JSON Key file contains a 'project_id' field"
    )]
    MissingProjectId,
    #[error("JSON Key file is required for authentication")]
    MissingJsonKey,
    #[error("Query job not completed or timeout")]
    JobNotCompleted,
}

#[derive(Clone)]
pub struct Connection {
    client: Client,
    project_id: Arc<String>,
    default_dataset: Option<Arc<String>>,
}

impl std::fmt::Debug for Connection {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Connection")
            .field("client", &"")
            .field("project_id", &self.project_id)
            .field("default_dataset", &self.default_dataset)
            .finish_non_exhaustive()
    }
}

impl Connection {
    pub async fn new<S: AsRef<str>, P: Into<Option<String>>, D: Into<Option<String>>>(
        json_key: S,
        project_id: P,
        default_dataset: D,
    ) -> Result<Self> {
        let cert = CredentialsFile::new_from_str(json_key.as_ref()).await?;
        let (mut config, json_key_project_id) = ClientConfig::new_with_credentials(cert).await?;

        // Disable gRPC connection pool to reduce client creation time since we only use the REST API
        {
            let rcc = ChannelConfig::default().with_num_channels(0);
            let wcc = ChannelConfig::default().with_num_channels(0);
            config = config
                .with_streaming_read_config(rcc)
                .with_streaming_write_config(
                    StreamingWriteConfig::default().with_channel_config(wcc),
                );
        }

        // Prefer user-provided project_id; fall back to the project_id from the JSON Key file
        let final_project_id = project_id
            .into()
            .or(json_key_project_id)
            .ok_or(Error::MissingProjectId)?;

        let client = Client::new(config).await?;

        Ok(Self {
            client,
            project_id: Arc::new(final_project_id),
            default_dataset: default_dataset.into().map(Arc::new),
        })
    }

    pub async fn query(&self, sql: String) -> Result<Query> {
        {
            // NOTE:
            // By default we don't know which datasets (Databases) exist, and INFORMATION_SCHEMA.SCHEMATA only retrieves from the US region without a 'region qualifier'
            // This means 'SELECT * FROM INFORMATION_SCHEMA.SCHEMATA' cannot get all datasets, so we hack it here to get all datasets
            // This approach is consistent with db.ts 'public async databases()'
            // https://docs.cloud.google.com/bigquery/docs/information-schema-datasets-schemata?hl=zh-cn#scope_and_syntax
            if sql.starts_with("__DATAFLARE_BIGQUERY_CALL_INFORMATION_SCHEMA.SCHEMATA") {
                let sets = self.client.dataset().list(&self.project_id, None).await?;
                let current = match &self.default_dataset {
                    Some(v) => Value::String(v.as_ref().clone()),
                    None => Value::String(String::new()),
                };
                return Ok(Query {
                    columns: vec![
                        QueryColumn {
                            name: "current_dataset".into(),
                            datatype: "String".into(),
                        },
                        QueryColumn {
                            name: "dataset".into(),
                            datatype: "String".into(),
                        },
                    ],
                    rows: sets
                        .into_iter()
                        .map(|v| {
                            vec![
                                current.clone(),
                                Value::String(v.dataset_reference.dataset_id),
                            ]
                        })
                        .collect(),
                    rows_affected: None,
                    duration: 0,
                });
            }
        }

        // Normal SQL query below

        let dataset = self.default_dataset.as_ref().map(|set| DatasetReference {
            project_id: self.project_id.as_ref().clone(),
            dataset_id: set.as_ref().clone(),
        });

        let req = QueryRequest {
            query: sql,
            default_dataset: dataset,
            use_legacy_sql: false,
            timeout_ms: Some(30 * 1_000),
            ..Default::default()
        };

        // TODO: This library is missing startTime/endTime so we have to time it ourselves
        // https://docs.cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query#response-body
        let now = Instant::now();

        let res = self.client.job().query(&self.project_id, &req).await?;

        if !res.job_complete {
            return Err(Error::JobNotCompleted);
        }

        // If job_complete is true, both schema and rows should be present
        let schema = res.schema.map(|v| v.fields).unwrap_or_default();
        let values = res.rows.unwrap_or_default();

        let duration = now.elapsed().as_millis() as u32;
        let rows_affected = res.num_dml_affected_rows.map(|n| n.max(0) as u64);

        let mut columns = Vec::with_capacity(schema.len());
        let mut rows = Vec::with_capacity(values.len());

        for field in &schema {
            columns.push(QueryColumn {
                name: field.name.to_owned(),
                datatype: format!("{:?}", field.data_type).to_lowercase(),
            });
        }

        for tunple in values {
            let row = tunple
                .f
                .into_iter()
                .enumerate()
                .map(|(i, v)| decode_value(v.v, &schema[i].data_type, &schema[i].fields))
                .collect();
            rows.push(row);
        }

        // TODO: Should use job().get_query_results to fetch more results?

        return Ok(Query {
            columns,
            rows,
            rows_affected,
            duration,
        });
    }
}

#[inline]
fn decode_value(v: BigQueryValue, t: &TableFieldType, f: &Option<Vec<TableFieldSchema>>) -> Value {
    // Try to convert BigQuery String values to their actual types; fall back to the original value on failure
    #[inline]
    fn try_to_value(v: &BigQueryValue, t: &TableFieldType) -> Option<Value> {
        match (t, v) {
            (TableFieldType::Boolean | TableFieldType::Bool, BigQueryValue::String(s)) => {
                s.parse::<bool>().ok().map(Value::Bool)
            }
            (TableFieldType::Integer | TableFieldType::Int64, BigQueryValue::String(s)) => {
                s.parse::<i64>().ok().map(Value::I64)
            }
            (TableFieldType::Float | TableFieldType::Float64, BigQueryValue::String(s)) => {
                s.parse::<f64>().ok().map(Value::F64)
            }
            (TableFieldType::Json, BigQueryValue::String(s)) => Value::pretty_json_try_from_str(&s),
            (TableFieldType::Bytes, BigQueryValue::String(s)) => {
                BASE64_STANDARD.decode(s).ok().map(Value::from_bytes)
            }
            _ => None,
        }
    }

    #[inline]
    fn to_query_value(
        v: BigQueryValue,
        t: &TableFieldType,
        f: &Option<Vec<TableFieldSchema>>,
    ) -> Value {
        match v {
            BigQueryValue::Null => Value::Null,
            BigQueryValue::String(v) => Value::String(v),
            BigQueryValue::Array(cells) => {
                let s = format_value(BigQueryValue::Array(cells), t, f);
                Value::String(s)
            }
            BigQueryValue::Struct(tuple) => {
                let s = format_value(BigQueryValue::Struct(tuple), t, f);
                Value::String(s)
            }
        }
    }

    try_to_value(&v, &t).unwrap_or_else(|| to_query_value(v, t, f))
}

// Convert non-simple values uniformly to String
fn format_value(v: BigQueryValue, t: &TableFieldType, f: &Option<Vec<TableFieldSchema>>) -> String {
    #[inline]
    fn escape<S: AsRef<str>>(s: S) -> String {
        s.as_ref().replace('\\', "\\\\").replace('"', "\\\"")
    }
    match v {
        BigQueryValue::Null => "null".to_string(),
        BigQueryValue::String(s) => {
            match t {
                // Do not double-quote encode values of these data types
                TableFieldType::Boolean
                | TableFieldType::Bool
                | TableFieldType::Integer
                | TableFieldType::Int64
                | TableFieldType::Float
                | TableFieldType::Float64 => s,
                _ => format!("\"{}\"", escape(s)),
            }
        }
        BigQueryValue::Array(cells) => {
            let mut items = Vec::with_capacity(cells.len());
            for cell in cells {
                items.push(format_value(cell.v, t, &f));
            }
            format!("[{}]", items.join(", "))
        }
        BigQueryValue::Struct(tuple) => {
            let mut fields = Vec::with_capacity(tuple.f.len());
            for (i, cell) in tuple.f.into_iter().enumerate() {
                let sub = f.as_ref().and_then(|fs| fs.get(i));
                let (name, t, f) = match sub {
                    Some(f) => (escape(&f.name), &f.data_type, &f.fields),
                    None => (String::from("Unknow"), &TableFieldType::String, &None),
                };
                let value = format_value(cell.v, t, f);
                fields.push(format!("\"{name}\": {value}"));
            }
            format!("{{{}}}", fields.join(", "))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use TableFieldType as T;
    use google_cloud_bigquery::http::tabledata::list::{Cell, Tuple, Value as V};

    #[test]
    fn test_decode_value() {
        // null
        assert_eq!(decode_value(V::Null, &T::String, &None), Value::Null);
        assert_eq!(decode_value(V::Null, &T::Numeric, &None), Value::Null);

        // bool
        assert_eq!(
            decode_value(V::String("true".into()), &T::Boolean, &None),
            Value::Bool(true)
        );
        assert_eq!(
            decode_value(V::String("false".into()), &T::Bool, &None),
            Value::Bool(false)
        );
        assert_eq!(
            decode_value(V::String("invalid".into()), &T::Boolean, &None),
            Value::String("invalid".into())
        );
        // number
        assert_eq!(
            decode_value(V::String("123".into()), &T::Integer, &None),
            Value::I64(123)
        );
        assert_eq!(
            decode_value(V::String("-456".into()), &T::Int64, &None),
            Value::I64(-456)
        );
        assert_eq!(
            decode_value(V::String("not_a_number".into()), &T::Integer, &None),
            Value::String("not_a_number".into())
        );
        // float
        assert_eq!(
            decode_value(V::String("3.14".into()), &T::Float, &None),
            Value::F64(3.14)
        );
        assert_eq!(
            decode_value(V::String("-2.5".into()), &T::Float64, &None),
            Value::F64(-2.5)
        );
        assert_eq!(
            decode_value(V::String("not_a_float".into()), &T::Float, &None),
            Value::String("not_a_float".into())
        );
        // TODO: more
    }

    #[test]
    fn test_array_format_value() {
        let value = V::Null;
        assert_eq!(format_value(value, &T::String, &None), "null");

        let value = V::String("hello".to_string());
        assert_eq!(format_value(value, &T::String, &None), "\"hello\"");

        let value = V::String("hello \"world\"".to_string());
        assert_eq!(
            format_value(value, &T::String, &None),
            "\"hello \\\"world\\\"\""
        );

        let value = V::String("path\\to\\file".to_string());
        assert_eq!(
            format_value(value, &T::String, &None),
            "\"path\\\\to\\\\file\""
        );

        let value = V::String("test\\\"escape".to_string());
        assert_eq!(
            format_value(value, &T::String, &None),
            "\"test\\\\\\\"escape\""
        );

        let value = V::Array(vec![
            Cell {
                v: V::String("1".to_string()),
            },
            Cell {
                v: V::String("2".to_string()),
            },
            Cell {
                v: V::String("3".to_string()),
            },
        ]);
        assert_eq!(
            format_value(value, &T::String, &None),
            "[\"1\", \"2\", \"3\"]"
        );

        let value = V::Array(vec![
            Cell {
                v: V::String("hello".to_string()),
            },
            Cell {
                v: V::String("world".to_string()),
            },
        ]);
        assert_eq!(
            format_value(value, &T::String, &None),
            "[\"hello\", \"world\"]"
        );

        let value = V::Array(vec![
            Cell {
                v: V::String("1".to_string()),
            },
            Cell {
                v: V::String("test".to_string()),
            },
            Cell { v: V::Null },
        ]);
        assert_eq!(
            format_value(value, &T::String, &None),
            "[\"1\", \"test\", null]"
        );

        let value = V::Array(vec![
            Cell {
                v: V::Array(vec![
                    Cell {
                        v: V::String("1".to_string()),
                    },
                    Cell {
                        v: V::String("2".to_string()),
                    },
                ]),
            },
            Cell {
                v: V::Array(vec![
                    Cell {
                        v: V::String("3".to_string()),
                    },
                    Cell {
                        v: V::String("4".to_string()),
                    },
                ]),
            },
        ]);
        assert_eq!(
            format_value(value, &T::String, &None),
            "[[\"1\", \"2\"], [\"3\", \"4\"]]"
        );

        let value = V::Array(vec![]);
        assert_eq!(format_value(value, &T::String, &None), "[]");

        let value = V::Array(vec![
            Cell {
                v: V::String("hello \"world\"".to_string()),
            },
            Cell {
                v: V::String("path\\file".to_string()),
            },
        ]);
        assert_eq!(
            format_value(value, &T::String, &None),
            "[\"hello \\\"world\\\"\", \"path\\\\file\"]"
        );
    }

    #[test]
    fn test_format_struct() {
        // STRUCT('abc')
        let value = V::Struct(Tuple {
            f: vec![Cell {
                v: V::String("abc".to_string()),
            }],
        });
        assert_eq!(
            format_value(value, &T::String, &None),
            "{\"Unknow\": \"abc\"}"
        );

        // STRUCT(1, 'abc')
        let value = V::Struct(Tuple {
            f: vec![
                Cell {
                    v: V::String("1".to_string()),
                },
                Cell {
                    v: V::String("abc".to_string()),
                },
            ],
        });
        assert_eq!(
            format_value(value, &T::String, &None),
            "{\"Unknow\": \"1\", \"Unknow\": \"abc\"}"
        );

        let value = V::Struct(Tuple {
            f: vec![
                Cell {
                    v: V::String("hello".to_string()),
                },
                Cell { v: V::Null },
            ],
        });
        assert_eq!(
            format_value(value, &T::String, &None),
            "{\"Unknow\": \"hello\", \"Unknow\": null}"
        );

        let value = V::Struct(Tuple { f: vec![] });
        assert_eq!(format_value(value, &T::String, &None), "{}");

        let value = V::Struct(Tuple {
            f: vec![
                Cell {
                    v: V::String("outer".to_string()),
                },
                Cell {
                    v: V::Struct(Tuple {
                        f: vec![Cell {
                            v: V::String("inner".to_string()),
                        }],
                    }),
                },
            ],
        });
        assert_eq!(
            format_value(value, &T::String, &None),
            "{\"Unknow\": \"outer\", \"Unknow\": {\"Unknow\": \"inner\"}}"
        );

        let value = V::Struct(Tuple {
            f: vec![
                Cell {
                    v: V::String("name".to_string()),
                },
                Cell {
                    v: V::Array(vec![
                        Cell {
                            v: V::String("1".to_string()),
                        },
                        Cell {
                            v: V::String("2".to_string()),
                        },
                    ]),
                },
            ],
        });
        assert_eq!(
            format_value(value, &T::String, &None),
            "{\"Unknow\": \"name\", \"Unknow\": [\"1\", \"2\"]}"
        );

        // Test array of structs
        let value = V::Array(vec![
            Cell {
                v: V::Struct(Tuple {
                    f: vec![Cell {
                        v: V::String("a".to_string()),
                    }],
                }),
            },
            Cell {
                v: V::Struct(Tuple {
                    f: vec![Cell {
                        v: V::String("b".to_string()),
                    }],
                }),
            },
        ]);
        assert_eq!(
            format_value(value, &T::String, &None),
            "[{\"Unknow\": \"a\"}, {\"Unknow\": \"b\"}]"
        );
    }
}
