use tauri::menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{App, AppHandle, Emitter, Runtime, menu::MenuEvent};

const APP_COMMANDS: &[&str] = &[
    "project.open",
    "project.openFile",
    "project.close",
    "file.save",
    "file.closeEditor",
    "settings.open",
];

pub fn init(app: &App) -> tauri::Result<()> {
    let menu = build_menu(app.handle())?;
    app.set_menu(menu)?;
    Ok(())
}

pub fn on_menu_event(app: &AppHandle, event: MenuEvent) {
    let id = event.id().0.as_str();
    if APP_COMMANDS.contains(&id) {
        let _ = app.emit("app-command", id);
    }
}

fn build_menu<R: Runtime>(handle: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let pkg = handle.package_info();
    let config = handle.config();
    let about_metadata = AboutMetadata {
        name: Some(pkg.name.clone()),
        version: Some(pkg.version.to_string()),
        copyright: config.bundle.copyright.clone(),
        authors: config.bundle.publisher.clone().map(|p| vec![p]),
        ..Default::default()
    };

    let file_menu = file_submenu(handle)?;
    let edit_menu = edit_submenu(handle)?;
    let window_menu = window_submenu(handle)?;

    #[cfg(target_os = "macos")]
    {
        let view_menu = Submenu::with_items(
            handle,
            "View",
            true,
            &[&PredefinedMenuItem::fullscreen(handle, None)?],
        )?;

        let app_menu = Submenu::with_items(
            handle,
            pkg.name.clone(),
            true,
            &[
                &PredefinedMenuItem::about(handle, None, Some(about_metadata))?,
                &PredefinedMenuItem::separator(handle)?,
                &MenuItem::with_id(
                    handle,
                    "settings.open",
                    "Settings…",
                    true,
                    Some("CmdOrCtrl+,"),
                )?,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::services(handle, None)?,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::hide(handle, None)?,
                &PredefinedMenuItem::hide_others(handle, None)?,
                &PredefinedMenuItem::show_all(handle, None)?,
                &PredefinedMenuItem::separator(handle)?,
                &PredefinedMenuItem::quit(handle, None)?,
            ],
        )?;

        return Menu::with_items(
            handle,
            &[
                &app_menu,
                &file_menu,
                &edit_menu,
                &view_menu,
                &window_menu,
            ],
        );
    }

    #[cfg(not(target_os = "macos"))]
    {
        let help_menu = Submenu::with_items(
            handle,
            "Help",
            true,
            &[&PredefinedMenuItem::about(
                handle,
                None,
                Some(about_metadata),
            )?],
        )?;

        Menu::with_items(
            handle,
            &[&file_menu, &edit_menu, &window_menu, &help_menu],
        )
    }
}

fn file_submenu<R: Runtime>(handle: &AppHandle<R>) -> tauri::Result<Submenu<R>> {
    Submenu::with_items(
        handle,
        "File",
        true,
        &[
            &MenuItem::with_id(
                handle,
                "project.open",
                "Open Folder…",
                true,
                Some("CmdOrCtrl+O"),
            )?,
            &MenuItem::with_id(
                handle,
                "project.openFile",
                "Open File…",
                true,
                Some("CmdOrCtrl+Shift+O"),
            )?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(
                handle,
                "project.close",
                "Close Project",
                true,
                Some("CmdOrCtrl+Shift+W"),
            )?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(
                handle,
                "file.save",
                "Save",
                true,
                Some("CmdOrCtrl+S"),
            )?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(
                handle,
                "file.closeEditor",
                "Close Editor Tab",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::close_window(handle, None)?,
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::quit(handle, None)?,
        ],
    )
}

fn edit_submenu<R: Runtime>(handle: &AppHandle<R>) -> tauri::Result<Submenu<R>> {
    Submenu::with_items(
        handle,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(handle, None)?,
            &PredefinedMenuItem::redo(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::cut(handle, None)?,
            &PredefinedMenuItem::copy(handle, None)?,
            &PredefinedMenuItem::paste(handle, None)?,
            &PredefinedMenuItem::select_all(handle, None)?,
        ],
    )
}

fn window_submenu<R: Runtime>(handle: &AppHandle<R>) -> tauri::Result<Submenu<R>> {
    Submenu::with_items(
        handle,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(handle, None)?,
            &PredefinedMenuItem::maximize(handle, None)?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::close_window(handle, None)?,
        ],
    )
}
