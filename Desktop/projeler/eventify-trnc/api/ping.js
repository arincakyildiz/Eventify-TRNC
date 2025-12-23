// Simple health check for Vercel function discovery
module.exports = (req, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
};

