const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

require("dotenv").config();

const fetchAndProcessData = async () => {
  try {
    const conversionRateResponse = await axios.get(
      process.env.CURRECY_EXCHANGE_RATE_API
    );
    const conversionRate = conversionRateResponse.data.conversion_rate;

    const sourceResponse = await axios.get(process.env.SOURCE_URL);
    const $ = cheerio.load(sourceResponse.data);
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
        let cardName = $(element).find("a:has(h4)").find("h4").text().trim();
        let card_id = $(element).find("span.my-2").text().trim();
        let priceWithHKD = Math.round(
          parseInt(
            $(element).find("strong.text-end").text().trim().replace(" 円", ""),
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

    console.log("json updated successfully");
  } catch (err) {
    console.log("Error:", err);
  }
};

fetchAndProcessData();
