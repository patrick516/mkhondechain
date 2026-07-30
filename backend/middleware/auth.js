const jwt = require("jsonwebtoken");
const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");

module.exports = async function (req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.security.unauthorizedAccess(req.ip, req.path, null);
    return res.status(401).json({
      error: "Access denied. Please log in to continue.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // Verify admin still exists and is active
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        role: true,
        groupId: true,
        status: true,
      },
    });
    if (!admin || admin.status !== "active") {
      logger.security.unauthorizedAccess(req.ip, req.path, token);
      return res.status(403).json({
        error: "Account no longer active. Please contact support.",
      });
    }

    req.admin = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      groupId: admin.groupId,
    };

    next();
  } catch (err) {
    let message = "Session expired or invalid. Please log in again.";
    let status = 403;

    if (err.name === "TokenExpiredError") {
      message = "Session expired. Please log in again.";
    } else if (err.name === "JsonWebTokenError") {
      message = "Invalid session. Please log in again.";
      status = 401;
    }

    logger.security.unauthorizedAccess(req.ip, req.path, token);
    return res.status(status).json({ error: message });
  }
};
