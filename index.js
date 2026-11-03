import { competitorTargets } from './modules/inputs.js';
import { settings } from './modules/settings.js';
import { fetchKeywords } from './modules/fetcher.js';
import { saveToCsv } from './modules/storage.js';

async function run() {
  try {
    const items = await fetchKeywords(competitorTargets, settings);
    
    items.sort((a, b) => {
      const volA = a.keyword_info?.search_volume || 0;
      const volB = b.keyword_info?.search_volume || 0;
      return volB - volA;
    });

    // Pass only the items; storage.js handles the 3 file splits
    saveToCsv(items);
  } catch (error) {
    console.error("Execution Error:", error.message);
    process.exit(1);
  }
}

run();