export interface SchemaColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  isAutoIncrement?: boolean;
  defaultValue?: string;
  note?: string;
}

export interface SchemaIndex {
  name?: string;
  columns: string[];
  type?: string;
  unique?: boolean;
  pk?: boolean;
  note?: string;
}

export interface SchemaTable {
  id: string;
  schema?: string;
  name: string;
  columns: SchemaColumn[];
  indexes: SchemaIndex[];
  note?: string;
  /** DBML table setting: `Table … [headerColor: #hex]` */
  headerColor?: string;
  /** Group id if table belongs to a `TableGroup` */
  groupId?: string;
}

export interface SchemaTableGroup {
  id: string;
  schema?: string;
  name: string;
  tableIds: string[];
  color?: string;
  note?: string;
}

export interface SchemaReference {
  id: string;
  sourceTableId: string;
  sourceColumns: string[];
  targetTableId: string;
  targetColumns: string[];
}

export interface SchemaEnum {
  id: string;
  schema?: string;
  name: string;
  values: string[];
}

export interface SchemaModel {
  tables: SchemaTable[];
  references: SchemaReference[];
  enums: SchemaEnum[];
  tableGroups?: SchemaTableGroup[];
}
