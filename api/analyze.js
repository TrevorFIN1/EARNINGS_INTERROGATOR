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
          max_tokens: 1800,
          system: 'You are a Wall Street analyst. Return ONLY a raw JSON object. No markdown. No backticks. Start with { and end with }.',
          messages: [{ role: 'user', content: `Analyze this earnings call transcript. Return JSON with these exact keys:

company (string),
quarter (string),
confidence_score (integer 0-100, whole number),
score_reasoning (string: 3 sentences explaining exactly why this score, what specific language patterns hurt it, what would have made it higher),
score_deductions (array of objects with keys: reason (string, specific thing that lowered the score), points_lost (integer, how many points this cost), quote (string, the exact words from transcript that caused this deduction, max 15 words), weight_explanation (string, 1 sentence on why this factor matters more or less than others)),
sentiment (string: Bullish or Cautiously Bullish or Neutral or Cautiously Bearish or Bearish),
sentiment_reasoning (string, 1 sentence),
sub_scores (object with these exact keys:
  transparency (integer 0-100, how open and specific management was),
  transparency_explanation (string, 1 sentence),
  transparency_highlights (array of 2 strings, exact quotes from transcript relevant to this score),
  guidance_quality (integer 0-100, how specific and useful forward guidance was),
  guidance_quality_explanation (string, 1 sentence),
  guidance_quality_highlights (array of 2 strings, exact quotes from transcript relevant to this score),
  management_credibility (integer 0-100, consistency and track record signals),
  management_credibility_explanation (string, 1 sentence),
  management_credibility_highlights (array of 2 strings, exact quotes from transcript relevant to this score),
  risk_disclosure (integer 0-100, how thoroughly risks were acknowledged),
  risk_disclosure_explanation (string, 1 sentence),
  risk_disclosure_highlights (array of 2 strings, exact quotes from transcript relevant to this score),
  tone_confidence (integer 0-100, how confident vs defensive the tone was),
  tone_confidence_explanation (string, 1 sentence),
  tone_confidence_highlights (array of 2 strings, exact quotes from transcript relevant to this score)
),
metrics (array of 3 max, each with label, value, trend (up or down or flat or unknown), note (string)),
flags (array of 4 max, each with type (Hedge Language or Evasion or Risk Signal or Positive Signal or Vague Guidance or Deflection or Buried Risk), severity (Critical or High or Medium or Low or Positive), quote (string max 15 words), analysis (string 2 sentences)),
red_flags_count (integer),
positive_signals_count (integer),
key_questions (array of exactly 3 strings),
verdict (string, 3 sentences),
analyst_grade (string: A or B or C or D or F),
data_methodology (string: 2 sentences explaining that this analysis is based on NLP pattern recognition of the transcript text using established financial communication research, hedge word detection, guidance specificity scoring, and sentiment analysis modeled on academic studies of earnings call language)

Transcript: ${transcript.slice(0, 2500)}` }]
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
