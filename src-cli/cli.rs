use clap::{Parser, Subcommand};
use client_store::{Client, ConnectionItemResult};
use comfy_table::{ContentArrangement, Table};
use database::Database;
use query::Value;

#[derive(Parser)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    List,
    Query { id: String, sql: String },
}

type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error("Connection not found: {0}")]
    ConnectionNotFound(String),
    #[error(transparent)]
    Client(#[from] client_store::Error),
    #[error(transparent)]
    Database(#[from] database::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    if let Err(err) = run(cli).await {
        eprintln!("Error: {err}");
        std::process::exit(1);
    }
}

async fn run(cli: Cli) -> Result<()> {
    let data_dir = dir::app_dir();
    let client = Client::connect(&data_dir).await?;
    match cli.command {
        Command::List => list_connections(&client).await?,
        Command::Query { id, sql } => run_query(&client, &id, sql).await?,
    }
    Ok(())
}

const MODIFIER: &str = "││──├─┼┤│─┼├┤┬┴┌┐└┘";
const TRUNCATION: &str = "…";

async fn list_connections(client: &Client) -> Result<()> {
    let connections = client.connection_list().await?;
    if connections.is_empty() {
        println!("No connections found.");
        return Ok(());
    }

    let mut table = Table::new();
    table
        .apply_modifier(MODIFIER)
        .set_truncation_indicator(TRUNCATION)
        .set_content_arrangement(ContentArrangement::Dynamic)
        .set_header(["ID", "Type", "Name"]);

    let mut kv_count = 0;
    for connection in connections {
        if connection.config.is_kv() {
            kv_count += 1;
            continue;
        }
        table.add_row([
            connection.cid,
            connection.config.product_name().to_string(),
            connection.name,
        ]);
    }

    println!("{table}");
    if kv_count > 0 {
        println!(
            "Note: {kv_count} KV database connections are not displayed because they are not currently supported."
        );
    }

    Ok(())
}

async fn run_query(client: &Client, id: &str, sql: String) -> Result<()> {
    let connection = find_connection(client, id).await?;
    let database = Database::connect(connection.config).await?;
    let query = database.sql_query(sql).await?;
    let cols_len = query.columns.len();
    let rows_len = query.rows.len();
    let affected = query.rows_affected.unwrap_or(0);

    let mut table = Table::new();
    table
        .apply_modifier(MODIFIER)
        .set_truncation_indicator(TRUNCATION)
        .set_content_arrangement(ContentArrangement::Dynamic);

    let mut header = Vec::with_capacity(cols_len);
    for column in &query.columns {
        header.push(format!("{} [{}]", column.name, column.datatype));
    }
    table.set_header(header);

    for row in query.rows {
        let mut r = Vec::with_capacity(cols_len);
        for cell in row {
            r.push(terminal_string(cell));
        }
        table.add_row(r);
    }
    println!("{table}");
    println!(
        "Rows: {rows_len}, Columns: {cols_len}, Rows Affected: {affected}, Duration: {}ms",
        query.duration
    );
    Ok(())
}

async fn find_connection(client: &Client, id: &str) -> Result<ConnectionItemResult> {
    let connections = client.connection_list().await?;
    let conn = connections
        .into_iter()
        .find(|item| item.cid == id && !item.config.is_kv())
        .ok_or_else(|| Error::ConnectionNotFound(id.to_owned()))?;
    Ok(conn)
}

fn terminal_string(val: Value) -> String {
    match val {
        Value::Null => "NULL".to_string(),
        Value::Bool(v) => v.to_string(),
        Value::I8(v) => v.to_string(),
        Value::U8(v) => v.to_string(),
        Value::I16(v) => v.to_string(),
        Value::U16(v) => v.to_string(),
        Value::I32(v) => v.to_string(),
        Value::U32(v) => v.to_string(),
        Value::F32(v) => v.to_string(),
        Value::I64(v) => v.to_string(),
        Value::U64(v) => v.to_string(),
        Value::F64(v) => v.to_string(),
        Value::String(v) => v,
        Value::Bytes(v) => hex::encode(v),
        // NOTE: Array and Map are objects used only for serialization and transmission in conjunction with Query; they do not exist when used as database values.
        Value::Array(_) => "".to_string(),
        Value::Map(_) => "".to_string(),
    }
}
