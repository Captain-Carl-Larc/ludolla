import { competitorTargets } from './modules/inputs.js';
import { settings } from './modules/settings.js';
import { fetchKeywords } from './modules/fetcher.js';
import { saveRawTargetJsons, saveMasterCsv } from './modules/storage.js';

async function run() {
  try {
    const { allItems, byTarget } = await fetchKeywords(competitorTargets, settings);
    
    // Save the raw JSON objects immediately
    saveRawTargetJsons(byTarget);
    
    // Deduplicate while preserving all competitor sources
    const uniqueMap = new Map();
    allItems.forEach(item => {
      if (!item.keyword) return;
      
      if (!uniqueMap.has(item.keyword)) {
        // First time seeing this keyword, initialize its sources array
        uniqueMap.set(item.keyword, { ...item, sources: [item.sourceBrand] });
      } else {
        // Keyword already exists, append this new brand to its sources
        const existing = uniqueMap.get(item.keyword);
        if (!existing.sources.includes(item.sourceBrand)) {
          existing.sources.push(item.sourceBrand);
        }
      }
    });
    
    const items = Array.from(uniqueMap.values());

    // Sort by Difficulty (Ascending), then Volume (Descending)
    items.sort((a, b) => {
      const diffA = a.keyword_properties?.keyword_difficulty ?? 101;
      const diffB = b.keyword_properties?.keyword_difficulty ?? 101;
      
      if (diffA !== diffB) return diffA - diffB;
      
      const volA = a.keyword_info?.search_volume ?? 0;
      const volB = b.keyword_info?.search_volume ?? 0;
      return volB - volA; 
    });

    // Save the finalized master list
    saveMasterCsv(items);
  } catch (error) {
    console.error("Execution Error:", error.message);
    process.exit(1);
  }
}

run();