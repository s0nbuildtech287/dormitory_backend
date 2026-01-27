const express = require("express");
const cors = require("cors");

// Temporarily disable console.log to hide dotenv messages
const originalConsoleLog = console.log;
console.log = () => {}; // Disable logging temporarily
require("dotenv").config();
console.log = originalConsoleLog; // Restore logging

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Dormitory System Backend!" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
