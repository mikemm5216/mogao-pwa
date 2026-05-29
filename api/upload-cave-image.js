const { put } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { caveId, imageDataUrl, caption, clientUploadId, contentHash, fileExt } = req.body || {};
  const id = String(caveId || '').replace(/[^0-9]/g, '');
  if (!id) return res.status(400).json({ error: 'Missing caveId' });

  const match = String(imageDataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid imageDataUrl' });

  const mime = match[1];
  const base64 = match[2];
  const ext = String(fileExt || '').toLowerCase().replace(/[^a-z0-9]/g, '') || (mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg');
  const fallbackId = contentHash ? `${id}-${String(contentHash).slice(0, 24)}` : `${id}-${Date.now()}`;
  const safeUploadId = String(clientUploadId || fallbackId).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  const pathname = `caves/${id}/${safeUploadId}.${ext}`;
  const buffer = Buffer.from(base64, 'base64');

  try {
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: mime,
      addRandomSuffix: false,
      allowOverwrite: true
    });

    return res.status(200).json({
      ok: true,
      storage: 'vercel-blob',
      image: {
        src: blob.url,
        caption: caption || '',
        createdAt: new Date().toISOString(),
        clientUploadId: safeUploadId,
        contentHash: contentHash || ''
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Vercel Blob upload failed',
      detail: error && error.message ? error.message : String(error)
    });
  }
};
