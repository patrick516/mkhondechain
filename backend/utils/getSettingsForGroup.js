// ─────────────────────────────────────────────────────────────
// File: backend/utils/getSettingsForGroup.js
// ─────────────────────────────────────────────────────────────
// Get settings for a group, creating a default record if none
// exists yet. Replaces the old SystemSetting.getForGroup() static
// method — Prisma models don't support attached methods.
// ─────────────────────────────────────────────────────────────

async function getSettingsForGroup(prisma, groupId) {
  let settings = await prisma.systemSetting.findUnique({ where: { groupId } });
  if (!settings) {
    settings = await prisma.systemSetting.create({ data: { groupId } });
  }
  return settings;
}

module.exports = getSettingsForGroup;
