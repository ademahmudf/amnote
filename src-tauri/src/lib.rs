use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NotePayload {
    pub id: String,
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(rename = "isPinned", default)]
    pub is_pinned: bool,
    #[serde(rename = "isArchived", default)]
    pub is_archived: bool,
    #[serde(rename = "isTrashed", default)]
    pub is_trashed: bool,
    #[serde(rename = "isLocked", skip_serializing_if = "Option::is_none")]
    pub is_locked: Option<bool>,
    #[serde(rename = "lockHash", skip_serializing_if = "Option::is_none")]
    pub lock_hash: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(rename = "trashedAt", skip_serializing_if = "Option::is_none")]
    pub trashed_at: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct NoteFrontmatter {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(rename = "isPinned", default)]
    pub is_pinned: bool,
    #[serde(rename = "isArchived", default)]
    pub is_archived: bool,
    #[serde(rename = "isTrashed", default)]
    pub is_trashed: bool,
    #[serde(rename = "isLocked", skip_serializing_if = "Option::is_none")]
    pub is_locked: Option<bool>,
    #[serde(rename = "lockHash", skip_serializing_if = "Option::is_none")]
    pub lock_hash: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(rename = "trashedAt", skip_serializing_if = "Option::is_none")]
    pub trashed_at: Option<i64>,
}

fn resolve_vault_dir() -> PathBuf {
    let docs_dir = dirs::document_dir().unwrap_or_else(|| {
        dirs::home_dir()
            .map(|h| h.join("Documents"))
            .unwrap_or_else(|| PathBuf::from("."))
    });
    docs_dir.join("AmNotes")
}

fn ensure_vault_directories() -> Result<PathBuf, String> {
    let vault = resolve_vault_dir();
    let trash = vault.join(".trash");

    if !vault.exists() {
        fs::create_dir_all(&vault).map_err(|e| format!("Failed to create vault directory: {}", e))?;
    }
    if !trash.exists() {
        fs::create_dir_all(&trash).map_err(|e| format!("Failed to create trash directory: {}", e))?;
    }

    Ok(vault)
}

#[tauri::command]
fn get_vault_path() -> Result<String, String> {
    let vault = ensure_vault_directories()?;
    Ok(vault.to_string_lossy().to_string())
}

#[tauri::command]
fn open_vault_in_file_manager() -> Result<(), String> {
    let vault = ensure_vault_directories()?;
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&vault)
            .spawn()
            .map_err(|e| format!("Failed to open vault in Finder: {}", e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&vault)
            .spawn()
            .map_err(|e| format!("Failed to open vault in file manager: {}", e))?;
    }

    Ok(())
}

fn parse_markdown_file(path: &Path) -> Option<NotePayload> {
    let raw = fs::read_to_string(path).ok()?;
    let trimmed = raw.trim_start();

    if trimmed.starts_with("---") {
        if let Some(end_idx) = trimmed[3..].find("\n---") {
            let frontmatter_str = &trimmed[3..3 + end_idx];
            let body_str = &trimmed[3 + end_idx + 4..];

            if let Ok(meta) = serde_yaml::from_str::<NoteFrontmatter>(frontmatter_str) {
                return Some(NotePayload {
                    id: meta.id,
                    title: meta.title,
                    content: body_str.trim_start_matches('\n').to_string(),
                    tags: meta.tags,
                    is_pinned: meta.is_pinned,
                    is_archived: meta.is_archived,
                    is_trashed: meta.is_trashed,
                    is_locked: meta.is_locked,
                    lock_hash: meta.lock_hash,
                    created_at: meta.created_at,
                    updated_at: meta.updated_at,
                    trashed_at: meta.trashed_at,
                });
            }
        }
    }

    // Fallback: parse raw markdown file with no frontmatter
    let file_stem = path.file_stem()?.to_string_lossy().to_string();
    let title = file_stem.clone();
    let modified = fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());

    Some(NotePayload {
        id: format!("file-{}", file_stem),
        title,
        content: raw,
        tags: vec![],
        is_pinned: false,
        is_archived: false,
        is_trashed: false,
        is_locked: None,
        lock_hash: None,
        created_at: modified,
        updated_at: modified,
        trashed_at: None,
    })
}

