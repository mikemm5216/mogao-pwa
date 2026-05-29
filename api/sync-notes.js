module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'mikemm5216';
  const repo = process.env.GITHUB_REPO || 'mogao-pwa';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const path = process.env.CUSTOM_NOTES_PATH || 'data/custom-notes.json';
  if (!token) return res.status(500).json({ error: 'Missing GITHUB_TOKEN' });

  const incoming = req.body || {};
  const payload = {
    updatedAt: new Date().toISOString(),
    notes: Array.isArray(incoming.notes) ? incoming.notes : [],
    coordinateMap: incoming.coordinateMap || {}
  };

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  let sha;
  const current = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (current.ok) sha = (await current.json()).sha;

  const body = {
    message: `Sync Mogao custom notes ${payload.updatedAt}`,
    branch,
    content: Buffer.from(JSON.stringify(payload, null, 2), 'utf8').toString('base64')
  };
  if (sha) body.sha = sha;

  const result = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!result.ok) return res.status(result.status).json({ error: await result.text() });
  return res.status(200).json({ ok: true, updatedAt: payload.updatedAt });
};
