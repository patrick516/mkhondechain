// ─────────────────────────────────────────────────────────────
// Member Controller
// Manages savings group members.
// Every member gets a hashed PIN for USSD authentication.
// ─────────────────────────────────────────────────────────────

const Member = require("../models/memberModel");
const Group = require("../models/Group");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");

// GET /api/members — list members (group-scoped for admins)
exports.getAllMembers = async (req, res) => {
  try {
    const query = {};

    // Regular admins only see their group's members
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      query.groupId = req.admin.groupId;
    }

    const members = await Member.find(query)
      .select("-pinHash") // NEVER return PIN hash
      .sort({ createdAt: -1 });

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
    const query = { _id: req.params.id };

    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      query.groupId = req.admin.groupId;
    }

    const member = await Member.findOne(query).select("-pinHash");
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
  const { firstName, surname, gender, phone, pin, groupId } = req.body;

  // Validation
  if (!firstName || !surname || !phone || !pin || !groupId) {
    return res.status(400).json({
      error: "First name, surname, phone, PIN, and group ID are required",
    });
  }

  // Validate phone format
  const phoneRegex = /^\+265\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      error: "Phone must be in format +265XXXXXXXXX",
    });
  }

  // Validate PIN (4-6 digits)
  const pinRegex = /^\d{4,6}$/;
  if (!pinRegex.test(pin)) {
    return res.status(400).json({
      error: "PIN must be 4-6 digits",
    });
  }

  // Validate group exists and admin has access
  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  if (
    req.admin.role !== "superadmin" &&
    req.admin.groupId &&
    req.admin.groupId.toString() !== groupId
  ) {
    return res
      .status(403)
      .json({ error: "You can only add members to your own group" });
  }

  try {
    // Hash PIN
    const pinHash = await bcrypt.hash(pin, 12);

    const newMember = await Member.create({
      firstName: firstName.trim(),
      surname: surname.trim(),
      gender,
      phone,
      pinHash,
      groupId,
      status: "active",
    });

    logger.info("MEMBER_CREATED", {
      memberId: newMember._id,
      phone: newMember.phone,
      groupId: newMember.groupId,
      admin: req.admin.username,
    });

    // Return member without pinHash
    const memberResponse = newMember.toObject();
    delete memberResponse.pinHash;

    res.status(201).json(memberResponse);
  } catch (error) {
    logger.error("ADD_MEMBER_ERROR", {
      error: error.message,
      phone,
      admin: req.admin.username,
    });

    if (error.code === 11000) {
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
    const query = { _id: req.params.id };

    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      query.groupId = req.admin.groupId;
    }

    const member = await Member.findOne(query);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Update allowed fields
    if (firstName) member.firstName = firstName.trim();
    if (surname) member.surname = surname.trim();
    if (gender) member.gender = gender;
    if (status && ["active", "suspended", "left"].includes(status)) {
      member.status = status;
    }
    if (groupId && req.admin.role === "superadmin") {
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ error: "Target group not found" });
      }
      member.groupId = groupId;
    }

    await member.save();

    logger.info("MEMBER_UPDATED", {
      memberId: member._id,
      admin: req.admin.username,
      changes: Object.keys(req.body),
    });

    const memberResponse = member.toObject();
    delete memberResponse.pinHash;

    res.status(200).json(memberResponse);
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
    const query = { _id: req.params.id };

    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      query.groupId = req.admin.groupId;
    }

    const member = await Member.findOne(query);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Prevent deletion if member has outstanding loan
    if (member.loanBalance > 0) {
      return res.status(400).json({
        error: "Cannot delete member with outstanding loan. Settle loan first.",
      });
    }

    member.status = "left";
    await member.save();

    logger.info("MEMBER_DELETED", {
      memberId: member._id,
      phone: member.phone,
      admin: req.admin.username,
    });

    res
      .status(200)
      .json({ message: "Member marked as left", memberId: member._id });
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

    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
      return res.status(400).json({ error: "PIN must be 4-6 digits" });
    }

    const query = { _id: req.params.id };
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      query.groupId = req.admin.groupId;
    }

    const member = await Member.findOne(query);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    member.pinHash = await bcrypt.hash(newPin, 12);
    await member.save();

    // Notify member via SMS
    const sendSms = require("../utils/africasTalkingSms");
    await sendSms(
      member.phone,
      `MkhondeChain: PIN yanu yasinthidwa. / Your PIN has been reset.\n` +
        `Lankhulani mtsogoleri wanu kuti adziwe PIN yatsopano.\n` +
        `Contact your group leader for your new PIN.`,
    );

    logger.info("MEMBER_PIN_RESET", {
      memberId: member._id,
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
