// ─────────────────────────────────────────────────────────────
// MkhondeChain Server
// Secure, production-ready Express server.
// ─────────────────────────────────────────────────────────────

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
// require("./services/cronJobs");

const logger = require("./utils/logger");

// Create logs directory if not exists
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ─────────────────────────────────────────────────────────────
// Route Imports
// ─────────────────────────────────────────────────────────────
const authRoutes = require("./routes/authRoutes");
const ussdRoutes = require("./routes/ussdRoutes");

const loanRoutes = require("./routes/loanRoutes");
const memberRoutes = require("./routes/memberRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const dashboardRoutes = require("./routes/dashboardRoutes");
const auditRoute = require("./routes/auditRoute");

const auth = require("./middleware/auth");

// ─────────────────────────────────────────────────────────────
// App & Server Setup
// ─────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────────────────────
// Security Middleware
// ─────────────────────────────────────────────────────────────

// Helmet: security headers
app.use(helmet());

// Rate limiting: general API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", generalLimiter);

// Stricter rate limiting: login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many login attempts. Please try again after 15 minutes.",
  },
  skipSuccessfulRequests: true,
});
app.use("/api/auth/login", loginLimiter);

// Stricter rate limiting: USSD
const ussdLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 USSD requests per minute per IP
  message: {
    error: "END Pali vuto. Yesaninso.\nSystem busy. Please try again.",
  },
});
app.use("/ussd", ussdLimiter);

// MongoDB sanitization: prevent NoSQL injection
app.use(mongoSanitize());

// HTTP Parameter Pollution prevention
app.use(hpp());

// Request size limits
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn("CORS_BLOCKED", { origin });
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─────────────────────────────────────────────────────────────
// Socket.IO
// ─────────────────────────────────────────────────────────────
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  const jwt = require("jsonwebtoken");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    socket.adminId = decoded.id;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  logger.info("SOCKET_CONNECTED", {
    socketId: socket.id,
    adminId: socket.adminId,
  });
  socket.on("disconnect", () => {
    logger.info("SOCKET_DISCONNECTED", { socketId: socket.id });
  });
});

app.set("io", io);

// ─────────────────────────────────────────────────────────────
// Database
// ─────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("MONGODB_CONNECTED"))
  .catch((err) => {
    logger.error("MONGODB_CONNECTION_ERROR", { error: err.message });
    process.exit(1);
  });

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

// Public routes
app.use("/api/auth", authRoutes);
app.use("/ussd", ussdRoutes);

// Protected routes

app.use("/api/loans", auth, loanRoutes);
app.use("/api/members", auth, memberRoutes);
app.use("/api/transactions", auth, transactionRoutes);

app.use("/api/dashboard", auth, dashboardRoutes);
app.use("/audit", auth, auditRoute);

// ─────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("EXPRESS_ERROR", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    ip: req.ip,
  });

  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ error: "Access denied." });
  }

  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message,
  });
});

// ─────────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// ─────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info("SERVER_STARTED", { port: PORT, env: process.env.NODE_ENV });
});
