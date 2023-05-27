// main.rs
mod exchange;
use exchange::get_jupiter_price;

#[tokio::main]
async fn main() {
    let client = reqwest::Client::new();

    let price = get_jupiter_price(&client, "So11111111111111111111111111111111111111112", "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R").await.expect("Failed to get price");

    println!("{}", price);
}
