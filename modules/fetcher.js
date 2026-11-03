export async function fetchKeywords(targets, settings) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD variables.");
  }

  const auth = Buffer.from(`${login}:${password}`).toString('base64');
  const baseUrl = settings.environment === 'live' 
    ? 'https://api.dataforseo.com' 
    : 'https://sandbox.dataforseo.com';
    
  const endpoint = `${baseUrl}/v3/dataforseo_labs/google/keywords_for_site/live`;

  let allItems = [];
  let byTarget = {};

  for (const targetUrl of targets) {
    const brandName = targetUrl.replace(/^https?:\/\/(www\.)?/, '').split('.')[0];
    
    const payload = [{
      target: targetUrl,
      location_name: settings.location_name,
      language_name: settings.language_name,
      limit: settings.limit,
      include_subdomains: settings.include_subdomains,
      include_serp_info: settings.include_serp_info
    }];

    console.log(`Fetching keywords for ${brandName} (${settings.environment})...`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    
    // Top-level API validation
    if (data.status_code !== 20000) {
      throw new Error(`DataForSEO Error: ${data.status_message}`);
    }

    let targetKeywords = [];
    
    for (const task of data.tasks || []) {
      if (task.status_code === 20000 && task.result?.[0]?.items) {
        task.result[0].items.forEach(item => {
          // Tag the item with its source brand before saving
          item.sourceBrand = brandName;
          targetKeywords.push(item);
          allItems.push(item);
        });
      } else {
        console.warn(`Task failed for ${brandName}: ${task?.status_message}`);
      }
    }
    
    byTarget[targetUrl] = targetKeywords;
  }

  return { allItems, byTarget };
}