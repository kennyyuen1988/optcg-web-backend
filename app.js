const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3721", "https://optcg-web.vercel.app"],
  })
);

const port = 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get("/api/data", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT id, imageurl FROM cards WHERE id <= 50"
    );

    const results = { results: result ? result.rows : null };
    res.send(results);
    client.release();
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});
