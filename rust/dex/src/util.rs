// util.rs

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
// given token ad