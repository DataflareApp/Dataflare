use ring::aead::{
    AES_256_GCM, Aad, BoundKey, NONCE_LEN, Nonce, NonceSequence, OpeningKey, SealingKey, UnboundKey,
};
use ring::error::Unspecified;
use serde::de;
use serde::ser::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("Encrypt failed")]
    Encrypt,
    #[error("Decrypt failed")]
    Decrypt,
    #[error("Invalid encrypted data")]
    EncryptedData,
    #[error("JSON: {0}")]
    Json(#[from] serde_json::Error),
}

fn rand_nonce() -> RandNonce {
    let mut buf = [0; NONCE_LEN];
    rand::fill(&mut buf);
    RandNonce(buf)
}

#[derive(Debug, Clone, Copy)]
struct RandNonce([u8; NONCE_LEN]);

impl RandNonce {
    fn new(nonce: [u8; NONCE_LEN]) -> Self {
        Self(nonce)
    }
}

impl NonceSequence for RandNonce {
    fn advance(&mut self) -> Result<Nonce, Unspecified> {
        Ok(Nonce::assume_unique_for_key(self.0))
    }
}

// NOTE: This key should be randomly generated and stored in the operating system's keychain,
// But due to historical reasons, we will keep it this way for now.
// In future versions, we can migrate the user database to SQLCipher.
fn key() -> UnboundKey {
    const KEY: [u8; 32] = *b"w*Ns-vqv4_gZ7j6RRxW63Dmgd69icXva";
    UnboundKey::new(&AES_256_GCM, &KEY).unwrap()
}

pub fn encrypt<T>(value: &T) -> Result<Vec<u8>, CryptoError>
where
    T: ?Sized + Serialize,
{
    let mut buf = serde_json::to_vec(&value)?;
    let nonce = rand_nonce();
    let mut sealing = SealingKey::new(key(), nonce);
    sealing
        .seal_in_place_append_tag(Aad::empty(), &mut buf)
        .map_err(|_| CryptoError::Encrypt)?;
    buf.extend_from_slice(&nonce.0);
    Ok(buf)
}

pub fn decrypt<'a, T>(buf: &'a mut [u8]) -> Result<T, CryptoError>
where
    T: de::Deserialize<'a>,
{
    let len = buf.len();
    if len < NONCE_LEN + 16 {
        return Err(CryptoError::EncryptedData);
    }
    let nonce = buf[len - NONCE_LEN..].try_into().unwrap();
    let encryped = &mut buf[..len - NONCE_LEN];
    let mut opening = OpeningKey::new(key(), RandNonce::new(nonce));
    let buf = opening
        .open_in_place(Aad::empty(), encryped)
        .map_err(|_| CryptoError::Decrypt)?;
    let value = serde_json::from_slice(buf)?;
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[test]
    fn test_crypto() {
        let mut encrypted = encrypt(&1).unwrap();
        assert_eq!(decrypt::<i32>(&mut encrypted).unwrap(), 1);

        #[derive(Debug, Serialize, Deserialize, Default, PartialEq, Eq)]
        struct Test {
            a: usize,
            b: String,
            c: Option<bool>,
            d: bool,
        }
        let data = Test::default();
        let mut encrypted = encrypt(&data).unwrap();
        assert_eq!(decrypt::<Test>(&mut encrypted).unwrap(), data);
    }
}
