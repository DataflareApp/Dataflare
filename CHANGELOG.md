## v3.0.1

**Published:** `2026-05-09T17:00:00Z`

**Changes**

- Add the Japanese translations. **Contributor**: @cwatanab
- Fix Turso cipher options toggle

## v3.0.0

**Published:** `2026-05-06T16:00:00Z`

**Changes**

- Rewrite auto-complete component
- Rewrite checkbox component
- Upgrade Tauri to latest version
- Add CLI crate
- Fix PostgreSQL affected rows error
- Fix URL canonicalization bug in AI providers

## v2.10.2

**Published:** `2026-04-21T14:04:02Z`

**Changes**

- Add R2 SQL JSON functions
- FIx component backdrop-filter style

## v2.10.1

**Published:** `2026-04-20T03:36:50Z`

**Changes**

- Rename libSQL to Turso
- Rewrite the libSQL remote connection driver
- Supports experimental Turso database
- Dynamically loading the libSQL database driver
- Display column types in libSQL remote connection
- Displays the affected rows in the libSQL remote connection.
- Displays the actual query time during a remote connection to libSQL
- Fixed SQLite and SQLCipher's init sql could only execute a single statement
- Built-in SQLite driver, no longer dynamically loaded
- Fix white screen caused by AI panel in macOS 12.6
- Reduce app size by 2-4 MB

## v2.9.6

**Published:** `2026-04-14T12:43:04Z`

**Changes**

- Upgrade DuckDB to v1.5.2
- Improved SQLite, SQLCipher, LibSQL, Rqlite, CloudflareD1, EchoLite functions typing suggestions

## v2.9.5

**Published:** `2026-04-10T14:53:33Z`

**Changes**

- Support Manticore Search
- Improve MySQL driver
- Improve binary data conversion performance

## v2.9.4

**Published:** `2026-03-26T06:06:59Z`

**Changes**

- Support `R2 SQL`
- Supports `Worker Analytics Engine` URL link
- Move keyboard shortcuts to Settings
- Fix database type sorting

## v2.9.3

**Published:** `2026-03-23T16:50:55Z`

**Changes**

- Upgrade DuckDB to v1.5.1
- Improve SSH proxy performance
- Improve SQL query error messages
- Fixed some bugs

## v2.9.2

**Published:** `2026-03-17T06:16:33Z`

**Changes**

- Support **Presto** database
- Optimize the timing of refreshing the SQL editor's typing suggestions
- Update Databend/Databricks/Trino tag to **beta**

## v2.9.1

**Published:** `2026-03-15T12:06:59Z`

**Changes**

- Fix Databricks SQL catalog context
- Upgrade SQLite to v3.51.3
- UPgrade SQLCipher to v4.10.0

## v2.9.0

**Published:** `2026-03-12T06:17:14Z`

**Changes**

- Support Databricks database
- Upgrade DuckDB to v1.5.0
- Fix Clickhouse driver session
- Improve the readability of HTTP error messages
- Optimize AI message loading performance
- Some bug fixes

## v2.8.7

**Published:** `2026-02-10T13:29:56Z`

**Changes**

- Fix Trino retry error message
- Add `Copy SQL` menu to AI Chat tool result
- Update Databend keywords
- Rewrite `Databend` client drive

## v2.8.6

**Published:** `2026-02-08T06:45:40Z`

**Changes**

