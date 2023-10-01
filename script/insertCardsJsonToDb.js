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

const pool = new Pool(poolConfig);

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
});

const insertDataToDb = async () => {
  try {
    const CardInfoList = JSON.parse(
      fs.readFileSync("cronjob/cards_with_price.json", "utf-8")
    );

    await pool.query("TRUNCATE TABLE cards_with_price");
    console.log("Table truncated successfully");

    await pool.query("ALTER SEQUENCE cards_with_price_id_seq RESTART WITH 1");
    console.log("Sequence reset successfully");

    // Generate and execute INSERT INTO statements
    const totalCardNumbers = CardInfoList.length;
    let insertedCardNumbers = 0;
    const promises = CardInfoList.map((card) => {
      return new Promise((resolve, reject) => {
        pool.query(
          "INSERT INTO cards_with_price (card_id, name, price) VALUES ($1, $2, $3)",
          [card.card_id, card.name, card.price],
          (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res);
              insertedCardNumbers += 1;
            }
          }
        );
      });
    });

    await Promise.all(promises);
    console.log(
      `json import successfully, inserted cards: ${insertedCardNumbers}/${totalCardNumbers}`
    );
  } catch (err) {
    console.log("Error:", err);
  } finally {
    await pool.end();
    console.log("pool end");
  }
};

insertDataToDb();
