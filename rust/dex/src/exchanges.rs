// exchange.rs
use std::error::Error;

// given token addresses, return ticker on jupiter
// Returns: For 1 of token_1, how many token_2 can I get?
pub async fn get_jupiter_price(client: &reqwest::Client, token_1: &str, token_2: &str) -> Result<f64, Box<dyn Error>> {

    let url = format!("https://price.jup.ag/v4/price?ids={}&vsToken={}", token_1, token_2);
    let response: serde_json::Value = client.get(&url).send().await?.json().await?;    
    let price = response["data"][token_1]["price"].as_f64().unwrap_or(0.0);

    Ok(price)
}
