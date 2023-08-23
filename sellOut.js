const ethers = require('ethers');
const fs = require('fs');
require("dotenv").config();

const sellsFilePath = 'addresses.txt'; // Ubah sesuai dengan path file addresses.txt
const friendsAddress = '0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4';
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const provider = new ethers.WebSocketProvider('wss://base.blockpi.network/v1/ws/8f4b2bdc03a217dbea6a1d29dd32dab9311f6b8b'); 
const gasPrice = ethers.parseUnits('0.000000000000049431', 'ether');
const account = wallet.connect(provider);

const friends = new ethers.Contract(
    friendsAddress,
    [
      'function buyShares(address arg0, uint256 arg1)',
      'function getBuyPriceAfterFee(address sharesSubject, uint256 amount) public view returns (uint256)',
      'function sharesBalance(address sharesSubject, address holder) public view returns (uint256)',
      'function sharesSupply(address sharesSubject) public view returns (uint256)',
      'function sellShares(address sharesSubject, uint256 amount) public payable',
      'event Trade(address trader, address subject, bool isBuy, uint256 shareAmount, uint256 ethAmount, uint256 protocolEthAmount, uint256 subjectEthAmount, uint256 supply)',
    ],
    account
);

const init = async () => {
    try {
        const addressesFileContent = fs.readFileSync(sellsFilePath, 'utf8');
        const addresses = addressesFileContent.split('\n').map(address => address.trim()).filter(address => address !== '');

        for (const friend of addresses) {
            const bal = await friends.sharesBalance(friend, wallet.address);
            if (bal >= 1) {
                const supply = await friends.sharesSupply(friend);
                if (supply > 1 && friend !== '0xb426d1F9Aea9a1aBD880CaE47D1aa759307A6B3B') {
                    console.log(`Selling: ${friend}`);
                    try {
                        const tx = await friends.sellShares(friend, 1, {gasPrice});
                        const receipt = await tx.wait();
                        console.log('Transaction Mined:', receipt.blockNumber);
                        if (bal >= 2 && supply > 2) {
                            console.log(`Selling 2nd: ${friend}`);
                            const tx2 = await friends.sellShares(friend, 1, {gasPrice});
                            const receipt2 = await tx2.wait();
                            console.log('Transaction Mined:', receipt2.blockNumber);
                        }
                        if (bal >= 3 && supply > 3) {
                            console.log(`Selling 3rd: ${friend}`);
                            const tx3 = await friends.sellShares(friend, 1, {gasPrice});
                            const receipt3 = await tx3.wait();
                            console.log('Transaction Mined:', receipt3.blockNumber);
                        }
                    } catch (error) {
                        console.log('Transaction Failed:', error);
                    }
                } else {
                    console.log(`Bag holder: ${friend}`);
                }
            } else {
                console.log(`No Balance: ${friend}`);
            }
        }
    } catch (error) {
        console.error('Error reading addresses file:', error);
    }
}

init();

process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
});
