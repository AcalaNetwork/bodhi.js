export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** A floating point number that requires more precision than IEEE 754 binary 64 */
  BigFloat: any;
  /** A location in a connection that can be used for resuming pagination. */
  Cursor: any;
  /** The day, does not include a time. */
  Date: any;
  /**
   * A point in time as described by the [ISO
   * 8601](https://en.wikipedia.org/wiki/ISO_8601) standard. May or may not include a timezone.
   */
  Datetime: any;
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: any;
};

/** A filter to be used against BigFloat fields. All fields are combined with a logical ‘and.’ */
export type BigFloatFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: Maybe<Scalars['BigFloat']>;
  /** Equal to the specified value. */
  equalTo?: Maybe<Scalars['BigFloat']>;
  /** Greater than the specified value. */
  greaterThan?: Maybe<Scalars['BigFloat']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: Maybe<Scalars['BigFloat']>;
  /** Included in the specified list. */
  in?: Maybe<Array<Scalars['BigFloat']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: Maybe<Scalars['Boolean']>;
  /** Less than the specified value. */
  lessThan?: Maybe<Scalars['BigFloat']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: Maybe<Scalars['BigFloat']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: Maybe<Scalars['BigFloat']>;
  /** Not equal to the specified value. */
  notEqualTo?: Maybe<Scalars['BigFloat']>;
  /** Not included in the specified list. */
  notIn?: Maybe<Array<Scalars['BigFloat']>>;
};

/** A filter to be used against Boolean fields. All fields are combined with a logical ‘and.’ */
export type BooleanFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: Maybe<Scalars['Boolean']>;
  /** Equal to the specified value. */
  equalTo?: Maybe<Scalars['Boolean']>;
  /** Greater than the specified value. */
  greaterThan?: Maybe<Scalars['Boolean']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: Maybe<Scalars['Boolean']>;
  /** Included in the specified list. */
  in?: Maybe<Array<Scalars['Boolean']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: Maybe<Scalars['Boolean']>;
  /** Less than the specified value. */
  lessThan?: Maybe<Scalars['Boolean']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: Maybe<Scalars['Boolean']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: Maybe<Scalars['Boolean']>;
  /** Not equal to the specified value. */
  notEqualTo?: Maybe<Scalars['Boolean']>;
  /** Not included in the specified list. */
  notIn?: Maybe<Array<Scalars['Boolean']>>;
};

/** A filter to be used against Datetime fields. All fields are combined with a logical ‘and.’ */
export type DatetimeFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: Maybe<Scalars['Datetime']>;
  /** Equal to the specified value. */
  equalTo?: Maybe<Scalars['Datetime']>;
  /** Greater than the specified value. */
  greaterThan?: Maybe<Scalars['Datetime']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: Maybe<Scalars['Datetime']>;
  /** Included in the specified list. */
  in?: Maybe<Array<Scalars['Datetime']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: Maybe<Scalars['Boolean']>;
  /** Less than the specified value. */
  lessThan?: Maybe<Scalars['Datetime']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: Maybe<Scalars['Datetime']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: Maybe<Scalars['Datetime']>;
  /** Not equal to the specified value. */
  notEqualTo?: Maybe<Scalars['Datetime']>;
  /** Not included in the specified list. */
  notIn?: Maybe<Array<Scalars['Datetime']>>;
};

/** A filter to be used against Int fields. All fields are combined with a logical ‘and.’ */
export type IntFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: Maybe<Scalars['Int']>;
  /** Equal to the specified value. */
  equalTo?: Maybe<Scalars['Int']>;
  /** Greater than the specified value. */
  greaterThan?: Maybe<Scalars['Int']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: Maybe<Scalars['Int']>;
  /** Included in the specified list. */
  in?: Maybe<Array<Scalars['Int']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: Maybe<Scalars['Boolean']>;
  /** Less than the specified value. */
  lessThan?: Maybe<Scalars['Int']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: Maybe<Scalars['Int']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: Maybe<Scalars['Int']>;
  /** Not equal to the specified value. */
  notEqualTo?: Maybe<Scalars['Int']>;
  /** Not included in the specified list. */
  notIn?: Maybe<Array<Scalars['Int']>>;
};

