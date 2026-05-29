module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
  const imageUrl = req.body && req.body.imageUrl;
  if (!imageUrl) return res.status(400).json({ error: 'Missing imageUrl' });

  const prompt = '請辨識這張莫高窟手寫筆記圖片，整理成 JSON。只輸出 JSON，不要 Markdown。欄位：id（洞窟號，只保留數字）、title、subtitle、note（橘色重點短句）、desc（完整繁中筆記，整理壁面、主尊、經變、人物、供養人、歷史背景）、isSpecial。';
  const result = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_OCR_MODEL || 'gpt-4.1-mini',
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, { type: 'input_image', image_url: imageUrl }] }]
    })
  });
  if (!result.ok) return res.status(result.status).json({ error: await result.text() });
  const data = await result.json();
  const text = data.output_text || (data.output || []).flatMap((item) => item.content || []).map((item) => item.text || '').join('\n');
  return res.status(200).json({ text });
};
