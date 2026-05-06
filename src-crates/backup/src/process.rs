use serde::Serialize;
use std::ffi::OsStr;
use std::io::Result as IoResult;
use std::process::Stdio;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader, BufWriter};
use tokio::process::{Child, ChildStderr, ChildStdout, Command};
use tokio::sync::mpsc::{
    Receiver, Sender, UnboundedReceiver, UnboundedSender, channel, unbounded_channel,
};

const BUFF_SIZE: usize = 32 * 1024;

#[derive(Debug)]
pub struct Cmd {
    cmd: Command,
}

impl Cmd {
    pub fn new<S: AsRef<OsStr>>(program: S) -> Self {
        let mut cmd = Command::new(program);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());
        Self { cmd }
    }

    pub fn arg(&mut self, arg: impl AsRef<OsStr>) -> &mut Self {
        self.cmd.arg(arg);
        self
    }

    pub fn args<I, S>(&mut self, args: I) -> &mut Self
    where
        I: IntoIterator<Item = S>,
        S: AsRef<OsStr>,
    {
        self.cmd.args(args);
        self
    }

    pub fn env(&mut self, key: impl AsRef<OsStr>, value: impl AsRef<OsStr>) -> &mut Self {
        self.cmd.env(key, value);
        self
    }

    pub async fn run(
        mut self,
        path: impl AsRef<str>,
    ) -> IoResult<(UnboundedReceiver<BackupMessage>, Killer)> {
        let path = shell::path_expand(path.as_ref());
        let file = LazyFile::new(path.as_ref());

        let mut child = self.cmd.spawn()?;
        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();

        let (tx, rx) = unbounded_channel::<BackupMessage>();
        let (kill_tx, kill_rx) = channel::<()>(1);

        async fn copy_stdout(
            stdout: ChildStdout,
            mut writer: LazyFile,
            tx: UnboundedSender<BackupMessage>,
            kill_tx: Sender<()>,
        ) {
            let mut reader = BufReader::with_capacity(BUFF_SIZE, stdout);
            let mut buf = [0; BUFF_SIZE];
            let mut progress = 0;
            loop {
                match reader.read(&mut buf).await {
                    Ok(0) => {
                        if writer.initialized() {
                            let _ = tx.send(BackupMessage::StdoutCompleted);
                        }
                        break;
                    }
                    Ok(n) => {
                        if let Err(err) = writer.write_all(&buf[..n]).await {
                            let _ = tx.send(BackupMessage::io_error(err));
                            let _ = kill_tx.send(()).await;
                            break;
                        }
                        progress += n;
                        let _ = tx.send(BackupMessage::Stdout(progress));
                    }
                    Err(err) => {
                        let _ = tx.send(BackupMessage::io_error(err));
                        let _ = kill_tx.send(()).await;
                        break;
                    }
                };
            }
            if let Err(err) = writer.flush().await {
                let _ = tx.send(BackupMessage::io_error(err));
                let _ = kill_tx.send(()).await;
            }
        }

        async fn recv_stderr(stderr: ChildStderr, tx: UnboundedSender<BackupMessage>) {
            let mut reader = BufReader::new(stderr);
            let mut buf = String::new();
            loop {
                match reader.read_line(&mut buf).await {
                    Ok(0) => break,
                    Ok(_) => {
                        let _ = tx.send(BackupMessage::Stderr(buf.clone()));
                        buf.clear();
                    }
                    Err(err) => {
                        let _ = tx.send(BackupMessage::io_error(err));
                        break;
                    }
                }
            }
        }

        async fn wait_exit(
            child: &mut Child,
            tx: UnboundedSender<BackupMessage>,
            mut kill_rx: Receiver<()>,
        ) {
            tokio::select! {
                rst = child.wait() => {
                    let _ = match rst {
                        Ok(status) => {
                            match status.code() {
                                Some(code) => tx.send(BackupMessage::Exit(code)),
                                None => tx.send(BackupMessage::ExitWithKill),
                            }
                        },
                        Err(err) => {
                            tx.send(BackupMessage::io_error(err))
                        }
                    };
                }
                _ = kill_rx.recv() => {
                   let _ = child.kill().await;
                   let _ = tx.send(BackupMessage::ExitWithKill);
                }
            }
        }

        let kill_tx2 = kill_tx.clone();
        tokio::spawn(async move {
            tokio::join!(
                copy_stdout(stdout, file, tx.clone(), kill_tx2),
                recv_stderr(stderr, tx.clone()),
                wait_exit(&mut child, tx, kill_rx),
            );
        });

        Ok((rx, Killer { tx: kill_tx }))
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "lowercase", content = "value")]
pub enum BackupMessage {
    Stdout(usize),
    StdoutCompleted,
    Stderr(String),
    Exit(i32),
    ExitWithKill,
    IoError(String),
}

impl BackupMessage {
    pub fn io_error<E: std::error::Error>(error: E) -> Self {
        Self::IoError(format!("{error:?}"))
    }
}

#[derive(Debug)]
pub struct Killer {
    tx: Sender<()>,
}

impl Killer {
    pub async fn kill(&self) {
        let _ = self.tx.send(()).await;
    }
}

#[derive(Debug)]
enum LazyFile {
    Path(String),
    File(BufWriter<File>),
}

impl LazyFile {
    fn new(path: &str) -> Self {
        Self::Path(path.to_string())
    }

    fn initialized(&self) -> bool {
        matches!(self, Self::File(_))
    }

    async fn get_mut(&mut self) -> IoResult<&mut BufWriter<File>> {
        match self {
            Self::File(file) => Ok(file),
            Self::Path(path) => {
                let f = File::create(path).await?;
                *self = Self::File(BufWriter::with_capacity(BUFF_SIZE, f));
                match self {
                    Self::File(file) => Ok(file),
                    _ => unreachable!(),
                }
            }
        }
    }

    async fn write_all(&mut self, buf: &[u8]) -> IoResult<()> {
        self.get_mut().await?.write_all(buf).await
    }

    async fn flush(&mut self) -> IoResult<()> {
        match self {
            Self::File(file) => file.flush().await,
            Self::Path(_) => Ok(()),
        }
    }
}
