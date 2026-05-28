const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
require("dotenv").config();
require("./services/cronJobs");

// ─────────────────────────────────────────────────────────────
// Route Imports
// ─────────────────────────────────────────────────────────────
const authRoutes = require("./routes/authRoutes");
const ussdRoutes = require("./routes/ussdRoutes");
const savingsRoutes = require("./routes/savings");
const loanRoutes = require("./routes/loanRoutes");
const memberRoutes = require("./routes/memberRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const contractRoute = require("./routes/contractRoute");
const auditRoute = require("./routes/auditRoute");

// Auth middleware — used to protect routes
const auth = require("./middleware/auth");

// ─────────────────────────────────────────────────────────────
// App & Server Setup
// ─────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────────────────────
// CORS
// In development: allow localhost frontend
// In production: set FRONTEND_URL in .env to your real domain
// ─────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5174", // Vite sometimes picks this port
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, Postman, Africa's Talking USSD)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
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

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// ─────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// Database
// ─────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ─────────────────────────────────────────────────────────────
// Routes
//
// PUBLIC (no auth required):
//   /api/auth  — login endpoint
//   /ussd      — Africa's Talking posts here from outside
//
// PROTECTED (requires JWT token):
//   Everything else
// ─────────────────────────────────────────────────────────────

// Public routes
app.use("/api/auth", authRoutes);
app.use("/ussd", ussdRoutes);

// Protected routes — all require a valid JWT token
app.use("/api/savings", auth, savingsRoutes);
app.use("/api/loans", auth, loanRoutes);
app.use("/api/members", auth, memberRoutes);
app.use("/api/transactions", auth, transactionRoutes);
app.use("/api/payments", auth, paymentRoutes);
app.use("/dashboard", auth, dashboardRoutes);
app.use("/contract", auth, contractRoute);
app.use("/audit", auth, auditRoute);

// Start Server

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(` Backend running on http://localhost:${PORT}`);
});
