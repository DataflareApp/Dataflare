pub use client_store::{
    AgentItem, ChatItem, Client, ConnectionItemResult, Error, Id, JsonArray, JsonMap, ProviderItem,
    QueryHistoryItem, QueryItem, WidgetConfig, WidgetItem,
};

use crate::window::BACKUP_WINDOW;
use crate::window_state::WindowStateManager;
use database::ConnectionConfig;
use tauri::{AppHandle, Manager, State, command};

type Result<T, E = Error> = std::result::Result<T, E>;

#[command]
pub async fn create_connection(
    client: State<'_, Client>,
    name: String,
    config: ConnectionConfig,
) -> Result<Id> {
    client.create_connection(name, config).await
}

#[command]
pub async fn update_connection(
    client: State<'_, Client>,
    cid: String,
    name: String,
    config: ConnectionConfig,
) -> Result<(), Error> {
    client.update_connection(cid, name, config).await
}

#[command]
pub async fn delete_connection(
    app: AppHandle,
    client: State<'_, Client>,
    wsm: State<'_, WindowStateManager>,
    cid: String,
) -> Result<(), Error> {
    client.delete_connection(&cid).await?;

    // Also delete the corresponding window state when deleting a connection; currently there are two windows related to cid
    // 1. database: cid
    // 2. backup: backup_cid
    {
        wsm.remove(&cid);
        if let Some(window) = app.get_webview_window(&cid) {
            let _ = window.close();
        }
    }
    {
        let label = format!("{BACKUP_WINDOW}_{}", cid);
        wsm.remove(&label);
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }
    }

    Ok(())
}

#[command]
pub async fn connection_list(
    client: State<'_, Client>,
) -> Result<Vec<ConnectionItemResult>, Error> {
    client.connection_list().await
}

#[command]
pub async fn connection_sort(client: State<'_, Client>, cids: Vec<String>) -> Result<(), Error> {
    client.connection_sort(cids).await
}

#[command]
pub async fn query_list(client: State<'_, Client>, cid: String) -> Result<Vec<QueryItem>, Error> {
    client.query_list(cid).await
}

#[command]
pub async fn query_content(client: State<'_, Client>, qid: String) -> Result<String, Error> {
    client.query_content(qid).await
}

#[command]
pub async fn create_query(
    client: State<'_, Client>,
    cid: String,
    name: String,
    content: String,
) -> Result<Id, Error> {
    client.create_query(cid, name, content).await
}

#[command]
pub async fn import_query(
    client: State<'_, Client>,
    cid: String,
    path: String,
) -> Result<(), Error> {
    client.import_query(cid, path).await
}

#[command]
pub async fn update_query(
    client: State<'_, Client>,
    qid: String,
    content: String,
) -> Result<(), Error> {
    client.update_query(qid, content).await
}

#[command]
pub async fn duplicate_query(client: State<'_, Client>, qid: String) -> Result<(), Error> {
    client.duplicate_query(qid).await
}

#[command]
pub async fn delete_query(client: State<'_, Client>, qid: String) -> Result<(), Error> {
    client.delete_query(qid).await
}

#[command]
pub async fn rename_query(
    client: State<'_, Client>,
    qid: String,
    name: String,
) -> Result<(), Error> {
    client.rename_query(qid, name).await
}

#[command]
pub async fn export_query(
    client: State<'_, Client>,
    qid: String,
    path: String,
) -> Result<(), Error> {
    client.export_query(qid, path).await
}

#[command]
pub async fn query_history_list(
    client: State<'_, Client>,
    qid: String,
    page: i32,
    limit: i32,
) -> Result<Vec<QueryHistoryItem>, Error> {
    client.query_history_list(qid, page, limit).await
}

#[command]
pub async fn clear_query_history(client: State<'_, Client>, qid: String) -> Result<(), Error> {
    client.clear_query_history(qid).await
}

#[command]
pub async fn create_query_history(
    client: State<'_, Client>,
    cid: String,
    qid: String,
    content: String,
    error_content: Option<String>,
) -> Result<(), Error> {
    client
        .create_query_history(cid, qid, content, error_content)
        .await
}

#[command]
pub async fn create_widget(
    client: State<'_, Client>,
    cid: String,
    width: u32,
    height: u32,
    x: u32,
    y: u32,
    config: WidgetConfig,
) -> Result<Id, Error> {
    client.create_widget(cid, width, height, x, y, config).await
}

