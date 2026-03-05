use tauri::{
    App, Manager,
    menu::{MenuBuilder, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
};

pub fn setup(app: &mut App) -> tauri::Result<()> {
    let show_hide = MenuItem::with_id(app, "toggle", "Mostrar / Esconder  (Ctrl+Alt+N)", true, None::<&str>)?;
    let sessions  = MenuItem::with_id(app, "sessions", "Sessions  (Ctrl+Alt+V)", true, None::<&str>)?;
    let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
    let quit      = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;

    let menu = MenuBuilder::new(app)
        .item(&show_hide)
        .item(&sessions)
        .item(&separator)
        .item(&quit)
        .build()?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("TypeFlow v1.0")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => toggle_card(app),
            "sessions" => toggle_viewer(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                toggle_card(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn toggle_card(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("card") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

fn toggle_viewer(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("viewer") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}
