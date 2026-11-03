import { competitorTargets } from './modules/inputs.js';
import { settings } from './modules/settings.js';
import { fetchKeywords } from './modules/fetcher.js';
import { saveToCsv } from './modules/storage.js';

async function run() {
  try {
    const rawItems = await fetchKeywords(competitorTargets, settings);
    
    // 1. Remove Duplicates using a Map
    const uniqueMap = new Map();
    rawItems.forEach(item => {
      if (item.keyword && !uniqueMap.has(item.keyword)) {
        uniqueMap.set(item.keyword, item);
      }
    });
    
    const items = Array.from(uniqueMap.values());
    console.log(`Removed duplicates. Proceeding with ${items.length} unique keywords.`);

    // 2. Chained Sorting: 1. Difficulty (Ascending), 2. Volume (Descending)
    items.sort((a, b) => {
      const diffA = a.keyword_difficulty || 0;
      const diffB = b.keyword_difficulty || 0;
      
      if (diffA !== diffB) {
        return diffA - diffB; // Primary: Lowest difficulty first
      }
      
      const volA = a.keyword_info?.search_volume || 0;
      const volB = b.keyword_info?.search_volume || 0;
      return volB - volA; // Secondary: Highest volume first
    });

    // 3. Save to 3 separate CSV files based on KD
    saveToCsv(items);
  } catch (error) {
    console.error("Execution Error:", error.message);
    process.exit(1);
  }
}

run();