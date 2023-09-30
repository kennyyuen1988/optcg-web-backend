const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: process.env.WHITE_LIST_ORIGIN,
  })
);

console.log("process.env.DATABASE_URL_1", process.env.DATABASE_URL);
console.log("process.env.WHITE_LIST_ORIGIN_1", process.env.WHITE_LIST_ORIGIN);

const port = 3000;
let poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

if (process.env.DEPLOY_ENV === "production") {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

app.get("/api/data", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM cards_with_price ORDER BY price DESC LIMIT 20"
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
