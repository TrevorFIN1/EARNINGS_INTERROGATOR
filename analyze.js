export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  const { action, transcript } = req.body || {};
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
        { name: 'Stratosphere Cloud', ticker: 'STCL', sector: 'SaaS', issue: 'churn acceleration and elongating sales cycles' },
        { name: 'Atlas Biotech', ticker: 'ATBS', sector: 'biotech', issue: 'clinical trial setbacks and cash burn concerns' },
        { name: 'Ironclad Manufacturing', ticker: 'IRMF', sector: 'industrials', issue: 'input cost inflation and order book softness' }
      ];
      const c = companies[Math.floor(Math.random() * companies.length)];
      const tones = ['evasive and heavily hedged','cautiously optimistic but vague on specifics','bullish but dismissive of real risks','defensive and blame-shifting'];
      const tone = tones[Math.floor(Math.random() * tones.length)];
 
      const genResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 1200,
          messages: [{ role: 'user', content: `Write a 300-word fictional Q3 earnings call excerpt for ${c.name} (${c.ticker}), a ${c.sector} company. Tone: ${tone}. Challenge: ${c.issue}. Include 2 financial figures, 3 hedge phrases, 1 buried risk, 1 analyst Q&A. No headers, just the transcript text.` }]
        })
      });
      const genData = await genResp.json();
      if (!genResp.ok) throw new Error(genData.error?.message || 'Generation failed');
      const text = genData.content.filter(x => x.type === 'text').map(x => x.text).join('');
      return res.status(200).json({ transcript: text, company: c.name, ticker: c.ticker });
    }
 
    if (action === 'analyze') {
      if (!transcript) return res.status(400).json({ error: 'No transcript provided.' });
 
      const system = `You are a Wall Street analyst. Analyze the earnings call and return ONLY a JSON object. No markdown. No backticks. No text before or after the JSON.
 
The JSON must follow this structure exactly:
{"company":"string","quarter":"string","confidence_score":0,"score_reasoning":"string","sentiment":"Neutral","sentiment_reasoning":"string","metrics":[{"label":"string","value":"string","trend":"up","note":"string"}],"flags":[{"type":"Hedge Language","severity":"High","quote":"string","analysis":"string"}],"red_flags_count":0,"positive_signals_count":0,"key_questions":["string","string","string"],"verdict":"string","analyst_grade":"C"}
 
Rules:
- confidence_score: integer 0-100. 90+=transparent, 70-89=credible, 50-69=watch carefully, 30-49=red flags, 0-29=severe evasion
- score_reasoning: exactly 2 sentences explaining the score
- sentiment: one of Bullish, Cautiously Bullish, Neutral, Cautiously Bearish, Bearish
- metrics: 3 items max, note is 1 short sentence
- flags: 5 items max, quote is under 15 words, analysis is 2 short sentences
- key_questions: exactly 3 short questions
- verdict: exactly 3 sentences
- analyst_grade: one of A, B, C, D, F`;
 
      const analyzeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 2000,
          system: system,
          messages: [{ role: 'user', content: `Analyze this transcript:\n\n${transcript.slice(0, 4000)}` }]
        })
      });
 
      const analyzeData = await analyzeResp.json();
      if (!analyzeResp.ok) throw new Error(analyzeData.error?.message || 'API error');
      const raw = analyzeData.content.filter(x => x.type === 'text').map(x => x.text).join('');
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return res.status(200).json(parsed);
    }
 
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
