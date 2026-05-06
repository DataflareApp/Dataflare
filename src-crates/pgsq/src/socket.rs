use crate::{Config, Error, Result, TlsMode};
use bytes::BytesMut;
use pgwire::messages::{
    Message, PgWireBackendMessage, PgWireFrontendMessage, response::SslResponse,
    startup::SslRequest,
};
use proxy::SshStream;
use std::fmt::Debug;
use std::pin::Pin;
use std::task::{Context, Poll};
use tokio::io::{
    AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt, BufStream, ReadBuf, Result as IoResult,
};
use tokio::net::TcpStream;
use tokio_native_tls::{TlsStream, native_tls::TlsConnector};

pub(crate) enum Stream {
    Tcp(TcpStream),
    Ssh(SshStream),
}

#[derive(Debug)]
pub(crate) enum Socket {
    Stream(BufStream<Stream>),
    TlsStream(BufStream<TlsStream<Stream>>),
}

impl Socket {
    pub(crate) async fn with_stream(mut stream: Stream, config: &Config) -> Result<Self> {
        match config.tls_mode {
            // TODO: First try without TLS; if the server requires it, then establish a TLS connection
            TlsMode::Allow => {
                return Ok(Self::Stream(BufStream::new(stream)));
            }
            TlsMode::Disabled => {
                return Ok(Self::Stream(BufStream::new(stream)));
            }
            TlsMode::Preferred => {
                let res = Self::request_upgrade(&mut stream).await?;
                if res == SslResponse::Refuse {
                    return Ok(Self::Stream(BufStream::new(stream)));
                }
            }
            TlsMode::Required | TlsMode::VerifyFull | TlsMode::VerifyCa => {
                let res = Self::request_upgrade(&mut stream).await?;
                if res != SslResponse::Accept {
                    return Err(Error::tls("server does not support TLS", ""));
                }
            }
        }
        let accept_invalid_certs =
            !matches!(config.tls_mode, TlsMode::VerifyCa | TlsMode::VerifyFull);
        let accept_invalid_hostnames = !matches!(config.tls_mode, TlsMode::VerifyFull);

        Self::tls_handshake(
            stream,
            accept_invalid_certs,
            accept_invalid_hostnames,
            config,
        )
        .await
    }

    pub(crate) async fn read_message(&mut self) -> Result<PgWireBackendMessage> {
        loop {
            let mut buf = BytesMut::zeroed(5);
            self.read_exact(&mut buf).await?;
            let len = i32::from_be_bytes([buf[1], buf[2], buf[3], buf[4]]) as usize;
            buf.resize(1 + len, 0);
            self.read_exact(&mut buf[5..]).await?;
            let msg = PgWireBackendMessage::decode(&mut buf)?.unwrap();
            // We discard these messages here since they are not needed; we only do simple queries
            if !matches!(
                msg,
                PgWireBackendMessage::ParameterStatus(..)
                    | PgWireBackendMessage::BackendKeyData(..)
                    | PgWireBackendMessage::NoticeResponse(..)
            ) {
                return Ok(msg);
            }
        }
    }

    pub(crate) async fn send_message(&mut self, msg: PgWireFrontendMessage) -> Result<()> {
        let mut buf = BytesMut::new();
        msg.encode(&mut buf)?;
        self.write_all(&buf).await?;
        self.flush().await?;
        Ok(())
    }

    async fn request_upgrade(stream: &mut Stream) -> Result<SslResponse> {
        let mut bytes = BytesMut::new();
        PgWireFrontendMessage::SslRequest(SslRequest::new()).encode(&mut bytes)?;
        stream.write_all(&bytes).await?;
        stream.flush().await?;

        let mut buf = BytesMut::zeroed(1);
        stream.read_exact(&mut buf).await?;
        let ssl_response = SslResponse::decode(&mut buf)?.unwrap();
        Ok(ssl_response)
    }

    async fn tls_handshake(
        stream: Stream,
        accept_invalid_certs: bool,
        accept_invalid_hostnames: bool,
        config: &Config,
    ) -> Result<Socket> {
        let mut builder = TlsConnector::builder();

        builder
            .danger_accept_invalid_certs(accept_invalid_certs)
            .danger_accept_invalid_hostnames(accept_invalid_hostnames);

        if let Some(cert) = &config.tls_root_cert {
            builder.add_root_certificate(cert.clone());
        }
        if let Some(identity) = &config.tls_client_cert {
            builder.identity(identity.clone());
        }

        let connector = builder
            .build()
            .map_err(|err| Error::tls("connector build failed", err))?;
        let connector = tokio_native_tls::TlsConnector::from(connector);
        let tls_stream = connector
            .connect(&config.host, stream)
            .await
            .map_err(|err| Error::tls("connect failed", err))?;

        Ok(Socket::TlsStream(BufStream::new(tls_stream)))
    }
}

impl Debug for Stream {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Tcp(_) => write!(f, "TcpStream"),
            Self::Ssh(_) => write!(f, "SshStream"),
        }
    }
}

impl AsyncRead for Stream {
    #[inline]
    fn poll_read(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<IoResult<()>> {
        match self.get_mut() {
            Self::Tcp(s) => Pin::new(s).poll_read(cx, buf),
            Self::Ssh(s) => Pin::new(s).poll_read(cx, buf),
        }
    }
}

impl AsyncWrite for Stream {
    #[inline]
    fn poll_write(self: Pin<&mut Self>, cx: &mut Context<'_>, buf: &[u8]) -> Poll<IoResult<usize>> {
        match self.get_mut() {
            Self::Tcp(s) => Pin::new(s).poll_write(cx, buf),
            Self::Ssh(s) => Pin::new(s).poll_write(cx, buf),
        }
    }

    #[inline]
    fn poll_flush(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        match self.get_mut() {
            Self::Tcp(s) => Pin::new(s).poll_flush(cx),
            Self::Ssh(s) => Pin::new(s).poll_flush(cx),
        }
    }

    #[inline]
    fn poll_shutdown(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        match self.get_mut() {
            Self::Tcp(s) => Pin::new(s).poll_shutdown(cx),
            Self::Ssh(s) => Pin::new(s).poll_shutdown(cx),
        }
    }
}

impl AsyncRead for Socket {
    #[inline]
    fn poll_read(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<IoResult<()>> {
        match self.get_mut() {
            Self::Stream(s) => Pin::new(s).poll_read(cx, buf),
            Self::TlsStream(s) => Pin::new(s).poll_read(cx, buf),
        }
    }
}

impl AsyncWrite for Socket {
    #[inline]
    fn poll_write(self: Pin<&mut Self>, cx: &mut Context<'_>, buf: &[u8]) -> Poll<IoResult<usize>> {
        match self.get_mut() {
            Self::Stream(s) => Pin::new(s).poll_write(cx, buf),
            Self::TlsStream(s) => Pin::new(s).poll_write(cx, buf),
        }
    }

    #[inline]
    fn poll_flush(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        match self.get_mut() {
            Self::Stream(s) => Pin::new(s).poll_flush(cx),
            Self::TlsStream(s) => Pin::new(s).poll_flush(cx),
        }
    }

    #[inline]
    fn poll_shutdown(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        match self.get_mut() {
            Self::Stream(s) => Pin::new(s).poll_shutdown(cx),
            Self::TlsStream(s) => Pin::new(s).poll_shutdown(cx),
        }
    }
}
