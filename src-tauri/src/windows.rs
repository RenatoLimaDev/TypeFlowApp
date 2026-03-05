use tauri::{App, WebviewWindowBuilder, WebviewUrl};

#[cfg(target_os = "windows")]
use raw_window_handle::{HasWindowHandle, RawWindowHandle};

pub fn setup(app: &mut App) -> tauri::Result<()> {
    let monitor = app.primary_monitor()?.unwrap();
    let work_area = monitor.work_area();
    let scale = monitor.scale_factor();

    let wa_w = (work_area.size.width as f64 / scale) as i32;
    let wa_h = (work_area.size.height as f64 / scale) as i32;
    let wa_x = (work_area.position.x as f64 / scale) as i32;
    let wa_y = (work_area.position.y as f64 / scale) as i32;

    // ── Card ─────────────────────────────────────────────────────
    let card_w = 900_i32;
    let card_h = 105_i32;
    let card_x = wa_x + (wa_w - card_w) / 2;
    let card_y = wa_y + wa_h - card_h - 4;

    let card = WebviewWindowBuilder::new(app, "card", WebviewUrl::App("src/windows/card/index.html".into()))
        .title("TypeFlow")
        .inner_size(card_w as f64, card_h as f64)
        .position(card_x as f64, card_y as f64)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .visible_on_all_workspaces(true)
        .focused(false)
        .build()?;

    // Começa com NOACTIVATE — shortcuts.rs vai remover quando não tiver fullscreen
    #[cfg(target_os = "windows")]
    if let Ok(handle) = card.window_handle() {
        if let RawWindowHandle::Win32(h) = handle.as_raw() {
            crate::platform::set_noactivate(h.hwnd.get() as isize);
        }
    }

    // ── Viewer ───────────────────────────────────────────────────
    let viewer_w = 880_i32;
    let viewer_h = std::cmp::min(640, (wa_h as f64 * 0.82) as i32);
    let viewer_x = wa_x + (wa_w - viewer_w) / 2;
    let viewer_y = wa_y + wa_h - viewer_h;

    WebviewWindowBuilder::new(app, "viewer", WebviewUrl::App("src/windows/viewer/index.html".into()))
        .title("TypeFlow — Sessions")
        .inner_size(viewer_w as f64, viewer_h as f64)
        .position(viewer_x as f64, viewer_y as f64)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .visible(false)
        .visible_on_all_workspaces(true)
        .focused(false)
        .build()?;

    // ── Onboarding ───────────────────────────────────────────────
    let ob_w = 320_i32;
    let ob_h = 340_i32;
    let ob_x = wa_x + (wa_w - ob_w) / 2;
    let ob_y = card_y - ob_h - 40;

    WebviewWindowBuilder::new(app, "onboarding", WebviewUrl::App("src/windows/onboarding/index.html".into()))
        .title("TypeFlow")
        .inner_size(ob_w as f64, ob_h as f64)
        .position(ob_x as f64, ob_y as f64)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .visible_on_all_workspaces(true)
        .focused(false)
        .build()?;

    Ok(())
}