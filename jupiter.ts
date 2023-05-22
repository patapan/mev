import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

interface TokenData {
    [key: string]: string;
}

const token_ids = getTokenIdsFromTxt();

async function getJupiterPrice(token_1: string, token_2: string, amount = 1): Promise<number> {
    const url = `https://price.jup.ag/v4/price?ids=${token_1}&vsToken=${token_2}`
    const response = await axios.get(url);

    return response.data.data[token_1].price * amount;
}

async function tokenIdtoSymbol(token_id: string): Promise<string> {
    const url = `https://public-api.solscan.io/token/meta?tokenAddress=${token_id}`;
    const response = await axios.get(url, { headers: { token: process.env.SOLSCAN_API } });
    return response.data.symbol;
}

async function getTokenIdsFromSolScan(): Promise<TokenData> {
    const tokens: TokenData = {};
    for (let i = 0; i < 10; i++) {
        const url = `https://public-api.solscan.io/token/list?sortBy=market_cap&direction=desc&limit=50&offset=${i}`;
        const response = await axios.get(url, { headers: { token: process.env.SOLSCAN_API } });

        for (const token of response.data.data) {
            tokens[token.tokenSymbol] = token.mintAddress;
        }
    }
    fs.writeFileSync("./data/solana_tokens.txt", JSON.stringify(tokens));
    return tokens;
}

function getTokenIdsFromTxt(): TokenData {
    const data = fs.readFileSync("./data/solana_tokens.txt", 'utf8');
    return JSON.parse(data);
}

/*  Given a matrix of prices, identifies potential arbitrage opportunities */
function calculateArbitrageOpportunity(prices: number[][], investment: number = 200): [boolean, number[], number] {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === j) {
          if (prices[i][j] !== 1.0) {
            throw new Error(`Invalid conversion rate: ${prices[i][j]} at (${i}, ${j})`);
          }
        } else {
          if (prices[i][j] <= 0) {
            throw new Error(`Invalid conversion rate: ${prices[i][j]} at (${i}, ${j})`);
          }
        }
      }
    }
  
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          if (i !== j && j !== k && k !== i) {
            let finalAmount = investment * prices[i][j] * prices[j][k] * prices[k][i];
            if (finalAmount > investment * 1.03) { //atleast 3% profit
              let profit = finalAmount - investment;
              return [true, [i, j, k], profit];
            }
          }
        }
      }
    }
    return [false, [], 0];
  }

  async function main() {
    
    const valid_tokens = ['SOL', 'USDC', 'RAY'];

    // Every 10 seconds, get all combo prices of valid_tokens on jupiter
    while (true) {
        console.log("Jupiter DEX")
        let prices: number[][] = []; // create array to hold prices

        for (let i = 0; i < valid_tokens.length; i++ ) {
            let row: number[] = [];
            for (let j = 0; j < valid_tokens.length; j++) {
                if (i === j) {
                    row.push(1.0); // add 1.0 for same token to token conversion rate
                } else {
                    let token_1 = valid_tokens[i]
                    let token_2 = valid_tokens[j]; 
                    const jupiterPrice = await getJupiterPrice(token_ids[token_1], token_ids[token_2]);
                    row.push(jupiterPrice);

                    console.log(token_1 + " to " + token_2 + ": " + jupiterPrice);
                }   
            }
            prices.push(row);
        }

        // Check for arbitrage opportunity after each price matrix fetch
        const [hasOpportunity, sequence, profit] = calculateArbitrageOpportunity(prices);
        if (hasOpportunity) {
            console.log(`Arbitrage opportunity detected with the sequence: ${sequence.map(idx => valid_tokens[idx]).join(' -> ')}. Estimated profit: ${profit}`);
        }

        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}


main();
