use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::fs::{self, File};
use std::hash::{Hash, Hasher};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
#[cfg(not(target_os = "macos"))]
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

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct AppConfig {
    #[serde(rename = "customVaultPath", default)]
    pub custom_vault_path: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct VaultMarker {
    initialized: bool,
}

fn get_config_file_path() -> PathBuf {
    let config_dir = dirs::config_dir().unwrap_or_else(|| {
        dirs::home_dir()
            .map(|h| h.join(".config"))
            .unwrap_or_else(|| PathBuf::from("."))
    });
    config_dir.join("amnote").join("config.json")
}

fn read_app_config() -> AppConfig {
    let path = get_config_file_path();
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
            return config;
        }
    }
    AppConfig::default()
}

fn save_app_config(config: &AppConfig) -> Result<(), String> {
    let path = get_config_file_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    write_atomic(&path, &json)
}

fn resolve_vault_dir() -> PathBuf {
    let config = read_app_config();
    if let Some(custom) = config.custom_vault_path {
        if !custom.trim().is_empty() {
            return PathBuf::from(custom);
        }
    }

    let docs_dir = dirs::document_dir().unwrap_or_else(|| {
        dirs::home_dir()
            .map(|h| h.join("Documents"))
            .unwrap_or_else(|| PathBuf::from("."))
    });
    docs_dir.join("AmNotes")
}

fn is_safe_note_id(id: &str) -> bool {
    if id.is_empty() || id.len() > 200 {
        return false;
    }

    let mut chars = id.chars();
    if !chars.next().is_some_and(char::is_alphanumeric) {
        return false;
    }

    id.chars()
        .all(|ch| ch.is_alphanumeric() || matches!(ch, '-' | '_' | '.' | '(' | ')' | ' '))
        && !id.contains("..")
}

fn validate_note_id(id: &str) -> Result<(), String> {
    if is_safe_note_id(id) {
        Ok(())
    } else {
        Err(format!("Invalid note id: {id:?}"))
    }
}

fn note_file_path(vault: &Path, id: &str, trashed: bool) -> Result<PathBuf, String> {
    validate_note_id(id)?;

    let directory = if trashed {
        vault.join(".trash")
    } else {
        vault.to_path_buf()
    };
    let canonical_directory = directory
        .canonicalize()
        .map_err(|e| format!("Failed to resolve vault directory: {}", e))?;
    let path = canonical_directory.join(format!("{}.md", id));

    if !path.starts_with(&canonical_directory) {
        return Err(format!("Note path escapes vault: {id:?}"));
    }

    Ok(path)
}

fn sync_directory(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        let directory =
            File::open(parent).map_err(|e| format!("Failed to open vault directory: {}", e))?;
        directory
            .sync_all()
            .map_err(|e| format!("Failed to sync vault directory: {}", e))?;
    }
    Ok(())
}

fn write_atomic(path: &Path, contents: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("Invalid note path: {}", path.display()))?;
    fs::create_dir_all(parent).map_err(|e| format!("Failed to create note directory: {}", e))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to create temporary filename: {}", e))?
        .as_nanos();
    let filename = path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "note".to_string());
    let temp_path = parent.join(format!(".{filename}.{timestamp}.tmp"));

    let write_result = (|| -> Result<(), String> {
        let mut file = File::create(&temp_path)
            .map_err(|e| format!("Failed to create temporary note file: {}", e))?;
        file.write_all(contents.as_bytes())
            .map_err(|e| format!("Failed to write note: {}", e))?;
        file.sync_all()
            .map_err(|e| format!("Failed to sync note: {}", e))?;
        drop(file);
        fs::rename(&temp_path, path).map_err(|e| format!("Failed to replace note: {}", e))?;
        Ok(())
    })();

    if write_result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }
    write_result?;
    sync_directory(path)
}

fn ensure_vault_directories() -> Result<PathBuf, String> {
    let vault = resolve_vault_dir();
    let trash = vault.join(".trash");

    if !vault.exists() {
        fs::create_dir_all(&vault)
            .map_err(|e| format!("Failed to create vault directory: {}", e))?;
    }
    if !trash.exists() {
        fs::create_dir_all(&trash)
            .map_err(|e| format!("Failed to create trash directory: {}", e))?;
    }

    Ok(vault)
}

fn vault_marker_path(vault: &Path) -> PathBuf {
    vault.join(".amnote.json")
}

fn write_vault_marker(vault: &Path) -> Result<(), String> {
    let marker = serde_json::to_string_pretty(&VaultMarker { initialized: true })
        .map_err(|e| format!("Failed to serialize vault marker: {}", e))?;
    write_atomic(&vault_marker_path(vault), &marker)
}

