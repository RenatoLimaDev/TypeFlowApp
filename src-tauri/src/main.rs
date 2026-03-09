#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::Emitter;

mod windows;
mod tray;
mod shortcuts;
mod platform;
mod keyboard;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![reassert_noactivate])
        .setup(|app| {
            windows::setup(app)?;
            tray::setup(app)?;
            shortcuts::setup(app)?;
            keyboard::start(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let _ = window.emit("keyboard-capture-stop", ());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running TypeFlow");
}

#[tauri::command]
fn reassert_noactivate(window: tauri::Window) {
    #[cfg(target_os = "windows")]
    {
        use raw_window_handle::{HasWindowHandle, RawWindowHandle};
        if let Ok(handle) = window.window_handle() {
            if let RawWindowHandle::Win32(h) = handle.as_raw() {
                crate::platform::reassert_noactivate(h.hwnd.get() as isize);
            }
        }
    }
}