- Support [Trino](https://github.com/trinodb/trino) database
- Fix macOS titlebar flickering
- Fix SQL editor line operations `Ctrl + K`
- Add macOS SQL editor `Ctr l+ Shift + P / N` shortcut

## v2.8.5

**Published:** `2026-02-01T03:13:26Z`

**Changes**

- Support Windows Arm
- Support for searching in table filter columns
- Support for searching in table sort columns
- Automatically adjust the height of the AI chat input box
- Preserve input state when switching AI chat
- Improved chart configuration in the dashboard
- Fix macOS 12.6 panic
- Fix Anthropic models tool call

## v2.8.4

**Published:** `2026-01-28T12:33:04Z`

**Changes**

- Upgrade DuckDB to v1.4.4.
- Simplified renaming of AI chat title
- Auto-set chat title (set when the first message is sent)
- Optimized usage of AI tools
- Optimized default AI instructions
- Optimized AI chat list
- Fixed scrolling when tool invocation is approved.
- Fixed comparison error when editing tables.
- Fix Anthropic AI Provider
- Fixed table header context menu error

## v2.8.3

**Published:** `2026-01-25T09:55:57Z`

**Changes**

- Improved Settings page
- Improved AI Chat performance
- Fix several bugs

## v2.8.2

**Published:** `2026-01-18T12:11:10Z`

**Changes**

- Fix create connection Window delay
- Fix tool-getTableColumnSamples `limit` value
- Fix export tool query results file name
- Fix Markdown table rendering
- Fix columns sort/filter popover size
- Update default agent instructions

## v2.8.1

**Published:** `2026-01-13T14:03:06Z`

**Changes**

- Supports AI chat Markdown rendering
- SQL preview uses fixed font size (13px)
- Support export AI chat SQL query result
- FIx Windows10 titlebar button

## v2.8.0

**Published:** `2026-01-11T12:24:45Z`

**Changes**

### AI Assistant

- Support AI Chat

#### Tools

- getDatabaseSchema
- getTableSchema
- getTableColumnSamples
- runSQLQuery
- generateChart(line/bar/area/pie)

### DuckDB

- Upgrade DuckDB to `v1.4.3`
- Support DuckDB foreign keys
- Fix get DuckDB table columns function

### libSQL

- Upgrade libSQL to `v0.9.29`

### SQLite

- Upgrade SQLite to `v3.51.1`

### SQLCipher

- Upgrade SQLCipher to `v4.10.0`

### Workers Analytics Engine

- Update keywords/functions

### UI

- Update Titlebar style
- Fix text input suggestions scroll
- Fix DropdownMenu style
- Fix SplitView row resize
- Fix SplitView cursor flicker
- Fix table header cursor flicker
- Fix table footer layout error

### Linux Platform

- Change default font to `sans-serif`
- Remove window decoration
- Custom window control buttons (GTK style)

## v2.7.2

**Published:** `2025-12-06T02:14:55Z`

**Changes**

- Supports reverse navigation based on foreign keys in tables
- Add context menus to tabs, `Close` `Close All Tabs` `Close Other Tabs`

## v2.7.1

**Published:** `2025-12-03T01:52:31Z`

**Changes**

- Improve BigQuery connection speed
- Fix BigQuery array/struct display
- Fix BigQuery TLS error
- FIx "Can't move my cursor with Option + Arrow in the text" #150
- Always display percentages in the pie chart

## v2.7.0

**Published:** `2025-11-25T14:24:22Z`

**Changes**

- Support **BigQuery**

## v2.6.5

**Published:** `2025-11-22T14:33:12Z`

**Changes**

- Supports resizing the connection list
- Improve connection list focus switching
- Improve icon flickering
- Stable Workers Analytics Engine
- Upgrade DuckDB to v1.4.2
- Fix some bugs

## v2.6.4

**Published:** `2025-11-12T02:53:04Z`

**Changes**

### macOS only

- Fix panic in versions of macOS below 15
- Remove the animated spring effect

## v2.6.3

**Published:** `2025-11-10T14:11:47Z`

**Changes**

- Upgrade DuckDB to `v1.4.1`
- Upgrade SQLite to `v3.50.2 `
- Upgrade SQLCipher to `v4.6.1`

## v2.6.2

**Published:** `2025-11-09T07:31:59Z`

**Changes**

- Fix table focus
- Improve table rendering performance
- Improve the priority of table rows data retrieval
- Fix chart tooltip flickering
- Improved pie chart mouse events
- Fix table pagination layout style
- Fix SQL Query historys
- Update QuestDB data types
- Fix QuestDB materialized views display
- Fix column transform window state restore

## v2.6.1

**Published:** `2025-10-26T16:35:12Z`

**Changes**

- Support [Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- Optimize element titles for accessibility

## v2.6.0

**Published:** `2025-10-19T09:48:26Z`

**Changes**

- Support manual commit mode
- Support column transform
- Update postgres 18 keyworkds
- Add quick search icon
- Fix some bugs, improved performance
- Fix #56, Show ISO8601 datetime preview for UNIX times
- Fix #84, MANUAL COMMIT MODE

## v2.5.0

**Published:** `2025-09-27T13:55:27Z`

**Changes**

- Upgrade DuckDB to v1.4.0
- Update macOS titlebar bug
- Adapted for macOS 26 window style
- Fix "If there are no rows, displaying columns is not responsive" [#28](https://github.com/DataflareApp/Dataflare/issues/28)
- Improve UI animations
- Improve Table component

### Table Keyboard Shortcuts

| Function                     | Shortcut        |
| ---------------------------- | --------------- |
| Refresh                      | `⌘ + R`         |
| Filter                       | `⌘ + F`         |
| Select All Rows              | `⌘ + A`         |
| Unselect All Rows            | `ESC`           |
| Insert Row                   | `⌘ + I`         |
| Delete Rows                  | `⌘ + Backspace` |
| Copy Cell                    | `⌘ + C`         |
| Copy Selected Rows           | `⌘ + ⇧ + C`     |
| Resize Column to Fix Content | `⌘ + E`         |
| Resize Column to Minimum     | `⌘ + ⇧ + E`     |
| Edit Cell                    | `Enter`         |
| Edit Row                     | `⇧ + Enter`     |
| Previous Page                | `⌘ + ←`         |
| Next Page                    | `⌘ + →`         |
| First Page                   | `⌘ + ⇧ + ←`     |
| Last Page                    | `⌘ + ⇧ + →`     |

## v2.3.4

**Published:** `2025-09-04T13:58:54Z`

**Changes**

- Support multi-row table selection
- Improve where statement input
- Fix Connections UI layout

## v2.3.3

**Published:** `2025-08-27T15:39:38Z`

**Changes**

- Improve fuzzy search
- Fix KV database key split search
- Improve SQL parser
- Support minify SQL <kbd>Ctrl + Shift + J</kbd>
- Fix format SQL <kbd>Ctrl + Shift + L</kbd> #120
- Change indent from 4 to 2 spaces

## v2.3.2

**Published:** `2025-08-20T16:32:34Z`

**Changes**

- Improved search #139
- Fix MacOS Tahoe UI BUG #138

## v2.3.1

**Published:** `2025-08-17T04:11:26Z`

**Changes**

- Fix backup logs
- Fix KV console scroll
- Support backup Redis database
- Support copy DDL in schema manager

## v2.3.0

**Published:** `2025-08-09T17:54:48Z`

**Changes**

- DuckDB non-blocking batch insert
- Reset the page number when changing filter conditions
- Fix SQL statement parsing position error
- Support insert random boolean value
- Support quick filter from clipboard #136
- Support backup `SQLite` database
- Support backup `DuckDB` database
- Support backup `MySQL` database
- Support backup `PostgreSQL` database

## v2.2.1

**Published:** `2025-07-23T08:35:50Z`

**Changes**

- Fix some bugs

## v2.2.0

**Published:** `2025-07-21T12:13:46Z`

**Changes**

- Support Redis connection <sup>experimental<sup/>
- Support Cloudflare Workers KV connection <sup>experimental<sup/>
- Support S3 connection <sup>experimental<sup/>
- Support copy schema manager image
- Upgrade EchoLite to v0.2.0
- Automatically save table rows configuration
- Fix SQL editor statement delay and state recovery
- Improvement Command Search
- Allow setting window decorations on Linux

## v2.1.0

**Published:** `2025-06-22T08:46:38Z`

**Changes**

- Support access to remote SQLite databases (via [EchoLite](https://github.com/DataflareApp/echolite)
- Support adjusting columns to minimum width
- Open the connection in a new window when pressing ctrl

## v2.0.2

**Published:** `2025-06-09T15:53:03Z`

**Changes**

- Fix table list scrollview error
- Copy Bytes value as hex string

## v2.0.1

**Published:** `2025-06-08T06:03:57Z`

**Changes**

- Support SSH Agent
- Support formatting of binary value display #123
- Support quick connection switching using the keyboard in search
- Upgrade DuckDB to v1.3.0
- Improvement of SQL Statement Read-Only Check
- Add some search keyboard shortcuts
- Fix SQL statement parsing #121
- Fix IPv6 address as HTTP host
- Fix macOS full screen TitleBar style

## v2.0.0

**Published:** `2025-05-20T11:05:26Z`

**Changes**

- Upgrade DuckDB to v1.2.2
- Upgrade libSQL to v0.9.7
- Use MRU for tabs management
- Improvement of Random Data Generation
- Show exported files in the file manager
- Support multiple connection Windows
- Support opening database files directly in the file manager
- Support searching in the connection list
- Support reconnect to the database in the search command
- Support double-clicking to directly open the database connection
- Support opening the database connection in a new window
- Support saving the database connection directly
- Fix DuckDB loading extensions
- Fix IPv6 host connection url encode
- Fix copy text to clipboard
- Fix macOS traffic light position
- [BUG] Format function can't be undone #119
- [Feature Request] Open multiple instances #112
- [Feature Request] Allow users to manually reconnect to the database #105
- [Feature Request] highlight current select row in table view #66
- [BUG] Dark theme on Windows stops working after a while #63
- [Feature Request] Open Sqlite files directly from Finder (macOS) and Explorer (Windows) #46

## v1.9.5

**Published:** `2025-04-01T13:20:00Z`

**Changes**

- Change App icon
- Fix some bugs

## v1.9.4

**Published:** `2025-03-15T08:48:55Z`

**Changes**

- Support export table all rows
- Upgrade DuckDB to v1.2.1
- Upgrade SQLite to v3.48.0
- Fix connect to StarRocks #96
- Fix touchpad operation Dashboard
- Fix decode string error
- Optimize dashboard widget alignment

## v1.9.3

**Published:** `2025-01-25T02:05:18Z`

**Changes**

- Support MySQL `vector` data type
- Improve MySQL editor typing suggestions
- Fix some bugs

## v1.9.2

**Published:** `2024-11-29T16:14:37Z`

**Changes**

- Support export schema manager image
- Fix the drag view being too small #107

## v1.9.1

**Published:** `2024-11-23T14:48:06Z`

**Changes**

- Support Dashboard
- Support copy table content as `CSV` `JSON` `SQL`
- Support disable table number format
- Optimize PostgreSQL Performance
- Return to first page when changing search #104
- Add table `First Page` / `Last Page` Button
- Fix Schema Manager bugs
- Fix table pagination row display
- Fix export JSON number
- Fix table number format
- Fix clean query history

## v1.8.4

**Published:** `2024-10-13T13:27:12Z`

**Changes**

- Upgrade DuckDB to `v1.1.1`
- Support DuckDB `varint` data type
- Fix test connection message

## v1.8.3

**Published:** `2024-09-26T05:15:36Z`

**Changes**

- Fix error
- Upgrade `webkit2gtk` to `2.44.3`

## v1.8.2

**Published:** `2024-09-20T14:11:57Z`

**Changes**

- Support adding initial SQL
- Add combination keywords in the SQL editor
- Default column width wide enough to show name and type
- Formatting table number value
- Cancel the previous test after changing the connection config

## v1.8.1

**Published:** `2024-09-15T05:04:09Z`

**Changes**

- Support Deutsch, thanks Till
- Support resize column width to fix content
- Show table column count
- Add SQLite jsonb functions
- Allow SQLCipher empty password

## v1.8.0

**Published:** `2024-09-04T14:56:47Z`

**Changes**

- Support [QuestDB](https://questdb.io)
- Fix cancel SQL query
- Fix query time

## v1.7.4

**Published:** `2024-08-29T12:20:25Z`

**Changes**

- Support SSH proxy <sup>Databend</sup> <sup>ClickHouse</sup> <sup>Rqlite</sup>
- Support switch to the previous/next tab `Ctrl + [` `Ctrl + ]`
- Fix `ClickHouse` `Databend` error message
- Fix `DuckDB` columns info
- Fix `PostgreSQL` IPv6 host
- Fix shortcut key errors on Windows
- Fix the connection popup UI on Windows

## v1.7.3

**Published:** `2024-08-18T05:11:06Z`

**Changes**

- Display view in table list
- Display view in schema manager
- Display database version number when testing connection
- Add view and index to editor typing hints
- Show current connection first in connections manage
- Move refresh table menu to external
- Fix some bugs

## v1.7.2

**Published:** `2024-08-11T10:34:08Z`

**Changes**

- Support view zoom
    - Zoom In `Ctrl+`
    - Zoom Out `Ctrl -`
    - Zoom to Actual Size `Ctrl 0`
- Fix JSON float precision

## v1.7.1

**Published:** `2024-08-06T04:59:34Z`

**Changes**

- Fix MSSQL schema manager token error #91

## v1.7.0

**Published:** `2024-07-29T04:56:52Z`

**Changes**

- Support [Databend](https://github.com/datafuselabs/databend) <sup>Beta</sup>
- Upgrade SQLite to 3.46.0
- Upgrade SQLCipher to 4.5.7
- Dynamic loading of DuckDB, SQLite, SQLCipher
    - When connecting for the first time, the database driver will be downloaded over the network.
- App size reduced by 36MB
- Performance improvements and bug fixes

## v1.6.0

**Published:** `2024-07-18T14:15:23Z`

**Changes**

- Support `ClickHouse`
- Support `DuckDB` type alias
- Support column autocomplete suggestions in table preview #48
- Support `D1` schema manager <sup>1</sup>
- Support `D1` columns autocomplete suggestions <sup>2</sup>
- Fix SQL editor refresh
- Performance optimization

D1 has some limitations regarding SQL query, we cannot retrieve all data in a single request. Therefore, data is retrieved in a loop, which may result in sending a large number of HTTP requests, depending on the number of your tables.

1. `1 + n * 2 `
2. `1 + n`

## v1.5.0

**Published:** `2024-07-02T12:39:23Z`

**Changes**

- Support `DuckDB`
- Update `libSQL` logo
- Use the `JetBrains Mono` font for the following data type of columns:
    - `date` `time` `timetz` `datetime` `timestamp` `timestamptz` `year`

## v1.4.0

**Published:** `2024-06-08T12:09:55Z`

**Changes**

- Support batch insert
- Add query status in query result
- Add `not null` and `default value` in edit row
- Auto create database file (libSQL, SQLite, SQLCipher)
- Fix schema manager minimap <sup>AppImage</sup>
- Fix query does not return result #86
- Fix Cloudflare D1 same column name error
- Fix libSQL, SQLite, SQLcipher connection test
- Show more accurate query duration
    - `MySQL, MariaDB, PostgreSQL, CockroachDB, SQL Server, Remote libSQL`: Network round-trip time + Query duration
    - `Cloudflare D1, Rqlite`: Read query duration from response
    - `SQLite, SQLCipher, Local libSQL`: From send query to full receipt of results

## v1.3.7

**Published:** `2024-05-18T17:39:13Z`

**Changes**

- Support export table to `.sql` file
- Update SQL editor dark theme
- Performance improvements and bug fixes

## v1.3.6

**Published:** `2024-05-03T14:13:43Z`

**Changes**

- Support PostgreSQL all datatype
- Support MySQL / MariaDB `bit` `geometry` datatype
- Change datatype to lower case
- Fix some bugs

## v1.3.5

**Published:** `2024-04-18T12:47:26Z`

**Changes**

- Support PostgreSQL `vector` type #78
- Support create database
- Support for selecting fonts installed on the system <sub>Settings<sub>
- Change Query icon
- Fix some bugs

## v1.3.4

**Published:** `2024-04-10T15:14:00Z`

**Changes**

- Add `Trigger Manager`
- Add `Extension Manager` <sup>PostgreSQL</sup>
- Support copy connection URL
- Support custom D1 API origin #76
- Disable App auto update
- Fix some bugs

## v1.3.3

**Published:** `2024-03-31T12:51:57Z`

**Changes**

- Add function manager
- Change font-mono to `JetBrainsMono`
- Fix SQL Editor syntax highlight
- Fix #71

## v1.3.2

**Published:** `2024-03-27T08:19:44Z`

**Changes**

- Support français, thanks @Sukaato.
- Show scrollbar when mouse hover
- Support import `rqlite` connection URL
- Fix #69, #70

## v1.3.1

**Published:** `2024-03-17T14:07:21Z`

**Changes**

- Allow disable auto connect database #67
- Support PostgreSQL tsvector type
- Switch to custom scrollbar
- Disable F5 refresh window <sup>Windows</sup>
- Fix import connection from URL
- Fix some UI errors

## v1.3.0

**Published:** `2024-03-11T09:50:15Z`

**Changes**

- Support [CockroachDB](https://github.com/cockroachdb/cockroach)
- Support switch database
- Fix SQLite foreign key jump
- Fix PostgreSQL schema manager primary key repeat

## v1.2.2

**Published:** `2024-03-06T12:20:10Z`

**Changes**

- Support PostgreSQL `CITEXT` type
- Change SQL Query icon
- Improve UI and performance

## v1.2.1

**Published:** `2024-02-27T13:54:05Z`

**Changes**

- Support PostgreSQL `geometric`, `macaddr8` types
- Support rqlite `BLOB` type
- Suport export table to `CSV` file
- Support copy `INSERT SQL` statement
- Fix context menu position (AppImage)

## v1.2.0

**Published:** `2024-02-19T07:02:50Z`

**Changes**

- Support [Cloudflare D1](https://developers.cloudflare.com/d1/) (#55)
- Run filter when pressing `Enter` key (#47)

## v1.1.0

**Published:** `2024-02-15T09:44:15Z`

**Changes**

- Support `简体中文`
- Support mouse middle button close tab
- Support close all tab `Ctrl+Shift+W`
- Show Index in schema manager
- Add keyboard shortcuts help
- Fix libSQL stream expired

## v1.0.1

**Published:** `2024-02-01T08:59:46Z`

**Changes**

- Fix delete connection error
- Update libSQL to latest

## v1.0.0

**Published:** `2024-01-31T14:46:37Z`

**Changes**

- Redesigned "Edit Table" interface
- Support add / drop `Index`
- Merge appearance into settings
- Support PostgreSQL enum type #9

## v0.6.1

**Published:** `2024-01-23T16:22:26Z`

**Changes**

- View pretty `JSON` `JSONB` value
- Allow creating multiple fk in a single column
- Fix PostgreSQL `TIMETZ` type decode
- Fix View Table interface multiple fk jump
- Fix schema manager repeat column #40

## v0.6.0

**Published:** `2024-01-21T23:59:59Z`

**Changes**

- Redesigned "New Table" interface
- Support search Table in Schema Manager
- Fix scrollbar position
- Fix #35

## v0.5.0

**Published:** `2024-01-14T16:04:13Z`

**Changes**

- Support connect [Rqlite](https://github.com/rqlite/rqlite) database.
- Support connect [SQLCipher](https://github.com/sqlcipher/sqlcipher) database.