fn collect_vault_revision(vault: &Path) -> Result<u64, String> {
    let mut files = Vec::new();
    let directories = [vault.to_path_buf(), vault.join(".trash")];

    for directory in directories {
        let entries = fs::read_dir(&directory)
            .map_err(|e| format!("Failed to read vault directory: {}", e))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() || path.extension().map_or(true, |ext| ext != "md") {
                continue;
            }

            let relative_path = path
                .strip_prefix(vault)
                .map_err(|e| format!("Failed to resolve vault file: {}", e))?
                .to_string_lossy()
                .to_string();
            let metadata = fs::metadata(&path)
                .map_err(|e| format!("Failed to read vault file metadata: {}", e))?;
            let modified = metadata
                .modified()
                .map_err(|e| format!("Failed to read vault file timestamp: {}", e))?
                .duration_since(UNIX_EPOCH)
                .map_err(|e| format!("Invalid vault file timestamp: {}", e))?;

            files.push((relative_path, modified.as_nanos() as u64, metadata.len()));
        }
    }

    files.sort();
    let mut hasher = DefaultHasher::new();
    files.hash(&mut hasher);
    Ok(hasher.finish())
}

#[tauri::command]
fn get_vault_path() -> Result<String, String> {
    let vault = ensure_vault_directories()?;
    Ok(vault.to_string_lossy().to_string())
}

