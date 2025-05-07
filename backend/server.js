const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

console.log("✔ Loaded Africa's Talking API Key:", process.env.AT_API_KEY);

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(" MongoDB connection error:", err));

// Route Imports
const routes = require("./routes/savings");
const ussdRoutes = require("./routes/ussdRoutes");

app.use("/api", routes);
app.use("/api", ussdRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
