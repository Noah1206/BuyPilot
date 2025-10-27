"""
Competitor store scraper
Scrapes products from Korean e-commerce sites (Coupang, Naver SmartStore, etc.)
Returns top 3 best-selling products
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from bs4 import BeautifulSoup
import time
import logging
from typing import List, Dict, Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class CompetitorScraper:
    """Scraper for Korean competitor stores"""

    def __init__(self):
        self.driver = None

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
            logger.info("✅ Chrome WebDriver initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize WebDriver: {str(e)}")
            raise

    def _close_driver(self):
        """Close WebDriver"""
        if self.driver:
            self.driver.quit()
            self.driver = None

    def scrape_competitor_store(self, url: str, max_products: int = 3) -> Dict[str, Any]:
        """
        Scrape competitor store and return top 3 products

        Args:
            url: Competitor store URL (Coupang, Naver SmartStore, etc.)
            max_products: Maximum products to return (default 3)

        Returns:
            Dict with store info and top products
        """
        try:
            self._init_driver()

            domain = urlparse(url).netloc
            logger.info(f"🔍 Scraping competitor: {domain}")

            # Route to appropriate scraper based on domain
            if 'coupang.com' in domain:
                products = self._scrape_coupang(url, max_products)
            elif 'smartstore.naver.com' in domain or 'shopping.naver.com' in domain:
                products = self._scrape_naver(url, max_products)
            elif 'gmarket.co.kr' in domain:
                products = self._scrape_gmarket(url, max_products)
            elif '11st.co.kr' in domain:
                products = self._scrape_11st(url, max_products)
            else:
                # Generic scraper for unknown sites
                products = self._scrape_generic(url, max_products)

            return {
                'ok': True,
                'store_url': url,
                'domain': domain,
                'products': products[:max_products],  # Top 3 only
                'total_found': len(products)
            }

        except Exception as e:
            logger.error(f"❌ Scraping failed for {url}: {str(e)}")
            return {
                'ok': False,
                'error': str(e),
                'store_url': url,
                'products': []
            }
        finally:
            self._close_driver()

    def _scrape_coupang(self, url: str, max_products: int) -> List[Dict]:
        """Scrape Coupang store"""
        self.driver.get(url)
        time.sleep(3)

        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "li.search-product"))
            )
        except:
            logger.warning("⚠️ Coupang products not loaded")
            return []

        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        products = []

        items = soup.select('li.search-product')[:max_products * 2]  # Get extras for sorting

        for item in items:
            try:
                # Title
                title_elem = item.select_one('div.name')
                if not title_elem:
                    continue
                title = title_elem.get_text(strip=True)

                # Price
                price_elem = item.select_one('strong.price-value')
                if not price_elem:
                    continue
                price_text = price_elem.get_text(strip=True).replace(',', '')
                price = int(price_text)

                # Image
                img_elem = item.select_one('img.search-product-wrap-img')
                image_url = img_elem.get('src', '') if img_elem else ''

                # Sales count (if available)
                sales_elem = item.select_one('span.rating-total-count')
                sales_count = 0
                if sales_elem:
                    sales_text = sales_elem.get_text(strip=True).replace('(', '').replace(')', '').replace(',', '')
                    try:
                        sales_count = int(sales_text)
                    except:
                        sales_count = 0

                # Product URL
                link_elem = item.select_one('a.search-product-link')
                product_url = f"https://www.coupang.com{link_elem.get('href', '')}" if link_elem else url

                products.append({
                    'title': title,
                    'price': price,
                    'image_url': image_url,
                    'url': product_url,
                    'sales_count': sales_count,
                    'rating': 0  # Coupang doesn't show ratings in list
                })

            except Exception as e:
                logger.error(f"❌ Failed to parse Coupang product: {str(e)}")
                continue

        # Sort by sales count
        products.sort(key=lambda x: x['sales_count'], reverse=True)

        logger.info(f"✅ Scraped {len(products)} products from Coupang")
        return products

    def _scrape_naver(self, url: str, max_products: int) -> List[Dict]:
        """Scrape Naver SmartStore"""
        self.driver.get(url)
        time.sleep(3)

        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.product-item"))
            )
        except:
            logger.warning("⚠️ Naver products not loaded")
            return []

        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        products = []

        items = soup.select('div.product-item')[:max_products * 2]

        for item in items:
            try:
                title_elem = item.select_one('span.product-name')
                if not title_elem:
                    continue
                title = title_elem.get_text(strip=True)

                price_elem = item.select_one('span.price')
                if not price_elem:
                    continue
                price_text = price_elem.get_text(strip=True).replace(',', '').replace('원', '')
                price = int(price_text)

                img_elem = item.select_one('img')
                image_url = img_elem.get('src', '') if img_elem else ''

                link_elem = item.select_one('a')
                product_url = link_elem.get('href', url) if link_elem else url

                products.append({
                    'title': title,
                    'price': price,
                    'image_url': image_url,
                    'url': product_url,
                    'sales_count': 0,  # Naver doesn't show sales
                    'rating': 0
                })

            except Exception as e:
                logger.error(f"❌ Failed to parse Naver product: {str(e)}")
                continue

        logger.info(f"✅ Scraped {len(products)} products from Naver")
        return products

    def _scrape_gmarket(self, url: str, max_products: int) -> List[Dict]:
        """Scrape Gmarket"""
        # Similar structure to Coupang scraper
        return self._scrape_generic(url, max_products)

    def _scrape_11st(self, url: str, max_products: int) -> List[Dict]:
        """Scrape 11st"""
        # Similar structure to Coupang scraper
        return self._scrape_generic(url, max_products)

    def _scrape_generic(self, url: str, max_products: int) -> List[Dict]:
        """Generic scraper for unknown sites"""
        self.driver.get(url)
        time.sleep(3)

        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        products = []

        # Try common product selectors
        selectors = [
            'div.product-item',
            'li.product-item',
            'div.item',
            'li.item',
            'div.product',
            'li.product'
        ]

        items = []
        for selector in selectors:
            items = soup.select(selector)
            if items:
                break

        logger.info(f"🔍 Found {len(items)} potential products with generic scraper")

        for item in items[:max_products * 2]:
            try:
                # Try to find title
                title_elem = (
                    item.select_one('h3') or
                    item.select_one('h4') or
                    item.select_one('.title') or
                    item.select_one('.name') or
                    item.select_one('.product-name')
                )
                if not title_elem:
                    continue
                title = title_elem.get_text(strip=True)

                # Try to find price
                price_elem = (
                    item.select_one('.price') or
                    item.select_one('.cost') or
                    item.select_one('.amount')
                )
                if not price_elem:
                    continue
                price_text = price_elem.get_text(strip=True).replace(',', '').replace('원', '').replace('₩', '')
                # Extract numbers only
                import re
                price_match = re.search(r'\d+', price_text)
                if not price_match:
                    continue
                price = int(price_match.group())

                # Image
                img_elem = item.select_one('img')
                image_url = img_elem.get('src', '') if img_elem else ''

                # URL
                link_elem = item.select_one('a')
                product_url = link_elem.get('href', url) if link_elem else url
                if not product_url.startswith('http'):
                    product_url = urlparse(url).scheme + '://' + urlparse(url).netloc + product_url

                products.append({
                    'title': title,
                    'price': price,
                    'image_url': image_url,
                    'url': product_url,
                    'sales_count': 0,
                    'rating': 0
                })

            except Exception as e:
                logger.error(f"❌ Failed to parse generic product: {str(e)}")
                continue

        logger.info(f"✅ Scraped {len(products)} products with generic scraper")
        return products


def get_scraper() -> CompetitorScraper:
    """Get competitor scraper instance"""
    return CompetitorScraper()
