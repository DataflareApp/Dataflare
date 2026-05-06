use fbon::{SerError, to_bytes};
use serde::Serialize;
use tauri::ipc::Response;

pub fn to_response<T: Serialize + ?Sized>(data: &T) -> Result<Response, SerError> {
    let data = to_bytes(data)?;
    Ok(Response::new(data))
}
