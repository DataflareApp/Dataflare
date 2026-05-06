use crate::utils::FirstCell;
use crate::{
    ChunkInsert, Database, Error, LOCALHOST, ManticoreSearchConfig, MySqlConfig, MySqlTlsMode,
    Result,
};
use mysql::{ClientIdentity, Compression, Connection, Flavor, OptsBuilder, PathOrBuf, SslOpts};
use proxy::{Proxy, ProxyConfig, ProxyHandler};
use query::{Query, QueryColumn, Value};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct MySqlConnection {
    conn: Arc<Mutex<Connection>>,
    _proxy_handler: Option<Arc<ProxyHandler>>,
}

impl MySqlConnection {
    pub(crate) async fn test(config: MySqlConfig) -> Result<Option<String>> {
        let conn = Self::make_conn(config, Flavor::MySql).await?;
        let version = conn
            .select("SELECT CONCAT('v', VERSION(), ' ', @@version_comment);".into())
            .await?
            .first_cell_string()
            .map(Some)?;
        Ok(version)
    }

    pub(crate) async fn test_manticore_search(
        config: ManticoreSearchConfig,
    ) -> Result<Option<String>> {
        let config = Self::manticore_to_mysql(config);
        let conn = Self::make_conn(config, Flavor::ManticoreSearch).await?;
        let version = conn
            .select("SELECT CONCAT('Version: ', VERSION());".into())
            .await?
            .first_cell_string()
            .map(Some)?;
        Ok(version)
    }

    async fn make_conn(config: MySqlConfig, flavor: Flavor) -> Result<Self> {
        let (options, proxy_handler) = Self::make_options(config).await?;
        let conn = Self {
            conn: Arc::new(Mutex::new(
                Connection::connect(options.into(), flavor).await?,
            )),
            _proxy_handler: proxy_handler.map(Arc::new),
        };
        Ok(conn)
    }

    pub(crate) async fn connect(config: MySqlConfig) -> Result<Database> {
        let conn = Self::make_conn(config, Flavor::MySql).await?;
        Ok(Database::MySql(conn))
    }

    pub(crate) async fn connect_manticore_search(
        config: ManticoreSearchConfig,
    ) -> Result<Database> {
        let config = Self::manticore_to_mysql(config);
        let conn = Self::make_conn(config, Flavor::ManticoreSearch).await?;
        Ok(Database::MySql(conn))
    }

    fn manticore_to_mysql(mut config: ManticoreSearchConfig) -> MySqlConfig {
        if config.readonly {
            match &mut config.initial {
                Some(initial) => {
                    *initial = format!("SET ro = 1; {initial}");
                }
                None => {
                    config.initial = Some("SET ro = 1;".into());
                }
            }
        }
        if config.port.is_none() {
            config.port = Some(9306);
        }
        MySqlConfig {
            host: config.host,
            port: config.port,
            user: String::new(),
            password: None,
            database: None,
            readonly: config.readonly,
            initial: config.initial,
            tls: config.tls,
            proxy: config.proxy,
        }
    }

    async fn make_proxy(
        (host, default_host): (Option<String>, &'static str),
        (port, default_port): (Option<u16>, u16),
        proxy: Option<ProxyConfig>,
    ) -> Result<(String, u16, Option<ProxyHandler>), Error> {
        let host = host.unwrap_or(default_host.to_string());
        let port = port.unwrap_or(default_port);
        let rst = match proxy {
            Some(p) => {
                let (addr, handler) = Proxy::new(host, port, p).listen().await?;
                (addr.ip().to_string(), addr.port(), Some(handler))
            }
            None => (host, port, None),
        };
        Ok(rst)
    }

    async fn make_options(config: MySqlConfig) -> Result<(OptsBuilder, Option<ProxyHandler>)> {
        let (host, port, proxy_handler) =
            Self::make_proxy((config.host, LOCALHOST), (config.port, 3306), config.proxy).await?;

        let make_tls = || -> SslOpts {
            let ident = match (config.tls.config.cert, config.tls.config.key) {
                (Some(cert), Some(key)) => Some(ClientIdentity::new(cert, key)),
                _ => None,
            };
            let root_certs = config
                .tls
                .config
                .ca
                .map(|ca| vec![PathOrBuf::from(ca.as_bytes().to_vec())])
                .unwrap_or_default();
            SslOpts::default()
                .with_client_identity(ident)
                .with_root_certs(root_certs)
        };

        let tls = match config.tls.mode {
            MySqlTlsMode::Disabled => None,
            MySqlTlsMode::Required => {
                let tls = make_tls()
                    .with_danger_accept_invalid_certs(true)
                    .with_danger_skip_domain_validation(true);
                Some(tls)
            }
            MySqlTlsMode::RequiredVerify => Some(make_tls()),
        };

        let init = config.initial.map(|s| vec![s]).unwrap_or_default();

        let opts = OptsBuilder::default()
            .user(Some(&config.user))
            .pass(config.password.as_deref())
            .ip_or_hostname(host)
            .tcp_port(port)
            .db_name(config.database.as_deref())
            .ssl_opts(tls)
            .prefer_socket(false)
            .init(init)
            .compression(Compression::fast());

        Ok((opts, proxy_handler))
    }

    pub(crate) async fn select(&self, sql: String) -> Result<Vec<Vec<Value>>> {
        let res = self.conn.lock().await.query(sql).await?;
        Ok(res.rows)
    }

    pub(crate) async fn execute(&self, sql: String) -> Result<()> {
        self.conn.lock().await.query(sql).await?;
        Ok(())
    }

    pub(crate) async fn transaction(&self, sqls: Vec<String>) -> Result<()> {
        self.conn.lock().await.transaction(&sqls).await?;
        Ok(())
    }

    pub(crate) async fn query(&self, sql: String) -> Result<Query> {
        let mut query = Query::default();
        let res = {
            let mut conn = self.conn.lock().await;
            let now = Instant::now();
            let res = conn.query(sql).await?;
            query.duration = now.elapsed().as_millis() as u32;
            res
        };
        query.rows = res.rows;
        query.columns = res
            .columns
            .into_iter()
            .map(|(n, t)| QueryColumn {
                name: n,
                datatype: t,
            })
            .collect();
        query.rows_affected = Some(res.affected_rows);
        Ok(query)
    }

    // TODO: Consider opening a new connection pool for faster batch insert
    pub(crate) async fn batch_insert(&self, insert: ChunkInsert) -> Result<()> {
        let (opts, flavor) = {
            let conn = self.conn.lock().await;
            (conn.opts.clone(), conn.flavor)
        };
        let mut conn = Connection::connect(opts, flavor).await?;
        for sql in insert {
            conn.exec_drop(&sql).await?;
        }
        Ok(())
    }
}
