// Member Controller
// Manages savings group members.
// Every member gets a hashed PIN for USSD authentication.
// ─────────────────────────────────────────────────────────────

const prisma = require("../utils/prismaClient");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const logger = require("../utils/logger");
const sendSms = require("../utils/africasTalkingSms");

// PINs in this list are never issued as starting PINs — they are the first
// codes anyone would guess.
const BLOCKED_PINS = new Set([
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1234",
  "4321",
  "2580",
]);

// Cryptographically random 4-digit starting PIN.
function generateStartingPin() {
  let pin;
  do {
    pin = String(crypto.randomInt(0, 10000)).padStart(4, "0");
  } while (BLOCKED_PINS.has(pin));
  return pin;
}

// Welcome SMS: branding, group, member name, the starting PIN, and a
// Chichewa call to save. Contains a PIN, so it is never logged.
function buildWelcomeSms({ firstName, surname, groupName, pin }) {
  const name = `${firstName} ${surname}`.trim();
  return (
    `MkhondeChain\n` +
    `Moni ${name}! Takukondweretsani ku gulu la ${groupName}.\n` +
    `Welcome to ${groupName}.\n\n` +
    `PIN yanu / Your PIN: ${pin}\n\n` +
    `Gwiritsani ntchito PIN iyi pa *XXX# kenako isinthe yoyamba.\n` +
    `Use this PIN at *XXX#, then change it the first time.\n` +
    `Yambani kusunga ndalama zanu mosavuta!`
  );
}

// GET /api/members — list members (group-scoped for admins)
exports.getAllMembers = async (req, res) => {
  try {
    const where = {};

    // Regular admins only see their group's members
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      where.groupId = req.admin.groupId;
    }

    const members = await prisma.member.findMany({
      where,
      omit: { pinHash: true }, // NEVER return PIN hash
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(members);
  } catch (error) {
    logger.error("GET_ALL_MEMBERS_ERROR", {
      error: error.message,
      admin: req.admin.username,
    });
    res.status(500).json({ error: "Failed to get members" });
  }
};

// GET /api/members/:id — single member details
exports.getMember = async (req, res) => {
  try {
    const where = { id: req.params.id };

    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      where.groupId = req.admin.groupId;
    }

    const member = await prisma.member.findFirst({
      where,
      omit: { pinHash: true },
    });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.status(200).json(member);
  } catch (error) {
    logger.error("GET_MEMBER_ERROR", {
      error: error.message,
      memberId: req.params.id,
    });
    res.status(500).json({ error: "Failed to get member" });
  }
};

// POST /api/members — add new member
exports.addMember = async (req, res) => {
  const { firstName, surname, gender, phone } = req.body;
  const requestedPin = req.body.pin;

  // Determine target group: regular admins can ONLY add members to their
  // own group — groupId is never trusted from the client for them.
  // Only superadmin may specify a groupId explicitly in the request.
  let groupId = req.admin.groupId;
  if (req.admin.role === "superadmin") {
    groupId = req.body.groupId;
  }

  // Validation
  if (!firstName || !surname || !phone) {
    return res.status(400).json({
      error: "First name, surname, and phone are required",
    });
  }

  if (!groupId) {
    return res.status(400).json({
      error:
        req.admin.role === "superadmin"
          ? "Group ID is required"
          : "Your account is not linked to a group. Contact the superadmin.",
    });
  }

  // Validate phone format
  const phoneRegex = /^\+265\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      error: "Phone must be in format +265XXXXXXXXX",
    });
  }

  // PIN: the caller MAY supply one (exactly 4 digits); otherwise a random
  // 4-digit starting PIN is generated here and delivered to the member by SMS.
  let pin = requestedPin;
  if (pin !== undefined && pin !== null && pin !== "") {
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        error: "PIN must be exactly 4 digits",
      });
    }
  } else {
    pin = generateStartingPin();
  }

  try {
    // Validate group exists and admin has access
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Hash PIN
    const pinHash = await bcrypt.hash(pin, 12);

    const newMember = await prisma.member.create({
      data: {
        firstName: firstName.trim(),
        surname: surname.trim(),
        gender,
        phone,
        pinHash,
        groupId,
        status: "active",
      },
      omit: { pinHash: true },
    });

    logger.info("MEMBER_CREATED", {
      memberId: newMember.id,
      phone: newMember.phone,
      groupId: newMember.groupId,
      admin: req.admin.username,
    });

    // Welcome SMS with the starting PIN. Failure must never roll back the
    // member — the PIN is disclosed to the leader below instead.
    let smsDelivered = false;
    try {
      const smsResult = await sendSms(
        newMember.phone,
        buildWelcomeSms({
          firstName: newMember.firstName,
          surname: newMember.surname,
          groupName: group.name,
          pin,
        }),
      );
      smsDelivered = Boolean(smsResult?.success);
    } catch (smsErr) {
      logger.error("MEMBER_WELCOME_SMS_FAILED", {
        memberId: newMember.id,
        phone: newMember.phone,
        error: smsErr.message,
      });
    }

    if (!smsDelivered) {
      logger.warn("MEMBER_WELCOME_SMS_NOT_DELIVERED", {
        memberId: newMember.id,
        phone: newMember.phone,
        admin: req.admin.username,
      });
    }

    res.status(201).json({
      ...newMember,
      smsDelivered,
      // Only when the SMS could not be delivered, so the leader can hand the
      // starting PIN to the member in person instead of leaving them stranded.
      ...(smsDelivered ? {} : { pin }),
    });
  } catch (error) {
    logger.error("ADD_MEMBER_ERROR", {
      error: error.message,
      phone,
      admin: req.admin.username,
    });

    if (error.code === "P2002") {
      return res.status(400).json({
        error: "A member with this phone number already exists.",
      });
    }
    res.status(500).json({ error: "Failed to add member" });
  }
};

