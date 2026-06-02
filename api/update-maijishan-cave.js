module.exports = async function handler(req, res) {
  res.status(410).json({
    error: '這個入口已停用',
    detail: '手機端不能直接修改主洞窟資料。請改用補充資料流程。'
  });
};
