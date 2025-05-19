const express = require("express");
const cors = require("cors");
require("dotenv").config();
console.log("Loaded Africa's Talking API Key:", process.env.AT_API_KEY);
const mongoose = require("mongoose");

// Route Imports
const routes = require("./routes/savings");
const ussdRoutes = require("./routes/ussdRoutes"); // USSD routes
const savingsRoutes = require("./routes/savings");
const loanRoutes = require("./routes/loanRoutes");
const memberRoutes = require("./routes/memberRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));

// Use routes
app.use("/api/savings", savingsRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/transactions", transactionRoutes);

app.use("/ussd", ussdRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
1;
