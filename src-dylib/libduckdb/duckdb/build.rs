fn main() {
    // Fix: https://github.com/duckdb/duckdb-rs/pull/495#issuecomment-2799979544
    #[cfg(target_os = "windows")]
    {
        println!("cargo:rustc-link-lib=dylib=Rstrtmgr");
        println!("cargo:rustc-link-lib=dylib=Bcrypt");
    }
}
