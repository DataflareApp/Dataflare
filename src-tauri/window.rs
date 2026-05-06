use crate::client::{
    Client, ConnectionItemResult, Error as ClientError, connection_list, create_connection,
};
use crate::window_state::WindowStateManager;
use database::{ConnectionConfig, DuckDbConfig, SqliteConfig, TursoDatabaseConfig};
use std::cell::Cell;
use tauri::async_runtime::block_on;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent, command};
use tokio::sync::oneshot;

#[cfg(target_os = "linux")]
use std::path::{Component, Path, PathBuf};
#[cfg(target_os = "windows")]
use std::path::{Path, PathBuf};
#[cfg(target_os = "macos")]
use {
    std::sync::{Arc, Mutex},
    url::Url,
};

#[cfg(target_os = "macos")]
pub const DECORATION: bool = true;
#[cfg(target_os = "windows")]
pub const DECORATION: bool = false;
#[cfg(target_os = "linux")]
pub const DECORATION: bool = false;

fn try_show_window(app: &AppHandle, label: &str) -> bool {
    app.get_webview_window(label)
        .map(|win| {
            let _ = win.unminimize();
            let _ = win.show();
            let _ = win.set_focus();
        })
        .is_some()
}

pub const CONNECTIONS_WINDOW: &str = "connections";
const REFRESH_CONNECTIONS: &str = "refresh-connections";
#[command]
pub async fn show_connections_window(app: AppHandle) -> Result<(), String> {
    if try_show_window(&app, CONNECTIONS_WINDOW) {
        return Ok(());
    }
    let mut builder = WebviewWindowBuilder::new(
        &app,
        CONNECTIONS_WINDOW,
        WebviewUrl::App("connections.html".into()),
    )
    .title("Dataflare")
    .inner_size(660., 440.)
    .min_inner_size(660., 440.)
    .visible(false)
    .decorations(DECORATION)
    .disable_drag_drop_handler()
    .enable_clipboard_access()
    .use_https_scheme(true);
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    if let Some(state) = app.state::<WindowStateManager>().get(CONNECTIONS_WINDOW) {
        builder = state.restore(builder);
    }
    builder.build().map(|_| ()).map_err(|err| err.to_string())
}

pub const SETTINGS_WINDOW: &str = "settings";
const SWITCH_SETTINGS_TAB: &str = "switch-settings-tab";

#[command]
pub async fn show_settings_window(app: AppHandle, tab: Option<String>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        if let Some(tab_name) = tab {
            let _ = window.emit(SWITCH_SETTINGS_TAB, tab_name);
        }
        return Ok(());
    }

    let mut builder = WebviewWindowBuilder::new(
        &app,
        SETTINGS_WINDOW,
        WebviewUrl::App("settings.html".into()),
    )
    .title("Dataflare")
    .inner_size(720., 460.)
    .min_inner_size(720., 460.)
    .maximizable(false)
    .minimizable(false)
    .visible(false)
    .decorations(DECORATION)
    .disable_drag_drop_handler()
    .enable_clipboard_access()
    .use_https_scheme(true);

    if let Some(tab) = tab {
        let script = format!(r#"window.__DEFAULT_TAB = '{tab}'"#);
        builder = builder.initialization_script(script);
    }

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    if let Some(state) = app.state::<WindowStateManager>().get(SETTINGS_WINDOW) {
        builder = state.restore(builder);
    }
    builder.build().map(|_| ()).map_err(|err| err.to_string())
}

pub const ACTIVATE_WINDOW: &str = "activate";
#[command]
pub async fn show_activate_window(app: AppHandle) -> Result<(), String> {
    if try_show_window(&app, ACTIVATE_WINDOW) {
        return Ok(());
    }
    let mut builder = WebviewWindowBuilder::new(
        &app,
        ACTIVATE_WINDOW,
        WebviewUrl::App("activate.html".into()),
    )
    .title("Dataflare")
    .inner_size(640., 500.)
    .min_inner_size(640., 500.)
    .maximizable(false)
    .minimizable(false)
    .visible(false)
    .decorations(DECORATION)
    .disable_drag_drop_handler()
    .enable_clipboard_access()
    .use_https_scheme(true);
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    if let Some(state) = app.state::<WindowStateManager>().get(ACTIVATE_WINDOW) {
        builder = state.restore(builder);
    }
    builder.build().map(|_| ()).map_err(|err| err.to_string())
}

