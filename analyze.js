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
          max_tokens: 900,
          messages: [{ role: 'user', content: `Generate a realistic fictional Q3 earnings call transcript excerpt (400-500 words) for ${c.name} (${c.ticker}), a ${c.sector} company. The tone should be ${tone}. The company is dealing with ${c.issue}. Include: CEO opening remarks, 2-3 specific financial figures, at least 3 instances of hedge language or evasion, one buried risk disclosure, and one analyst Q&A exchange. Make it feel like a real Wall Street call. No labels or headers, just the transcript.` }]
        })
      });
      const genData = await genResp.json();
      const text = genData.content.filter(x => x.type === 'text').map(x => x.text).join('');
      return res.status(200).json({ transcript: text, company: c.name, ticker: c.ticker });
    }

    if (action === 'analyze') {
      if (!transcript) return res.status(400).json({ error: 'No transcript provided.' });

      const system = `You are a senior Wall Street analyst with 20 years experience. You are deeply skeptical and trained to detect spin, evasion, and risk in earnings calls.

Analyze the transcript and return ONLY valid JSON, no markdown, no backticks, no extra text.

Return this exact structure:
{"company":"string","quarter":"string","confidence_score":integer 0-100,"score_reasoning":"string 3-4 sentences explaining exactly WHY you gave this specific score citing specific language patterns","sentiment":"Bullish|Cautiously Bullish|Neutral|Cautiously Bearish|Bearish","sentiment_reasoning":"string 1-2 sentences","metrics":[{"label":"string","value":"string","trend":"up|down|flat|unknown","note":"string analyst take"}],"flags":[{"type":"Hedge Language|Evasion|Risk Signal|Positive Signal|Vague Guidance|Deflection|Buried Risk","severity":"Critical|High|Medium|Low|Positive","quote":"string max 25 words","analysis":"string 2-3 sentences what this means and what investor should do"}],"red_flags_count":integer,"positive_signals_count":integer,"key_questions":["string 3 pointed questions a smart analyst would ask"],"verdict":"string 4-6 sentences plain English full investment read","analyst_grade":"A|B|C|D|F"}

Score: 90-100=exceptional transparency. 70-89=generally credible minor hedging. 50-69=meaningful hedges watch carefully. 30-49=significant red flags credibility questionable. 0-29=severe evasion possible material omissions.

Extract 3-5 metrics. Find 5-8 flags. Be brutally honest. Name specific language patterns.`;

      const analyzeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 2000,
          system: system,
          messages: [{ role: 'user', content: `Analyze this earnings call transcript:\n\n${transcript}` }]
        })
      });

      const analyzeData = await analyzeResp.json();
      if (!analyzeResp.ok) throw new Error(analyzeData.error?.message || 'API error');
      const raw = analyzeData.content.filter(x => x.type === 'text').map(x => x.text).join('');
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      return res.status(200).json(parsed);
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
