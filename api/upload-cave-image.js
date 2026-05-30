const { handleUpload } = require('@vercel/blob/client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload = {};
        try { payload = clientPayload ? JSON.parse(clientPayload) : {}; } catch (_) {}

        const id = String(payload.caveId || '').replace(/[^0-9]/g, '');
        if (!id) throw new Error('Missing caveId');

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          tokenPayload: JSON.stringify({
            caveId: id,
            caption: payload.caption || '',
            clientUploadId: payload.clientUploadId || '',
            contentHash: payload.contentHash || '',
            fileExt: payload.fileExt || 'jpg'
          })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Frontend receives blob.url from client upload result and stores it locally.
        // This hook is intentionally light so upload remains fast.
        try {
          const payload = tokenPayload ? JSON.parse(tokenPayload) : {};
          console.log('Mogao Blob upload completed', {
            url: blob.url,
            caveId: payload.caveId,
            clientUploadId: payload.clientUploadId
          });
        } catch (_) {
          console.log('Mogao Blob upload completed', { url: blob.url });
        }
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({
      error: 'Vercel Blob client upload failed',
      detail: error && error.message ? error.message : String(error)
    });
  }
};
