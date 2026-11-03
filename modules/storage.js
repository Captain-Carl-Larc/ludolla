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

function escapeCsv(value) {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

// Helper to build CSV formatting cleanly for both individual and master files
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

// 1. Send the heavy JSON files off to Cloudflare R2
export async function uploadRawTargetJsonsToR2(byTarget) {
  for (const [target, items] of Object.entries(byTarget)) {
    const brandName = target.replace(/^https?:\/\/(www\.)?/, '').split('.')[0];
    const filename = `${brandName}_raw.json`;
    
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

// 2. Save sorted individual CSVs locally for GitHub to commit
export function saveBrandCsvs(byTarget) {
  for (const [target, items] of Object.entries(byTarget)) {
    const brandName = target.replace(/^https?:\/\/(www\.)?/, '').split('.')[0];
    const filename = `${brandName}_sorted.csv`;
    const storagePath = path.join(__dirname, '..', 'storage', filename);

    // Apply your standard chained sort to the individual brand files
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

// 3. Save the deduplicated master CSV locally for GitHub to commit
export function saveMasterCsv(items) {
  const filename = 'master_keywords.csv';
  const storagePath = path.join(__dirname, '..', 'storage', filename);
  
  if (!items || items.length === 0) {
    fs.writeFileSync(storagePath, "Keyword,Search Volume,CPC,Competition,Difficulty,Sources\n", 'utf8');
    return;
  }

  const csvContent = buildCsvContent(items, true);
  fs.writeFileSync(storagePath, csvContent, 'utf8');
  console.log(`Saved ${items.length} deduplicated keywords to ${filename} locally.`);
}