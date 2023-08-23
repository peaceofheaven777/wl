const ethers = require('ethers');
const fs = require('fs');
const Twitter = require('twitter');
const axios = require('axios');
require("dotenv").config();

const friendsAddress = '0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4';
const provider = new ethers.WebSocketProvider('wss://base.blockpi.network/v1/ws/73bf67ad7bacf805b7207668dd0886c5417157ee'); 

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const account = wallet.connect(provider);

const friends = new ethers.Contract(
  friendsAddress,
  [
    'function buyShares(address arg0, uint256 arg1)',
    'function getBuyPriceAfterFee(address sharesSubject, uint256 amount) public view returns (uint256)',
    'event Trade(address trader, address subject, bool isBuy, uint256 shareAmount, uint256 ethAmount, uint256 protocolEthAmount, uint256 subjectEthAmount, uint256 supply)',
  ],
  account
);

const gasPrice = ethers.parseUnits('0.00001100000079431', 'ether');

const balanceArray = [];

const twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

const run = async () => {
  let filter = friends.filters.Trade(null,null,null,null,null,null,null,null);

  friends.on(filter, async (event) => {
    if (event.args[2] == true) {
      const amigo = event.args[1];
      const weiBalance = await provider.getBalance(amigo);

      const currentTime = new Date().toLocaleTimeString();

      console.log(`[${currentTime}] Checking user: ${amigo}`);

      for (const botBalance in balanceArray) {
        if (weiBalance > botBalance - 300000000000000 && weiBalance < botBalance + 300000000000000) {
          console.log(`[${currentTime}] Bot detected: ${amigo}`);
          return false;
        }
      }

      // Fetch user data from API
      const userDataResponse = await axios.get(`https://prod-api.kosetto.com/users/${amigo}`);
      const userData = userDataResponse.data;

      // Extract Twitter username from user data
      const twitterUsername = userData.twitterUsername;

      // Fetch follower count from Twitter API
      twitterClient.get('users/show', { screen_name: twitterUsername }, async (error, twitterUser, response) => {
        if (error) {
          console.error(`[${currentTime}] Error fetching Twitter user data: ${error}`);
          return;
        }

        const followerCount = twitterUser.followers_count;
        console.log(`[${currentTime}] Twitter Followers for ${twitterUsername}: ${followerCount}`);

        const holderCount = userData.holderCount;
        console.log(`[${currentTime}] Holder Count: ${holderCount}`);

        if (followerCount >= 10000 && holderCount <= 5) {
          let qty = 1;
          if (weiBalance >= 90000000000000000) qty = 2;
          if (weiBalance >= 900000000000000000) qty = 3;

          const addressFilePath = './addresses.txt';
          const existingAddresses = fs.readFileSync(addressFilePath, 'utf-8').split('\n').filter(Boolean);

          if (existingAddresses.includes(amigo)) {
            console.log(`[${currentTime}] Address ${amigo} has already been purchased.`);
            return;
          }

          const buyPrice = await friends.getBuyPriceAfterFee(amigo, qty);
          console.log(`[${currentTime}] BUY PRICE: ${buyPrice} ${event.args[7]}`);
          if (qty < 2 && buyPrice > 2000000000000000) return false;
          if (buyPrice > 10000000000000000) return false;
          console.log(`[${currentTime}] ### BUY ### ${amigo}, ${buyPrice}`);
          const tx = await friends.buyShares(amigo, qty, {value: buyPrice, gasPrice});
          fs.appendFileSync('./buys.txt', amigo + "\n");
          try {
            const receipt = await tx.wait();
            console.log(`[${currentTime}] Transaction Mined: ${receipt.blockNumber}`);
            
            // Append the bought address to the file
            fs.appendFileSync(addressFilePath, amigo + '\n');
          } catch (error) {
            console.log(`[${currentTime}] Transaction Failed: ${error}`);
          }
        } else {
          console.log(`[${currentTime}] Not meeting criteria for purchase: ${amigo}`);
        }
      });
    }
  });
}

try {
  run();
} catch (error) {
  console.error(`ERR: ${error}`);
}

process.on('uncaughtException', error => {
  console.error(`Uncaught Exception: ${error}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Unhandled Promise Rejection: ${reason}`);
});
