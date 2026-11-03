import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Generate a random 3-character string for this specific run
const runPrefix = Math.random().toString(36).substring(2, 5);

function escapeCsv(value) {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

function buildCsvContent(items, includeSources = false) {
  const headers = includeSources 
    ? "Keyword,Search Volume,CPC,Competition,Difficulty,Sources\n"
    : "Keyword,Search Volume,CPC,Competition,Difficulty\n";
  
  const rows = items.map(item => {
    const keyword = escapeCsv(item.keyword);
    const searchVolume = item.keyword_info?.search_volume ?? 0;
    const cpc = item.keyword_info?.cpc ?? 0;
    const competition = item.keyword_info?.competition_level ?? 'UNKNOWN';
    const difficulty = item.keyword_properties?.keyword_difficulty ?? '';
    
    if (includeSources) {
      const sources = escapeCsv(item.sources?.join(' | ') || '');
      return `${keyword},${searchVolume},${cpc},${competition},${difficulty},${sources}`;
    }
    return `${keyword},${searchVolume},${cpc},${competition},${difficulty}`;
  });

  return headers + rows.join('\n');
}

export async function uploadRawTargetJsonsToR2(byTarget) {
  for (const [target, items] of Object.entries(byTarget)) {
    const brandName = target.replace(/^https?:\/\/(www\.)?/, '').split('.')[0];
    
    // Apply prefix to R2 JSON files
    const filename = `${runPrefix}_${brandName}_raw.json`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `keyword-research/raw-json/${filename}`,
      Body: JSON.stringify(items, null, 2),
      ContentType: 'application/json',
    });

    try {
      await s3.send(command);
      console.log(`Uploaded ${filename} to Cloudflare R2.`);
    } catch (error) {
      console.error(`Failed to upload ${filename} to R2:`, error.message);
    }
  }
}

export function saveBrandCsvs(byTarget) {
  for (const [target, items] of Object.entries(byTarget)) {
    const brandName = target.replace(/^https?:\/\/(www\.)?/, '').split('.')[0];
    
    // Apply prefix to local brand CSVs
    const filename = `${runPrefix}_${brandName}_sorted.csv`;
    const storagePath = path.join(__dirname, '..', 'storage', filename);

    items.sort((a, b) => {
      const diffA = a.keyword_properties?.keyword_difficulty ?? 101;
      const diffB = b.keyword_properties?.keyword_difficulty ?? 101;
      if (diffA !== diffB) return diffA - diffB;
      const volA = a.keyword_info?.search_volume ?? 0;
      const volB = b.keyword_info?.search_volume ?? 0;
      return volB - volA; 
    });

    const csvContent = buildCsvContent(items, false);
    fs.writeFileSync(storagePath, csvContent, 'utf8');
    console.log(`Saved ${items.length} keywords to ${filename} locally.`);
  }
}

export function saveMasterCsv(items) {
  // Apply prefix to local master CSV
  const filename = `${runPrefix}_master_keywords.csv`;
  const storagePath = path.join(__dirname, '..', 'storage', filename);
  
  if (!items || items.length === 0) {
    fs.writeFileSync(storagePath, "Keyword,Search Volume,CPC,Competition,Difficulty,Sources\n", 'utf8');
    return;
  }

  const csvContent = buildCsvContent(items, true);
  fs.writeFileSync(storagePath, csvContent, 'utf8');
  console.log(`Saved ${items.length} deduplicated keywords to ${filename} locally.`);
}