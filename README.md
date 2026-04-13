# Earnings Interrogator

AI-powered earnings call transcript analyzer. Detects hedge language, evasions, buried risks, and scores management confidence 0–100.

## Project Structure

```
earnings-interrogator/
├── api/
│   └── analyze.js       ← Vercel serverless function (keeps API key secure)
├── public/
│   └── index.html       ← Full frontend
├── package.json
├── vercel.json
└── README.md
```

## Deployment (Vercel)

### Step 1 — Push to GitHub
1. Create a new repo on github.com (name it `earnings-interrogator`)
2. Upload all files from this folder (drag & drop into GitHub)

### Step 2 — Deploy on Vercel
1. Go to vercel.com/new
2. Import your GitHub repo
3. Under **Environment Variables**, add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-...` (your key)
4. Click **Deploy**

### Step 3 — Done
Your site is live at `earnings-interrogator.vercel.app`

## Features
- Paste any earnings call transcript for instant analysis
- Generate a random realistic fictional call to explore
- Confidence score 0–100 with detailed rationale
- Flagged language patterns (hedge, evasion, risk, positive)
- Hidden risks + genuine positives extraction
- Plain-English analyst verdict
- Watch list for next quarter
