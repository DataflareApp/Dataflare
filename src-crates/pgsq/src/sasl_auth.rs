use crate::{Config, Error, socket::Socket};
use base64::prelude::{BASE64_STANDARD, Engine as _};
use bytes::Bytes;
use hmac::{Hmac, Mac};
use pgwire::messages::startup::{
    Authentication, PasswordMessageFamily, SASLInitialResponse, SASLResponse,
};
use pgwire::messages::{PgWireBackendMessage, PgWireFrontendMessage};
use rand::{Rng, rng};
use sha2::{Digest, Sha256};
use stringprep::saslprep;

const GS2_HEADER: &str = "n,,";
const CHANNEL_ATTR: &str = "c";
const USERNAME_ATTR: &str = "n";
const CLIENT_PROOF_ATTR: &str = "p";
const NONCE_ATTR: &str = "r";

pub(crate) async fn authenticate(
    socket: &mut Socket,
    config: &Config,
    methods: Vec<String>,
) -> Result<(), Error> {
    let mut can_auth = false;
    let mut unknown_methods = Vec::new();
    for method in methods {
        match method.as_str() {
            "SCRAM-SHA-256" | "SCRAM-SHA-256-PLUS" => {
                can_auth = true;
                continue;
            }
            _ => {
                unknown_methods.push(method);
            }
        }
    }
    if !can_auth {
        return Err(Error::Protocol(format!(
            "unsupported SASL authentication mechanisms '{}'",
            unknown_methods.join(", ")
        )));
    }

    let mut channel_binding = format!("{CHANNEL_ATTR}=");
    BASE64_STANDARD.encode_string(GS2_HEADER, &mut channel_binding);

    let username = format!("{}={}", USERNAME_ATTR, config.username);
    let username = saslprep(&username)?;

    let nonce = gen_nonce();

    let client_first_message_bare = format!("{username},{nonce}");
    let client_first_message = format!("{GS2_HEADER}{client_first_message_bare}");

    socket
        .send_message(PgWireFrontendMessage::PasswordMessageFamily(
            PasswordMessageFamily::SASLInitialResponse(SASLInitialResponse::new(
                "SCRAM-SHA-256".into(), // TODO
                Some(client_first_message.into()),
            )),
        ))
        .await?;

    let cont = match socket.read_message().await? {
        PgWireBackendMessage::Authentication(Authentication::SASLContinue(data)) => {
            AuthenticationSaslContinue::try_from(data)?
        }
        msg => return Err(Error::protocol("SASLContinue", msg)),
    };

    let salted_password = hi(
        config.password.as_deref().unwrap_or_default(),
        &cont.salt,
        cont.iterations,
    )?;
    let mut mac = Hmac::<Sha256>::new_from_slice(&salted_password)?;
    mac.update(b"Client Key");
    let client_key = mac.finalize().into_bytes();
    let stored_key = Sha256::digest(client_key);
    let client_final_message_wo_proof = format!(
        "{channel_binding},r={nonce}",
        channel_binding = channel_binding,
        nonce = &cont.nonce
    );
    let auth_message = format!(
        "{client_first_message_bare},{server_first_message},{client_final_message_wo_proof}",
        client_first_message_bare = client_first_message_bare,
        server_first_message = cont.message,
        client_final_message_wo_proof = client_final_message_wo_proof
    );
    let mut mac = Hmac::<Sha256>::new_from_slice(&stored_key)?;
    mac.update(auth_message.as_bytes());
    let client_signature = mac.finalize().into_bytes();
    let client_proof: Vec<u8> = client_key
        .iter()
        .zip(client_signature.iter())
        .map(|(&a, &b)| a ^ b)
        .collect();

    let mut mac = Hmac::<Sha256>::new_from_slice(&salted_password)?;
    mac.update(b"Server Key");

    let server_key = mac.finalize().into_bytes();
    let mut mac = Hmac::<Sha256>::new_from_slice(&server_key)?;
    mac.update(auth_message.as_bytes());
    let mut client_final_message = format!("{client_final_message_wo_proof},{CLIENT_PROOF_ATTR}=");
    BASE64_STANDARD.encode_string(client_proof, &mut client_final_message);

    socket
        .send_message(PgWireFrontendMessage::PasswordMessageFamily(
            PasswordMessageFamily::SASLResponse(SASLResponse::new(Bytes::from(
                client_final_message,
            ))),
        ))
        .await?;

    let verifier = match socket.read_message().await? {
        PgWireBackendMessage::Authentication(Authentication::SASLFinal(data)) => {
            AuthenticationSaslFinal::try_from(data)?.verifier
        }
        PgWireBackendMessage::ErrorResponse(err) => return Err(Error::error_response(err)),
        msg => return Err(Error::protocol("SASLFinal", msg)),
    };

    mac.verify_slice(&verifier)
        .map_err(|err| Error::Protocol(format!("verification failed: {}", err)))?;

    Ok(())
}

