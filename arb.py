import requests
import json

def calculate_arbitrage_opportunity(prices):
    """
    Calculates the arbitrage opportunity given a matrix of conversion rates.

    :param prices: A 3x3 matrix of conversion rates between three cryptocurrencies.
                   prices[i][j] is the conversion rate from currency i to currency j.
                   prices[i][i] should always be 1.0.
    :return: A tuple containing the arbitrage opportunity (True or False) and the arbitrage path.
    """
    for i in range(3):
        for j in range(3):
            if i == j:
                assert prices[i][j] == 1.0, f"Invalid conversion rate: {prices[i][j]} at ({i}, {j})"
            else:
                assert prices[i][j] > 0, f"Invalid conversion rate: {prices[i][j]} at ({i}, {j})"

    for i in range(3):
        for j in range(3):
            for k in range(3):
                if i != j and j != k and k != i:
                    conversion_rate = prices[i][j] * prices[j][k] * prices[k][i]
                    if conversion_rate > 1.0:
                        return True, (i, j, k)
    return False, ()

def fetch_token_prices():
    query = '''
    {
      tokens(where: {symbol_in: ["eth", "uni", "arb"]}) {
        symbol
        derivedETH
      }
    }
    '''
    url = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3"
    headers = {"Content-Type": "application/json"}
    data = json.dumps({"query": query})
    response = requests.post(url, headers=headers, data=data)
    response_data = response.json()
    
    prices = {}
    print("response")
    print(response_data)

    for token in response_data['data']['tokens']:
        prices[token['symbol']] = float(token['derivedETH'])
        
    return prices

def create_conversion_matrix(prices):
    conversion_rates = [
        [1.0, prices["AAVE"] / prices["ETH"], prices["ARB"] / prices["ETH"]],
        [prices["ETH"] / prices["AAVE"], 1.0, prices["ARB"] / prices["AAVE"]],
        [prices["ETH"] / prices["ARB"], prices["AAVE"] / prices["ARB"], 1.0],
    ]
    return conversion_rates

def main():
    token_prices = fetch_token_prices()
    print(f"Token prices (in ETH): {token_prices}")
    
    conversion_rates = create_conversion_matrix(token_prices)
    print(f"Conversion rates matrix: {conversion_rates}")
    
    arbitrage, path = calculate_arbitrage_opportunity(conversion_rates)
    if arbitrage:
        print(f"Arbitrage opportunity detected! Trade path: " + path)
    else:
        print("No arbitrage opportunity detected.")

if __name__ == "__main__":
    main()
