// platform.rs
#[cfg(target_os = "windows")]
pub fn set_noactivate(hwnd_val: isize) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos,
        GWL_EXSTYLE, WS_EX_NOACTIVATE, WS_EX_TOPMOST,
        HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE, SWP_NOACTIVATE,
    };

    unsafe {
        let hwnd = HWND(hwnd_val as *mut _);

        // Adiciona WS_EX_NOACTIVATE + WS_EX_TOPMOST no estilo extended
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        SetWindowLongPtrW(
            hwnd,
            GWL_EXSTYLE,
            ex_style | WS_EX_NOACTIVATE.0 as isize | WS_EX_TOPMOST.0 as isize,
        );

        // Força TOPMOST via SetWindowPos também
        let _ = SetWindowPos(
            hwnd,
            HWND_TOPMOST,
            0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );
    }
}

#[cfg(not(target_os = "windows"))]
pub fn set_noactivate(_hwnd_val: isize) {}

#[cfg(target_os = "windows")]
pub fn reassert_noactivate(hwnd_val: isize) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_NOACTIVATE,
    };
    unsafe {
        let hwnd = HWND(hwnd_val as *mut _);
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_NOACTIVATE.0 as isize);
    }
}

#[cfg(not(target_os = "windows"))]
pub fn reassert_noactivate(_hwnd_val: isize) {}