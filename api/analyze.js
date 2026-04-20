export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { action, transcript } = req.body || {};
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });
  try {
    if (action === 'generate') {
      const companies = [
        { name: 'NovaTech Systems', sector: 'semiconductor', issue: 'supply chain disruptions and margin compression' },
        { name: 'Meridian Health', sector: 'healthcare', issue: 'reimbursement headwinds and rising labor costs' },
        { name: 'Apex Financial Group', sector: 'fintech', issue: 'regulatory scrutiny and slowing loan growth' },
        { name: 'Stratosphere Cloud', sector: 'SaaS', issue: 'churn acceleration and elongating sales cycles' },
        { name: 'Crestview Energy', sector: 'energy', issue: 'commodity price volatility and capex overruns' }
      ];
      const c = companies[Math.floor(Math.random() * companies.length)];
      const tones = ['evasive and heavily hedged', 'cautiously optimistic but vague', 'defensive and blame-shifting'];
      const tone = tones[Math.floor(Math.random() * tones.length)];
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [{ role: 'user', content: `Write a 200-word fictional earnings call excerpt for ${c.name}, a ${c.sector} company dealing with ${c.issue}. Tone: ${tone}. Include 2 financial figures and 2 hedge phrases. Just the transcript text, no headers.` }]
        })
      });
      const d = await r.json();
      if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Generate failed' });
      const text = d.content.filter(x => x.type === 'text').map(x => x.text).join('');
      return res.status(200).json({ transcript: text, company: c.name });
    }
    if (action === 'analyze') {
      if (!transcript) return res.status(400).json({ error: 'No transcript provided.' });
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2500,
          system: 'You are a Wall Street analyst. Return ONLY a raw JSON object. No markdown. No backticks. Start with { and end with }. Keep all string values short and concise.',
          messages: [{ role: 'user', content: `Analyze this earnings call transcript. Return JSON with these exact keys:

company (string),
quarter (string),
confidence_score (integer 0-100),
score_reasoning (string, 2 short sentences on why this score),
score_deductions (array of 3 objects max, each with: reason (string), points_lost (integer), quote (string max 10 words), weight_explanation (string, 1 short sentence)),
sentiment (string: Bullish or Cautiously Bullish or Neutral or Cautiously Bearish or Bearish),
sentiment_reasoning (string, 1 sentence),
sub_scores (object with: transparency (integer), transparency_explanation (string, 1 sentence), transparency_highlights (array of 2 short strings), guidance_quality (integer), guidance_quality_explanation (string, 1 sentence), guidance_quality_highlights (array of 2 short strings), management_credibility (integer), management_credibility_explanation (string, 1 sentence), management_credibility_highlights (array of 2 short strings), risk_disclosure (integer), risk_disclosure_explanation (string, 1 sentence), risk_disclosure_highlights (array of 2 short strings), tone_confidence (integer), tone_confidence_explanation (string, 1 sentence), tone_confidence_highlights (array of 2 short strings)),
metrics (array of 3 max, each with label, value, trend, note),
flags (array of 4 max, each with type, severity, quote (max 10 words), analysis (1 sentence)),
red_flags_count (integer),
positive_signals_count (integer),
key_questions (array of 3 short strings),
verdict (string, 2 sentences),
analyst_grade (string: A or B or C or D or F),
data_methodology (string, 1 sentence)

Transcript: ${transcript.slice(0, 1500)}` }]
        })
      });
      const d = await r.json();
      if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Analyze failed' });
      const raw = d.content.filter(x => x.type === 'text').map(x => x.text).join('');
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end === -1) return res.status(500).json({ error: 'No JSON in response' });
      const parsed = JSON.parse(raw.slice(start, end + 1));
      return res.status(200).json(parsed);
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
