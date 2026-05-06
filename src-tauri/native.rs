use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager, command};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Auto,
    Light,
    Dark,
}

impl From<String> for Theme {
    fn from(value: String) -> Self {
        match value.as_str() {
            "light" => Theme::Light,
            "dark" => Theme::Dark,
            _ => Theme::Auto,
        }
    }
}

impl std::fmt::Display for Theme {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Theme::Auto => write!(f, "auto"),
            Theme::Light => write!(f, "light"),
            Theme::Dark => write!(f, "dark"),
        }
    }
}

impl Theme {
    fn apply(&self, app: &AppHandle) {
        app.set_theme(match self {
            Theme::Auto => None,
            Theme::Light => Some(tauri::Theme::Light),
            Theme::Dark => Some(tauri::Theme::Dark),
        });
    }
}

const ERROR_MESSAGE: &str = "Get app config dir failed";

#[command]
pub fn set_theme(app: AppHandle, theme: Theme) {
    theme.apply(&app);
    let p = app
        .path()
        .app_data_dir()
        .expect(ERROR_MESSAGE)
        .join(dir::THEME_FILE);
    let _ = fs::write(p, theme.to_string());
}

#[command]
pub fn get_theme(app: AppHandle) -> Theme {
    let p = app
        .path()
        .app_data_dir()
        .expect(ERROR_MESSAGE)
        .join(dir::THEME_FILE);
    fs::read_to_string(p)
        .map(Theme::from)
        .unwrap_or(Theme::Auto)
}

pub fn restore_theme(app: &AppHandle) {
    let theme = get_theme(app.clone());
    theme.apply(app);
}

#[cfg(target_os = "macos")]
#[command]
pub fn get_macos_titlebar_height(window: tauri::Window) -> Result<usize, ()> {
    use objc2::rc::Retained;
    use objc2_app_kit::NSWindow;
    unsafe {
        let ptr = window.ns_window().map_err(|_| ())? as *mut NSWindow;
        let window = Retained::retain(ptr).ok_or(())?;
        let frame = window.frame();
        let content = window.contentLayoutRect();
        let height = frame.size.height - content.size.height;
        Ok(height as usize)
    }
}
