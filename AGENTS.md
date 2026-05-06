# AGENTS.md

Dataflare is a database GUI client written in Tauri.

### Code Style

- No comments for obvious code

### For TypeScript

- Prefer arrow functions
- Callback arrow functions must use explicit `return` keyword; single-expression callbacks like `=> a.b.c` are exempt
- When checking value of finite enum type, prefer `switch` over `if`

### For Rust

- For paths that are used multiple times within a mod, they should be imported using a `use` declaration
