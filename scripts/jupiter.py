
import requests
import os
import json
import time


"""Get the price of a token on Jupiter"""
def getJupiterPrice(token_1, token_2, amount, slippage=1):
    url = f'https://quote-api.jup.ag/v4/quote?inputMint={token_1}&outputMint={token_2}&amount={str(amount)}&slippageBps={str(slippage)}'
    return requests.get(url).json()['data'][0]['outAmount']

def tokenIdtoSymbol(token_id):
    url = f'https://public-api.solscan.io/token/meta?tokenAddress={token_id}'
    return requests.get(url, headers={'token': os.getenv("SOLSCAN_API")}).json()['symbol']

""
def getTokenIdsFromSolScan():
    tokens = {}
    for i in range(10):
        url = f'https://public-api.solscan.io/token/list?sortBy=market_cap&direction=desc&limit=50&offset={i}'
        response = requests.get(url, headers={'token': os.getenv("SOLSCAN_API")}).json()

        for token in response['data']:
            tokens[token['tokenSymbol']] = token['mintAddress']
    f = open("./data/solana_tokens.txt", "w")
    f.write(json.dumps(tokens))
    f.close()
    return tokens

def getTokenIdsFromTxt():
    f = open("./data/solana_tokens.txt", "r")
    return json.loads(f.read())


def main():
    token_ids = getTokenIdsFromTxt()
    valid_tokens = ['SOL', 'RAY', 'USDC', 'ETH']

    while True:
        for token in valid_tokens:
            jupiterPrice = getJupiterPrice(token_ids[token])
            orcaPrice = getOrcaPrice()

            print("Jupiter Price: " + str(jupiterPrice))

        time.sleep(10)