fn gen_nonce() -> String {
    let mut rng = rng();
    let count = rng.random_range(64..128);
    let nonce: String = std::iter::repeat(())
        .map(|()| {
            let mut c = rng.random_range(0x21..0x7F) as u8;
            while c == 0x2C {
                c = rng.random_range(0x21..0x7F) as u8;
            }
            c
        })
        .take(count)
        .map(|c| c as char)
        .collect();
    rng.random_range(32..128);
    format!("{NONCE_ATTR}={nonce}")
}

fn hi<'a>(s: &'a str, salt: &'a [u8], iter_count: u32) -> Result<[u8; 32], Error> {
    let mut mac = Hmac::<Sha256>::new_from_slice(s.as_bytes())?;
    mac.update(salt);
    mac.update(&1u32.to_be_bytes());
    let mut u = mac.finalize_reset().into_bytes();
    let mut hi = u;
    for _ in 1..iter_count {
        mac.update(u.as_slice());
        u = mac.finalize_reset().into_bytes();
        hi = hi.iter().zip(u.iter()).map(|(&a, &b)| a ^ b).collect();
    }
    Ok(hi.into())
}

#[derive(Debug)]
pub struct AuthenticationSaslContinue {
    pub salt: Vec<u8>,
    pub iterations: u32,
    pub nonce: String,
    pub message: String,
}

impl TryFrom<Bytes> for AuthenticationSaslContinue {
    type Error = Error;
    fn try_from(buf: Bytes) -> Result<Self, Self::Error> {
        let mut iterations: u32 = 4096;
        let mut salt = Vec::new();
        let mut nonce = Bytes::new();
        for item in buf.split(|b| *b == b',') {
            let key = item[0];
            let value = &item[2..];
            match key {
                b'r' => {
                    nonce = buf.slice_ref(value);
                }
                b'i' => {
                    if let Ok(s) = std::str::from_utf8(value) {
                        if let Ok(n) = s.parse::<u32>() {
                            iterations = n;
                        }
                    }
                }
                b's' => {
                    salt = BASE64_STANDARD
                        .decode(value)
                        .map_err(|err| Error::Base64("salt", err))?;
                }
                _ => {}
            }
        }
        Ok(Self {
            iterations,
            salt,
            nonce: String::from_utf8(nonce.to_vec()).map_err(|err| Error::Utf8("nonce", err))?,
            message: String::from_utf8(buf.to_vec()).map_err(|err| Error::Utf8("message", err))?,
        })
    }
}

#[derive(Debug)]
pub struct AuthenticationSaslFinal {
    pub verifier: Vec<u8>,
}

impl TryFrom<Bytes> for AuthenticationSaslFinal {
    type Error = Error;
    fn try_from(buf: Bytes) -> Result<Self, Self::Error> {
        let mut verifier = Vec::new();
        for item in buf.split(|b| *b == b',') {
            let key = item[0];
            let value = &item[2..];
            if let b'v' = key {
                verifier = BASE64_STANDARD
                    .decode(value)
                    .map_err(|err| Error::Base64("verifier", err))?;
            }
        }
        Ok(Self { verifier })
    }
}
