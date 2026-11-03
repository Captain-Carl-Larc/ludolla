import { competitorTargets } from './modules/inputs.js';
import { settings } from './modules/settings.js';
import { fetchKeywords } from './modules/fetcher.js';
import { uploadRawTargetJsonsToR2, saveBrandCsvs, saveMasterCsv } from './modules/storage.js';

async function run() {
  try {
    const { allItems, byTarget } = await fetchKeywords(competitorTargets, settings);
    
    // 1. Stream the massive JSON objects directly to R2 (bypassing GitHub)
    await uploadRawTargetJsonsToR2(byTarget);
    
    // 2. Generate and save the sorted individual brand CSVs locally
    saveBrandCsvs(byTarget);
    
    // 3. Deduplicate and merge sources for the master list
    const uniqueMap = new Map();
    allItems.forEach(item => {
      if (!item.keyword) return;
      
      if (!uniqueMap.has(item.keyword)) {
        uniqueMap.set(item.keyword, { ...item, sources: [item.sourceBrand] });
      } else {
        const existing = uniqueMap.get(item.keyword);
        if (!existing.sources.includes(item.sourceBrand)) {
          existing.sources.push(item.sourceBrand);
        }
      }
    });
    
    const masterItems = Array.from(uniqueMap.values());

    // 4. Sort the master list
    masterItems.sort((a, b) => {
      const diffA = a.keyword_properties?.keyword_difficulty ?? 101;
      const diffB = b.keyword_properties?.keyword_difficulty ?? 101;
      
      if (diffA !== diffB) return diffA - diffB;
      
      const volA = a.keyword_info?.search_volume ?? 0;
      const volB = b.keyword_info?.search_volume ?? 0;
      return volB - volA; 
    });

    // 5. Save the master CSV locally
    saveMasterCsv(masterItems);
  } catch (error) {
    console.error("Execution Error:", error.message);
    process.exit(1);
  }
}

run();