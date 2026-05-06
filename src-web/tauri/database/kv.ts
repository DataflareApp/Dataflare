export interface NameSpace {
    id: string
    title: string | null
}

export interface Keys {
    keys: Key[]
    cursor: Cursor | null
}

export type Cursor = unknown

export type Key = KeyString | KeyBytes

export const enum KeyType {
    String = 'string',
    Bytes = 'bytes'
}

export interface KeyString {
    type: KeyType.String
    value: string
}

export interface KeyBytes {
    type: KeyType.Bytes
    value: string
}

export type GenericValue = GenericValueString | GenericValueBytes | GenericValueRedis

export const enum GenericValueType {
    String = 'string',
    Bytes = 'bytes',
    Redis = 'redis'
}
export interface GenericValueString {
    type: GenericValueType.String
    value: string
}
export interface GenericValueBytes {
    type: GenericValueType.Bytes
    value: number[]
}
export interface GenericValueRedis {
    type: GenericValueType.Redis
    value: RedisValue
}

export type RedisValue =
    | RedisValueString
    | RedisValueList
    | RedisValueSet
    | RedisValueZset
    | RedisValueHash
    | RedisValueStream
    | RedisValueJson

export const enum RedisValueType {
    String = 'string',
    List = 'list',
    Set = 'set',
    Zset = 'zset',
    Hash = 'hash',
    Stream = 'stream',
    Json = 'json'
}

export interface RedisValueString {
    type: RedisValueType.String
    value: string
}

export interface RedisValueList {
    type: RedisValueType.List
    value: string[]
}

export interface RedisValueSet {
    type: RedisValueType.Set
    value: string[]
}

export interface RedisValueZset {
    type: RedisValueType.Zset
    value: RedisZsetEntry[]
}

export interface RedisValueHash {
    type: RedisValueType.Hash
    value: RedisEntry[]
}

export interface RedisValueStream {
    type: RedisValueType.Stream
    value: RedisStream[]
}

export interface RedisValueJson {
    type: RedisValueType.Json
    value: string
}

export interface RedisZsetEntry {
    key: string
    score: string
}

export interface RedisStream {
    id: string
    fields: RedisEntry[]
}

export interface RedisEntry {
    key: string
    value: string
}

export interface KvOutput {
    value: GenericValue | null
    cloudflare: CloudflareData | null
    redis: RedisData | null
    s3: S3Data | null
}

export interface KvInput {
    value: InputValue
    cloudflare: CloudflareData | null
    redis: RedisData | null
    s3: S3Data | null
}

export type InputValue = InputValueGeneric | InputValuePath

export const enum InputValueType {
    Generic = 'generic',
    Path = 'path'
}
export interface InputValueGeneric {
    type: InputValueType.Generic
    value: GenericValue
}
export interface InputValuePath {
    type: InputValueType.Path
    value: string
}

export interface CloudflareData {
    expiration: number | null
    metadata: CloudflareKvMetadata | null
}

export interface RedisData {
    ttl: number | null
    type: string
    memory_usage: number
}

export interface S3Data {
    content_length: number | null
    content_type: string | null
    metadata: {
        [key: string]: string
    }
    raw: {
        [key: string]: string | null
    }
}

export type CloudflareKvMetadata = {
    [key: string]: string | number | boolean | null | CloudflareKvMetadata
}

export type CommandOutput =
    | CommandOutputKeys
    | CommandOutputGet
    | CommandOutputRedisResponse
    | CommandOutputDone

export const enum CommandOutputType {
    Keys = 'keys',
    Get = 'get',
    RedisResponse = 'redisresponse',
    Done = 'done'
}

export type CommandOutputKeys = {
    type: CommandOutputType.Keys
    value: string[]
}

export type CommandOutputGet = {
    type: CommandOutputType.Get
    value: GetOutput
}

export type CommandOutputRedisResponse = {
    type: CommandOutputType.RedisResponse
    value: RedisResponseData
}

export interface RedisResponseData {
    response: RedisResponse
    debug: string
}

export type CommandOutputDone = {
    type: CommandOutputType.Done
}

export interface GetOutput {
    key: Key
    output: KvOutput
}

export type RedisResponse = RedisResponseString | RedisResponseList | RedisResponseMap

export const enum RedisResponseType {
    String = 'string',
    List = 'list',
    Map = 'map'
}

export interface RedisResponseString {
    type: RedisResponseType.String
    value: string
}

export interface RedisResponseList {
    type: RedisResponseType.List
    value: string[]
}

export interface RedisResponseMap {
    type: RedisResponseType.Map
    value: RedisEntry[]
}
