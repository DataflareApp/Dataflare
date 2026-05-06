use backup::{BackupConfig, Killer};
use proxy::ProxyHandler;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicU32, Ordering};
use tauri::{AppHandle, Emitter, Manager, Window, command};
use tokio::sync::Mutex;
use tokio::time::{Duration, sleep};

#[command]
pub fn backup_command_preview(config: BackupConfig) -> Result<String, String> {
    config.command_string()
}

#[command]
pub async fn start_backup(
    app: AppHandle,
    window: Window,
    mut config: BackupConfig,
    path: String,
) -> Result<u32, String> {
    let proxy_handler = config.try_proxy().await?;

    let cmd = config.command()?;
    let (mut rx, killer) = cmd
        .run(path)
        .await
        .map_err(|err| format!("Failed to run command: {:?}", err))?;

    let tasks = BackupTasks::from(app.clone());
    let id = tasks.insert(killer, proxy_handler).await;

    tokio::spawn(async move {
        {
            // Intentionally delay here to give the frontend time to register event listeners, preventing events from being sent before the frontend is ready and avoiding event loss
            sleep(Duration::from_millis(300)).await;
        }
        let event_name = format!("backup-task-{}", id);
        loop {
            let msg = match rx.recv().await {
                Some(msg) => msg,
                None => break,
            };
            let _ = app.emit_to(window.label(), &event_name, msg);
        }
        tasks.remove(id).await;
    });

    Ok(id)
}

#[command]
pub async fn cancel_backup(app: AppHandle, id: u32) -> Result<(), ()> {
    BackupTasks::from(app).cancel(id).await;
    Ok(())
}

#[derive(Debug, Clone)]
struct BackupTasks {
    map: Arc<Mutex<HashMap<u32, (Killer, Option<ProxyHandler>)>>>,
}

impl BackupTasks {
    fn new() -> Self {
        Self {
            map: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn from(app: AppHandle) -> Self {
        if let Some(tasks) = app.try_state::<Self>() {
            return Self {
                map: tasks.map.clone(),
            };
        }
        let tasks = Self::new();
        app.manage(tasks.clone());
        tasks
    }

    async fn insert(&self, killer: Killer, proxy_handler: Option<ProxyHandler>) -> u32 {
        static ID_COUNTER: AtomicU32 = AtomicU32::new(0);
        let id = ID_COUNTER.fetch_add(1, Ordering::SeqCst);
        self.map.lock().await.insert(id, (killer, proxy_handler));
        id
    }

    async fn remove(&self, id: u32) -> Option<(Killer, Option<ProxyHandler>)> {
        self.map.lock().await.remove(&id)
    }

    async fn cancel(&self, id: u32) {
        let task = self.remove(id).await;
        if let Some((killer, _proxy_handler)) = task {
            killer.kill().await;
        }
    }
}
