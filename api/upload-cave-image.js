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
  if (!token) return res.status(500).json({ error: 'Missing GITHUB_TOKEN' });

  const { caveId, imageDataUrl, caption, clientUploadId, contentHash } = req.body || {};
  const id = String(caveId || '').replace(/[^0-9]/g, '');
  if (!id) return res.status(400).json({ error: 'Missing caveId' });
  if (!imageDataUrl || !String(imageDataUrl).startsWith('data:image/')) return res.status(400).json({ error: 'Missing imageDataUrl' });

  const match = String(imageDataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid imageDataUrl' });
  const mime = match[1];
  const base64 = match[2];
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const safeUploadId = String(clientUploadId || (contentHash ? `${id}-${String(contentHash).slice(0, 24)}` : new Date().toISOString())).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  const safeContentHash = contentHash ? String(contentHash).replace(/[^a-fA-F0-9]/g, '').slice(0, 64) : '';
  const imagePath = `images/caves/${id}/${safeUploadId}.${ext}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${imagePath}`;

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  const existing = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
  if (existing.ok) {
    return res.status(200).json({ ok: true, deduped: true, image: { src: imagePath, caption: caption || '', createdAt: new Date().toISOString(), clientUploadId: safeUploadId, contentHash: safeContentHash } });
  }

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Add cave ${id} image`, branch, content: base64 })
  });
  if (!putRes.ok) return res.status(putRes.status).json({ error: await putRes.text() });
  return res.status(200).json({ ok: true, image: { src: imagePath, caption: caption || '', createdAt: new Date().toISOString(), clientUploadId: safeUploadId, contentHash: safeContentHash } });
};
