import Papa from 'papaparse';
import { Client, ClientConfig } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

interface QueryTarget {
  schema: string,
  tables: string[],
  filenames: string[],
}
type QueryParams = ClientConfig & QueryTarget;

const getAllTables = async (client: Client, schema: string) => {
  console.log(`querying all tables under schema ${schema} ...`);

  const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1
    `, [schema]);

  return res.rows.map(row => row.table_name);
};

export const pullDataFromDb = async ({
  host,
  port,
  database,
  user,
  password,
  schema,
  tables,
  filenames,
}: QueryParams) => {
  if (tables.length !== filenames.length) {
    throw new Error('tables and filenames should have the same length');
  }

  const client = new Client({
    host: host,
    port: port,
    database: database,
    user: user,
    password: password,
  });

  const savedFiles = [];
  try {
    console.log('connecting to db ...');
    await client.connect();
    console.log('db connected!');

    const tableNames = tables ?? await getAllTables(client, schema);

    for (const [i, table] of tableNames.entries()) {
      const targetFile = filenames[i] ?? `${table}.csv`;
      const dataRes = await client.query(`SELECT * FROM "${schema}"."${table}"`);

      const csv = Papa.unparse(dataRes.rows);
      fs.writeFileSync(targetFile, csv);

      savedFiles.push(targetFile);
      console.log(`saved [${schema}.${table}] data to [${targetFile}]`);
    }

  } catch (err) {
    console.error('Error fetching data:', err);
  } finally {
    await client.end();
  }

  return savedFiles;
};
