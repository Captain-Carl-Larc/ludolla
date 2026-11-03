export async function fetchKeywords(targets, settings) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD environment variables.");
  }

  const auth = Buffer.from(`${login}:${password}`).toString('base64');

  let baseUrl;
  if (settings.environment === 'live') {
    baseUrl = 'https://api.dataforseo.com';
  } else {
    baseUrl = 'https://sandbox.dataforseo.com';
  }
    
  const endpoint = `${baseUrl}/v3/dataforseo_labs/google/keywords_for_site/live`;

  const payload = targets.map(targetUrl => ({
    target: targetUrl,
    location_name: settings.location_name,
    language_name: settings.language_name,
    limit: settings.limit,
    include_subdomains: settings.include_subdomains,
    include_serp_info: settings.include_serp_info
  }));

  console.log(`Fetching site keywords from DataForSEO (${settings.environment} mode)...`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  let allKeywords = [];
  for (const task of data.tasks || []) {
    if (task.status_code === 20000 && task.result?.[0]?.items) {
      allKeywords.push(...task.result[0].items);
    } else {
      console.warn(`A task failed or returned no data: ${task?.status_message}`);
    }
  }

  return allKeywords;
}