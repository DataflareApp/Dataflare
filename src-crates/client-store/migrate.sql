-- 2023-13-03 23:26:25

CREATE TABLE IF NOT EXISTS "connection" (
    cid TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    config BLOB NOT NULL,
    sort INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "query" (
    qid TEXT NOT NULL PRIMARY KEY,
    cid TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "history" (
    hid TEXT NOT NULL PRIMARY KEY,
    cid TEXT NOT NULL,
    qid TEXT NOT NULL,
    content TEXT NOT NULL,
    error TEXT,
    created_at INTEGER NOT NULL
);

-- 2024-10-22 20:38:39

CREATE TABLE IF NOT EXISTS "dashboard" (
    wid TEXT NOT NULL PRIMARY KEY,
    cid TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    config TEXT NOT NULL
);

-- 2025-07-08 15:46:44

CREATE TABLE IF NOT EXISTS "storage" (
    cid TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL CHECK (JSON_VALID(value)),
    PRIMARY KEY(cid, key)
);

-- 2025-12-05 14:44:30

CREATE TABLE IF NOT EXISTS "provider" (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    config TEXT NOT NULL CHECK (JSON_VALID(config)),
    models TEXT NOT NULL CHECK (JSON_VALID(models))
) STRICT;

CREATE TABLE IF NOT EXISTS "chat" (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    cid TEXT NOT NULL,
    name TEXT NOT NULL,
    config TEXT NOT NULL CHECK (JSON_VALID(config)),
    messages TEXT NOT NULL CHECK (JSON_VALID(messages)),
    last_message_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000),
    last_accessed_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000)
) STRICT;

CREATE INDEX IF NOT EXISTS "chat_idx" ON "chat"("cid", "id");

CREATE TABLE IF NOT EXISTS "agent" (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    instructions TEXT NOT NULL,
    config TEXT NOT NULL CHECK (JSON_VALID(config))
) STRICT;