#[tauri::command]
async fn pick_vault_folder() -> Result<Option<String>, String> {
    let current_vault = resolve_vault_dir();
    let mut dialog = rfd::AsyncFileDialog::new().set_title("Select AmNote Vault Folder");
    if current_vault.exists() {
        dialog = dialog.set_directory(&current_vault);
    }
    let folder = dialog.pick_folder().await;
    Ok(folder.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
fn set_vault_path(new_path: String) -> Result<String, String> {
    let trimmed = new_path.trim();
    if trimmed.is_empty() {
        return Err("Vault path cannot be empty".to_string());
    }

    let p = PathBuf::from(trimmed);
    if !p.exists() {
        fs::create_dir_all(&p).map_err(|e| format!("Failed to create folder: {}", e))?;
    }
    let trash = p.join(".trash");
    if !trash.exists() {
        let _ = fs::create_dir_all(&trash);
    }

    let mut config = read_app_config();
    config.custom_vault_path = Some(trimmed.to_string());
    save_app_config(&config)?;

    Ok(p.to_string_lossy().to_string())
}

#[tauri::command]
fn reset_vault_path() -> Result<String, String> {
    let mut config = read_app_config();
    config.custom_vault_path = None;
    save_app_config(&config)?;

    let default_vault = ensure_vault_directories()?;
    Ok(default_vault.to_string_lossy().to_string())
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
    if !notes.is_empty() && !vault_marker_path(&vault).exists() {
        write_vault_marker(&vault)?;
    }
    Ok(notes)
}

#[tauri::command]
fn is_vault_initialized() -> Result<bool, String> {
    let vault = ensure_vault_directories()?;
    let path = vault_marker_path(&vault);
    if !path.exists() {
        return Ok(false);
    }

    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read vault marker: {}", e))?;
    let marker: VaultMarker = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse vault marker: {}", e))?;
    Ok(marker.initialized)
}

#[tauri::command]
fn mark_vault_initialized() -> Result<(), String> {
    let vault = ensure_vault_directories()?;
    write_vault_marker(&vault)
}

#[tauri::command]
fn get_vault_revision() -> Result<String, String> {
    let vault = ensure_vault_directories()?;
    let revision = collect_vault_revision(&vault)?;
    Ok(revision.to_string())
}

#[tauri::command]
fn serialize_note(note: &NotePayload) -> Result<String, String> {
    let frontmatter = NoteFrontmatter {
        id: note.id.clone(),
        title: note.title.clone(),
        tags: note.tags.clone(),
        is_pinned: note.is_pinned,
        is_archived: note.is_archived,
        is_trashed: note.is_trashed,
        is_locked: note.is_locked,
        lock_hash: note.lock_hash.clone(),
        created_at: note.created_at,
        updated_at: note.updated_at,
        trashed_at: note.trashed_at,
    };

    let frontmatter_yaml = serde_yaml::to_string(&frontmatter)
        .map_err(|e| format!("Failed to serialize note metadata: {}", e))?;
    Ok(format!("---\n{}---\n\n{}", frontmatter_yaml, note.content))
}

fn ensure_note_unchanged(path: &Path, expected_content: &str) -> Result<(), String> {
    if !path.exists() {
        return Err("CONFLICT: Note was deleted in the vault.".to_string());
    }

    let disk_note = parse_markdown_file(path)
        .ok_or_else(|| "CONFLICT: Note on disk could not be parsed.".to_string())?;
    if disk_note.content != expected_content {
        return Err("CONFLICT: Note changed in the vault before this save.".to_string());
    }

    Ok(())
}

#[tauri::command]
fn save_note_to_vault(note: NotePayload, expected_content: Option<String>) -> Result<(), String> {
    let vault = ensure_vault_directories()?;
    write_note_to_vault(&vault, &note, expected_content.as_deref())
}

fn write_note_to_vault(
    vault: &Path,
    note: &NotePayload,
    expected_content: Option<&str>,
) -> Result<(), String> {
    validate_note_id(&note.id)?;
    let file_content = serialize_note(note)?;
    let active_path = note_file_path(&vault, &note.id, false)?;
    let trash_path = note_file_path(&vault, &note.id, true)?;
    let target_path = if note.is_trashed {
        &trash_path
    } else {
        &active_path
    };
    if let Some(expected_content) = expected_content {
        ensure_note_unchanged(target_path, expected_content)?;
    }

    if note.is_trashed {
        write_atomic(&trash_path, &file_content)?;
        if active_path.exists() {
            fs::remove_file(&active_path)
                .map_err(|e| format!("Failed to remove active note after trash: {}", e))?;
            sync_directory(&active_path)?;
        }
    } else {
        write_atomic(&active_path, &file_content)?;
        if trash_path.exists() {
            fs::remove_file(&trash_path)
                .map_err(|e| format!("Failed to remove stale trashed note: {}", e))?;
            sync_directory(&trash_path)?;
        }
    }

    Ok(())
}

#[tauri::command]
fn backup_note_version(note: NotePayload, label: String) -> Result<String, String> {
    let vault = ensure_vault_directories()?;
    backup_note_to_vault(&vault, &note, &label)
}

fn backup_note_to_vault(vault: &Path, note: &NotePayload, label: &str) -> Result<String, String> {
    validate_note_id(&note.id)?;
    if !label.is_empty()
        && label.len() <= 64
        && label
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-')
    {
        // Valid backup label.
    } else {
        return Err(format!("Invalid backup label: {label:?}"));
    }

    let backup_dir = vault.join(".backups");
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to create backup filename: {}", e))?
        .as_millis();
    let backup_path = backup_dir.join(format!("{}-{}-{}.md", timestamp, note.id, label));
    write_atomic(&backup_path, &serialize_note(&note)?)?;
    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_note_from_vault(id: String, permanent: bool) -> Result<(), String> {
    let vault = ensure_vault_directories()?;
    let active_path = note_file_path(&vault, &id, false)?;
    let trash_path = note_file_path(&vault, &id, true)?;

    if permanent {
        if active_path.exists() {
            fs::remove_file(&active_path)
                .map_err(|e| format!("Failed to delete active note: {}", e))?;
        }
        if trash_path.exists() {
            fs::remove_file(&trash_path)
                .map_err(|e| format!("Failed to delete trashed note: {}", e))?;
        }
        sync_directory(&active_path)?;
    } else if active_path.exists() {
        if trash_path.exists() {
            return Err(format!("A trashed note already exists for id {id:?}"));
        }
        fs::rename(&active_path, &trash_path)
            .map_err(|e| format!("Failed to move note to trash: {}", e))?;
        sync_directory(&active_path)?;
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
        .setup(|_app| {
            #[cfg(not(target_os = "macos"))]
            {
                if let Some(window) = _app.get_webview_window("main") {
                    let _ = window.set_decorations(false);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_omarchy_theme,
            get_vault_path,
            pick_vault_folder,
            set_vault_path,
            reset_vault_path,
            open_vault_in_file_manager,
            load_notes_from_vault,
            is_vault_initialized,
            mark_vault_initialized,
            get_vault_revision,
            backup_note_version,
            save_note_to_vault,
            delete_note_from_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AmNote desktop application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_note(id: &str, content: &str) -> NotePayload {
        NotePayload {
            id: id.to_string(),
            title: "Integration test".to_string(),
            content: content.to_string(),
            tags: vec!["test".to_string()],
            is_pinned: false,
            is_archived: false,
            is_trashed: false,
            is_locked: None,
            lock_hash: None,
            created_at: 1,
            updated_at: 2,
            trashed_at: None,
        }
    }

    fn temp_vault(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path =
            std::env::temp_dir().join(format!("amnote-{}-{}-{}", name, std::process::id(), unique));
        fs::create_dir_all(path.join(".trash")).unwrap();
        path
    }

    #[test]
    fn note_writes_are_checked_and_backed_up() {
        let vault = temp_vault("integration");
        let note = test_note("note-test", "original content");

        write_note_to_vault(&vault, &note, None).unwrap();
        let active_path = note_file_path(&vault, &note.id, false).unwrap();
        let disk_note = parse_markdown_file(&active_path).unwrap();
        assert_eq!(disk_note.content, "original content");

        let conflict = write_note_to_vault(&vault, &note, Some("different content"));
        assert!(conflict.unwrap_err().contains("CONFLICT"));

        let local_backup = backup_note_to_vault(&vault, &note, "local").unwrap();
        let disk_note_payload = test_note("note-test", "disk content");
        let disk_backup = backup_note_to_vault(&vault, &disk_note_payload, "disk").unwrap();
        assert!(local_backup.contains(".backups"));
        assert!(fs::metadata(local_backup).unwrap().len() > 0);
        assert!(fs::metadata(disk_backup).unwrap().len() > 0);

        fs::remove_dir_all(&vault).ok();
    }

    #[test]
    fn note_ids_cannot_escape_the_vault() {
        let vault = temp_vault("traversal");
        let result = note_file_path(&vault, "../../outside", false);
        assert!(result.is_err());
        assert!(!vault.parent().unwrap().join("outside.md").exists());
        fs::remove_dir_all(&vault).ok();
    }
}
