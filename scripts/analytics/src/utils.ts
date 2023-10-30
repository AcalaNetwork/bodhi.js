import Papa from 'papaparse';
import fs from 'fs';

export const readCSV = async (filename: string): Promise<any[]> => {
  const fileContent = fs.readFileSync(filename, 'utf8');

  const result = Papa.parse(fileContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });

  if (result.errors.length > 0) {
    throw new Error(`Error parsing CSV: ${result.errors[0].message}`);
  }

  return result.data;
};

export const writeCSV = (filename: string, data: any[]) => {
  const csv = Papa.unparse(data);
  fs.writeFileSync(filename, csv);
};