#[command]
pub async fn delete_widget(client: State<'_, Client>, wid: String) -> Result<(), Error> {
    client.delete_widget(wid).await
}

#[command]
pub async fn widget_list(client: State<'_, Client>, cid: String) -> Result<Vec<WidgetItem>, Error> {
    client.widget_list(cid).await
}

#[command]
pub async fn update_widget_position(
    client: State<'_, Client>,
    wid: String,
    x: u32,
    y: u32,
) -> Result<(), Error> {
    client.update_widget_position(wid, x, y).await
}

#[command]
pub async fn update_widget_size(
    client: State<'_, Client>,
    wid: String,
    width: u32,
    height: u32,
) -> Result<(), Error> {
    client.update_widget_size(wid, width, height).await
}

#[command]
pub async fn update_widget_config(
    client: State<'_, Client>,
    wid: String,
    config: WidgetConfig,
) -> Result<(), Error> {
    client.update_widget_config(wid, config).await
}

#[command]
pub async fn get_storage(
    client: State<'_, Client>,
    cid: String,
    key: String,
) -> Result<String, Error> {
    client.get_storage(cid, key).await
}

#[command]
pub async fn set_storage(
    client: State<'_, Client>,
    cid: String,
    key: String,
    value: String,
) -> Result<(), Error> {
    client.set_storage(cid, key, value).await
}

#[command]
pub async fn delete_storage(
    client: State<'_, Client>,
    cid: String,
    key: String,
) -> Result<(), Error> {
    client.delete_storage(cid, key).await
}

#[command]
pub async fn provider_list(client: State<'_, Client>) -> Result<Vec<ProviderItem>, Error> {
    client.provider_list().await
}

#[command]
pub async fn create_provider(
    client: State<'_, Client>,
    name: String,
    config: JsonMap,
    models: JsonArray,
) -> Result<i64, Error> {
    client.create_provider(name, config, models).await
}

#[command]
pub async fn update_provider(
    client: State<'_, Client>,
    id: i64,
    name: String,
    config: JsonMap,
    models: JsonArray,
) -> Result<(), Error> {
    client.update_provider(id, name, config, models).await
}

#[command]
pub async fn delete_provider(client: State<'_, Client>, id: i64) -> Result<(), Error> {
    client.delete_provider(id).await
}

#[command]
pub async fn chat_list(client: State<'_, Client>, cid: String) -> Result<Vec<ChatItem>, Error> {
    client.chat_list(cid).await
}

#[command]
pub async fn create_chat(client: State<'_, Client>, cid: String) -> Result<i64, Error> {
    client.create_chat(cid).await
}

#[command]
pub async fn delete_chat(client: State<'_, Client>, id: i64) -> Result<(), Error> {
    client.delete_chat(id).await
}

#[command]
pub async fn delete_all_chats(client: State<'_, Client>, cid: String) -> Result<ChatItem, Error> {
    client.delete_all_chats(cid).await
}

#[command]
pub async fn get_chat_detail(client: State<'_, Client>, id: i64) -> Result<JsonMap, Error> {
    client.get_chat_detail(id).await
}

#[command]
pub async fn update_chat_name(
    client: State<'_, Client>,
    id: i64,
    name: String,
) -> Result<(), Error> {
    client.update_chat_name(id, name).await
}

#[command]
pub async fn update_chat_config(
    client: State<'_, Client>,
    id: i64,
    config: JsonMap,
) -> Result<(), Error> {
    client.update_chat_config(id, config).await
}

#[command]
pub async fn update_chat_messages(
    client: State<'_, Client>,
    id: i64,
    messages: JsonArray,
) -> Result<(), Error> {
    client.update_chat_messages(id, messages).await
}

#[command]
pub async fn agent_list(client: State<'_, Client>) -> Result<Vec<AgentItem>, Error> {
    client.agent_list().await
}

#[command]
pub async fn create_agent(
    client: State<'_, Client>,
    name: String,
    instructions: String,
) -> Result<i64, Error> {
    client.create_agent(name, instructions).await
}

#[command]
pub async fn update_agent(
    client: State<'_, Client>,
    id: i64,
    name: String,
    instructions: String,
) -> Result<(), Error> {
    client.update_agent(id, name, instructions).await
}

#[command]
pub async fn delete_agent(client: State<'_, Client>, id: i64) -> Result<(), Error> {
    client.delete_agent(id).await
}
