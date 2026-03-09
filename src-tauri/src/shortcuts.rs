use tauri::Emitter;
use tauri::Manager;
use tauri::App;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn setup(app: &mut App) -> tauri::Result<()> {
    let handle = app.handle().clone();

    app.global_shortcut().on_shortcuts(
        [
            Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyV),
            Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyS),
            Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyC),
        ],
        move |_app, shortcut, event| {
            if event.state == ShortcutState::Pressed {
                match shortcut.key {
                    Code::KeyV => toggle_window(&handle, "viewer"),
                    Code::KeyS => { let _ = handle.emit("toggle-sound", ()); }
                    Code::KeyC => { let _ = handle.emit("toggle-click-through", ()); }
                    _ => {}
                }
            }
        },
    ).map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e)))?;

    Ok(())
}

fn toggle_window(app: &tauri::AppHandle, label: &str) {
    if let Some(win) = app.get_webview_window(label) {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}