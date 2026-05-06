use crate::{Error, Result};
use futures_util::future::BoxFuture;
use futures_util::stream::{FuturesUnordered, StreamExt};
use query::Value;
use std::io::Error as IoError;

pub(crate) trait FirstCell {
    // Get the value of the first cell from the query result
    // Used to get the database version when testing a database connection
    fn first_cell_string(&mut self) -> Result<String>;
}

impl FirstCell for Vec<Vec<Value>> {
    fn first_cell_string(&mut self) -> Result<String> {
        if !self.is_empty() && !self[0].is_empty() {
            if let Value::String(s) = self.remove(0).remove(0) {
                return Ok(s);
            }
        }
        Err(Error::Io(IoError::other(
            "Received no result of type 'String'",
        )))
    }
}

pub(crate) async fn unordered_tasks<E, I, D, F>(
    max_task: usize,
    mut iter: I,
    run: F,
) -> Result<(), E>
where
    I: Iterator<Item = D>,
    F: Fn(D) -> BoxFuture<'static, Result<(), E>>,
{
    let mut tasks = FuturesUnordered::new();
    loop {
        let task_len = tasks.len();
        if task_len < max_task {
            for _ in 0..max_task - task_len {
                match iter.next() {
                    None => break,
                    Some(sql) => {
                        tasks.push(run(sql));
                    }
                }
            }
        }
        match tasks.next().await {
            None => break,
            Some(rst) => rst?,
        };
    }
    Ok(())
}

pub(crate) fn empty_if<T: Into<String>>(val: String, fallback: T) -> String {
    if val.is_empty() { fallback.into() } else { val }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::FutureExt;

    #[tokio::test]
    async fn test_unordered_tasks() {
        let rst = unordered_tasks(2, vec![1, 2, 3].into_iter(), |n| {
            async move { Err(n) }.boxed()
        })
        .await;
        assert_eq!(rst, Err(1));
    }
}
