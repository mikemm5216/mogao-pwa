module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  return res.status(200).json({
    ok: true,
    hasBlobReadWriteToken: Boolean(token),
    tokenLength: token.length,
    tokenLooksLikeBlobToken: token.startsWith('vercel_blob_rw_') || token.startsWith('vercel_blob_'),
    vercelEnv: process.env.VERCEL_ENV || '',
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12) : '',
    checkedAt: new Date().toISOString()
  });
};