pub const BACKUP_WINDOW: &str = "backup";
#[command]
pub async fn show_backup_window(
    app: AppHandle,
    connection: ConnectionItemResult,
) -> Result<(), String> {
    let script = connection_script(&connection)?;
    let label = format!("{}_{}", BACKUP_WINDOW, connection.cid);

    if try_show_window(&app, &label) {
        return Ok(());
    }
    let mut builder =
        WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("backup.html".into()))
            .title("Dataflare")
            .inner_size(520., 420.)
            .min_inner_size(520., 420.)
            .visible(false)
            .decorations(DECORATION)
            .disable_drag_drop_handler()
            .enable_clipboard_access()
            .use_https_scheme(true)
            .initialization_script(script);
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    if let Some(state) = app.state::<WindowStateManager>().get(&label) {
        builder = state.restore(builder);
    }
    builder.build().map(|_| ()).map_err(|err| err.to_string())
}

#[command]
pub async fn new_database_window(
    app: AppHandle,
    connection: ConnectionItemResult,
    close_connections_window: bool,
    reopen_if_exists: bool,
) -> Result<(), String> {
    let script = connection_script(&connection)?;
    let label = &connection.cid;

    if let Some(cw) = app.get_webview_window(label) {
        if !reopen_if_exists {
            let _ = cw.unminimize();
            let _ = cw.show();
            let _ = cw.set_focus();
            return Ok(());
        }
        // Multiple windows for the same connection are not allowed; if already open, close first then reopen
        // The window does not close immediately after .close(), so we use a channel to wait here
        // Note that window close must not be prevented anywhere, otherwise this will wait forever
        let (tx, rx) = oneshot::channel();
        let cell = Cell::new(Some(tx));
        cw.on_window_event(move |e| {
            if let WindowEvent::Destroyed = e {
                if let Some(tx) = cell.replace(None) {
                    let _ = tx.send(());
                }
            }
        });
        let _ = cw.close();
        let _ = rx.await;
    }

    let mut builder =
        WebviewWindowBuilder::new(&app, label, WebviewUrl::App("database.html".into()))
            .title("Dataflare")
            .inner_size(900., 600.)
            .min_inner_size(780., 420.)
            .visible(false)
            .decorations(DECORATION)
            .disable_drag_drop_handler()
            .enable_clipboard_access()
            .use_https_scheme(true)
            .initialization_script(script);
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    if let Some(state) = app.state::<WindowStateManager>().get(label) {
        builder = state.restore(builder);
    }
    builder.build().map_err(|err| err.to_string())?;

    if close_connections_window {
        if let Some(cw) = app.get_webview_window(CONNECTIONS_WINDOW) {
            let _ = cw.close();
        }
    }

    Ok(())
}

