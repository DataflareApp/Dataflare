use tauri::command;

#[command]
pub fn set_password(user: String, password: String) -> Result<(), String> {
    entry(user)?
        .set_password(&password)
        .map_err(|e| e.to_string())
}

#[command]
pub fn get_password(user: String) -> Result<String, String> {
    entry(user)?.get_password().map_err(|e| e.to_string())
}

#[command]
pub fn delete_password(user: String) -> Result<(), String> {
    entry(user)?.delete_password().map_err(|e| e.to_string())
}

// NOTE:
// Since Tauri does not sign the application in development mode,
// a test substitute is used on macOS debug builds to avoid entering the password manually every time
// https://github.com/tauri-apps/tauri/issues/7930

#[cfg(not(all(debug_assertions, target_os = "macos")))]
fn entry(user: String) -> Result<keyring::Entry, String> {
    keyring::Entry::new("Dataflare", &user).map_err(|e| e.to_string())
}
#[cfg(all(debug_assertions, target_os = "macos"))]
fn entry(user: String) -> Result<MacDebugEntry, String> {
    MacDebugEntry::new(user).map_err(|e| e.to_string())
}

#[cfg(all(debug_assertions, target_os = "macos"))]
pub struct MacDebugEntry {
    user: String,
}

#[cfg(all(debug_assertions, target_os = "macos"))]
impl MacDebugEntry {
    pub fn new(user: String) -> Result<Self, std::io::Error> {
        let _ = std::fs::create_dir(".keychain");
        Ok(Self { user })
    }
    fn user(&self) -> String {
        format!(".keychain/{}", self.user)
    }
    pub fn set_password(&self, password: &str) -> Result<(), std::io::Error> {
        std::fs::write(self.user(), password)
    }
    pub fn get_password(&self) -> Result<String, std::io::Error> {
        std::fs::read_to_string(self.user())
    }
    pub fn delete_password(&self) -> Result<(), std::io::Error> {
        std::fs::remove_file(self.user())
    }
}
