use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine as _;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::collections::BTreeMap;
use std::fs::{self, File};
use std::hash::{Hash, Hasher};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Emitter;
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
    #[serde(rename = "createdAt", alias = "created_at", default)]
    pub created_at: i64,
    #[serde(rename = "updatedAt", alias = "updated_at", default)]
    pub updated_at: i64,
    #[serde(rename = "trashedAt", alias = "trashed_at", skip_serializing_if = "Option::is_none")]
    pub trashed_at: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct AppConfig {
    #[serde(rename = "customVaultPath", default)]
    pub custom_vault_path: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq, Eq)]
pub struct TagMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(rename = "updatedAt", default)]
    pub updated_at: i64,
}

fn default_vault_version() -> u32 {
    1
}

fn default_vault_initialized() -> bool {
    true
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct VaultMetadata {
    #[serde(default = "default_vault_initialized")]
    pub initialized: bool,
    #[serde(default = "default_vault_version")]
    pub version: u32,
    #[serde(default)]
    pub tags: BTreeMap<String, TagMeta>,
}

impl Default for VaultMetadata {
    fn default() -> Self {
        Self {
            initialized: true,
            version: 1,
            tags: BTreeMap::new(),
        }
    }
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

fn resolve_note_file_path(vault: &Path, id: &str, trashed: bool) -> Result<PathBuf, String> {
    let standard = note_file_path(vault, id, trashed)?;
    if standard.exists() {
        return Ok(standard);
    }

    let directory = if trashed {
        vault.join(".trash")
    } else {
        vault.to_path_buf()
    };

    if let Ok(entries) = fs::read_dir(&directory) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("md") {
                if let Some(parsed) = parse_markdown_file(&path) {
                    if parsed.id == id {
                        return Ok(path);
                    }
                }
            }
        }
    }

    Ok(standard)
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

fn write_atomic<T: AsRef<[u8]>>(path: &Path, contents: T) -> Result<(), String> {
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
        file.write_all(contents.as_ref())
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

fn write_vault_metadata(vault: &Path, meta: &VaultMetadata) -> Result<(), String> {
    let json = serde_json::to_string_pretty(meta)
        .map_err(|e| format!("Failed to serialize vault metadata: {}", e))?;
    write_atomic(&vault_marker_path(vault), &json)
}

fn read_vault_metadata(vault: &Path) -> Result<VaultMetadata, String> {
    let path = vault_marker_path(vault);
    if !path.exists() {
        return Ok(VaultMetadata {
            initialized: false,
            version: 1,
            tags: BTreeMap::new(),
        });
    }

    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read vault metadata: {}", e))?;
    let meta: VaultMetadata = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse vault metadata: {}", e))?;
    Ok(meta)
}

fn write_vault_marker(vault: &Path) -> Result<(), String> {
    let mut meta = read_vault_metadata(vault).unwrap_or_default();
    meta.initialized = true;
    write_vault_metadata(vault, &meta)
}

fn reconcile_syncthing_conflicts(vault: &Path, current_meta: &mut VaultMetadata) {
    if let Ok(entries) = fs::read_dir(vault) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
            if file_name.contains("sync-conflict")
                && file_name.ends_with(".json")
                && file_name.contains("amnote")
            {
                if let Ok(conflict_content) = fs::read_to_string(&path) {
                    if let Ok(conflict_meta) = serde_json::from_str::<VaultMetadata>(&conflict_content) {
                        for (tag, meta) in conflict_meta.tags {
                            match current_meta.tags.get(&tag) {
                                Some(existing) => {
                                    if meta.updated_at > existing.updated_at {
                                        current_meta.tags.insert(tag, meta);
                                    }
                                }
                                None => {
                                    current_meta.tags.insert(tag, meta);
                                }
                            }
                        }
                    }
                }
                let _ = fs::remove_file(&path);
            }
        }
    }
}

