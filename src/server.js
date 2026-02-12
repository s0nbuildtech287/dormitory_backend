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

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Dormitory System Backend!" });
});

// API Routes
const authRoutes = require('./routers/authRoutes');
const registrationRoutes = require('./routers/registrationRoutes');
const roomRoutes = require('./routers/roomRoutes');
const contractRoutes = require('./routers/contractRoutes');
const invoiceRoutes = require('./routers/invoiceRoutes');
const feedbackRoutes = require('./routers/feedbackRoutes');
const notificationRoutes = require('./routers/notificationRoutes');
const logRoutes = require('./routers/logRoutes');
const settingsRoutes = require('./routers/settingsRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 1234;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
