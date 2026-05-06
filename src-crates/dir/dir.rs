use std::path::PathBuf;

const IDENTIFIER: &str = "app.dataflare.desktop";
const DRIVER_DIR: &str = "drivers";
pub const CLIENT_DATABASE_FILE: &str = "data.db";
pub const THEME_FILE: &str = ".theme";
pub const WINDOW_STATE_FILE: &str = ".window-state";

pub fn app_dir() -> PathBuf {
    match dirs::data_dir() {
        Some(path) => path.join(IDENTIFIER),
        None => {
            eprintln!("Error: App data directory not found");
            std::process::exit(1);
        }
    }
}

pub fn driver_dir() -> PathBuf {
    app_dir().join(DRIVER_DIR)
}