// PATCH /api/members/:id — update member (name, status, group)
exports.updateMember = async (req, res) => {
  try {
    const { firstName, surname, gender, status, groupId } = req.body;
    const where = { id: req.params.id };

    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      where.groupId = req.admin.groupId;
    }

    const member = await prisma.member.findFirst({ where });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Build the update payload from allowed fields
    const data = {};
    if (firstName) data.firstName = firstName.trim();
    if (surname) data.surname = surname.trim();
    if (gender) data.gender = gender;
    if (status && ["active", "suspended", "left"].includes(status)) {
      data.status = status;
    }
    if (groupId && req.admin.role === "superadmin") {
      const targetGroup = await prisma.group.findUnique({
        where: { id: groupId },
      });
      if (!targetGroup) {
        return res.status(404).json({ error: "Target group not found" });
      }
      data.groupId = groupId;
    }

    const updatedMember = await prisma.member.update({
      where: { id: member.id },
      data,
      omit: { pinHash: true },
    });

    logger.info("MEMBER_UPDATED", {
      memberId: updatedMember.id,
      admin: req.admin.username,
      changes: Object.keys(req.body),
    });

    res.status(200).json(updatedMember);
  } catch (error) {
    logger.error("UPDATE_MEMBER_ERROR", {
      error: error.message,
      memberId: req.params.id,
    });
    res.status(500).json({ error: "Failed to update member" });
  }
};

// DELETE /api/members/:id — soft delete (mark as left)
exports.deleteMember = async (req, res) => {
  try {
    const where = { id: req.params.id };

    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      where.groupId = req.admin.groupId;
    }

    const member = await prisma.member.findFirst({ where });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Prevent deletion if member has outstanding loan
    if (member.loanBalance > 0) {
      return res.status(400).json({
        error: "Cannot delete member with outstanding loan. Settle loan first.",
      });
    }

    await prisma.member.update({
      where: { id: member.id },
      data: { status: "left" },
    });

    logger.info("MEMBER_DELETED", {
      memberId: member.id,
      phone: member.phone,
      admin: req.admin.username,
    });

    res
      .status(200)
      .json({ message: "Member marked as left", memberId: member.id });
  } catch (error) {
    logger.error("DELETE_MEMBER_ERROR", {
      error: error.message,
      memberId: req.params.id,
    });
    res.status(500).json({ error: "Failed to delete member" });
  }
};

// POST /api/members/:id/reset-pin — reset member PIN
exports.resetPin = async (req, res) => {
  try {
    const { newPin } = req.body;

    if (!newPin || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ error: "PIN must be exactly 4 digits" });
    }
    const where = { id: req.params.id };
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      where.groupId = req.admin.groupId;
    }

    const member = await prisma.member.findFirst({ where });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const pinHash = await bcrypt.hash(newPin, 12);
    await prisma.member.update({
      where: { id: member.id },
      // A leader-initiated reset also forces a change on next login —
      // same security reasoning as a brand-new member's initial PIN.
      data: { pinHash, mustChangePin: true },
    });

    // Notify member via SMS
    await sendSms(
      member.phone,
      `MkhondeChain: PIN yanu yasinthidwa. / Your PIN has been reset.\n` +
        `Lankhulani mtsogoleri wanu kuti adziwe PIN yatsopano.\n` +
        `Contact your group leader for your new PIN.`,
    );

    logger.info("MEMBER_PIN_RESET", {
      memberId: member.id,
      admin: req.admin.username,
    });

    res.status(200).json({ message: "PIN reset successfully" });
  } catch (error) {
    logger.error("RESET_PIN_ERROR", {
      error: error.message,
      memberId: req.params.id,
    });
    res.status(500).json({ error: "Failed to reset PIN" });
  }
};
