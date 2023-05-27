// main.rs
mod exchanges;
mod arbitrage;
mod util;

use arbitrage::calc_triangle_arbitrage_opportunity;
use exchanges::get_jupiter_price;

#[tokio::main]
async fn main() {
    triangle().await;
}

use std::thread;
use std::time::Duration;

async fn triangle() {
    // This should come from your data
    let valid_tokens = vec![
        vec!["SOL", "USDC", "RAY"],
        vec!["USDC", "ORCA", "SOL"],
        vec!["USDC", "BTC", "SOL"],
        vec!["USDC", "GENE", "SOL"],
    ];

    let token_ids = util::get_token_ids_from_txt().unwrap();
    let client = reqwest::Client::new();

    loop {
        for triplet in &valid_tokens {
            println!("Jupiter DEX Triplet: {:?}", triplet);
            let mut prices: Vec<Vec<f64>> = Vec::new(); // create vector to hold prices

            for i in 0..triplet.len() {
                let mut row: Vec<f64> = Vec::new();
                for j in 0..triplet.len() {
                    if i == j {
                        row.push(1.0); // add 1.0 for same token to token conversion rate
                    } else {
                        let token_1 = triplet[i];
                        let token_2 = triplet[j]; 
                        let jupiter_price = get_jupiter_price(&client, token_ids.get(token_1).unwrap(), token_ids.get(token_2).unwrap()).await.unwrap();
                        row.push(jupiter_price);
                        println!("{} to {}: {}", token_1, token_2, jupiter_price);
                    }   
                }
                prices.push(row);
            }

            // Check for arbitrage opportunity after each price matrix fetch
            let arbitrage_opportunity = calc_triangle_arbitrage_opportunity(&prices, /*investment=*/1000.0).unwrap();
            if arbitrage_opportunity.has_opportunity {
                let sequence_str: Vec<&str> = arbitrage_opportunity.indices.iter().map(|&idx| triplet[idx]).collect();
                println!("Arbitrage opportunity detected with the sequence: {}. Estimated profit: {}", sequence_str.join(" -> "), arbitrage_opportunity.profit);
                return;
            }

        }
        thread::sleep(Duration::from_secs(10));
    }
}
