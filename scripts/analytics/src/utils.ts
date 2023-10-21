import * as fastcsv from 'fast-csv';
import fs from 'fs';

export const readCSV = async (filename: string) => {
  const data: any[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filename)
      .pipe(fastcsv.parse({ headers: true }))
      .on('data', (row) => data.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  return data;
};

export const writeCSV = async (filename: string, data: any[]) => new Promise<void>((resolve, reject) => {
  const writeStream = fs.createWriteStream(filename);
  fastcsv.write(data, { headers: true })
    .pipe(writeStream)
    .on('finish', resolve)
    .on('error', reject);
});
