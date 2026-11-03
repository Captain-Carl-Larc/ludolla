import { competitorTargets } from './modules/inputs.js';
import { settings } from './modules/settings.js';
import { fetchKeywords } from './modules/fetcher.js';
import { saveToCsv, saveRawTargetCsvs } from './modules/storage.js';

async function run() {
  try {
    const { allItems, byTarget } = await fetchKeywords(competitorTargets, settings);
    
    // 1. Save untouched raw files for each brand immediately
    saveRawTargetCsvs(byTarget);
    
    // 2. Remove Duplicates from the master list
    const uniqueMap = new Map();
    allItems.forEach(item => {
      if (item.keyword && !uniqueMap.has(item.keyword)) {
        uniqueMap.set(item.keyword, item);
      }
    });
    
    const items = Array.from(uniqueMap.values());
    console.log(`Removed duplicates. Proceeding with ${items.length} unique keywords.`);

    // 3. Chained Sorting
    items.sort((a, b) => {
      const diffA = a.keyword_difficulty || 0;
      const diffB = b.keyword_difficulty || 0;
      
      if (diffA !== diffB) return diffA - diffB;
      
      const volA = a.keyword_info?.search_volume || 0;
      const volB = b.keyword_info?.search_volume || 0;
      return volB - volA; 
    });

    // 4. Save to master difficulty files
    saveToCsv(items);
  } catch (error) {
    console.error("Execution Error:", error.message);
    process.exit(1);
  }
}

run();