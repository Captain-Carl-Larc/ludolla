import { competitorTargets } from './modules/inputs.js';
import { settings } from './modules/settings.js';
import { fetchKeywords } from './modules/fetcher.js';
import { saveToCsv } from './modules/storage.js';

async function run() {
  try {
    const items = await fetchKeywords(competitorTargets, settings);
    
    // Chained Sorting: 1. Difficulty (Ascending), 2. Volume (Descending)
    items.sort((a, b) => {
      const diffA = a.keyword_difficulty || 0;
      const diffB = b.keyword_difficulty || 0;
      
      if (diffA !== diffB) {
        return diffA - diffB; // Primary: Lowest difficulty first
      }
      
      const volA = a.keyword_info?.search_volume || 0;
      const volB = b.keyword_info?.search_volume || 0;
      return volB - volA; // Secondary: Highest volume first if difficulty is a tie
    });

    saveToCsv(items);
  } catch (error) {
    console.error("Execution Error:", error.message);
    process.exit(1);
  }
}

run();