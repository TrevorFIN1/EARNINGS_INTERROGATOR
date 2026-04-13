
Copy

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  let body = '';
  try {
    body = req.body || {};
  } catch(e) {
    return res.status(400).json({ error: 'Bad request body' });
  }
 
  const { action, transcript } = body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' });
 
  try {
    if (action === 'generate') {
      const companies = [
        { name: 'NovaTech Systems', ticker: 'NVTS', sector: 'semiconductor', issue: 'supply chain disruptions and margin compression' },
        { name: 'Meridian Health', ticker: 'MRDH', sector: 'healthcare', issue: 'reimbursement headwinds and rising labor costs' },
        { name: 'Apex Financial Group', ticker: 'APXF', sector: 'fintech', issue: 'regulatory scrutiny and slowing loan growth' },
        { name: 'Crestview Energy', ticker: 'CRVW', sector: 'energy', issue: 'commodity price volatility and capex overruns' },
        { name: 'Luminary Retail', ticker: 'LMRY', sector: 'consumer', issue: 'inventory bloat and weakening consumer demand' },
        { name: 'Stratosphere Cloud', ticker: 'STCL', sector: 'SaaS', issue: 'churn acceleration and elongating sales cycles' }
      ];
      const c = companies[Math.floor(Math.random() * companies.length)];
      const tones = ['evasive and heavily hedged', 'cautiously optimistic but vague', 'defensive and blame-shifting'];
      const tone = tones[Math.floor(Math.random() * tones.length)];
 
      const genResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `Write a short 200-word fictional earnings call excerpt for ${c.name}, a ${c.sector} company dealing with ${c.issue}. Tone: ${tone}. Include 2 financial figures and 2 hedge phrases. Just the transcript, no headers.`
          }]
        })
      });
 
      const genText = await genResp.text();
      let genData;
      try { genData = JSON.parse(genText); }
      catch(e) { return res.status(500).json({ error: 'Generate parse error: ' + genText.slice(0, 100) }); }
 
      if (!genResp.ok) return res.status(500).json({ error: genData.error?.message || 'Generate API error' });
      const text = genData.content.filter(x => x.type === 'text').map(x => x.text).join('');
      return res.status(200).json({ transcript: text, company: c.name });
    }
 
    if (action === 'analyze') {
      if (!transcript) return res.status(400).json({ error: 'No transcript provided.' });
 
      const analyzeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          system: 'You are a Wall Street analyst. Return ONLY raw JSON with no markdown, no backticks, no explanation. Start your response with { and end with }.',
          messages: [{
            role: 'user',
            content: `Analyze this earnings call transcript and return JSON with these exact keys: company (string), quarter (string), confidence_score (integer 0-100), score_reasoning (string, 2 sentences), sentiment (string: Bullish or Cautiously Bullish or Neutral or Cautiously Bearish or Bearish), sentiment_reasoning (string), metrics (array of max 3 objects with keys label/value/trend/note), flags (array of max 4 objects with keys type/severity/quote/analysis), red_flags_count (integer), positive_signals_count (integer), key_questions (array of 3 strings), verdict (string, 2-3 sentences), analyst_grade (string: A or B or C or D or F).
 
Transcript: ${transcript.slice(0, 3000)}`
          }]
        })
      });
 
      const analyzeText = await analyzeResp.text();
      let analyzeData;
      try { analyzeData = JSON.parse(analyzeText); }
      catch(e) { return res.status(500).json({ error: 'Analyze response parse error: ' + analyzeText.slice(0, 100) }); }
 
      if (!analyzeResp.ok) return res.status(500).json({ error: analyzeData.error?.message || 'Analyze API error' });
 
      const raw = analyzeData.content.filter(x => x.type === 'text').map(x => x.text).join('');
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end === -1) return res.status(500).json({ error: 'No JSON found in response. Raw: ' + raw.slice(0, 100) });
 
      const jsonStr = raw.slice(start, end + 1);
      let parsed;
      try { parsed = JSON.parse(jsonStr); }
      catch(e) { return res.status(500).json({ error: 'JSON parse failed: ' + e.message + ' Raw: ' + jsonStr.slice(0, 100) }); }
 
      return res.status(200).json(parsed);
    }
 
    return res.status(400).json({ error: 'Unknown action: ' + action });
 
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error: ' + e.message });
  }
}
 