#[tauri::command]
fn load_notes_from_vault() -> Result<Vec<NotePayload>, String> {
    let vault = ensure_vault_directories()?;
    let mut notes = Vec::new();

    // Read active notes in vault
    if let Ok(entries) = fs::read_dir(&vault) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
                if let Some(note) = parse_markdown_file(&path) {
                    notes.push(note);
                }
            }
        }
    }

    // Read trashed notes in vault/.trash
    let trash_dir = vault.join(".trash");
    if let Ok(entries) = fs::read_dir(&trash_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
                if let Some(mut note) = parse_markdown_file(&path) {
                    note.is_trashed = true;
                    notes.push(note);
                }
            }
        }
    }

    notes.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(notes)
}

#[tauri::command]
fn save_note_to_vault(note: NotePayload) -> Result<(), String> {
    let vault = ensure_vault_directories()?;
    let trash = vault.join(".trash");

    let frontmatter = NoteFrontmatter {
        id: note.id.clone(),
        title: note.title.clone(),
        tags: note.tags,
        is_pinned: note.is_pinned,
        is_archived: note.is_archived,
        is_trashed: note.is_trashed,
        is_locked: note.is_locked,
        lock_hash: note.lock_hash,
        created_at: note.created_at,
        updated_at: note.updated_at,
        trashed_at: note.trashed_at,
    };

    let frontmatter_yaml = serde_yaml::to_string(&frontmatter)
        .map_err(|e| format!("Failed to serialize note metadata: {}", e))?;

    let file_content = format!("---\n{}---\n\n{}", frontmatter_yaml, note.content);

    let active_path = vault.join(format!("{}.md", note.id));
    let trash_path = trash.join(format!("{}.md", note.id));

    if note.is_trashed {
        if active_path.exists() {
            let _ = fs::remove_file(&active_path);
        }
        fs::write(&trash_path, file_content)
            .map_err(|e| format!("Failed to write trashed note: {}", e))?;
    } else {
        if trash_path.exists() {
            let _ = fs::remove_file(&trash_path);
        }
        fs::write(&active_path, file_content)
            .map_err(|e| format!("Failed to write note: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn delete_note_from_vault(id: String, permanent: bool) -> Result<(), String> {
    let vault = ensure_vault_directories()?;
    let active_path = vault.join(format!("{}.md", id));
    let trash_path = vault.join(".trash").join(format!("{}.md", id));

    if permanent {
        if active_path.exists() {
            let _ = fs::remove_file(&active_path);
        }
        if trash_path.exists() {
            let _ = fs::remove_file(&trash_path);
        }
    } else if active_path.exists() {
        let _ = fs::rename(&active_path, &trash_path);
    }

    Ok(())
}

#[tauri::command]
fn get_omarchy_theme() -> Result<String, String> {
    if let Ok(theme) = std::env::var("HYPRLAND_THEME") {
        if !theme.is_empty() {
            return Ok(theme);
        }
    }

    if let Some(home) = dirs::home_dir() {
        let theme_file = home.join(".config/omarchy/theme");
        if theme_file.exists() {
            if let Ok(content) = fs::read_to_string(theme_file) {
                let trimmed = content.trim();
                if !trimmed.is_empty() {
                    return Ok(trimmed.to_string());
                }
            }
        }
    }

    Ok("red-graphite".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(not(target_os = "macos"))]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_decorations(false);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_omarchy_theme,
            get_vault_path,
            open_vault_in_file_manager,
            load_notes_from_vault,
            save_note_to_vault,
            delete_note_from_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AmNote desktop application");
}
