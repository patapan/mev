// arbitrage.rs

pub struct ArbitrageOpportunity {
    pub has_opportunity: bool,
    pub indices: Vec<usize>,
    pub profit: f64,
}

// Given a 3x3 matrix of prices, return if there exists a profit opportunity
pub fn calc_triangle_arbitrage_opportunity(prices: &Vec<Vec<f64>>, investment: f64) -> Result<ArbitrageOpportunity, &'static str> {
    for i in 0..3 {
        for j in 0..3 {
            if i == j {
                if prices[i][j] != 1.0 {
                    return Err("Invalid conversion rate at diagonal");
                }
            } else {
                if prices[i][j] <= 0.0 {
                    return Err("Invalid conversion rate");
                }
            }
        }
    }

    for i in 0..3 {
        for j in 0..3 {
            for k in 0..3 {
                if i != j && j != k && k != i {
                    let final_amount = investment * prices[i][j] * prices[j][k] * prices[k][i];
                    if final_amount > investment * 1.01 { //atleast 1% profit
                        let profit = final_amount - investment;
                        return Ok(ArbitrageOpportunity {
                            has_opportunity: true,
                            indices: vec![i, j, k],
                            profit,
                        });
                    }
                }
            }
        }
    }

    Ok(ArbitrageOpportunity {
        has_opportunity: false,
        indices: vec![],
        profit: 0.0,
    })
}
