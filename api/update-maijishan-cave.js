const { put } = require('@vercel/blob');

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error('內容太多，請縮短後再試。'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
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

function cleanPoint(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Number(number.toFixed(3))));
}

function cleanImages(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, 80).map(item => {
    const src = cleanText(item && item.src, 1200).replace(/^\/public\/images\//, '/images/');
    const caption = cleanText(item && item.caption, 500);
    if (!src || seen.has(src)) return null;
    const ok = src.startsWith('https://') || src.startsWith('/images/') || src.startsWith('/public/images/');
    if (!ok) return null;
    seen.add(src);
    return { src, caption };
  }).filter(Boolean);
}

async function githubJson(url, options) {
  const response = await fetch(url, options || {});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub ${response.status}`);
  return data;
}

function decodeContent(file) {
  return JSON.parse(Buffer.from(file.content || '', 'base64').toString('utf8'));
}

async function findCoordinate(apiBase, headers, branch, site, id) {
  const coordinatePath = site === 'mogao'
    ? 'data/cave-coordinates.json'
    : 'data/maijishan-all-caves.json';
  const filePath = encodeURIComponent(coordinatePath).replace(/%2F/g, '/');
  const file = await githubJson(`${apiBase}/contents/${filePath}?ref=${encodeURIComponent(branch)}`, { headers });
  const raw = decodeContent(file);
  const list = Array.isArray(raw) ? raw : (Array.isArray(raw.caves) ? raw.caves : []);
  const found = list.find(item => String(item && item.id).replace(/[^0-9]/g, '') === id);
  if (!found) return null;
  const x = cleanPoint(found.x);
  const y = cleanPoint(found.y);
  if (x === null || y === null) return null;
  return {
    x,
    y,
    title: cleanText(found.title, 80) || `${id} 窟`
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  const repo =
    process.env.MOGAO_PWA_GITHUB_REPO ||
    process.env.MAIJISHAN_GITHUB_REPO ||
    'mikemm5216/mogao-pwa';

  const branch =
    process.env.MOGAO_PWA_GITHUB_BRANCH ||
    process.env.MAIJISHAN_GITHUB_BRANCH ||
    'main';

  if (!githubToken) return res.status(500).json({ error: '資料儲存權限尚未設定，請聯絡家人協助處理。' });

  try {
    const body = await readBody(req);
    const site = body.site === 'mogao' ? 'mogao' : 'maijishan';
    const id = cleanId(body.id);
    if (!id) return res.status(400).json({ error: '請先選洞窟號' });

    const path = site === 'mogao'
      ? 'data/mogao-supplements.json'
      : 'data/maijishan-supplements.json';

    const apiBase = `https://api.github.com/repos/${repo}`;
    const filePath = encodeURIComponent(path).replace(/%2F/g, '/');
    const headers = {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    let current = null;
    let list = [];

    try {
      current = await githubJson(`${apiBase}/contents/${filePath}?ref=${encodeURIComponent(branch)}`, { headers });
      list = decodeContent(current);
      if (!Array.isArray(list)) list = [];
    } catch (error) {
      if (!String(error.message || '').includes('Not Found')) throw error;
    }

    const now = new Date().toISOString();
    const supplement = {
      id,
      note: cleanText(body.note, 5000),
      images: cleanImages(body.images),
      updatedAt: now
    };

    let x = cleanPoint(body.x);
    let y = cleanPoint(body.y);
    let title = cleanText(body.title, 80) || `${id} 窟`;

    if (x === null || y === null) {
      const coordinate = await findCoordinate(apiBase, headers, branch, site, id);
      if (coordinate) {
        x = coordinate.x;
        y = coordinate.y;
        title = coordinate.title;
      }
    }

    if (x !== null && y !== null) {
      supplement.x = x;
      supplement.y = y;
      supplement.title = title;
    }

    const index = list.findIndex(item => String(item && item.id) === id);
    const previous = index >= 0 ? list[index] : null;
    if (index >= 0) list[index] = supplement;
    else list.push(supplement);

    if (blobToken) {
      await put(
        `${site}-supplements/cave-${id}-${now.replace(/[:.]/g, '-')}.json`,
        JSON.stringify({ previous, supplement }, null, 2),
        {
          access: 'public',
          contentType: 'application/json; charset=utf-8',
          addRandomSuffix: false,
          token: blobToken
        }
      );
    }

    const payload = {
      message: `Update ${site} supplement ${id}`,
      content: Buffer.from(`${JSON.stringify(list, null, 2)}\n`, 'utf8').toString('base64'),
      branch
    };
    if (current && current.sha) payload.sha = current.sha;

    const commit = await githubJson(`${apiBase}/contents/${filePath}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.status(200).json({
      ok: true,
      site,
      supplement,
      commitSha: commit && commit.commit ? commit.commit.sha : null
    });
  } catch (error) {
    return res.status(400).json({
      error: '補充資料儲存失敗',
      detail: error && error.message ? error.message : String(error)
    });
  }
};
