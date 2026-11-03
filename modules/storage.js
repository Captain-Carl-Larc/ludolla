import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a random 3-character string for this specific run
const runPrefix = Math.random().toString(36).substring(2, 5);

function escapeCsv(value) {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

export function saveRawTargetJsons(byTarget) {
  for (const [target, items] of Object.entries(byTarget)) {
    const brandName = target.replace(/^https?:\/\/(www\.)?/, '').split('.')[0];
    
    // Apply the 3-character prefix to the JSON file
    const filename = `${runPrefix}_${brandName}_raw.json`;
    const storagePath = path.join(__dirname, '..', 'storage', filename);
    
    fs.writeFileSync(storagePath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`Saved raw JSON object to ${filename}`);
  }
}

export function saveMasterCsv(items) {
  // Apply the 3-character prefix to the CSV file
  const filename = `${runPrefix}_master_keywords.csv`;
  const storagePath = path.join(__dirname, '..', 'storage', filename);

  if (!items || items.length === 0) {
    fs.writeFileSync(storagePath, "Keyword,Search Volume,CPC,Competition,Difficulty,Sources\n", 'utf8');
    console.log(`Saved empty headers to ${filename}`);
    return;
  }

  const headers = "Keyword,Search Volume,CPC,Competition,Difficulty,Sources\n";
  const rows = items.map(item => {
    const keyword = escapeCsv(item.keyword);
    const searchVolume = item.keyword_info?.search_volume ?? 0;
    const cpc = item.keyword_info?.cpc ?? 0;
    const competition = item.keyword_info?.competition_level ?? 'UNKNOWN';
    const difficulty = item.keyword_properties?.keyword_difficulty ?? '';
    const sources = escapeCsv(item.sources.join(' | '));

    return `${keyword},${searchVolume},${cpc},${competition},${difficulty},${sources}`;
  });

  fs.writeFileSync(storagePath, headers + rows.join('\n'), 'utf8');
  console.log(`Saved ${items.length} deduplicated keywords to ${filename}`);
}