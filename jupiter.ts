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

async function main() {
    
    const valid_tokens = ['SOL', 'USDC', 'RAY'];

    while (true) {
        for (let i = 0; i < valid_tokens.length; i++ ) {
            for (let j = i + 1; j < valid_tokens.length; j++) {
                let token_1 = valid_tokens[i]
                let token_2 = valid_tokens[j]; 
                const jupiterPrice = await getJupiterPrice(token_ids[token_1], token_ids[token_2]);

                console.log(token_1 + " to " + token_2 + ": " + jupiterPrice);
            }
            
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

main();
