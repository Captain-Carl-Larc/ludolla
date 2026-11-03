import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function saveToCsv(items) {
  if (!items || items.length === 0) {
    console.log("No items to save.");
    return;
  }

  const easy = [];
  const medium = [];
  const hard = [];

  // Categorize keywords by difficulty
  items.forEach(item => {
    const difficulty = item.keyword_difficulty || 0;
    if (difficulty <= 30) {
      easy.push(item);
    } else if (difficulty <= 69) {
      medium.push(item);
    } else {
      hard.push(item);
    }
  });

  const writeCsv = (data, filename) => {
    if (data.length === 0) {
      console.log(`No keywords found for ${filename}`);
      return;
    }

    const headers = "Keyword,Search Volume,CPC,Competition,Difficulty\n";
    const rows = data.map(item => {
      const keyword = `"${item.keyword || ''}"`; 
      const searchVolume = item.keyword_info?.search_volume || 0;
      const cpc = item.keyword_info?.cpc || 0;
      const competition = item.keyword_info?.competition_level || 'UNKNOWN';
      const difficulty = item.keyword_difficulty || 0;

      return `${keyword},${searchVolume},${cpc},${competition},${difficulty}`;
    });

    const csvContent = headers + rows.join('\n');
    const storagePath = path.join(__dirname, '..', 'storage', filename);

    fs.writeFileSync(storagePath, csvContent, 'utf8');
    console.log(`Successfully saved ${data.length} keywords to ${filename}`);
  };

  writeCsv(easy, 'dental_keywords_easy_0_30.csv');
  writeCsv(medium, 'dental_keywords_medium_31_69.csv');
  writeCsv(hard, 'dental_keywords_hard_70_100.csv');
}