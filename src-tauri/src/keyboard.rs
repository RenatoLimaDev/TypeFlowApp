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
        // Armazena o caractere da dead key pendente (ex: ´, ^, ~, `)
        static PENDING_DEAD: RefCell<Option<u16>> = RefCell::new(None);
    }

    APP_HANDLE.with(|h| *h.borrow_mut() = Some(handle));

    unsafe extern "system" fn hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 && CAPTURE_ACTIVE.load(Ordering::SeqCst) {
            let kb = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
            let vk = VIRTUAL_KEY(kb.vkCode as u16);
            let is_keydown = wparam.0 == WM_KEYDOWN as usize
                || wparam.0 == WM_SYSKEYDOWN as usize;
            let is_keyup = wparam.0 == WM_KEYUP as usize
                || wparam.0 == WM_SYSKEYUP as usize;

            // Bloqueia Space no keyup também — players como YouTube pausam no keyup
            if is_keyup && vk == VK_SPACE {
                return LRESULT(1);
            }

            if is_keydown {
                let ctrl = (GetKeyState(VK_CONTROL.0 as i32) & 0x8000u16 as i16) != 0;
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
                    // Space: tratado explicitamente.
                    // Dead key pendente + space = emite a dead key sozinha (ex: ´ + space = ´)
                    VK_SPACE => {
                        let dead = PENDING_DEAD.with(|pd| {
                            let val = pd.borrow().clone();
                            *pd.borrow_mut() = None;
                            val
                        });
                        if let Some(dead_u16) = dead {
                            // ´ + space = emite o acento sozinho
                            let s = char::from_u32(dead_u16 as u32)
                                .map(|c| c.to_string())
                                .unwrap_or_else(|| " ".into());
                            Some(KeyEvent { kind: "char".into(), char: Some(s) })
                        } else {
                            Some(KeyEvent { kind: "char".into(), char: Some(" ".into()) })
                        }
                    }
                    _ if ctrl => None,
                    _ => {
                        let keyboard_state = {
                            let mut state = [0u8; 256];
                            GetKeyboardState(&mut state);
                            state
                        };

                        let layout = GetKeyboardLayout(0);
                        let mut buf = [0u16; 4];

                        let result = ToUnicodeEx(
                            kb.vkCode,
                            kb.scanCode,
                            &keyboard_state,
                            &mut buf,
                            0,
                            layout,
                        );

                        if result < 0 {
                            // Dead key (´, ^, ~, `, "): ToUnicodeEx sujou o buffer interno
                            // do Windows. Limpa chamando novamente com mesma tecla.
                            let mut discard = [0u16; 4];
                            ToUnicodeEx(kb.vkCode, kb.scanCode, &keyboard_state, &mut discard, 0, layout);

                            // Salva o caractere da dead key para compor com a próxima tecla
                            if let Some(dead_char) = char::from_u32(buf[0] as u32) {
                                PENDING_DEAD.with(|pd| *pd.borrow_mut() = Some(dead_char as u16));
                            }
                            None // aguarda próxima tecla
                        } else if result > 0 {
                            if let Ok(s) = String::from_utf16(&buf[..result as usize]) {
                                let filtered: String = s.chars().filter(|c| *c >= ' ').collect();
                                if filtered.is_empty() {
                                    return CallNextHookEx(None, code, wparam, lparam);
                                }

                                // Verifica se havia dead key pendente
                                let composed = PENDING_DEAD.with(|pd| {
                                    let pending = pd.borrow().clone();
                                    if let Some(dead_u16) = pending {
                                        *pd.borrow_mut() = None;
                                        // ToUnicodeEx já fez a composição internamente.
                                        // Se retornou 2 chars: sem composição (ex: ´ + b).
                                        // Emite dead key + char separados.
                                        if filtered.chars().count() == 2 {
                                            let dead_str = char::from_u32(dead_u16 as u32)
                                                .map(|c| c.to_string())
                                                .unwrap_or_default();
                                            let base = filtered.chars().last()
                                                .map(|c| c.to_string())
                                                .unwrap_or_default();
                                            Some(dead_str + &base)
                                        } else {
                                            // Composição feita: retorna caractere composto (ex: á, ê, ã)
                                            Some(filtered)
                                        }
                                    } else {
                                        Some(filtered)
                                    }
                                });

                                composed.map(|c| KeyEvent { kind: "char".into(), char: Some(c) })
                            } else {
                                None
                            }
                        } else {
                            // result == 0: tecla sem tradução.
                            // Se havia dead key pendente, emite ela sozinha.
                            PENDING_DEAD.with(|pd| {
                                let pending = pd.borrow().clone();
                                if let Some(dead_u16) = pending {
                                    *pd.borrow_mut() = None;
                                    char::from_u32(dead_u16 as u32).map(|c| {
                                        KeyEvent { kind: "char".into(), char: Some(c.to_string()) }
                                    })
                                } else {
                                    None
                                }
                            })
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