/** A filter to be used against JSON fields. All fields are combined with a logical ‘and.’ */
export type JsonFilter = {
  /** Contained by the specified JSON. */
  containedBy?: Maybe<Scalars['JSON']>;
  /** Contains the specified JSON. */
  contains?: Maybe<Scalars['JSON']>;
  /** Contains all of the specified keys. */
  containsAllKeys?: Maybe<Array<Scalars['String']>>;
  /** Contains any of the specified keys. */
  containsAnyKeys?: Maybe<Array<Scalars['String']>>;
  /** Contains the specified key. */
  containsKey?: Maybe<Scalars['String']>;
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: Maybe<Scalars['JSON']>;
  /** Equal to the specified value. */
  equalTo?: Maybe<Scalars['JSON']>;
  /** Greater than the specified value. */
  greaterThan?: Maybe<Scalars['JSON']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: Maybe<Scalars['JSON']>;
  /** Included in the specified list. */
  in?: Maybe<Array<Scalars['JSON']>>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: Maybe<Scalars['Boolean']>;
  /** Less than the specified value. */
  lessThan?: Maybe<Scalars['JSON']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: Maybe<Scalars['JSON']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: Maybe<Scalars['JSON']>;
  /** Not equal to the specified value. */
  notEqualTo?: Maybe<Scalars['JSON']>;
  /** Not included in the specified list. */
  notIn?: Maybe<Array<Scalars['JSON']>>;
};

