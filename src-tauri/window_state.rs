use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{BufWriter, Cursor, Error as IoError, ErrorKind as IoErrorKind, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Manager, Runtime, WebviewWindow, WebviewWindowBuilder, Window};

type Result<T, E = IoError> = std::result::Result<T, E>;

#[derive(Debug)]
pub struct WindowStateManager {
    path: Arc<PathBuf>,
    map: Arc<Mutex<HashMap<String, WindowState>>>,
    ignore: Arc<Mutex<HashSet<String>>>,
}

#[derive(Debug, Clone, Copy)]
pub struct WindowState {
    width: u32,
    height: u32,
    x: i32,
    y: i32,
}

impl WindowState {
    fn read<R: Read>(reader: &mut R) -> Result<Self> {
        let mut buf = [0; 4];

        reader.read_exact(&mut buf)?;
        let mut width = u32::from_ne_bytes(buf);
        reader.read_exact(&mut buf)?;
        let mut height = u32::from_ne_bytes(buf);
        reader.read_exact(&mut buf)?;
        let x = i32::from_ne_bytes(buf);
        reader.read_exact(&mut buf)?;
        let y = i32::from_ne_bytes(buf);

        if width == 0 {
            width = 10;
        }
        if height == 0 {
            height = 10;
        }

        Ok(Self {
            width,
            height,
            x,
            y,
        })
    }

    fn write<W: Write>(mut self, writer: &mut W) -> Result<()> {
        if self.width == 0 {
            self.width = 10;
        }
        if self.height == 0 {
            self.height = 10;
        }
        writer.write_all(&self.width.to_ne_bytes())?;
        writer.write_all(&self.height.to_ne_bytes())?;
        writer.write_all(&self.x.to_ne_bytes())?;
        writer.write_all(&self.y.to_ne_bytes())?;
        writer.flush()?;
        Ok(())
    }

    fn try_from_window(window: &Window) -> tauri::Result<Self> {
        let scale = window.scale_factor()?;
        let size = window.inner_size()?.to_logical(scale);
        let position = window.outer_position()?.to_logical(scale);
        Ok(Self {
            width: size.width,
            height: size.height,
            x: position.x,
            y: position.y,
        })
    }

    fn try_from_webview_window(window: &WebviewWindow) -> tauri::Result<Self> {
        let scale = window.scale_factor()?;
        let size = window.inner_size()?.to_logical(scale);
        let position = window.outer_position()?.to_logical(scale);
        Ok(Self {
            width: size.width,
            height: size.height,
            x: position.x,
            y: position.y,
        })
    }

    pub fn restore<'a, R: Runtime, M: Manager<R>>(
        &self,
        window: WebviewWindowBuilder<'a, R, M>,
    ) -> WebviewWindowBuilder<'a, R, M> {
        window
            .inner_size(self.width as f64, self.height as f64)
            .position(self.x as f64, self.y as f64)
    }
}

fn read_label<R: Read>(reader: &mut R) -> Result<Option<String>> {
    let mut buf = [0; 2];
    match reader.read_exact(&mut buf) {
        Ok(_) => {}
        Err(e) if e.kind() == IoErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e),
    }
    let mut buf = vec![0u8; u16::from_ne_bytes(buf) as usize];
    reader.read_exact(&mut buf)?;
    let label = String::from_utf8(buf)
        .map_err(|_| IoError::new(IoErrorKind::InvalidData, "Invalid UTF-8 sequence"))?;
    Ok(Some(label))
}

fn write_label<W: Write>(writer: &mut W, label: &str) -> Result<()> {
    let len = label.len() as u16;
    writer.write_all(&len.to_ne_bytes())?;
    writer.write_all(label.as_bytes())?;
    writer.flush()?;
    Ok(())
}

impl WindowStateManager {
    pub fn new(dir: &Path) -> Self {
        let path = dir.join(dir::WINDOW_STATE_FILE);
        let map = Self::read_from_path(&path).unwrap_or_else(|_| HashMap::new());

        #[cfg(debug_assertions)]
        println!("WindowStateManager: {:#?}", map);

        Self {
            path: Arc::new(path),
            map: Arc::new(Mutex::new(map)),
            ignore: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    fn read_from_path(path: impl AsRef<Path>) -> Result<HashMap<String, WindowState>, ()> {
        let mut reader = match fs::read(path) {
            Ok(buf) => Cursor::new(buf),
            Err(_) => return Err(()),
        };
        let mut map = HashMap::new();
        loop {
            let label = match read_label(&mut reader) {
                Ok(Some(label)) => label,
                Ok(None) => break,
                Err(_) => return Err(()),
            };
            let state = match WindowState::read(&mut reader) {
                Ok(state) => state,
                Err(_) => return Err(()),
            };
            map.insert(label, state);
        }
        Ok(map)
    }

    pub fn get(&self, label: &str) -> Option<WindowState> {
        self.map.lock().ok().and_then(|map| map.get(label).copied())
    }

    // This is a small hack because window state is auto-saved on close
    // But when deleting a connection, the window is also closed
    // In that case, we don't want to save the just-deleted state since it will never be used again
    fn set_ignore(&self, label: &str) {
        if let Ok(mut set) = self.ignore.lock() {
            set.insert(label.into());
        }
    }

    fn ignored(&self, window: &Window) -> bool {
        if let Ok(set) = self.ignore.lock() {
            return set.contains(window.label());
        }
        true
    }

    pub fn remove(&self, label: &str) {
        self.set_ignore(label);
        let mut map = match self.map.lock() {
            Ok(map) => map,
            Err(_) => return,
        };
        let sync = map.remove(label);
        drop(map);
        if sync.is_some() {
            self.sync();
        }
    }

    pub fn save(&self, window: &Window) {
        if self.ignored(window) {
            return;
        }
        let state = match WindowState::try_from_window(window) {
            Ok(state) => state,
            Err(_) => return,
        };
        {
            let mut map = match self.map.lock() {
                Ok(map) => map,
                Err(_) => return,
            };
            map.insert(window.label().into(), state);
        }
        self.sync();
    }

    pub fn save_all(&self, app: &AppHandle) {
        {
            let mut map = match self.map.lock() {
                Ok(map) => map,
                Err(_) => return,
            };
            let windows = app.webview_windows();
            if windows.is_empty() {
                return;
            }
            for (_, window) in windows {
                let label = window.label();
                let state = match WindowState::try_from_webview_window(&window) {
                    Ok(state) => state,
                    Err(_) => return,
                };
                map.insert(label.into(), state);
            }
        }
        self.sync();
    }

    fn sync(&self) {
        let sync = || -> Result<()> {
            if let Ok(map) = self.map.lock() {
                let f = fs::OpenOptions::new()
                    .write(true)
                    .create(true)
                    .truncate(true)
                    .open(self.path.as_ref())?;
                let mut f = BufWriter::new(f);
                for (label, state) in &*map {
                    write_label(&mut f, label)?;
                    state.write(&mut f)?;
                }
                f.flush()?;
            }
            Ok(())
        };
        if let Err(e) = sync() {
            eprintln!("WindowStateManager: sync error: {:?}", e);
        }
    }
}
