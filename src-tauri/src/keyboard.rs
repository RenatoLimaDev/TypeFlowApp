use tauri::{AppHandle, Emitter, Listener};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;

#[derive(Clone, serde::Serialize)]
pub struct KeyEvent {
    pub kind: String,
    pub char: Option<String>,
}

static CAPTURE_ACTIVE: AtomicBool = AtomicBool::new(false);

pub fn start(handle: AppHandle) {
    handle.listen("keyboard-capture-start", move |_| {
        CAPTURE_ACTIVE.store(true, Ordering::SeqCst);
    });

    handle.listen("keyboard-capture-stop", move |_| {
        CAPTURE_ACTIVE.store(false, Ordering::SeqCst);
    });

    thread::spawn(move || {
        #[cfg(target_os = "windows")]
        windows_hook(handle);
    });
}

#[cfg(target_os = "windows")]
fn windows_hook(handle: AppHandle) {
    use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
    use windows::Win32::UI::Input::KeyboardAndMouse::*;
    use windows::Win32::UI::WindowsAndMessaging::*;
    use std::cell::RefCell;

    thread_local! {
        static APP_HANDLE: RefCell<Option<AppHandle>> = RefCell::new(None);
    }

    APP_HANDLE.with(|h| *h.borrow_mut() = Some(handle));

    unsafe extern "system" fn hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 && CAPTURE_ACTIVE.load(Ordering::SeqCst) {
            let kb = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
            let vk = VIRTUAL_KEY(kb.vkCode as u16);
            let is_keydown = wparam.0 == WM_KEYDOWN as usize
                || wparam.0 == WM_SYSKEYDOWN as usize;

            if is_keydown {
                let ctrl = (GetKeyState(VK_CONTROL.0 as i32) & 0x8000u16 as i16) != 0;
                let shift = (GetKeyState(VK_SHIFT.0 as i32) & 0x8000u16 as i16) != 0;
                let alt = (GetKeyState(VK_MENU.0 as i32) & 0x8000u16 as i16) != 0;

                // Deixa Ctrl+Alt+* passar — são atalhos globais do app
                if ctrl && alt {
                    return CallNextHookEx(None, code, wparam, lparam);
                }

                let evt: Option<KeyEvent> = match vk {
                    VK_ESCAPE => Some(KeyEvent { kind: "escape".into(), char: None }),
                    VK_RETURN if ctrl => Some(KeyEvent { kind: "ctrl_enter".into(), char: None }),
                    VK_RETURN => Some(KeyEvent { kind: "enter".into(), char: None }),
                    VK_BACK => Some(KeyEvent { kind: "backspace".into(), char: None }),
                    VK_Z if ctrl => Some(KeyEvent { kind: "ctrl_z".into(), char: None }),
                    _ if ctrl => None,
                    _ => {
                        let scan = MapVirtualKeyW(kb.vkCode, MAPVK_VK_TO_CHAR);
                        if scan > 0 {
                            if let Some(mut c) = char::from_u32(scan) {
                                if !shift {
                                    if let Some(lower) = c.to_lowercase().next() {
                                        c = lower;
                                    }
                                }
                                if c >= ' ' {
                                    Some(KeyEvent { kind: "char".into(), char: Some(c.to_string()) })
                                } else {
                                    None
                                }
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    }
                };

                if let Some(e) = evt {
                    APP_HANDLE.with(|h| {
                        if let Some(handle) = h.borrow().as_ref() {
                            let _ = handle.emit("global-key", e);
                        }
                    });
                    // Bloqueia a tecla — não passa para outros apps
                    return LRESULT(1);
                }
            }
        }

        CallNextHookEx(None, code, wparam, lparam)
    }

    unsafe {
        let hook = match SetWindowsHookExW(WH_KEYBOARD_LL, Some(hook_proc), None, 0) {
            Ok(h) => h,
            Err(e) => {
                eprintln!("Failed to set keyboard hook: {:?}", e);
                return;
            }
        };

        // Message loop — necessário para o hook receber eventos
        let mut msg = MSG::default();
        loop {
            let result = GetMessageW(&mut msg, None, 0, 0);
            if result.0 == 0 || result.0 == -1 {
                break;
            }
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        let _ = UnhookWindowsHookEx(hook);
    }
}

#[cfg(not(target_os = "windows"))]
fn windows_hook(_handle: AppHandle) {}