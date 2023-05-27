// exchange.rs
use std::error::Error;
use std::collections::HashMap;
use std::fs;
use serde_json::from_str;

type TokenData = HashMap<String, String>;

const SOLANA_TOKEN_ADDRESSES: &str = "../../../data/solana_tokens.txt";

// Returns a hashmap of [token_name] --> [token_address] for SOL chain
pub fn get_token_ids_from_txt() -> Result<TokenData, Box<dyn Error>> {
    let data = fs::read_to_string(SOLANA_TOKEN_ADDRESSES).map_err(|e| Box::new(e))?;
    let tokens: TokenData = from_str(&data)?;
    Ok(tokens)
}
// given token addresses, return ticker on jupiter
// Returns: For 1 of token_1, how many token_2 can I get?
pub async fn get_jupiter_price(client: &reqwest::Client, token_1: &str, token_2: &str) -> Result<f64, Box<dyn Error>> {

    let url = format!("https://price.jup.ag/v4/price?ids={}&vsToken={}", token_1, token_2);
    let response: serde_json::Value = client.get(&url).send().await?.json().await?;
    
    let price = response["data"][token_1]["price"].as_f64().unwrap_or(0.0);
    Ok(price)
}
