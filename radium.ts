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
const SOL_USDC_POOL_ID = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const RAY_SOL_POOL_ID = "AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA";
const RAY_USDC_POOL_ID = "6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg";
// const OPENBOOK_PROGRAM_ID = new PublicKey(
//   "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX"
// );

export async function parsePoolInfo(pool_id: string, market: string) {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const owner = new PublicKey("VnxDzsZ7chE88e9rB6UKztCt2HUwrkgCTx8WieWf5mM");

  const tokenAccounts = await getTokenAccounts(connection, owner);

  // example to get pool info
  const info = await connection.getAccountInfo(new PublicKey(pool_id));
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
}

// for (let i of [RAY_SOL_POOL_ID]) {
//   console.log(i);
//   getMarketProgramId(i).then(marketProgramId => {
//     if (marketProgramId) {
//       console.log(`marketProgramId: ${marketProgramId}`);
//     } else {
//       console.log('No matching ID found!');
//     }
//   });
// }


parsePoolInfo(SOL_USDC_POOL_ID, "SOL TO USDC");
// parsePoolInfo(RAY_USDC_POOL_ID, "RAY TO USDC");
parsePoolInfo(RAY_SOL_POOL_ID, "RAY TO SOL");