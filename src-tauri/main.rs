#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod backup;
mod client;
mod database;
mod device;
mod http;
mod ipc;
mod keychain;
mod lifecycle;
mod native;
mod sql;
mod url;
mod window;
mod window_state;

#[cfg(target_os = "macos")]
mod menu;

use database::ConnectionStore;
use lifecycle::{AppCheckUpdate, ConnectionsSearch, LicenseActivate, StateCache};
use tauri::async_runtime::{block_on, spawn};
use tauri::{Manager, RunEvent, WindowEvent, generate_handler};
use window_state::WindowStateManager;

fn main() {
    let mut builder = tauri::Builder::default();

    builder = builder
        .plugin(tauri_plugin_single_instance::init(
            #[allow(unused_variables)]
            |app, args, cwd| {
                #[cfg(any(target_os = "windows", target_os = "linux"))]
                {
                    window::open_sql_window_from_args(app, Some(cwd), Some(args));
                }
            },
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    builder = builder.invoke_handler(generate_handler![
        // App Update
        lifecycle::set_wait_app_restart,
        lifecycle::get_wait_app_restart,
        lifecycle::set_app_update_available,
        lifecycle::get_app_update_available,
        // License
        lifecycle::set_license_activated,
        lifecycle::get_license_activated,
        // Connections page search value
        lifecycle::set_connections_search,
        lifecycle::get_connections_search,
        // Device
        device::hostname,
        device::font_families,
        // HTTP
        http::fetch,
        // Keychain
        keychain::set_password,
        keychain::get_password,
        keychain::delete_password,
        // Window
        window::show_connections_window,
        window::show_settings_window,
        window::show_activate_window,
        window::show_backup_window,
        window::new_database_window,
        // Native
        native::set_theme,
        native::get_theme,
        #[cfg(target_os = "macos")]
        native::get_macos_titlebar_height,
        // URL
        url::decode_url,
        url::encode_url,
        // Client Data
        client::create_connection,
        client::update_connection,
        client::delete_connection,
        client::connection_list,
        client::connection_sort,
        client::create_query,
        client::import_query,
        client::query_content,
        client::update_query,
        client::duplicate_query,
        client::rename_query,
        client::export_query,
        client::delete_query,
        client::query_list,
        client::create_query_history,
        client::clear_query_history,
        client::query_history_list,
        client::create_widget,
        client::delete_widget,
        client::widget_list,
        client::update_widget_position,
        client::update_widget_size,
        client::update_widget_config,
        client::get_storage,
        client::set_storage,
        client::delete_storage,
        // AI provider
        client::provider_list,
        client::create_provider,
        client::update_provider,
        client::delete_provider,
        // AI chat
        client::chat_list,
        client::create_chat,
        client::delete_chat,
        client::delete_all_chats,
        client::get_chat_detail,
        client::update_chat_name,
        client::update_chat_config,
        client::update_chat_messages,
        // AI agent
        client::agent_list,
        client::create_agent,
        client::update_agent,
        client::delete_agent,
        // Database
        database::test,
        database::connect,
        database::close,
        database::sql_select,
        database::sql_query,
        database::sql_execute,
        database::sql_transaction,
        database::sql_batch_insert,
        database::sql_batch_insert_preview,
        database::sql_export_batch_insert,
        database::kv_namespaces,
        database::kv_keys,
        database::kv_get,
        database::kv_get_content,
        database::kv_download_content,
        database::kv_set,
        database::kv_delete,
        database::kv_run_command,
        // SQL Statement
        sql::format,
        sql::minify,
        sql::ddl_type,
        sql::statements_position,
        sql::statement_readonly,
        // Backup
        backup::backup_command_preview,
        backup::start_backup,
        backup::cancel_backup,
    ]);

    builder = builder
        .manage(ConnectionStore::new())
        .manage(ConnectionsSearch::new())
        .manage(AppCheckUpdate(StateCache::none()))
        .manage(LicenseActivate(StateCache::none()));

    #[cfg(target_os = "macos")]
    {
        builder = builder.manage(window::OpenedWindowQueue::new());
    }

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .menu(menu::create_menu)
            .on_menu_event(menu::menu_event);
    }

    builder = builder.setup(|app| {
        let dir = app.path().app_data_dir()?;
        if !dir.exists() {
            let _ = std::fs::create_dir_all(&dir);
        }
        {
            app.manage(WindowStateManager::new(&dir));
        }
        {
            let state = block_on(client::Client::connect(&dir))?;
            app.manage(state);
        }
        native::restore_theme(app.app_handle());

        #[cfg(target_os = "macos")]
        {
            let queue = app.state::<window::OpenedWindowQueue>();
            if queue.is_empty() {
                spawn(window::show_connections_window(app.app_handle().clone()));
            } else {
                queue.open_all(app.app_handle());
            }
        }

        #[cfg(any(target_os = "windows", target_os = "linux"))]
        {
            let opened = window::open_sql_window_from_args(app.app_handle(), None, None);
            if !opened {
                spawn(window::show_connections_window(app.app_handle().clone()));
            }
        }

        Ok(())
    });

    builder = builder.on_window_event(|window, event| match event {
        WindowEvent::CloseRequested { .. } => {
            let app = window.app_handle();
            // Save window state when closing the window
            app.state::<WindowStateManager>().save(window);
            // Open the connections window when closing the last non-connections window
            if window.webview_windows().len() == 1 && window.label() != window::CONNECTIONS_WINDOW {
                block_on(window::show_connections_window(app.clone()))
                    .expect("Failed to show connections window");
            }
            // Clean up database connections
            match window.label() {
                window::CONNECTIONS_WINDOW | window::SETTINGS_WINDOW | window::ACTIVATE_WINDOW => {}
                // Database Window, Backup Window
                label => {
                    block_on(app.state::<ConnectionStore>().close(label));
                }
            }
        }
        _ => {}
    });

    builder
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            match event {
                #[cfg(target_os = "macos")]
                RunEvent::Opened { urls } => {
                    app.state::<window::OpenedWindowQueue>()
                        .try_opens(app, urls);
                }
                RunEvent::Exit => {
                    app.state::<WindowStateManager>().save_all(app);
                }
                _ => {}
            };
        });
}
