"""
SmartStore Scraper - 네이버 스마트스토어 베스트 상품 크롤러
Selenium 기반으로 판매자 페이지에서 인기 상품 정보 수집
"""
import os
import re
import time
import logging
import random
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse, parse_qs
from concurrent.futures import ThreadPoolExecutor

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class SmartStoreScraper:
    """네이버 스마트스토어 베스트 상품 크롤러"""

    def __init__(self, headless: bool = True):
        """
        Initialize SmartStore scraper

        Args:
            headless: Run browser in headless mode (no GUI)
        """
        self.headless = headless
        self.driver = None

    def _init_driver(self):
        """Initialize Selenium WebDriver"""
        if self.driver:
            return

        try:
            chrome_options = Options()

            if self.headless:
                chrome_options.add_argument('--headless=new')

            # Anti-detection and optimization
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)

            # Random User-Agent
            user_agents = [
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            ]
            chrome_options.add_argument(f'--user-agent={random.choice(user_agents)}')

            # Memory optimization
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-infobars')

            # Check if running on Railway
            chrome_bin = os.getenv('CHROME_BIN')
            if chrome_bin:
                chrome_options.binary_location = chrome_bin
                logger.info(f"🐳 Using Railway system Chrome: {chrome_bin}")
                self.driver = webdriver.Chrome(options=chrome_options)
            else:
                logger.info("💻 Using local ChromeDriverManager")
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(service=service, options=chrome_options)

            logger.info("✅ Chrome WebDriver initialized for SmartStore")

        except Exception as e:
            logger.error(f"❌ Failed to initialize WebDriver: {str(e)}")
            raise

    def _close_driver(self):
        """Close WebDriver"""
        if self.driver:
            try:
                self.driver.quit()
                self.driver = None
                logger.info("✅ WebDriver closed")
            except Exception as e:
                logger.warning(f"⚠️ Error closing WebDriver: {str(e)}")

    def scrape_best_products(
        self,
        seller_url: str,
        max_products: int = 100,
        min_sales: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        스마트스토어 베스트 상품 크롤링

        Args:
            seller_url: 스마트스토어 베스트 페이지 URL
                       예: https://smartstore.naver.com/wg0057/best?cp=1
            max_products: 최대 수집 상품 개수
            min_sales: 최소 판매량 필터 (예: 1000개 이상)

        Returns:
            [{
                'title': '상품명',
                'price': 29900,
                'image_url': 'https://...',
                'product_url': 'https://smartstore.naver.com/...',
                'review_count': 1234,
                'purchase_count': 567,
                'rating': 4.8,
                'rank': 1,
                'popularity_score': 85.5
            }]
        """
        logger.info(f"🔍 Starting SmartStore scraping: {seller_url}")
        logger.info(f"   Target: {max_products} products, min sales: {min_sales}")

        try:
            # Initialize driver
            self._init_driver()

            # Extract seller info
            seller_info = self._parse_seller_url(seller_url)
            if not seller_info:
                raise ValueError(f"Invalid SmartStore URL: {seller_url}")

            logger.info(f"   Seller: {seller_info['seller_id']}")

            # Calculate pages needed (40 products per page)
            products_per_page = 40
            total_pages = min(10, (max_products // products_per_page) + 1)

            logger.info(f"   Scraping {total_pages} pages...")

            # Scrape multiple pages
            all_products = []
            for page in range(1, total_pages + 1):
                page_url = f"{seller_info['base_url']}?cp={page}"
                products = self._scrape_page(page_url, page)

                if products:
                    all_products.extend(products)
                    logger.info(f"   Page {page}: {len(products)} products")
                else:
                    logger.warning(f"   Page {page}: No products found")
                    break

                # Polite crawling - wait between pages
                if page < total_pages:
                    time.sleep(random.uniform(2, 4))

            logger.info(f"✅ Scraped total {len(all_products)} products")

            # Filter by sales count
            if min_sales > 0:
                filtered = [
                    p for p in all_products
                    if p.get('purchase_count', 0) >= min_sales
                ]
                logger.info(f"   Filtered to {len(filtered)} products (sales >= {min_sales})")
            else:
                filtered = all_products

            # Calculate popularity score
            for product in filtered:
                product['popularity_score'] = self._calculate_popularity(product)

            # Sort by popularity and limit
            filtered.sort(key=lambda x: x['popularity_score'], reverse=True)
            result = filtered[:max_products]

            logger.info(f"✅ Returning top {len(result)} products")
            return result

        except Exception as e:
            logger.error(f"❌ SmartStore scraping failed: {str(e)}")
            raise
        finally:
            self._close_driver()

    def _parse_seller_url(self, url: str) -> Optional[Dict[str, str]]:
        """
        Parse seller URL and extract seller ID

        Args:
            url: https://smartstore.naver.com/wg0057/best?cp=1

        Returns:
            {
                'seller_id': 'wg0057',
                'base_url': 'https://smartstore.naver.com/wg0057/best'
            }
        """
        try:
            parsed = urlparse(url)

            # Check domain
            if 'smartstore.naver.com' not in parsed.netloc:
                logger.warning(f"⚠️ Not a SmartStore URL: {parsed.netloc}")
                return None

            # Extract seller ID from path
            # Path: /wg0057/best or /wg0057/products
            path_parts = parsed.path.strip('/').split('/')
            if len(path_parts) < 2:
                logger.warning(f"⚠️ Invalid path: {parsed.path}")
                return None

            seller_id = path_parts[0]
            base_path = '/'.join(path_parts[:2])  # wg0057/best

            base_url = f"{parsed.scheme}://{parsed.netloc}/{base_path}"

            return {
                'seller_id': seller_id,
                'base_url': base_url
            }

        except Exception as e:
            logger.error(f"❌ Error parsing URL: {str(e)}")
            return None

    def _scrape_page(self, page_url: str, page_num: int) -> List[Dict[str, Any]]:
        """
        Scrape single page

        Returns:
            List of product dictionaries
        """
        try:
            # Load page
            self.driver.get(page_url)

            # Wait for products to load
            time.sleep(3)

            # Remove webdriver flag
            self.driver.execute_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )

            # Additional wait
            time.sleep(2)

            # Get page HTML
            html = self.driver.page_source
            soup = BeautifulSoup(html, 'html.parser')

            products = []

            # Find product items
            # SmartStore uses: <li class="_itemSection"> or <div class="product-item">
            item_selectors = [
                {'name': 'li', 'class': '_itemSection'},
                {'name': 'div', 'class': 'product-item'},
                {'name': 'div', 'class': '_2kRKWS_t'},  # New layout
            ]

            product_items = []
            for selector in item_selectors:
                items = soup.find_all(selector['name'], class_=selector['class'])
                if items:
                    product_items = items
                    logger.info(f"      Found {len(items)} items with selector: {selector}")
                    break

            if not product_items:
                logger.warning(f"      No products found on page {page_num}")
                return []

            # Parse each product
            for idx, item in enumerate(product_items):
                try:
                    product = self._parse_product_item(item, (page_num - 1) * 40 + idx + 1)
                    if product:
                        products.append(product)
                except Exception as e:
                    logger.warning(f"      Failed to parse product {idx+1}: {str(e)}")
                    continue

            return products

        except Exception as e:
            logger.error(f"❌ Error scraping page {page_num}: {str(e)}")
            return []

    def _parse_product_item(self, item: BeautifulSoup, rank: int) -> Optional[Dict[str, Any]]:
        """
        Parse single product item

        Returns:
            Product dictionary or None
        """
        try:
            product = {'rank': rank}

            # Title
            title_elem = (
                item.find('a', class_='_2kRKWS_t') or
                item.find('span', class_='_3w1xfP_2') or
                item.find('div', class_='_1zl6cBsmrkQh') or
                item.find('strong', class_='_22-5K5O7hGKcQ')
            )
            if title_elem:
                product['title'] = title_elem.get_text(strip=True)

            # Price
            price_elem = (
                item.find('span', class_='_3w1xfP_3') or
                item.find('strong', class_='_1LY7DqCnwR') or
                item.find('em', class_='_2FC23nc8ew')
            )
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                # Extract numeric value
                price_match = re.search(r'[\d,]+', price_text.replace(',', ''))
                if price_match:
                    product['price'] = int(price_match.group().replace(',', ''))

            # Image
            img_elem = item.find('img')
            if img_elem:
                img_url = img_elem.get('src') or img_elem.get('data-src')
                if img_url:
                    if img_url.startswith('//'):
                        img_url = 'https:' + img_url
                    product['image_url'] = img_url

            # Product URL
            link_elem = item.find('a', href=True)
            if link_elem:
                href = link_elem['href']
                if href.startswith('/'):
                    product['product_url'] = 'https://smartstore.naver.com' + href
                else:
                    product['product_url'] = href

            # Review count
            review_elem = (
                item.find('em', class_='_3a4u0W5iLp') or
                item.find('span', class_='_15NU6jfHe')
            )
            if review_elem:
                review_text = review_elem.get_text(strip=True)
                review_match = re.search(r'[\d,]+', review_text.replace(',', ''))
                if review_match:
                    product['review_count'] = int(review_match.group().replace(',', ''))

            # Purchase count (판매량)
            # Text like: "1천개 이상 구매", "500개 구매"
            purchase_elem = item.find('em', string=re.compile(r'구매|판매'))
            if purchase_elem:
                purchase_text = purchase_elem.get_text(strip=True)
                product['purchase_count'] = self._parse_purchase_count(purchase_text)

            # Rating (평점)
            rating_elem = (
                item.find('span', class_='_2L3vDuo0xU') or
                item.find('em', class_='_15NU6jfHe')
            )
            if rating_elem:
                rating_text = rating_elem.get_text(strip=True)
                rating_match = re.search(r'[\d.]+', rating_text)
                if rating_match:
                    product['rating'] = float(rating_match.group())

            # Validate required fields
            if not product.get('title') or not product.get('price'):
                return None

            # Set defaults
            product.setdefault('review_count', 0)
            product.setdefault('purchase_count', 0)
            product.setdefault('rating', 0.0)
            product.setdefault('image_url', '')
            product.setdefault('product_url', '')

            return product

        except Exception as e:
            logger.warning(f"Error parsing product: {str(e)}")
            return None

    def _parse_purchase_count(self, text: str) -> int:
        """
        Parse purchase count from text

        Examples:
            "1천개 이상 구매" -> 1000
            "500개 구매" -> 500
            "1만개 이상" -> 10000
        """
        try:
            # Extract number
            match = re.search(r'([\d,.]+)(천|만)?', text)
            if not match:
                return 0

            number = float(match.group(1).replace(',', ''))
            unit = match.group(2)

            if unit == '천':
                number *= 1000
            elif unit == '만':
                number *= 10000

            return int(number)

        except Exception:
            return 0

    def _calculate_popularity(self, product: Dict[str, Any]) -> float:
        """
        Calculate popularity score

        Formula:
        score = (구매수 * 0.5) + (리뷰수 * 0.3) + (평점 * 100 * 0.2)

        Returns:
            Score 0-100 (normalized)
        """
        try:
            purchase = product.get('purchase_count', 0)
            reviews = product.get('review_count', 0)
            rating = product.get('rating', 0)

            # Calculate raw score
            raw_score = (purchase * 0.5) + (reviews * 0.3) + (rating * 100 * 0.2)

            # Normalize to 0-100 (assuming max purchase = 10000)
            max_possible = (10000 * 0.5) + (5000 * 0.3) + (5 * 100 * 0.2)
            normalized = (raw_score / max_possible) * 100

            return round(min(100, normalized), 2)

        except Exception as e:
            logger.warning(f"Error calculating popularity: {str(e)}")
            return 0.0

    def close(self):
        """Close scraper and cleanup"""
        self._close_driver()

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()


# Singleton instance
_scraper = None

def get_smartstore_scraper() -> SmartStoreScraper:
    """Get or create SmartStore scraper singleton"""
    global _scraper
    if _scraper is None:
        _scraper = SmartStoreScraper(headless=True)
    return _scraper
