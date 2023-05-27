// main.rs
mod exchanges;

#[tokio::main]
async fn main() {
    let client = reqwest::Client::new();

    let token_addresses = exchange::get_token_ids_from_txt().unwrap();

    let SOL = token_addresses.get("SOL").expect("panic");
    let RAY = token_addresses.get("RAY").expect("panic");

    let price = exchange::get_jupiter_price(&client, SOL, RAY).await.expect("Failed to get price");

    println!("{}", price);
}