fn connection_script(conn: &ConnectionItemResult) -> Result<String, String> {
    let val = serde_json::to_string(conn)
        .map_err(|err| format!("Failed to serialize connection: {}", err))?
        .replace('\\', "\\\\")
        .replace('\'', "\\'");
    let script = format!(r#"window.__CONNECTION = '{val}';"#);
    Ok(script)
}

#[cfg(target_os = "macos")]
pub struct OpenedWindowQueue {
    paths: Arc<Mutex<Vec<String>>>,
}

#[cfg(target_os = "macos")]
impl OpenedWindowQueue {
    pub fn new() -> Self {
        Self {
            paths: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn is_empty(&self) -> bool {
        self.paths.lock().map(|v| v.is_empty()).unwrap_or(true)
    }

    fn conver_urls(urls: &[Url]) -> Vec<String> {
        urls.iter()
            .map(|url| match url.to_file_path() {
                Ok(p) => p.to_string_lossy().into(),
                Err(_) => url.path().into(),
            })
            .collect::<Vec<_>>()
    }

    // If Client is already initialized, open all; otherwise queue them and wait for Client initialization in .setup to complete
    pub fn try_opens(&self, app: &AppHandle, urls: Vec<Url>) {
        let paths = Self::conver_urls(&urls);
        if app.try_state::<Client>().is_some() {
            open_sql_windows_from_paths(app, paths);
        } else {
            if let Ok(mut vec) = self.paths.lock() {
                vec.extend(paths);
            }
        }
    }

    // Open all queued windows (Client is initialized)
    pub fn open_all(&self, app: &AppHandle) {
        if let Ok(mut paths) = self.paths.lock() {
            let paths = std::mem::take(&mut *paths);
            open_sql_windows_from_paths(app, paths);
        }
    }
}

#[cfg(any(target_os = "windows", target_os = "linux"))]
pub fn open_sql_window_from_args(
    app: &AppHandle,
    cwd: Option<String>,
    args: Option<Vec<String>>,
) -> bool {
    let args = args.unwrap_or_else(|| std::env::args().collect::<Vec<_>>());
    let mut paths = Vec::new();
    for arg in args.into_iter().skip(1) {
        if arg.starts_with('-') {
            continue;
        }
        let path = match absolute_path(arg, &cwd) {
            Ok(path) => path,
            Err(err) => {
                eprintln!("{err}");
                continue;
            }
        };
        paths.push(path);
    }
    if paths.is_empty() {
        return false;
    }
    open_sql_windows_from_paths(app, paths);
    true
}

fn open_sql_windows_from_paths(app: &AppHandle, files: Vec<String>) {
    let client = app.state::<Client>();
    let rst: Result<bool, ClientError> = block_on(async move {
        let connections = connection_list(client.clone()).await?;
        let mut refresh = false;
        for path in files {
            let find = connections.iter().find(|c| match &c.config {
                ConnectionConfig::SQLite(c) => c.path == path,
                ConnectionConfig::SQLCipher(c) => c.path == path,
                ConnectionConfig::DuckDB(c) => c.path == path,
                ConnectionConfig::Turso(c) => match &c.database {
                    TursoDatabaseConfig::LibSQL { path: p } => p == &path,
                    TursoDatabaseConfig::Turso { path: p, .. } => p == &path,
                    _ => false,
                },
                _ => false,
            });
            // Open existing connection
            if let Some(conn) = find {
                let rst = new_database_window(app.clone(), conn.clone(), false, false).await;
                if let Err(err) = rst {
                    eprintln!("Failed to open existing connection: {}", err);
                }
                continue;
            }
            // Create a new connection
            let name = filename(&path);
            let config = conn_config(path);
            let rst = create_connection(client.clone(), name.clone(), config.clone()).await;
            let cid = match rst {
                Ok(cid) => {
                    refresh = true;
                    cid
                }
                Err(err) => {
                    eprintln!("Failed to create new connection: {}", err);
                    continue;
                }
            };
            let item = ConnectionItemResult { cid, name, config };
            let rst = new_database_window(app.clone(), item, false, true).await;
            if let Err(err) = rst {
                eprintln!("Failed to open new connection: {}", err);
            }
        }
        Ok(refresh)
    });
    if let Ok(true) = rst {
        let _ = app.emit(REFRESH_CONNECTIONS, ());
    }
}

#[cfg(any(target_os = "windows", target_os = "linux"))]
fn absolute_path(path: String, cwd: &Option<String>) -> Result<String, String> {
    if Path::new(&path).is_absolute() {
        return Ok(path);
    }
    let root = match cwd {
        Some(cwd) => PathBuf::from(cwd),
        None => std::env::current_dir()
            .map_err(|err| format!("Failed to get current directory: {}", err))?,
    };
    #[cfg(target_os = "windows")]
    {
        Ok(root.join(path).to_string_lossy().into())
    }
    #[cfg(target_os = "linux")]
    {
        Ok(normalize_path(&root.join(path)).to_string_lossy().into())
    }
}

#[cfg(target_os = "linux")]
fn normalize_path(path: &Path) -> PathBuf {
    let mut components = path.components().peekable();
    let mut ret = if let Some(c @ Component::Prefix(..)) = components.peek().cloned() {
        components.next();
        PathBuf::from(c.as_os_str())
    } else {
        PathBuf::new()
    };

    for component in components {
        match component {
            Component::Prefix(..) => unreachable!(),
            Component::RootDir => {
                ret.push(Component::RootDir);
            }
            Component::CurDir => {}
            Component::ParentDir => {
                if ret.ends_with(Component::ParentDir) {
                    ret.push(Component::ParentDir);
                } else {
                    let popped = ret.pop();
                    if !popped && !ret.has_root() {
                        ret.push(Component::ParentDir);
                    }
                }
            }
            Component::Normal(c) => {
                ret.push(c);
            }
        }
    }
    ret
}

fn filename(file: &str) -> String {
    let path = std::path::Path::new(file);
    match path.file_name() {
        Some(name) => name.to_string_lossy().into(),
        None => file.into(),
    }
}

// tauri.conf.json -> fileAssociations
// NOTE: Here we can only distinguish DuckDB; Turso, libSQL and SQLCipher cannot be distinguished because they share the same file extensions as SQLite
fn conn_config(path: String) -> ConnectionConfig {
    if path.ends_with(".duckdb") || path.ends_with(".ddb") {
        return ConnectionConfig::DuckDB(DuckDbConfig {
            path,
            readonly: false,
            initial: None,
        });
    }
    // Default to SQLite
    ConnectionConfig::SQLite(SqliteConfig {
        path,
        readonly: false,
        initial: None,
    })
}