fn collect_vault_revision(vault: &Path) -> Result<u64, String> {
    let mut files = Vec::new();
    let directories = [vault.to_path_buf(), vault.join(".trash")];

    for directory in directories {
        if !directory.exists() {
            continue;
        }
        let entries = match fs::read_dir(&directory) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
            if file_name.starts_with('.') || !path.is_file() || path.extension().map_or(true, |ext| ext != "md") {
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

    let marker_path = vault_marker_path(vault);
    if marker_path.is_file() {
        if let Ok(metadata) = fs::metadata(&marker_path) {
            if let Ok(modified) = metadata
                .modified()
                .and_then(|t| t.duration_since(UNIX_EPOCH).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)))
            {
                files.push((".amnote.json".to_string(), modified.as_nanos() as u64, metadata.len()));
            }
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

fn is_conflict_filename(stem: &str) -> bool {
    let lower = stem.to_lowercase();
    lower.contains("conflicted copy") || lower.contains("sync-conflict")
}

fn parse_markdown_file(path: &Path) -> Option<NotePayload> {
    let file_stem = path.file_stem()?.to_string_lossy().to_string();
    let is_conflict = is_conflict_filename(&file_stem);

    let raw = fs::read_to_string(path).ok()?;
    let trimmed = raw.trim_start();

    if trimmed.starts_with("---") {
        if let Some(end_idx) = trimmed[3..].find("\n---") {
            let frontmatter_str = &trimmed[3..3 + end_idx];
            let body_str = &trimmed[3 + end_idx + 4..];

            if let Ok(meta) = serde_yaml::from_str::<NoteFrontmatter>(frontmatter_str) {
                let note_id = if is_conflict {
                    let suffix: String = file_stem
                        .chars()
                        .filter(|c| c.is_alphanumeric() || *c == '-')
                        .take(60)
                        .collect();
                    format!("{}-conflict-{}", meta.id, suffix)
                } else {
                    meta.id
                };
                let note_title = if is_conflict && !meta.title.contains("(Conflicted Copy)") {
                    format!("{} (Conflicted Copy)", meta.title)
                } else {
                    meta.title
                };

                return Some(NotePayload {
                    id: note_id,
                    title: note_title,
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
            let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
            if !name.starts_with('.') && path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
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
            let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
            if !name.starts_with('.') && path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
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
    let meta = read_vault_metadata(&vault)?;
    Ok(meta.initialized)
}

#[tauri::command]
fn mark_vault_initialized() -> Result<(), String> {
    let vault = ensure_vault_directories()?;
    write_vault_marker(&vault)
}

#[tauri::command]
fn load_tag_metadata() -> Result<VaultMetadata, String> {
    let vault = ensure_vault_directories()?;
    let mut meta = read_vault_metadata(&vault)?;
    let tags_before = meta.tags.clone();
    reconcile_syncthing_conflicts(&vault, &mut meta);
    if meta.tags != tags_before {
        let _ = write_vault_metadata(&vault, &meta);
    }
    Ok(meta)
}

#[tauri::command]
fn save_tag_metadata(tags: BTreeMap<String, TagMeta>) -> Result<VaultMetadata, String> {
    let vault = ensure_vault_directories()?;
    let mut current = read_vault_metadata(&vault)?;
    current.initialized = true;

    for (tag, new_meta) in tags {
        match current.tags.get(&tag) {
            Some(existing) => {
                if new_meta.updated_at >= existing.updated_at {
                    current.tags.insert(tag, new_meta);
                }
            }
            None => {
                current.tags.insert(tag, new_meta);
            }
        }
    }

    reconcile_syncthing_conflicts(&vault, &mut current);
    write_vault_metadata(&vault, &current)?;
    Ok(current)
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

fn normalize_content(s: &str) -> String {
    s.replace("\r\n", "\n").trim_end().to_string()
}

fn ensure_note_unchanged(path: &Path, expected_content: &str) -> Result<(), String> {
    if !path.exists() {
        return Err("CONFLICT: Note was deleted in the vault.".to_string());
    }

    let disk_note = parse_markdown_file(path)
        .ok_or_else(|| "CONFLICT: Note on disk could not be parsed.".to_string())?;
    if normalize_content(&disk_note.content) != normalize_content(expected_content) {
        return Err("CONFLICT: Note changed in the vault before this save.".to_string());
    }

    Ok(())
}

#[tauri::command]
fn save_note_to_vault(note: NotePayload, expected_content: Option<String>) -> Result<String, String> {
    let vault = ensure_vault_directories()?;
    write_note_to_vault(&vault, &note, expected_content.as_deref())?;
    cleanup_unused_attachments(&note)?;
    let revision = collect_vault_revision(&vault)?;
    Ok(revision.to_string())
}

fn write_note_to_vault(
    vault: &Path,
    note: &NotePayload,
    expected_content: Option<&str>,
) -> Result<(), String> {
    validate_note_id(&note.id)?;
    let file_content = serialize_note(note)?;
    let active_path = resolve_note_file_path(vault, &note.id, false)?;
    let trash_path = resolve_note_file_path(vault, &note.id, true)?;

    let existing_path = if active_path.exists() {
        Some(&active_path)
    } else if trash_path.exists() {
        Some(&trash_path)
    } else {
        None
    };

    if let Some(expected_content) = expected_content {
        match existing_path {
            Some(path) => {
                ensure_note_unchanged(path, expected_content)?;
            }
            None => {
                return Err("CONFLICT: Note was deleted in the vault.".to_string());
            }
        }
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
fn delete_note_from_vault(id: String, permanent: bool) -> Result<String, String> {
    let vault = ensure_vault_directories()?;
    let active_path = resolve_note_file_path(&vault, &id, false)?;
    let trash_path = resolve_note_file_path(&vault, &id, true)?;

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
        let target_trash_path = if trash_path.exists() {
            trash_path
        } else {
            let file_name = active_path
                .file_name()
                .map(PathBuf::from)
                .unwrap_or_else(|| PathBuf::from(format!("{id}.md")));
            vault.join(".trash").join(file_name)
        };

        if target_trash_path.exists() {
            let _ = fs::remove_file(&target_trash_path);
        }
        fs::rename(&active_path, &target_trash_path)
            .map_err(|e| format!("Failed to move note to trash: {}", e))?;
        sync_directory(&active_path)?;
    }

    let revision = collect_vault_revision(&vault)?;
    Ok(revision.to_string())
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

fn spawn_vault_watcher(app: tauri::AppHandle) {
    thread::spawn(move || {
        let vault = match ensure_vault_directories() {
            Ok(path) => path,
            Err(error) => {
                eprintln!("Unable to watch vault: {error}");
                return;
            }
        };

        let (event_sender, event_receiver) = mpsc::channel::<Instant>();
        let watcher_result =
            notify::recommended_watcher(move |result: Result<notify::Event, notify::Error>| {
                if result.is_ok() {
                    let _ = event_sender.send(Instant::now());
                }
            });

        let mut watcher: RecommendedWatcher = match watcher_result {
            Ok(watcher) => watcher,
            Err(error) => {
                eprintln!("Native vault watcher unavailable: {error}");
                return;
            }
        };

        if let Err(error) = watcher.watch(&vault, RecursiveMode::Recursive) {
            eprintln!("Unable to watch vault path: {error}");
            return;
        }

        loop {
            if event_receiver.recv().is_err() {
                return;
            }

            // Editors and sync tools often emit many events for one save.
            let debounce_deadline = Instant::now() + Duration::from_millis(250);
            while Instant::now() < debounce_deadline {
                if event_receiver
                    .recv_timeout(debounce_deadline.saturating_duration_since(Instant::now()))
                    .is_err()
                {
                    break;
                }
            }

            if let Err(error) = app.emit("vault-changed", ()) {
                eprintln!("Unable to notify frontend about vault change: {error}");
            }
        }
    });
}

const MAX_ATTACHMENT_BYTES: usize = 20 * 1024 * 1024;

fn sanitize_attachment_name(raw_name: &str) -> Result<String, String> {
    let file_name = Path::new(raw_name)
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_default();
    let extension = Path::new(&file_name)
        .extension()
        .map(|ext| ext.to_ascii_lowercase().to_string_lossy().to_string())
        .unwrap_or_default();

    if !matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif") {
        return Err("Only PNG, JPEG, WebP, or GIF images are supported.".to_string());
    }

    let stem = Path::new(&file_name)
        .file_stem()
        .map(|stem| stem.to_string_lossy().to_string())
        .unwrap_or_default();
    let safe_stem: String = stem
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.' {
                ch
            } else {
                '-'
            }
        })
        .take(100)
        .collect();
    let safe_stem = safe_stem.trim_matches('-').trim_matches('.');

    if safe_stem.is_empty() {
        return Err("Invalid image filename.".to_string());
    }

    Ok(format!("{}.{}", safe_stem, extension))
}

fn decode_image_data_url(data_url: &str) -> Result<(String, Vec<u8>), String> {
    let value = data_url
        .strip_prefix("data:")
        .ok_or_else(|| "Invalid image data URL.".to_string())?;
    let (mime, encoded) = value
        .split_once(";base64,")
        .ok_or_else(|| "Invalid image data URL.".to_string())?;
    let extension = match mime {
        "image/png" => "png",
        "image/jpeg" => "jpeg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => return Err("Unsupported image format.".to_string()),
    };

    let bytes = BASE64_STANDARD
        .decode(encoded.trim())
        .map_err(|e| format!("Invalid image data: {}", e))?;
    if bytes.len() > MAX_ATTACHMENT_BYTES {
        return Err("Images must be 20 MB or smaller.".to_string());
    }

    Ok((extension.to_string(), bytes))
}

#[tauri::command]
fn save_attachment(note_id: String, file_name: String, data_url: String) -> Result<String, String> {
    if !is_safe_note_id(&note_id)
        || !note_id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        return Err("Invalid note id for attachment storage.".to_string());
    }

    let vault = ensure_vault_directories()?;
    let (decoded_extension, bytes) = decode_image_data_url(&data_url)?;
    let safe_name = sanitize_attachment_name(&file_name)?;
    let stem = Path::new(&safe_name)
        .file_stem()
        .map(|stem| stem.to_string_lossy().to_string())
        .unwrap_or_else(|| "image".to_string());
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to create attachment filename: {}", e))?
        .as_millis();
    let attachment_name = format!("{}-{}.{}", stem, timestamp, decoded_extension);
    let attachment_dir = vault.join(".assets").join(&note_id);
    let attachment_path = attachment_dir.join(&attachment_name);

    write_atomic(&attachment_path, bytes)
        .map_err(|e| format!("Failed to save attachment: {}", e))?;
    Ok(format!("amnote-asset://localhost/{}/{}", note_id, attachment_name))
}

fn cleanup_unused_attachments(note: &NotePayload) -> Result<(), String> {
    if note.is_trashed {
        return Ok(());
    }

    let vault = ensure_vault_directories()?;
    let attachment_dir = vault.join(".assets").join(&note.id);
    if !attachment_dir.exists() {
        return Ok(());
    }

    for entry in fs::read_dir(&attachment_dir)
        .map_err(|e| format!("Failed to read attachment directory: {}", e))?
        .flatten()
    {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if !note
            .content
            .contains(&format!("amnote-asset://{}/{}", note.id, name))
        {
            fs::remove_file(&path)
                .map_err(|e| format!("Failed to remove unused attachment: {}", e))?;
        }
    }

    Ok(())
}

fn parse_attachment_request(
    uri: &tauri::http::Uri,
) -> Result<(String, String), &'static str> {
    // Current attachment URLs contain the note and filename in the path:
    // amnote-asset://localhost/{note-id}/{file}.
    let path = uri.path().trim_start_matches('/');
    if let Some((note_id, file_name)) = path.split_once('/') {
        return Ok((note_id.to_string(), file_name.to_string()));
    }

    // Earlier releases put the note ID in the URI authority:
    // amnote-asset://{note-id}/{file}. Continue serving those URLs.
    let note_id = uri.host().ok_or("Invalid attachment URL.")?;
    let file_name = path;
    Ok((note_id.to_string(), file_name.to_string()))
}

fn attachment_protocol_response(
    request: tauri::http::Request<Vec<u8>>,
) -> tauri::http::Response<Vec<u8>> {
    let invalid = |message: &'static str| {
        tauri::http::Response::builder()
            .status(tauri::http::StatusCode::BAD_REQUEST)
            .header(tauri::http::header::CONTENT_TYPE, "text/plain")
            .header("Access-Control-Allow-Origin", "*")
            .body(message.as_bytes().to_vec())
            .unwrap()
    };

    let (note_id, file_name) = match parse_attachment_request(request.uri()) {
        Ok(value) => value,
        Err(message) => return invalid(message),
    };

    if !is_safe_note_id(&note_id)
        || !note_id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        return invalid("Invalid attachment note id.");
    }
    let safe_name = match sanitize_attachment_name(&file_name) {
        Ok(name) => name,
        Err(_) => return invalid("Invalid attachment filename."),
    };

    let vault = match ensure_vault_directories() {
        Ok(path) => path,
        Err(_) => return invalid("Vault unavailable."),
    };
    let path = vault.join(".assets").join(note_id).join(&safe_name);
    match fs::read(path) {
        Ok(bytes) => {
            let content_type = match safe_name
                .rsplit_once('.')
                .map(|(_, ext)| ext.to_ascii_lowercase())
            {
                Some(ext) if ext == "png" => "image/png",
                Some(ext) if ext == "jpg" || ext == "jpeg" => "image/jpeg",
                Some(ext) if ext == "webp" => "image/webp",
                Some(ext) if ext == "gif" => "image/gif",
                _ => "application/octet-stream",
            };
            tauri::http::Response::builder()
                .header(tauri::http::header::CONTENT_TYPE, content_type)
                .header("Cache-Control", "private, max-age=31536000, immutable")
                .header("Access-Control-Allow-Origin", "*")
                .body(bytes)
                .unwrap()
        }
        Err(_) => invalid("Attachment not found."),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .register_uri_scheme_protocol("amnote-asset", |_context, request| {
            attachment_protocol_response(request)
        })
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            #[cfg(not(target_os = "macos"))]
            {
                if let Some(window) = _app.get_webview_window("main") {
                    let _ = window.set_decorations(false);
                }
            }
            spawn_vault_watcher(_app.handle().clone());
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
            save_attachment,
            save_note_to_vault,
            delete_note_from_vault,
            load_tag_metadata,
            save_tag_metadata,
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

    #[test]
    fn attachments_are_sanitized_and_validated() {
        assert_eq!(
            sanitize_attachment_name("../../secret path/My Image.png").unwrap(),
            "My-Image.png"
        );
        assert!(sanitize_attachment_name("malicious.svg").is_err());
        assert!(decode_image_data_url("data:text/html;base64,PGI+").is_err());

        let png = decode_image_data_url("data:image/png;base64,iVBORw0KGgo=").unwrap();
        assert_eq!(png.0, "png");
        assert!(!png.1.is_empty());
    }

    #[test]
    fn attachment_urls_include_the_note_in_the_request_path() {
        let current = tauri::http::Uri::from_static(
            "amnote-asset://localhost/note-test/image-png.png",
        );
        assert_eq!(
            parse_attachment_request(&current).unwrap(),
            ("note-test".to_string(), "image-png.png".to_string())
        );

        let legacy = tauri::http::Uri::from_static("amnote-asset://note-test/image-png.png");
        assert_eq!(
            parse_attachment_request(&legacy).unwrap(),
            ("note-test".to_string(), "image-png.png".to_string())
        );
    }

    #[test]
    fn tag_metadata_persists_and_updates_revision() {
        let vault = temp_vault("tag-metadata");
        let initial_rev = collect_vault_revision(&vault).unwrap();

        let mut meta = read_vault_metadata(&vault).unwrap();
        assert!(!meta.initialized);

        meta.initialized = true;
        meta.tags.insert(
            "work".to_string(),
            TagMeta {
                icon: Some("Briefcase".to_string()),
                color: Some("#3b82f6".to_string()),
                updated_at: 1000,
            },
        );
        write_vault_metadata(&vault, &meta).unwrap();

        let updated_rev = collect_vault_revision(&vault).unwrap();
        assert_ne!(initial_rev, updated_rev, "Revision must change when .amnote.json is written");

        let loaded = read_vault_metadata(&vault).unwrap();
        assert!(loaded.initialized);
        assert_eq!(loaded.tags.get("work").unwrap().icon.as_deref(), Some("Briefcase"));

        fs::remove_dir_all(&vault).ok();
    }

    #[test]
    fn tag_metadata_heals_syncthing_conflicts() {
        let vault = temp_vault("syncthing-heal");
        let mut main_meta = VaultMetadata::default();
        main_meta.tags.insert(
            "work".to_string(),
            TagMeta {
                icon: Some("Briefcase".to_string()),
                color: None,
                updated_at: 100,
            },
        );
        write_vault_metadata(&vault, &main_meta).unwrap();

        let mut conflict_meta = VaultMetadata::default();
        conflict_meta.tags.insert(
            "work".to_string(),
            TagMeta {
                icon: Some("Rocket".to_string()),
                color: Some("#ff0000".to_string()),
                updated_at: 200,
            },
        );
        conflict_meta.tags.insert(
            "ideas".to_string(),
            TagMeta {
                icon: Some("Lightbulb".to_string()),
                color: None,
                updated_at: 150,
            },
        );

        let conflict_path = vault.join(".amnote.sync-conflict-20260904-123456-XYZ.json");
        fs::write(&conflict_path, serde_json::to_string(&conflict_meta).unwrap()).unwrap();
        assert!(conflict_path.exists());

        reconcile_syncthing_conflicts(&vault, &mut main_meta);

        assert_eq!(main_meta.tags.get("work").unwrap().icon.as_deref(), Some("Rocket"));
        assert_eq!(main_meta.tags.get("ideas").unwrap().icon.as_deref(), Some("Lightbulb"));
        assert!(!conflict_path.exists());

        fs::remove_dir_all(&vault).ok();
    }

    #[test]
    fn note_trashing_and_restoring_with_expected_content() {
        let vault = temp_vault("trash-restore");
        let note = test_note("note-trash-test", "active note body");

        // 1. Initial save to active
        write_note_to_vault(&vault, &note, None).unwrap();
        let active_path = note_file_path(&vault, &note.id, false).unwrap();
        let trash_path = note_file_path(&vault, &note.id, true).unwrap();
        assert!(active_path.exists());
        assert!(!trash_path.exists());

        // 2. Move to trash with expected_content matching active note
        let mut trashed_note = note.clone();
        trashed_note.is_trashed = true;
        trashed_note.trashed_at = Some(123456);
        write_note_to_vault(&vault, &trashed_note, Some("active note body")).unwrap();
        assert!(!active_path.exists());
        assert!(trash_path.exists());

        // 3. Restore from trash with expected_content matching trashed note
        let mut restored_note = note.clone();
        restored_note.is_trashed = false;
        restored_note.trashed_at = None;
        write_note_to_vault(&vault, &restored_note, Some("active note body")).unwrap();
        assert!(active_path.exists());
        assert!(!trash_path.exists());

        fs::remove_dir_all(&vault).ok();
    }

    #[test]
    fn content_normalization_crlf_vs_lf() {
        let vault = temp_vault("crlf-norm");
        let note = test_note("crlf-test", "line one\r\nline two\r\n");

        write_note_to_vault(&vault, &note, None).unwrap();

        // Expected content with Unix newlines should match CRLF content on disk
        let mut updated = note.clone();
        updated.content = "line one\nline two\nline three".to_string();
        write_note_to_vault(&vault, &updated, Some("line one\nline two")).unwrap();

        let active_path = note_file_path(&vault, &note.id, false).unwrap();
        let disk = parse_markdown_file(&active_path).unwrap();
        assert_eq!(disk.content, "line one\nline two\nline three");

        fs::remove_dir_all(&vault).ok();
    }

    #[test]
    fn dropbox_conflicted_copy_parsing() {
        let vault = temp_vault("dropbox-conflict");
        let conflict_file = vault.join("Project Plan (Ade's conflicted copy 2026-09-05).md");
        let content = "---\nid: note-proj-123\ntitle: Project Plan\ncreated_at: 100\nupdated_at: 200\n---\n\nDropbox conflicting changes here";
        fs::write(&conflict_file, content).unwrap();

        let parsed = parse_markdown_file(&conflict_file).unwrap();
        assert_ne!(parsed.id, "note-proj-123", "Conflicted copy gets a distinct non-colliding ID");
        assert!(parsed.id.contains("conflict"));
        assert!(parsed.title.contains("(Conflicted Copy)"));
        assert_eq!(parsed.content, "Dropbox conflicting changes here");

        // resolve_note_file_path should find the actual file on disk despite synthesized ID
        let resolved = resolve_note_file_path(&vault, &parsed.id, false).unwrap();
        assert_eq!(resolved, conflict_file);
        assert!(resolved.exists());

        fs::remove_dir_all(&vault).ok();
    }
}
