use std::borrow::Cow;

pub fn args_split(args: &str) -> Result<Vec<String>, ()> {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    let items = shlex::split(args).ok_or(())?;
    #[cfg(target_os = "windows")]
    let items = winsplit::split(args);

    Ok(items)
}

pub fn arg_escape(arg: Cow<str>) -> Cow<str> {
    shell_escape::escape(arg)
}

pub fn path_expand(path: &str) -> Cow<'_, str> {
    shellexpand::tilde(path).into()
}

#[cfg(test)]
mod tests {
    // use super::*;
}
