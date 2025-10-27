"""
Naver Shopping Scraper
Searches for products by keyword and returns top selling products with URLs
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import time
import logging
from typing import List, Dict, Any
from urllib.parse import quote

logger = logging.getLogger(__name__)


class NaverShoppingScraper:
    """Scraper for Naver Shopping search results"""

    def __init__(self):
        self.driver = None
        self.base_url = "https://shopping.naver.com"

    def _init_driver(self):
        """Initialize Selenium WebDriver with headless Chrome"""
        if self.driver:
            return

        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            logger.info("✅ Chrome WebDriver initialized for Naver Shopping")
        except Exception as e:
            logger.error(f"❌ Failed to initialize WebDriver: {str(e)}")
            raise

    def _close_driver(self):
        """Close WebDriver"""
        if self.driver:
            self.driver.quit()
            self.driver = None

    def search_products(self, keyword: str, max_products: int = 100) -> List[Dict[str, Any]]:
        """
        Search products on Naver Shopping by keyword

        Args:
            keyword: Search keyword (e.g., "캠핑용 화로", "공구")
            max_products: Maximum products to return (default 100)

        Returns:
            List of products with URLs, sorted by popularity
        """
        try:
            self._init_driver()

            # Encode keyword for URL
            encoded_keyword = quote(keyword)
            search_url = f"{self.base_url}/search/all?query={encoded_keyword}&cat_id=&frm=NVSHATC&sort=rel"

            logger.info(f"🔍 Searching Naver Shopping for: {keyword}")
            self.driver.get(search_url)
            time.sleep(3)

            # Wait for product listings to load
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div.basicList_list_basis__uNBZR"))
                )
            except:
                logger.warning("⚠️ Product listings did not load")
                return []

            # Scroll to load more products
            for _ in range(3):  # Scroll 3 times to load more products
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(2)

            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            products = []

            # Find all product items
            items = soup.select('div.product_item__MDtDF')[:max_products * 2]  # Get extras for filtering

            logger.info(f"📦 Found {len(items)} product items")

            for idx, item in enumerate(items):
                try:
                    # Product title
                    title_elem = item.select_one('div.product_title__Mmw2K a')
                    if not title_elem:
                        continue
                    title = title_elem.get_text(strip=True)

                    # Product URL
                    product_url = title_elem.get('href', '')
                    if not product_url:
                        continue
                    # Make absolute URL
                    if not product_url.startswith('http'):
                        product_url = f"https://search.shopping.naver.com{product_url}"

                    # Price
                    price_elem = item.select_one('span.price_num__S2p_v em')
                    if not price_elem:
                        price_elem = item.select_one('span.price_num__S2p_v')
                    if not price_elem:
                        continue
                    price_text = price_elem.get_text(strip=True).replace(',', '').replace('원', '')
                    try:
                        price = int(price_text)
                    except:
                        continue

                    # Image
                    img_elem = item.select_one('img')
                    image_url = ''
                    if img_elem:
                        image_url = img_elem.get('src', '') or img_elem.get('data-src', '')

                    # Store name
                    store_elem = item.select_one('a.product_mall__Ew_7K')
                    store_name = store_elem.get_text(strip=True) if store_elem else ''

                    # Review count (판매량 지표로 사용)
                    review_elem = item.select_one('span.product_num__fafe5 em')
                    sales_count = 0
                    if review_elem:
                        review_text = review_elem.get_text(strip=True).replace(',', '')
                        try:
                            sales_count = int(review_text)
                        except:
                            sales_count = 0

                    products.append({
                        'title': title,
                        'price': price,
                        'url': product_url,
                        'image_url': image_url,
                        'store_name': store_name,
                        'sales_count': sales_count,
                        'rank': idx + 1
                    })

                except Exception as e:
                    logger.error(f"❌ Failed to parse product: {str(e)}")
                    continue

            # Sort by sales count (리뷰 수 = 판매량 지표)
            products.sort(key=lambda x: x['sales_count'], reverse=True)

            logger.info(f"✅ Scraped {len(products)} products from Naver Shopping")
            return products[:max_products]

        except Exception as e:
            logger.error(f"❌ Naver Shopping search failed: {str(e)}")
            return []
        finally:
            self._close_driver()

    def get_top_products(self, keyword: str, top_n: int = 3) -> List[Dict[str, Any]]:
        """
        Get top N best-selling products for a keyword

        Args:
            keyword: Search keyword
            top_n: Number of top products to return (default 3)

        Returns:
            List of top N products
        """
        all_products = self.search_products(keyword, max_products=100)
        return all_products[:top_n]


def get_naver_shopping_scraper() -> NaverShoppingScraper:
    """Get Naver Shopping scraper instance"""
    return NaverShoppingScraper()
