use rusqlite::types::{ToSql, ToSqlOutput, Value};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct WidgetItem {
    wid: String,
    width: u32,
    height: u32,
    x: u32,
    y: u32,
    #[serde(deserialize_with = "deserialize_json_string_config")]
    config: WidgetConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WidgetConfig {
    name: String,
    source: String,
    interval: u32,
    options: WidgetOptions,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "config")]
pub enum WidgetOptions {
    #[serde(rename = "table")]
    Table(TableConfig),
    #[serde(rename = "composed")]
    ComposedChart(ComposedChartConfig),
    #[serde(rename = "pie")]
    PieChart(PieChartConfig),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TableConfig {}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
pub struct ComposedChartConfig {
    axis: Axis,
    layout: Layout,
    categoryDataKey: String,
    bars: Vec<BarItem>,
    lines: Vec<LineItem>,
    areas: Vec<AreaItem>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
pub struct PieChartConfig {
    nameKey: String,
    dataKey: String,
    startColorIndex: u16,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Axis {
    x: AxisOptions,
    y: AxisOptions,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AxisOptions {
    hidden: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Layout {
    Horizontal,
    Vertical,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
pub struct BarItem {
    dataKey: String,
    barSize: u32,
    fill: String,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
pub struct LineItem {
    dataKey: String,
    stroke: String,
    r#type: LineType,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize)]
pub struct AreaItem {
    dataKey: String,
    fill: String,
    r#type: LineType,
}

#[allow(non_camel_case_types)]
#[derive(Debug, Serialize, Deserialize)]
pub enum LineType {
    bump,
    linear,
    monotone,
    step,
    stepBefore,
    stepAfter,
}

impl ToSql for WidgetConfig {
    fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
        #[cfg(debug_assertions)]
        let config = serde_json::to_string_pretty(self).unwrap_or_default();
        #[cfg(not(debug_assertions))]
        let config = serde_json::to_string(self).unwrap_or_default();

        Ok(ToSqlOutput::Owned(Value::Text(config)))
    }
}

fn deserialize_json_string_config<'de, D>(deserializer: D) -> Result<WidgetConfig, D::Error>
where
    D: serde::Deserializer<'de>,
{
    if let Ok(str) = String::deserialize(deserializer) {
        if let Ok(config) = serde_json::from_str(&str) {
            return Ok(config);
        }
    }
    // If an error occurs, return it as a Table
    Ok(WidgetConfig {
        name: "".into(),
        source: "".into(),
        interval: 0,
        options: WidgetOptions::Table(TableConfig {}),
    })
}
