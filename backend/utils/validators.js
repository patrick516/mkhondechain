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
const pinSchema = Joi.string()
  .pattern(/^\d{4,6}$/)
  .required()
  .messages({
    "string.pattern.base": "PIN must be 4-6 digits",
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

// USSD request body
const ussdSchema = Joi.object({
  phoneNumber: phoneSchema,
  text: Joi.string().max(50).allow("").default(""),
  sessionId: Joi.string().max(100).required(),
  networkCode: Joi.string().max(20).allow(""),
  serviceCode: Joi.string().max(20).allow(""),
});

module.exports = {
  phoneSchema,
  pinSchema,
  amountSchema,
  loginSchema,
  ussdSchema,
};
