// ─────────────────────────────────────────────────────────────
// Input Validators
// Joi schemas for strict input validation.
// ─────────────────────────────────────────────────────────────

const Joi = require("joi");

// Phone number: Malawian format +265XXXXXXXXX
const phoneSchema = Joi.string()
  .pattern(/^\+265\d{9}$/)
  .required()
  .messages({
    "string.pattern.base": "Phone must be in format +265XXXXXXXXX",
    "any.required": "Phone number is required",
  });

// PIN: 4-6 digits
// PIN: exactly 4 digits
const pinSchema = Joi.string()
  .pattern(/^\d{4}$/)
  .required()
  .messages({
    "string.pattern.base": "PIN must be exactly 4 digits",
    "any.required": "PIN is required",
  });
// Amount: positive integer, max 1,000,000 MK
const amountSchema = Joi.number()
  .integer()
  .min(1)
  .max(1000000)
  .required()
  .messages({
    "number.base": "Amount must be a number",
    "number.integer": "Amount must be a whole number",
    "number.min": "Amount must be at least 1",
    "number.max": "Amount cannot exceed 1,000,000",
    "any.required": "Amount is required",
  });

// Admin login
const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).max(128).required(),
});

// Superadmin: create a new group + its leader admin, in one go
// Superadmin: create a new group + its leader admin, in one go
const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  location: Joi.string().trim().min(2).required(),
  leaderUsername: Joi.string().trim().alphanum().min(3).max(30).required(),
  leaderFullName: Joi.string().trim().min(2).max(100).required(),
  leaderPassword: Joi.string().min(8).max(128).required(),
  leaderPhone: Joi.string()
    .trim()
    .pattern(/^\+265\d{9}$/)
    .allow("")
    .messages({
      "string.pattern.base": "Phone must be in format +265XXXXXXXXX",
    }),
});

// USSD request body
const ussdSchema = Joi.object({
  phoneNumber: phoneSchema,
  text: Joi.string().max(50).allow("").default(""),
  sessionId: Joi.string().max(100).required(),
  networkCode: Joi.string().max(20).allow(""),
  serviceCode: Joi.string().max(20).allow(""),
});

// Superadmin: reset a group leader's password
const resetLeaderPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).max(128).required(),
});

// Superadmin: change a group's status
const updateGroupStatusSchema = Joi.object({
  status: Joi.string().valid("active", "suspended", "inactive").required(),
});
// Group leader: start a new savings cycle
const startCycleSchema = Joi.object({
  cycleStartDate: Joi.date().iso().required().messages({
    "any.required": "Cycle start date is required",
  }),
  cycleEndDate: Joi.date()
    .iso()
    .greater(Joi.ref("cycleStartDate"))
    .required()
    .messages({
      "date.greater": "Cycle end date must be after the start date",
    }),
});
module.exports = {
  phoneSchema,
  pinSchema,
  amountSchema,
  loginSchema,
  ussdSchema,
  createGroupSchema,
  resetLeaderPasswordSchema,
  updateGroupStatusSchema,
  startCycleSchema,
};
