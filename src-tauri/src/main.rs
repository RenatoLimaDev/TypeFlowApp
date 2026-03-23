#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::Emitter;
use tauri::Manager;

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
        .invoke_handler(tauri::generate_handler![reassert_noactivate, sync_viewer_to_card, set_viewer_passthrough, show_viewer_noactivate, resize_card])
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
fn show_viewer_noactivate(app: tauri::AppHandle) -> Result<(), String> {
    let viewer = app.get_webview_window("viewer").ok_or("no viewer window")?;
    #[cfg(target_os = "windows")]
    {
        use raw_window_handle::{HasWindowHandle, RawWindowHandle};
        if let Ok(handle) = viewer.window_handle() {
            if let RawWindowHandle::Win32(h) = handle.as_raw() {
                // Mostra via Win32 sem ativar (não quebra fullscreen)
                crate::platform::show_noactivate(h.hwnd.get() as isize);
            }
        }
    }
    // Notifica o Tauri que a janela está visível — necessário para isVisible() funcionar
    // Como a janela já está visível pelo Win32, ShowWindow não muda o foreground
    viewer.show().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_viewer_passthrough(app: tauri::AppHandle, on: bool) -> Result<(), String> {
    use tauri::Emitter;
    let viewer = app.get_webview_window("viewer").ok_or("no viewer window")?;
    viewer.set_ignore_cursor_events(on).map_err(|e| e.to_string())?;
    viewer.emit("viewer-passthrough", on).map_err(|e| e.to_string())
}

#[tauri::command]
fn sync_viewer_to_card(app: tauri::AppHandle) -> Result<(), String> {
    let card = app.get_webview_window("card").ok_or("no card window")?;
    let viewer = app.get_webview_window("viewer").ok_or("no viewer window")?;

    let card_pos = card.outer_position().map_err(|e| e.to_string())?;
    let viewer_size = viewer.outer_size().map_err(|e| e.to_string())?;
    let scale = card.scale_factor().map_err(|e| e.to_string())?;

    let new_y = card_pos.y - viewer_size.height as i32;

    viewer
        .set_position(tauri::PhysicalPosition::new(card_pos.x, new_y))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn resize_card(app: tauri::AppHandle, height: i32) -> Result<(), String> {
    let card = app.get_webview_window("card").ok_or("no card window")?;
    let pos = card.outer_position().map_err(|e| e.to_string())?;
    let size = card.outer_size().map_err(|e| e.to_string())?;
    let scale = card.scale_factor().map_err(|e| e.to_string())?;
    let phys_h = (height as f64 * scale).round() as u32;
    let new_y = pos.y + size.height as i32 - phys_h as i32;
    card.set_size(tauri::PhysicalSize::new(size.width, phys_h)).map_err(|e| e.to_string())?;
    card.set_position(tauri::PhysicalPosition::new(pos.x, new_y)).map_err(|e| e.to_string())?;
    Ok(())
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

