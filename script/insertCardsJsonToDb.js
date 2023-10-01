const fs = require("fs");
const { Pool } = require("pg");

require("dotenv").config();

let poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

if (process.env.DEPLOY_ENV === "production") {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const client = new Pool(poolConfig);

const insertDataToDb = async () => {
  try {
    const CardInfoList = JSON.parse(
      fs.readFileSync("cronjob/cards_with_price.json", "utf-8")
    );

    // Connect to your postgres DB
    await client.connect();

    await client.query("TRUNCATE TABLE cards_with_price");
    console.log("Table truncated successfully");

    await client.query("ALTER SEQUENCE cards_with_price_id_seq RESTART WITH 1");
    console.log("Sequence reset successfully");

    // Generate and execute INSERT INTO statements
    const promises = CardInfoList.map((card) => {
      return new Promise((resolve, reject) => {
        client.query(
          "INSERT INTO cards_with_price (card_id, name, price) VALUES ($1, $2, $3)",
          [card.card_id, card.name, card.price],
          (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          }
        );
      });
    });

    await Promise.all(promises);
    console.log("json import successfully");
    // Close the connection after all INSERT INTO operations are completed
    await client.end((err) => {
      if (err) {
        console.log("Error ending client:", err);
        process.exit(1);
      } else {
        console.log("Client end");
        process.exit(0);
      }
    });
    console.log("client end");
    // Force Node.js process to exit
    process.exit(0);
  } catch (err) {
    console.log("Error:", err);
    await client.end();
    console.log("client end");
    // Force Node.js process to exit
    process.exit(1);
  }
};

insertDataToDb();
