const { put } = require('@vercel/blob');

function readJsonBody(req, limitBytes = 256 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error('內容太多，請縮短後再試。'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8') || '{}';
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('資料格式不正確。'));
      }
    });
    req.on('error', reject);
  });
}

function cleanId(value) {
  return String(value || '').replace(/[^0-9]/g, '').slice(0, 5);
}

function cleanText(value, max) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function cleanImages(images) {
  if (!Array.isArray(images)) return [];
  return images.slice(0, 40).map(item => {
    const src = cleanText(item && item.src, 1200);
    const caption = cleanText(item && item.caption, 500);
    if (!src) return null;
    const allowed = src.startsWith('https://') || src.startsWith('/images/maijishan/') || src.startsWith('/public/images/maijishan/');
    if (!allowed) return null;
    return { src, caption };
  }).filter(Boolean);
}

function encodeBase64Utf8(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

async function githubJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && data.message ? data.message : `GitHub ${response.status}`;
    throw new Error(message);
  }
  return data;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.MAIJISHAN_GITHUB_REPO || 'mikemm5216/mogao-pwa';
  const branch = process.env.MAIJISHAN_GITHUB_BRANCH || 'main';
  const path = 'data/maijishan-caves.json';

  if (!blobToken) return res.status(500).json({ error: '缺少 BLOB_READ_WRITE_TOKEN' });
  if (!githubToken) return res.status(500).json({ error: '缺少 GITHUB_TOKEN 或 GH_TOKEN' });

  try {
    const body = await readJsonBody(req);
    const id = cleanId(body.id);
    const title = cleanText(body.title, 120);
    const note = cleanText(body.note, 5000);
    const images = cleanImages(body.images);

    if (!id) return res.status(400).json({ error: '請先選洞窟號' });
    if (!title) return res.status(400).json({ error: '請輸入洞窟標題' });

    const apiBase = `https://api.github.com/repos/${repo}`;
    const fileUrl = `${apiBase}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;
    const current = await githubJson(fileUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const currentText = Buffer.from(current.content || '', 'base64').toString('utf8');
    const caves = JSON.parse(currentText);
    if (!Array.isArray(caves)) throw new Error('洞窟資料格式不正確。');

    const index = caves.findIndex(cave => String(cave && cave.id) === id);
    if (index < 0) return res.status(404).json({ error: `找不到第${id}窟` });

    const now = new Date().toISOString();
    const previous = caves[index];
    const nextCave = {
      ...previous,
      title,
      note,
      images
    };
    caves[index] = nextCave;

    const backupPayload = {
      kind: 'maijishan-cave-update',
      caveId: id,
      createdAt: now,
      previous,
      next: nextCave
    };

    const backupName = `maijishan-edits/cave-${id}-${now.replace(/[:.]/g, '-')}.json`;
    const backup = await put(backupName, JSON.stringify(backupPayload, null, 2), {
      access: 'public',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
      token: blobToken
    });

    const nextText = `${JSON.stringify(caves, null, 2)}\n`;
    const commit = await githubJson(`${apiBase}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update Maijishan cave ${id}`,
        content: encodeBase64Utf8(nextText),
        sha: current.sha,
        branch
      })
    });

    return res.status(200).json({
      ok: true,
      cave: nextCave,
      backupUrl: backup.url,
      commitSha: commit && commit.commit ? commit.commit.sha : null
    });
  } catch (error) {
    return res.status(400).json({ error: '儲存失敗', detail: error && error.message ? error.message : String(error) });
  }
};