export type Log = Node & {
  __typename?: 'Log';
  address: Scalars['String'];
  blockHash: Scalars['String'];
  blockNumber: Scalars['BigFloat'];
  createdAt: Scalars['Datetime'];
  data?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  logIndex: Scalars['BigFloat'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID'];
  /** Reads a single `TransactionReceipt` that is related to this `Log`. */
  receipt?: Maybe<TransactionReceipt>;
  receiptId?: Maybe<Scalars['String']>;
  removed: Scalars['Boolean'];
  topics: Scalars['JSON'];
  transactionHash: Scalars['String'];
  transactionIndex: Scalars['BigFloat'];
  updatedAt: Scalars['Datetime'];
};

/** A filter to be used against `Log` object types. All fields are combined with a logical ‘and.’ */
export type LogFilter = {
  /** Filter by the object’s `address` field. */
  address?: Maybe<StringFilter>;
  /** Checks for all expressions in this list. */
  and?: Maybe<Array<LogFilter>>;
  /** Filter by the object’s `blockHash` field. */
  blockHash?: Maybe<StringFilter>;
  /** Filter by the object’s `blockNumber` field. */
  blockNumber?: Maybe<BigFloatFilter>;
  /** Filter by the object’s `createdAt` field. */
  createdAt?: Maybe<DatetimeFilter>;
  /** Filter by the object’s `data` field. */
  data?: Maybe<StringFilter>;
  /** Filter by the object’s `id` field. */
  id?: Maybe<StringFilter>;
  /** Filter by the object’s `logIndex` field. */
  logIndex?: Maybe<BigFloatFilter>;
  /** Negates the expression. */
  not?: Maybe<LogFilter>;
  /** Checks for any expressions in this list. */
  or?: Maybe<Array<LogFilter>>;
  /** Filter by the object’s `receiptId` field. */
  receiptId?: Maybe<StringFilter>;
  /** Filter by the object’s `removed` field. */
  removed?: Maybe<BooleanFilter>;
  /** Filter by the object’s `topics` field. */
  topics?: Maybe<JsonFilter>;
  /** Filter by the object’s `transactionHash` field. */
  transactionHash?: Maybe<StringFilter>;
  /** Filter by the object’s `transactionIndex` field. */
  transactionIndex?: Maybe<BigFloatFilter>;
  /** Filter by the object’s `updatedAt` field. */
  updatedAt?: Maybe<DatetimeFilter>;
};

/** A connection to a list of `Log` values. */
export type LogsConnection = {
  __typename?: 'LogsConnection';
  /** A list of edges which contains the `Log` and cursor to aid in pagination. */
  edges: Array<LogsEdge>;
  /** A list of `Log` objects. */
  nodes: Array<Maybe<Log>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Log` you could get from the connection. */
  totalCount: Scalars['Int'];
};

/** A `Log` edge in the connection. */
export type LogsEdge = {
  __typename?: 'LogsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']>;
  /** The `Log` at the end of the edge. */
  node?: Maybe<Log>;
};

/** Methods to use when ordering `Log`. */
export enum LogsOrderBy {
  AddressAsc = 'ADDRESS_ASC',
  AddressDesc = 'ADDRESS_DESC',
  BlockHashAsc = 'BLOCK_HASH_ASC',
  BlockHashDesc = 'BLOCK_HASH_DESC',
  BlockNumberAsc = 'BLOCK_NUMBER_ASC',
  BlockNumberDesc = 'BLOCK_NUMBER_DESC',
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  DataAsc = 'DATA_ASC',
  DataDesc = 'DATA_DESC',
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  LogIndexAsc = 'LOG_INDEX_ASC',
  LogIndexDesc = 'LOG_INDEX_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  ReceiptIdAsc = 'RECEIPT_ID_ASC',
  ReceiptIdDesc = 'RECEIPT_ID_DESC',
  RemovedAsc = 'REMOVED_ASC',
  RemovedDesc = 'REMOVED_DESC',
  TopicsAsc = 'TOPICS_ASC',
  TopicsDesc = 'TOPICS_DESC',
  TransactionHashAsc = 'TRANSACTION_HASH_ASC',
  TransactionHashDesc = 'TRANSACTION_HASH_DESC',
  TransactionIndexAsc = 'TRANSACTION_INDEX_ASC',
  TransactionIndexDesc = 'TRANSACTION_INDEX_DESC',
  UpdatedAtAsc = 'UPDATED_AT_ASC',
  UpdatedAtDesc = 'UPDATED_AT_DESC'
}

/** An object with a globally unique `ID`. */
export type Node = {
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID'];
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['Cursor']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['Cursor']>;
};

/** The root query type which gives access points into the data universe. */
export type Query = Node & {
  __typename?: 'Query';
  _metadata?: Maybe<_Metadata>;
  log?: Maybe<Log>;
  /** Reads a single `Log` using its globally unique `ID`. */
  logByNodeId?: Maybe<Log>;
  /** Reads and enables pagination through a set of `Log`. */
  logs?: Maybe<LogsConnection>;
  /** Fetches an object given its globally unique `ID`. */
  node?: Maybe<Node>;
  /** The root query type must be a `Node` to work well with Relay 1 mutations. This just resolves to `query`. */
  nodeId: Scalars['ID'];
  /**
   * Exposes the root query type nested one level down. This is helpful for Relay 1
   * which can only query top level fields if they are in a particular form.
   */
  query: Query;
  /** Reads and enables pagination through a set of `Subquery`. */
  subqueries?: Maybe<SubqueriesConnection>;
  subquery?: Maybe<Subquery>;
  subqueryByName?: Maybe<Subquery>;
  /** Reads a single `Subquery` using its globally unique `ID`. */
  subqueryByNodeId?: Maybe<Subquery>;
  transactionReceipt?: Maybe<TransactionReceipt>;
  /** Reads a single `TransactionReceipt` using its globally unique `ID`. */
  transactionReceiptByNodeId?: Maybe<TransactionReceipt>;
  /** Reads and enables pagination through a set of `TransactionReceipt`. */
  transactionReceipts?: Maybe<TransactionReceiptsConnection>;
};

/** The root query type which gives access points into the data universe. */
export type QueryLogArgs = {
  id: Scalars['String'];
};

/** The root query type which gives access points into the data universe. */
export type QueryLogByNodeIdArgs = {
  nodeId: Scalars['ID'];
};

/** The root query type which gives access points into the data universe. */
export type QueryLogsArgs = {
  after?: Maybe<Scalars['Cursor']>;
  before?: Maybe<Scalars['Cursor']>;
  filter?: Maybe<LogFilter>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Array<LogsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryNodeArgs = {
  nodeId: Scalars['ID'];
};

/** The root query type which gives access points into the data universe. */
export type QuerySubqueriesArgs = {
  after?: Maybe<Scalars['Cursor']>;
  before?: Maybe<Scalars['Cursor']>;
  filter?: Maybe<SubqueryFilter>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Array<SubqueriesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QuerySubqueryArgs = {
  id: Scalars['Int'];
};

/** The root query type which gives access points into the data universe. */
export type QuerySubqueryByNameArgs = {
  name: Scalars['String'];
};

/** The root query type which gives access points into the data universe. */
export type QuerySubqueryByNodeIdArgs = {
  nodeId: Scalars['ID'];
};

/** The root query type which gives access points into the data universe. */
export type QueryTransactionReceiptArgs = {
  id: Scalars['String'];
};

/** The root query type which gives access points into the data universe. */
export type QueryTransactionReceiptByNodeIdArgs = {
  nodeId: Scalars['ID'];
};

/** The root query type which gives access points into the data universe. */
export type QueryTransactionReceiptsArgs = {
  after?: Maybe<Scalars['Cursor']>;
  before?: Maybe<Scalars['Cursor']>;
  filter?: Maybe<TransactionReceiptFilter>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Array<TransactionReceiptsOrderBy>>;
};

/** A filter to be used against String fields. All fields are combined with a logical ‘and.’ */
export type StringFilter = {
  /** Not equal to the specified value, treating null like an ordinary value. */
  distinctFrom?: Maybe<Scalars['String']>;
  /** Not equal to the specified value, treating null like an ordinary value (case-insensitive). */
  distinctFromInsensitive?: Maybe<Scalars['String']>;
  /** Ends with the specified string (case-sensitive). */
  endsWith?: Maybe<Scalars['String']>;
  /** Ends with the specified string (case-insensitive). */
  endsWithInsensitive?: Maybe<Scalars['String']>;
  /** Equal to the specified value. */
  equalTo?: Maybe<Scalars['String']>;
  /** Equal to the specified value (case-insensitive). */
  equalToInsensitive?: Maybe<Scalars['String']>;
  /** Greater than the specified value. */
  greaterThan?: Maybe<Scalars['String']>;
  /** Greater than the specified value (case-insensitive). */
  greaterThanInsensitive?: Maybe<Scalars['String']>;
  /** Greater than or equal to the specified value. */
  greaterThanOrEqualTo?: Maybe<Scalars['String']>;
  /** Greater than or equal to the specified value (case-insensitive). */
  greaterThanOrEqualToInsensitive?: Maybe<Scalars['String']>;
  /** Included in the specified list. */
  in?: Maybe<Array<Scalars['String']>>;
  /** Included in the specified list (case-insensitive). */
  inInsensitive?: Maybe<Array<Scalars['String']>>;
  /** Contains the specified string (case-sensitive). */
  includes?: Maybe<Scalars['String']>;
  /** Contains the specified string (case-insensitive). */
  includesInsensitive?: Maybe<Scalars['String']>;
  /** Is null (if `true` is specified) or is not null (if `false` is specified). */
  isNull?: Maybe<Scalars['Boolean']>;
  /** Less than the specified value. */
  lessThan?: Maybe<Scalars['String']>;
  /** Less than the specified value (case-insensitive). */
  lessThanInsensitive?: Maybe<Scalars['String']>;
  /** Less than or equal to the specified value. */
  lessThanOrEqualTo?: Maybe<Scalars['String']>;
  /** Less than or equal to the specified value (case-insensitive). */
  lessThanOrEqualToInsensitive?: Maybe<Scalars['String']>;
  /** Matches the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters. */
  like?: Maybe<Scalars['String']>;
  /** Matches the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters. */
  likeInsensitive?: Maybe<Scalars['String']>;
  /** Equal to the specified value, treating null like an ordinary value. */
  notDistinctFrom?: Maybe<Scalars['String']>;
  /** Equal to the specified value, treating null like an ordinary value (case-insensitive). */
  notDistinctFromInsensitive?: Maybe<Scalars['String']>;
  /** Does not end with the specified string (case-sensitive). */
  notEndsWith?: Maybe<Scalars['String']>;
  /** Does not end with the specified string (case-insensitive). */
  notEndsWithInsensitive?: Maybe<Scalars['String']>;
  /** Not equal to the specified value. */
  notEqualTo?: Maybe<Scalars['String']>;
  /** Not equal to the specified value (case-insensitive). */
  notEqualToInsensitive?: Maybe<Scalars['String']>;
  /** Not included in the specified list. */
  notIn?: Maybe<Array<Scalars['String']>>;
  /** Not included in the specified list (case-insensitive). */
  notInInsensitive?: Maybe<Array<Scalars['String']>>;
  /** Does not contain the specified string (case-sensitive). */
  notIncludes?: Maybe<Scalars['String']>;
  /** Does not contain the specified string (case-insensitive). */
  notIncludesInsensitive?: Maybe<Scalars['String']>;
  /** Does not match the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters. */
  notLike?: Maybe<Scalars['String']>;
  /** Does not match the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters. */
  notLikeInsensitive?: Maybe<Scalars['String']>;
  /** Does not start with the specified string (case-sensitive). */
  notStartsWith?: Maybe<Scalars['String']>;
  /** Does not start with the specified string (case-insensitive). */
  notStartsWithInsensitive?: Maybe<Scalars['String']>;
  /** Starts with the specified string (case-sensitive). */
  startsWith?: Maybe<Scalars['String']>;
  /** Starts with the specified string (case-insensitive). */
  startsWithInsensitive?: Maybe<Scalars['String']>;
};

/** A connection to a list of `Subquery` values. */
export type SubqueriesConnection = {
  __typename?: 'SubqueriesConnection';
  /** A list of edges which contains the `Subquery` and cursor to aid in pagination. */
  edges: Array<SubqueriesEdge>;
  /** A list of `Subquery` objects. */
  nodes: Array<Maybe<Subquery>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Subquery` you could get from the connection. */
  totalCount: Scalars['Int'];
};

/** A `Subquery` edge in the connection. */
export type SubqueriesEdge = {
  __typename?: 'SubqueriesEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']>;
  /** The `Subquery` at the end of the edge. */
  node?: Maybe<Subquery>;
};

