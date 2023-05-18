/*
A Radium market price calculator on Solana

Taken from https://github.com/raydium-io/raydium-sdk
*/

import { Connection, PublicKey } from "@solana/web3.js";
import {
  LIQUIDITY_STATE_LAYOUT_V4,
} from "@raydium-io/raydium-sdk";
import { OpenOrders } from "@project-serum/serum";
import BN from "bn.js";
import fetch from 'node-fetch';
import readline from 'readline';
import fs from 'fs';

// create the pool id map
const poolIdMap = createPoolIdMap();

/* Retrieves the associated marketProgramId of a given pool id */
async function getMarketProgramId(id: string): Promise<string | undefined> {
  try {
    const response = await fetch('https://api.raydium.io/v2/sdk/liquidity/mainnet.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result: any = await response.json();
    const data = result.official;

    const item = data.find((item: any) => item.id === id);
    return item ? item.marketProgramId : undefined;
  } catch (error) {
    console.error(`Fetch Error: ${error}`);
    return undefined;
  }
}

/* Retrieve the exchange rate given a pool id */
export async function getPoolPrice(pool_id: string) {
  const connection = new Connection("https://solana-mainnet.rpc.extrnode.com", "confirmed");

  // example to get pool info
  const info = await connection.getAccountInfo(new PublicKey(pool_id));
  // console.log(info)
  if (!info) return;

  const poolProgramId = await getMarketProgramId(pool_id);
  if (!poolProgramId) {
    console.error('No matching pool ID found!');
    return
  }

  const OPENBOOK_PROGRAM_ID = new PublicKey(poolProgramId);

  const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
  const openOrders = await OpenOrders.load(
    connection,
    poolState.openOrders,
    OPENBOOK_PROGRAM_ID // OPENBOOK_PROGRAM_ID(marketProgramId) of each pool can get from api: https://api.raydium.io/v2/sdk/liquidity/mainnet.json
  );

  const baseDecimal = 10 ** poolState.baseDecimal.toNumber(); // e.g. 10 ^ 6
  const quoteDecimal = 10 ** poolState.quoteDecimal.toNumber();

  const baseTokenAmount = await connection.getTokenAccountBalance(
    poolState.baseVault
  );
  const quoteTokenAmount = await connection.getTokenAccountBalance(
    poolState.quoteVault
  );

  const basePnl = poolState.baseNeedTakePnl.toNumber() / baseDecimal;
  const quotePnl = poolState.quoteNeedTakePnl.toNumber() / quoteDecimal;

  const openOrdersBaseTokenTotal =
    openOrders.baseTokenTotal.toNumber() / baseDecimal;
  const openOrdersQuoteTokenTotal =
    openOrders.quoteTokenTotal.toNumber() / quoteDecimal;

  const base =
    (baseTokenAmount.value?.uiAmount || 0) + openOrdersBaseTokenTotal - basePnl;
  const quote =
    (quoteTokenAmount.value?.uiAmount || 0) +
    openOrdersQuoteTokenTotal -
    quotePnl;

  return quote / base;
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
          if (finalAmount > investment) { //atleast 5% profit
            let profit = finalAmount - investment;
            return [true, [i, j, k], profit];
          }
        }
      }
    }
  }
  return [false, [], 0];
}

/* Constructs a matrix describing the exchange rate between tokens */
function constructPriceMatrix(rates: number[]): number[][] {
  if (rates.length !== 3) {
    throw new Error("Expected exactly three exchange rates");
  }

  // Initialize a 3x3 matrix with 1's on the diagonal
  let conversionMatrix = Array(3).fill(0).map(() => Array(3).fill(1));

  // Fill in the given rates and their reciprocals
  for (let i = 0; i < 3; i++) {
    let j = (i + 1) % 3;
    conversionMatrix[i][j] = rates[i];
    conversionMatrix[j][i] = 1 / rates[i];
  }

  return conversionMatrix;
}

// /* Returns array of format [SOL_USDC_POOL_ID, USDC_ETH_POOL_ID, ETH_SOL_POOL_ID] */
// function constructPoolIdArray(token_ids: string[], pool_data_file: string): number[] {
//   //TODO(patapan) implement

//   // we need to turn pool_data_file into a map which we can call like map[SOL][ETH] = SOL_ETH_POOL_ID


//   return ret;
// }

/* Create a map of all token combinations to pool IDs */
function createPoolIdMap() {
  const poolData = fs.readFileSync('./data/official_pool_data.txt', 'utf-8');
  const lines = poolData.split('\n');
  const poolIdMap = new Map();

  for (const line of lines) {
    const [id, pair] = line.split(',');
    poolIdMap.set(pair, id);
  }

  return poolIdMap;
}

/* Retrieve the price of a given quantity of a token in terms of another token */
export async function getRaydiumPrice(token1: string, token2: string, quantity = 1) {

  // find the pool id for the given tokens
  let poolId = poolIdMap.get(`${token1}-${token2}`);
  if (!poolId) {
    poolId = poolIdMap.get(`${token2}-${token1}`);
  }

  if (!poolId) {
    throw new Error(`No pool found for ${token1} and ${token2}`);
  }

  // get the price of 1 unit of token1 in terms of token2
  const price = await getPoolPrice(poolId);

  // return the price of the given quantity of token1 in terms of token2
  if (typeof price === 'number'){
    return price * quantity;
  } else {
    throw new Error ('Error getting price');
  }
}
async function main() {
  console.log("start");
  console.log(await getRaydiumPrice("SOL", "USDC"));
  console.log(await getRaydiumPrice("RAY", "USDC"));
  // iterate through data/valid_triplets.txt
  // const fileStream = fs.createReadStream("data/valid_triplets.txt");

  // const rl = readline.createInterface({
  //   input: fileStream,
  //   crlfDelay: Infinity
  // });

  // for await (const triplet of rl) {
  //   console.log(triplet);
  //   // construct 3x3 matrix of pool_ids using data/official_pool_data.txt
  //   let pool_array = constructPoolIdArray(triplet.split(","), "data/official_pool_data.txt");
  //   // using matrix of pool_ids, construct a new matrix of prices
  //   // TODO(PATAPAN) question -- How do we know when we need to invert a price. This is based on the order of the tokens in the pool array
  //   let price_matrix = constructPriceMatrix(pool_array);

  //   calculateArbitrageOpportunity(price_matrix);
  // }
}

// Everything below here should be removed/refactored into main

// raydium pool id can get from api: https://api.raydium.io/v2/sdk/liquidity/mainnet.json
const SOL_USDC_POOL_ID = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const RAY_SOL_POOL_ID = "AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA";
const RAY_USDC_POOL_ID = "6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg";


async function fetchAndCreateMatrix() {
  const [SOL_TO_USDC, RAY_TO_USDC, RAY_TO_SOL] = await Promise.all([
    getPoolPrice(SOL_USDC_POOL_ID),
    getPoolPrice(RAY_USDC_POOL_ID),
    getPoolPrice(RAY_SOL_POOL_ID)
  ]);


  if (SOL_TO_USDC === undefined || RAY_TO_USDC === undefined || RAY_TO_SOL === undefined) {
    throw new Error('Failed to fetch one or more exchange rates');
  }

  // Order is SOL, USDC, RAY. We do 1 / X to invert the rate
  return constructPriceMatrix([SOL_TO_USDC, 1 / RAY_TO_USDC, RAY_TO_SOL]);
}

main()

// fetchAndCreateMatrix().then(matrix => {
//   console.log(calculateArbitrageOpportunity(matrix))
// });