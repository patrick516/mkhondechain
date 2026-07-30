// Blocks any request from a non-superadmin. Must run AFTER the
// `auth` middleware, since it depends on req.admin being set.
// ─────────────────────────────────────────────────────────────

module.exports = function requireSuperadmin(req, res, next) {
  if (req.admin.role !== "superadmin") {
    return res.status(403).json({ error: "Superadmin access required" });
  }
  next();
};
