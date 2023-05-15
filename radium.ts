/*
A Radium market price calculator on Solana

Taken from https://github.com/raydium-io/raydium-sdk
*/

import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  TokenAccount,
  SPL_ACCOUNT_LAYOUT,
  LIQUIDITY_STATE_LAYOUT_V4,
} from "@raydium-io/raydium-sdk";
import { OpenOrders } from "@project-serum/serum";
import BN from "bn.js";
import fetch from 'node-fetch';

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

async function getTokenAccounts(connection: Connection, owner: PublicKey) {
  const tokenResp = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });

  const accounts: TokenAccount[] = [];
  for (const { pubkey, account } of tokenResp.value) {
    accounts.push({
      pubkey,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
    });
  }

  return accounts;
}

// raydium pool id can get from api: https://api.raydium.io/v2/sdk/liquidity/mainnet.json
// TODO(patapan) We could just go through that json, checking pool IDs.

const SOL_USDC_POOL_ID = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const RAY_SOL_POOL_ID = "AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA";
const RAY_USDC_POOL_ID = "6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg";


export async function parsePoolInfo(pool_id: string, market: string) {
  const connection = new Connection("https://solana-mainnet.rpc.extrnode.com", "confirmed");
  const owner = new PublicKey("VnxDzsZ7chE88e9rB6UKztCt2HUwrkgCTx8WieWf5mM");

  const tokenAccounts = await getTokenAccounts(connection, owner);

  // example to get pool info
  const info = await connection.getAccountInfo(new PublicKey(pool_id));
  console.log(info)
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

  const denominator = new BN(10).pow(poolState.baseDecimal);

  const addedLpAccount = tokenAccounts.find((a) =>
    a.accountInfo.mint.equals(poolState.lpMint)
  );

  console.log(
    market + ": " +  quote / base
  );

  return quote / base
}

type Matrix = number[][];

function calculateArbitrageOpportunity(prices: Matrix, investment: number = 1000): [boolean, number[], number] {
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

function createConversionMatrix(rates: number[]): number[][] {
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


async function fetchAndCreateMatrix() {
  const [SOL_TO_USDC, RAY_TO_USDC, RAY_TO_SOL] = await Promise.all([
    parsePoolInfo(SOL_USDC_POOL_ID, "SOL TO USDC"),
    parsePoolInfo(RAY_USDC_POOL_ID, "RAY TO USDC"),
    parsePoolInfo(RAY_SOL_POOL_ID, "RAY TO SOL")
  ]);


  if (SOL_TO_USDC === undefined || RAY_TO_USDC === undefined || RAY_TO_SOL === undefined) {
    throw new Error('Failed to fetch one or more exchange rates');
  }

  // Order is SOL, USDC, RAY. We do 1 / X to invert the rate
  return createConversionMatrix([SOL_TO_USDC, 1 / RAY_TO_USDC, RAY_TO_SOL]);
}

// fetchAndCreateMatrix().then(matrix => {
//   console.log(matrix);
//   console.log(calculateArbitrageOpportunity(matrix))
// });

console.log(parsePoolInfo("3mYsmBQLB8EZSjRwtWjPbbE8LiM1oCCtNZZKiVBKsePa", "CWAR TO USDC"));