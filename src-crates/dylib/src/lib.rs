pub mod driver;
pub mod ffi;

use current_platform::CURRENT_PLATFORM;
use libloading::{Library, Symbol};
use reqwest::{Client, StatusCode};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, LazyLock};
use tokio::fs::{self, File};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::{Mutex, RwLock};

const REMOTE: &str = "https://assets.dataflare.app/drivers/";

#[cfg(target_os = "macos")]
const PREFIX: &str = "lib";
#[cfg(target_os = "linux")]
const PREFIX: &str = "lib";
#[cfg(target_os = "windows")]
const PREFIX: &str = "";

#[cfg(target_os = "macos")]
const SUFFIX: &str = "dylib";
#[cfg(target_os = "linux")]
const SUFFIX: &str = "so";
#[cfg(target_os = "windows")]
const SUFFIX: &str = "dll";

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Driver error: {0}")]
    Library(#[from] libloading::Error),
    #[error("Load driver error(IO): {0}")]
    Io(#[from] std::io::Error),
    #[error(
        "Download driver failed(HTTP): {message}",
        message = reqwest::format_http_error(.0)
    )]
    Http(#[from] reqwest::Error),
    #[error("Download driver failed({0}): {1}")]
    Download(StatusCode, String),
    #[error("Database driver: SHA256 checksum does not match the expected value")]
    Sha256,
}

#[derive(Debug, Clone)]
pub struct Dylib {
    library: Arc<Library>,
}

impl Dylib {
    pub async fn try_load(name: &'static str, version: &str, expected_hash: &str) -> Result<Self> {
        let mutex = key_mutex(name).await;
        let _guard = mutex.lock().await;

        let path = dir::driver_dir().join(format!("{PREFIX}{name}.{SUFFIX}"));
        let checked = Self::check_driver(&path, expected_hash).await?;
        if !checked {
            let url = Self::asset_url(name, version);
            Self::download_driver(url, &path, expected_hash).await?;
        }
        let library = unsafe { Library::new(path)? };
        Ok(Self {
            library: Arc::new(library),
        })
    }

    pub fn symbol<T>(&self, name: &[u8]) -> Result<Symbol<'_, T>> {
        let sym = unsafe { self.library.get(name)? };
        Ok(sym)
    }

    fn asset_url(name: &str, version: &str) -> String {
        format!("{REMOTE}{PREFIX}{name}-{CURRENT_PLATFORM}-{version}.{SUFFIX}")
    }

    async fn check_hash(path: &Path, expected_hash: &str) -> Result<bool> {
        let mut file = File::open(path).await?;
        let mut sha256 = Sha256::new();
        let mut buffer = [0; 1024 * 8];
        loop {
            let count = file.read(&mut buffer).await?;
            if count == 0 {
                break;
            }
            sha256.update(&buffer[..count]);
        }
        let hex = format!("{:x}", sha256.finalize());
        Ok(hex == expected_hash)
    }

    async fn check_driver(path: &Path, expected_hash: &str) -> Result<bool> {
        let exists = path.try_exists()?;
        if !exists {
            return Ok(false);
        }
        Self::check_hash(path, expected_hash).await
    }

    async fn download_driver(url: String, path: &Path, expected_hash: &str) -> Result<()> {
        let mut res = Client::new().get(&url).send().await?;
        if !res.status().is_success() {
            return Err(Error::Download(res.status(), url));
        }
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent).await;
        }
        let mut file = File::create(path).await?;
        while let Some(bytes) = res.chunk().await? {
            file.write_all(&bytes).await?;
        }
        file.flush().await?;
        let checked = Self::check_hash(path, expected_hash).await?;
        if !checked {
            return Err(Error::Sha256);
        }
        Ok(())
    }
}

// Ensure only one instance of the same key can run at a time
async fn key_mutex(key: &'static str) -> Arc<Mutex<()>> {
    type KeyMap = LazyLock<RwLock<HashMap<&'static str, Arc<Mutex<()>>>>>;
    static KEY_MAP: KeyMap = LazyLock::new(|| RwLock::new(HashMap::new()));
    let read = KEY_MAP.read().await;
    if let Some(mutex) = read.get(key) {
        return mutex.clone();
    }
    drop(read);
    KEY_MAP
        .write()
        .await
        .entry(key)
        .or_insert_with(|| Arc::new(Mutex::new(())))
        .clone()
}
