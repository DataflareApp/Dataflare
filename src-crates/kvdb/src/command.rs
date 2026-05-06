use crate::{GenericValue, InputValue, Key, Keys, KvOutput, RedisResponse};
use regex::Regex;
use serde::{Deserialize, Serialize};

type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Command parse error")]
    ParseError,
    #[error("Command 'set' syntax error")]
    SetSyntaxError,
    #[error("Empty Command")]
    EmptyCommand,
    #[error("Unknown command: {0}")]
    UnknownCommand(String),
    #[error("{0}")]
    InvalidRegex(#[from] regex::Error),
    #[error("Wrong argument length, expected {0} but found {1}")]
    ArgsLengthError(usize, usize),
    #[error("Wrong argument length, expected {0} or {1} but found {2}")]
    ArgsLengthAbError(usize, usize, usize),
}

#[derive(Debug)]
pub enum Command {
    Search {
        pattern: String,
        filter: Option<Regex>,
    },
    Get {
        key: String,
    },
    Set {
        key: String,
        value: InputValue,
    },
    Delete {
        key: String,
    },
}

impl Command {
    pub fn parse_raw(val: &str) -> Result<Vec<String>> {
        let items = Self::split(val)?;
        Ok(items)
    }

    pub fn parse(val: &str) -> Result<Self> {
        let items = Self::split(val)?;
        let cmd = items[0].to_lowercase();
        let args = &items[1..];

        match cmd.as_str() {
            "search" => {
                Self::check_args_ab(args, 1, 2)?;
                let filter = args.get(1).map(|s| Regex::new(s)).transpose()?;
                Ok(Command::Search {
                    pattern: args[0].clone(),
                    filter,
                })
            }
            "get" => {
                Self::check_args(args, 1)?;
                Ok(Command::Get {
                    key: args[0].clone(),
                })
            }
            "set" => {
                Self::check_args_ab(args, 2, 3)?;
                let value = match args.len() {
                    // set key value
                    2 => InputValue::Generic(GenericValue::String(args[1].clone())),
                    // set key from path
                    3 => {
                        if &args[1].to_lowercase() != "from" {
                            return Err(Error::SetSyntaxError);
                        }
                        let path = shell::path_expand(&args[2]).to_string();
                        InputValue::Path(path)
                    }
                    _ => unreachable!(),
                };
                Ok(Command::Set {
                    key: args[0].clone(),
                    value,
                })
            }
            "delete" => {
                Self::check_args(args, 1)?;
                Ok(Command::Delete {
                    key: args[0].clone(),
                })
            }
            _ => Err(Error::UnknownCommand(cmd)),
        }
    }

    pub fn readonly(&self) -> bool {
        match self {
            Command::Search { .. } => true,
            Command::Get { .. } => true,
            Command::Set { .. } => false,
            Command::Delete { .. } => false,
        }
    }

    fn split(cmd: &str) -> Result<Vec<String>> {
        let items = shell::args_split(cmd).map_err(|_| Error::ParseError)?;
        if items.is_empty() {
            return Err(Error::EmptyCommand);
        }
        Ok(items)
    }

    fn check_args(args: &[String], expected: usize) -> Result<()> {
        if args.len() != expected {
            return Err(Error::ArgsLengthError(expected, args.len()));
        }
        Ok(())
    }

    fn check_args_ab(args: &[String], a: usize, b: usize) -> Result<()> {
        if args.len() != a && args.len() != b {
            return Err(Error::ArgsLengthAbError(a, b, args.len()));
        }
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase", content = "value")]
pub enum CommandOutput {
    Keys(Vec<String>),
    Get {
        key: Key,
        output: KvOutput,
    },
    RedisResponse {
        response: RedisResponse,
        debug: String,
    },
    Done,
}

impl CommandOutput {
    pub fn from_keys(keys: Keys, filter: Option<Regex>) -> Self {
        let mut items = keys
            .keys
            .into_iter()
            .filter_map(|key| {
                let key = match key {
                    Key::String(s) => s,
                    Key::Bytes(b) => b,
                };
                if let Some(reg) = &filter {
                    if !reg.is_match(&key) {
                        return None;
                    }
                }
                Some(key)
            })
            .collect::<Vec<_>>();
        if keys.cursor.is_some() {
            items.push("...".into());
        }
        Self::Keys(items)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split() {
        let cmd = Command::split("search pattern").unwrap();
        assert_eq!(cmd, vec!["search".to_string(), "pattern".to_string()]);

        let cmd = Command::split("get my_key").unwrap();
        assert_eq!(cmd, vec!["get".to_string(), "my_key".to_string()]);

        let cmd = Command::split("set my_key my_value").unwrap();
        assert_eq!(
            cmd,
            vec![
                "set".to_string(),
                "my_key".to_string(),
                "my_value".to_string()
            ]
        );

        let cmd = Command::split("get 'my key'").unwrap();
        assert_eq!(cmd, vec!["get".to_string(), "my key".to_string()]);

        #[cfg(any(target_os = "linux", target_os = "macos"))]
        {
            let cmd = Command::split("get /home/my\\ file").unwrap();
            assert_eq!(cmd, vec!["get".to_string(), "/home/my file".to_string()]);
        }
        #[cfg(target_os = "windows")]
        {
            let cmd = Command::split("get C:\\path\\to\\file").unwrap();
            assert_eq!(
                cmd,
                vec!["get".to_string(), "C:\\path\\to\\file".to_string()]
            );
        }
    }
}
