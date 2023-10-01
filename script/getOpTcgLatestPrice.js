const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const { Pool } = require("pg");

require("dotenv").config();

const port = 3000;
let poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

if (process.env.DEPLOY_ENV === "production") {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const client = new Pool(poolConfig);

axios
  .get(process.env.CURRECY_EXCHANGE_RATE_API)
  .then((response) => {
    const conversionRate = response.data.conversion_rate;

    axios
      .get(process.env.SOURCE_URL)
      .then((response) => {
        const $ = cheerio.load(response.data);
        const cardsList = $(".main")
          .find("div.container")
          .find("div.row")
          .find("div.p-0")
          .find("div.row:nth-child(2)")
          .find("div.col-12:nth-child(1)")
          .find("div.cards-list");

        let cardInfo = {};

        cardsList.each((index, card) => {
          const selectorRoot = $(card)
            .find("#card-lits")
            .find("div.col-md")
            .find(".card-product");

          ("div a:nth-child(2) h4");
          const name = selectorRoot.each((index, element) => {
            let cardName = $(element)
              .find("a:has(h4)")
              .find("h4")
              .text()
              .trim();
            let card_id = $(element).find("span.my-2").text().trim();
            let priceWithHKD = Math.round(
              parseInt(
                $(element)
                  .find("strong.text-end")
                  .text()
                  .trim()
                  .replace(" 円", ""),
                10
              ) * conversionRate
            );

            cardInfo = {
              ...cardInfo,
              [cardName]: {
                name: cardName,
                card_id,
                price: priceWithHKD,
              },
            };
          });
        });

        const CardInfoList = Object.values(cardInfo);

        fs.writeFileSync(
          "cronjob/cards_with_price.json",
          JSON.stringify(CardInfoList, null, 2)
        );

        // Connect to your postgres DB

        client.connect();

        client
          .query("TRUNCATE TABLE cards_with_price")
          .then((res) => {
            console.log("Table truncated successfully");
            return client.query(
              "ALTER SEQUENCE cards_with_price_id_seq RESTART WITH 1"
            );
          })
          .then((res) => {
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

            return Promise.all(promises);
          })
          .then(() => {
            console.log("json import successfully");
            // Close the connection after all INSERT INTO operations are completed
            client.end();
            // Force Node.js process to exit
            process.exit(0);
          })
          .catch((err) => {
            console.log("Error inserting data:", err);
            client.end();
            // Force Node.js process to exit
            process.exit(1);
          });
      })
      .catch((error) => {
        console.error(`catch error2: ${error}`);
      });
  })
  .catch((error) => {
    console.error(`catch error1: ${error}`);
  });
