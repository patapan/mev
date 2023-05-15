import requests
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def get_json_from_url(url: str):
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        return None

"""
Given a raydium pool id, scrape solscan for token data
"""
def get_token_data(id):
    url = 'https://solscan.io/account/' + id
    # Setup webdriver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)
    driver.get(url)

    try:
        # Replace 'css-selector-of-interest' with the actual CSS selector
        element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#root > section > main > div > div.sc-kRvVA.cLOGya > div:nth-child(1) > div.ant-col.ant-col-24.ant-col-md-16 > h2 > span > div > div:nth-child(3) > span"))
        )
        return element.text
    finally:
        driver.quit()


def main():
    RAYDIUM_MAINNET = 'https://api.raydium.io/v2/sdk/liquidity/mainnet.json'
    pools = get_json_from_url(RAYDIUM_MAINNET)['official']

    f = open("pool_data.txt", "a")
    for pool in pools:
        token_data = get_token_data(pool['id'])
        print(pool['id'])
        print(token_data)

        f.write(pool['id'] + ',')
        f.write(token_data + '\n')

if __name__ == "__main__":
    main()