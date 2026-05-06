use tauri::command;

// This function is meant to get the Device Name, but was mistakenly named hostname
// hostname is used in many other places, so it won't be renamed
// Consider hostname == Device Name
#[command]
pub fn hostname() -> String {
    whoami::devicename()
}

#[command]
pub fn font_families() -> Vec<String> {
    let mut rst = font_kit::source::SystemSource::new()
        .all_families()
        .unwrap_or_default();
    rst.sort();
    rst
}
