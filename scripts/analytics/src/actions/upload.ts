import axios from 'axios';
import fs from 'fs/promises';

import { FP_DATA_TYPE, getFPSchema } from '../consts';
import { toFPCompatible } from './transform';
import { readCSV } from '../utils';

const DUNE_URL = 'https://api.dune.com/api/v1/table/upload/csv';
const DAPP_LOOKER_URL = 'https://api.dapplooker.com/offchain/projects/csv';
const FOOTPRINT_URL = 'https://www.footprint.network/api/v1/custom/data/upload';

interface UploadParamsBase {
  tableName: string,
  filename: string,
  apiKey: string,
}

interface UploadParamsDune extends UploadParamsBase {
  description: string,
}

interface UploadParamsFP extends UploadParamsBase {
  type: FP_DATA_TYPE,
}

export const uploadToDune = async ({
  filename,
  apiKey,
  tableName,
  description,
}: UploadParamsDune) => {
  console.log(`uploading data to dune table ${tableName} ...`);
  const data = await fs.readFile(filename, 'utf-8');

  const headers = {
    'X-Dune-Api-Key': apiKey,
  };

  const payload = {
    table_name: tableName,
    description: description,
    is_private: false,
    data,
  };

  const res = await axios.post(DUNE_URL, payload, { headers });

  if (res.status !== 200 || res.data.success !== true) {
    throw new Error(`upload data to Dune failed: ${JSON.stringify(res)}`);
  }

  console.log('upload finished!');

  return res.data;
};

export const uploadToDappLooker = async ({
  filename,
  apiKey,
}: UploadParamsBase) => {
  console.log('uploading data to Dapplooker ...');
  const data = await fs.readFile(filename, 'utf-8');

  const headers = {
    'Content-Type': 'text/csv',
    Authorization: `Bearer ${apiKey}`,
  };

  const payload = data;

  const res = await axios.post(DAPP_LOOKER_URL, payload, { headers });
  console.log(res);

  if (res.status !== 200 || res.data.success !== true) {
    throw new Error(`upload data to Dapplooker failed: ${JSON.stringify(res.data)}`);
  }

  console.log('upload finished!');

  return res.data;
};

export const uploadToFootprint = async ({
  filename,
  tableName,
  apiKey,
  type,
}: UploadParamsFP) => {
  console.log(`uploading ${filename} data to footprint as ${tableName}...`);

  const data = await readCSV(filename);
  const tableData = toFPCompatible(data, type);
  const tableFieldSchema = getFPSchema(type);

  const headers = {
    accept: 'application/json',
    'api-key': apiKey,
    'content-type': 'application/json',
  };

  const payload = JSON.stringify({
    belongType: 'public',
    updateForce: true,
    tableFieldSchema,
    tableName,
    tableData,
  });

  const res = await axios.post(FOOTPRINT_URL, payload, { headers });

  if (res.status !== 200 || res.data.code !== 0) {
    throw new Error(`upload data to footprint failed: ${JSON.stringify(res.data)}`);
  }

  console.log(res.data);
};