/** Methods to use when ordering `Subquery`. */
export enum SubqueriesOrderBy {
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  DbSchemaAsc = 'DB_SCHEMA_ASC',
  DbSchemaDesc = 'DB_SCHEMA_DESC',
  HashAsc = 'HASH_ASC',
  HashDesc = 'HASH_DESC',
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  NameAsc = 'NAME_ASC',
  NameDesc = 'NAME_DESC',
  Natural = 'NATURAL',
  NetworkAsc = 'NETWORK_ASC',
  NetworkDesc = 'NETWORK_DESC',
  NetworkGenesisAsc = 'NETWORK_GENESIS_ASC',
  NetworkGenesisDesc = 'NETWORK_GENESIS_DESC',
  NextBlockHeightAsc = 'NEXT_BLOCK_HEIGHT_ASC',
  NextBlockHeightDesc = 'NEXT_BLOCK_HEIGHT_DESC',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  UpdatedAtAsc = 'UPDATED_AT_ASC',
  UpdatedAtDesc = 'UPDATED_AT_DESC',
  VersionAsc = 'VERSION_ASC',
  VersionDesc = 'VERSION_DESC'
}

export type Subquery = Node & {
  __typename?: 'Subquery';
  createdAt: Scalars['Datetime'];
  dbSchema: Scalars['String'];
  hash: Scalars['String'];
  id: Scalars['Int'];
  name: Scalars['String'];
  network?: Maybe<Scalars['String']>;
  networkGenesis?: Maybe<Scalars['String']>;
  nextBlockHeight: Scalars['Int'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID'];
  updatedAt: Scalars['Datetime'];
  version: Scalars['Int'];
};

/** A filter to be used against `Subquery` object types. All fields are combined with a logical ‘and.’ */
export type SubqueryFilter = {
  /** Checks for all expressions in this list. */
  and?: Maybe<Array<SubqueryFilter>>;
  /** Filter by the object’s `createdAt` field. */
  createdAt?: Maybe<DatetimeFilter>;
  /** Filter by the object’s `dbSchema` field. */
  dbSchema?: Maybe<StringFilter>;
  /** Filter by the object’s `hash` field. */
  hash?: Maybe<StringFilter>;
  /** Filter by the object’s `id` field. */
  id?: Maybe<IntFilter>;
  /** Filter by the object’s `name` field. */
  name?: Maybe<StringFilter>;
  /** Filter by the object’s `network` field. */
  network?: Maybe<StringFilter>;
  /** Filter by the object’s `networkGenesis` field. */
  networkGenesis?: Maybe<StringFilter>;
  /** Filter by the object’s `nextBlockHeight` field. */
  nextBlockHeight?: Maybe<IntFilter>;
  /** Negates the expression. */
  not?: Maybe<SubqueryFilter>;
  /** Checks for any expressions in this list. */
  or?: Maybe<Array<SubqueryFilter>>;
  /** Filter by the object’s `updatedAt` field. */
  updatedAt?: Maybe<DatetimeFilter>;
  /** Filter by the object’s `version` field. */
  version?: Maybe<IntFilter>;
};

// TODO: these types are not very useful actually, maybe just defined our own type
export type TransactionReceipt = Node & {
  __typename?: 'TransactionReceipt';
  blockHash: Scalars['String'];
  blockNumber: Scalars['BigFloat'];
  contractAddress?: Maybe<Scalars['String']>;
  createdAt: Scalars['Datetime'];
  effectiveGasPrice?: Scalars['BigFloat'];
  cumulativeGasUsed: Scalars['BigFloat'];
  from: Scalars['String'];
  gasUsed: Scalars['BigFloat'];
  id: Scalars['String'];
  /** Reads and enables pagination through a set of `Log`. */
  logs: LogsConnection;
  logsBloom: Scalars['String'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID'];
  status: Scalars['BigFloat'];
  to?: Maybe<Scalars['String']>;
  transactionHash: Scalars['String'];
  transactionIndex: Scalars['BigFloat'];
  type?: Maybe<Scalars['BigFloat']>;
  updatedAt: Scalars['Datetime'];
};

export type TransactionReceiptLogsArgs = {
  after?: Maybe<Scalars['Cursor']>;
  before?: Maybe<Scalars['Cursor']>;
  filter?: Maybe<LogFilter>;
  first?: Maybe<Scalars['Int']>;
  last?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Array<LogsOrderBy>>;
};

/** A filter to be used against `TransactionReceipt` object types. All fields are combined with a logical ‘and.’ */
export type TransactionReceiptFilter = {
  /** Checks for all expressions in this list. */
  and?: Maybe<Array<TransactionReceiptFilter>>;
  /** Filter by the object’s `blockHash` field. */
  blockHash?: Maybe<StringFilter>;
  /** Filter by the object’s `blockNumber` field. */
  blockNumber?: Maybe<BigFloatFilter>;
  /** Filter by the object’s `contractAddress` field. */
  contractAddress?: Maybe<StringFilter>;
  /** Filter by the object’s `createdAt` field. */
  createdAt?: Maybe<DatetimeFilter>;
  /** Filter by the object’s `cumulativeGasUsed` field. */
  cumulativeGasUsed?: Maybe<BigFloatFilter>;
  /** Filter by the object’s `from` field. */
  from?: Maybe<StringFilter>;
  /** Filter by the object’s `gasUsed` field. */
  gasUsed?: Maybe<BigFloatFilter>;
  /** Filter by the object’s `id` field. */
  id?: Maybe<StringFilter>;
  /** Filter by the object’s `logsBloom` field. */
  logsBloom?: Maybe<StringFilter>;
  /** Negates the expression. */
  not?: Maybe<TransactionReceiptFilter>;
  /** Checks for any expressions in this list. */
  or?: Maybe<Array<TransactionReceiptFilter>>;
  /** Filter by the object’s `status` field. */
  status?: Maybe<BigFloatFilter>;
  /** Filter by the object’s `to` field. */
  to?: Maybe<StringFilter>;
  /** Filter by the object’s `transactionHash` field. */
  transactionHash?: Maybe<StringFilter>;
  /** Filter by the object’s `transactionIndex` field. */
  transactionIndex?: Maybe<BigFloatFilter>;
  /** Filter by the object’s `type` field. */
  type?: Maybe<BigFloatFilter>;
  /** Filter by the object’s `updatedAt` field. */
  updatedAt?: Maybe<DatetimeFilter>;
};

/** A connection to a list of `TransactionReceipt` values. */
export type TransactionReceiptsConnection = {
  __typename?: 'TransactionReceiptsConnection';
  /** A list of edges which contains the `TransactionReceipt` and cursor to aid in pagination. */
  edges: Array<TransactionReceiptsEdge>;
  /** A list of `TransactionReceipt` objects. */
  nodes: Array<Maybe<TransactionReceipt>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `TransactionReceipt` you could get from the connection. */
  totalCount: Scalars['Int'];
};

/** A `TransactionReceipt` edge in the connection. */
export type TransactionReceiptsEdge = {
  __typename?: 'TransactionReceiptsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']>;
  /** The `TransactionReceipt` at the end of the edge. */
  node?: Maybe<TransactionReceipt>;
};

/** Methods to use when ordering `TransactionReceipt`. */
export enum TransactionReceiptsOrderBy {
  BlockHashAsc = 'BLOCK_HASH_ASC',
  BlockHashDesc = 'BLOCK_HASH_DESC',
  BlockNumberAsc = 'BLOCK_NUMBER_ASC',
  BlockNumberDesc = 'BLOCK_NUMBER_DESC',
  ContractAddressAsc = 'CONTRACT_ADDRESS_ASC',
  ContractAddressDesc = 'CONTRACT_ADDRESS_DESC',
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  CumulativeGasUsedAsc = 'CUMULATIVE_GAS_USED_ASC',
  CumulativeGasUsedDesc = 'CUMULATIVE_GAS_USED_DESC',
  FromAsc = 'FROM_ASC',
  FromDesc = 'FROM_DESC',
  GasUsedAsc = 'GAS_USED_ASC',
  GasUsedDesc = 'GAS_USED_DESC',
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  LogsBloomAsc = 'LOGS_BLOOM_ASC',
  LogsBloomDesc = 'LOGS_BLOOM_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  StatusAsc = 'STATUS_ASC',
  StatusDesc = 'STATUS_DESC',
  ToAsc = 'TO_ASC',
  ToDesc = 'TO_DESC',
  TransactionHashAsc = 'TRANSACTION_HASH_ASC',
  TransactionHashDesc = 'TRANSACTION_HASH_DESC',
  TransactionIndexAsc = 'TRANSACTION_INDEX_ASC',
  TransactionIndexDesc = 'TRANSACTION_INDEX_DESC',
  TypeAsc = 'TYPE_ASC',
  TypeDesc = 'TYPE_DESC',
  UpdatedAtAsc = 'UPDATED_AT_ASC',
  UpdatedAtDesc = 'UPDATED_AT_DESC'
}

export type _Metadata = {
  __typename?: '_Metadata';
  chain?: Maybe<Scalars['String']>;
  genesisHash?: Maybe<Scalars['String']>;
  indexerHealthy?: Maybe<Scalars['Boolean']>;
  indexerNodeVersion?: Maybe<Scalars['String']>;
  lastProcessedHeight?: Maybe<Scalars['Int']>;
  lastProcessedTimestamp?: Maybe<Scalars['Date']>;
  queryNodeVersion?: Maybe<Scalars['String']>;
  specName?: Maybe<Scalars['String']>;
  targetHeight?: Maybe<Scalars['Int']>;
};
