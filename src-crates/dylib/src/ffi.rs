// Shared FFI ABI for the `src-dylib` cdylibs and the runtime loader.
// Changes here affect every consumer that imports this file via mod path,
// so keep layouts ABI-stable and run the full `src-dylib` test after edits.

#[repr(C)]
pub struct TypedValue<T, V> {
    pub kind: T,
    pub value: V,
}

impl<T, V> TypedValue<T, V> {
    pub fn new(t: T, v: V) -> Self {
        Self { kind: t, value: v }
    }
}

#[repr(C)]
#[derive(Copy, Clone)]
pub struct BytesRef {
    ptr: *const u8,
    len: usize,
}

impl BytesRef {
    pub fn new(bytes: &[u8]) -> Self {
        Self {
            ptr: bytes.as_ptr(),
            len: bytes.len(),
        }
    }
    pub fn as_bytes(&self) -> &[u8] {
        unsafe { std::slice::from_raw_parts(self.ptr, self.len) }
    }
}

#[repr(transparent)]
#[derive(Copy, Clone)]
pub struct StringRef {
    bytes: BytesRef,
}

impl StringRef {
    pub fn new(s: &str) -> Self {
        Self {
            bytes: BytesRef::new(s.as_bytes()),
        }
    }
    pub fn as_str(&self) -> &str {
        unsafe { std::str::from_utf8_unchecked(self.bytes.as_bytes()) }
    }
}

#[repr(C)]
pub struct ErrorMessage {
    ptr: *mut u8,
    len: usize,
}

impl ErrorMessage {
    pub fn new(s: String) -> Self {
        let vec = s.into_bytes();
        let len = vec.len();
        let ptr = Box::into_raw(vec.into_boxed_slice()) as *mut u8;
        Self { ptr, len }
    }

    #[allow(dead_code, unused)]
    pub fn null() -> Self {
        Self {
            ptr: std::ptr::null_mut(),
            len: 0,
        }
    }

    pub fn is_null(&self) -> bool {
        self.ptr.is_null()
    }

    #[allow(dead_code, unused)]
    pub fn as_str(&self) -> &str {
        unsafe {
            let bytes = std::slice::from_raw_parts(self.ptr, self.len);
            std::str::from_utf8_unchecked(bytes)
        }
    }

    pub fn free(self) {
        if !self.is_null() {
            unsafe {
                let _ = Vec::from_raw_parts(self.ptr, self.len, self.len);
            }
        }
    }
}

unsafe impl Send for ErrorMessage {}
unsafe impl Sync for ErrorMessage {}
