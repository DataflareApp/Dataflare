use crate::{Config, Result, socket::Socket};
use bytes::{BufMut, BytesMut};
use md5::{Digest, Md5};
use pgwire::messages::{PgWireFrontendMessage, startup::PasswordMessageFamily};
use std::fmt::Write;

pub(crate) async fn authenticate(
    socket: &mut Socket,
    config: &Config,
    salt: Vec<u8>,
) -> Result<()> {
    let mut hasher = Md5::new();
    hasher.update(config.password.as_deref().unwrap_or_default());
    hasher.update(&config.username);
    let mut output = String::with_capacity(35);
    let _ = write!(output, "{:x}", hasher.finalize_reset());
    hasher.update(&output);
    hasher.update(salt);
    output.clear();
    let _ = write!(output, "md5{:x}", hasher.finalize());

    let mut buf = BytesMut::with_capacity(36);
    buf.put_slice(output.as_bytes());
    buf.put_u8(b'\0');

    socket
        .send_message(PgWireFrontendMessage::PasswordMessageFamily(
            PasswordMessageFamily::Raw(buf),
        ))
        .await?;

    Ok(())
}
