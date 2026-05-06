use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State, command};

struct WatiRestart;

#[command]
pub fn set_wait_app_restart(app: AppHandle) {
    app.manage(WatiRestart);
}

#[command]
pub fn get_wait_app_restart(app: AppHandle) -> bool {
    app.try_state::<WatiRestart>().is_some()
}

pub struct StateCache(Arc<AtomicU8>);

impl StateCache {
    pub fn none() -> Self {
        Self(Arc::new(AtomicU8::new(0)))
    }
    fn get(&self) -> Option<bool> {
        match self.0.load(Ordering::Acquire) {
            1 => Some(true),
            2 => Some(false),
            _ => None,
        }
    }
    fn set(&self, value: Option<bool>) {
        self.0.store(
            match value {
                Some(true) => 1,
                Some(false) => 2,
                None => 0,
            },
            Ordering::Release,
        )
    }
}

pub struct AppCheckUpdate(pub StateCache);

#[command]
pub fn set_app_update_available(sc: State<AppCheckUpdate>, available: bool) {
    sc.0.set(Some(available));
}

#[command]
pub fn get_app_update_available(sc: State<AppCheckUpdate>) -> Option<bool> {
    sc.0.get()
}

pub struct LicenseActivate(pub StateCache);

#[command]
pub fn set_license_activated(sc: State<LicenseActivate>) {
    sc.0.set(Some(true));
}

#[command]
pub fn get_license_activated(sc: State<LicenseActivate>) -> Option<bool> {
    sc.0.get()
}

pub struct ConnectionsSearch {
    value: Arc<Mutex<String>>,
}

impl ConnectionsSearch {
    pub fn new() -> Self {
        Self {
            value: Arc::new(Mutex::new(String::new())),
        }
    }
    fn get(&self) -> String {
        if let Ok(v) = self.value.lock() {
            v.clone()
        } else {
            String::new()
        }
    }
    fn set(&self, value: String) {
        if let Ok(mut v) = self.value.lock() {
            *v = value;
        }
    }
}

#[command]
pub fn set_connections_search(cs: State<ConnectionsSearch>, value: String) {
    cs.set(value);
}

#[command]
pub fn get_connections_search(cs: State<ConnectionsSearch>) -> String {
    cs.get()
}
