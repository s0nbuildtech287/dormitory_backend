const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "dormitory_system",
  max: 10,
  idleTimeoutMillis: 0, // 0 = never close idle connections (prevents Node exit)
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false, // NEVER let pg cause Node.js to exit
  keepAlive: true, // send TCP keepalive probes
  keepAliveInitialDelayMillis: 10000,
});

// Prevent idle client errors from crashing the process
pool.on("error", (err) => {
  console.error("[pg pool] Unexpected client error (ignored):", err.message);
});

// Test connection
pool
  .connect()
  .then((client) => {
    console.log("✅ PostgreSQL Database connected successfully");
    client.release();
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });

module.exports = pool;
