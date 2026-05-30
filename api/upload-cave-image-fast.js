const { put } = require('@vercel/blob');

module.exports.config = {
  api: {
    bodyParser: false
  }
};

function readRawBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error('照片壓縮後仍太大，請改選一張照片或降低手機原圖大小。'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cave-Id, X-Caption, X-Client-Upload-Id, X-Content-Hash');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'Vercel Blob 尚未設定',
      detail: '缺少 BLOB_READ_WRITE_TOKEN。請到 Vercel Project Settings → Environment Variables 新增 BLOB_READ_WRITE_TOKEN，或在 Vercel Storage 連接 Blob store 後重新部署。'
    });
  }

  try {
    const caveId = String(req.headers['x-cave-id'] || '').replace(/[^0-9]/g, '');
    const clientUploadId = String(req.headers['x-client-upload-id'] || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
    const contentHash = String(req.headers['x-content-hash'] || '').replace(/[^a-fA-F0-9]/g, '').slice(0, 64);
    const caption = decodeURIComponent(String(req.headers['x-caption'] || '')).slice(0, 500);
    const contentType = String(req.headers['content-type'] || 'image/jpeg').split(';')[0].trim() || 'image/jpeg';

    if (!caveId) return res.status(400).json({ error: 'Missing caveId' });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      return res.status(415).json({ error: 'Unsupported image type' });
    }

    const body = await readRawBody(req, 1.5 * 1024 * 1024);
    if (!body.length) return res.status(400).json({ error: 'Empty image body' });

    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const safeUploadId = clientUploadId || `${caveId}-${Date.now()}`;
    const pathname = `caves/${caveId}/${safeUploadId}.${ext}`;

    const blob = await put(pathname, body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      token
    });

    return res.status(200).json({
      url: blob.url,
      pathname: blob.pathname,
      caveId,
      caption,
      clientUploadId: safeUploadId,
      contentHash,
      bytes: body.length,
      contentType
    });
  } catch (error) {
    return res.status(400).json({
      error: '照片上傳失敗',
      detail: error && error.message ? error.message : String(error)
    });
  }
};
