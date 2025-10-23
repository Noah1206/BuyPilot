"""
Taobao Web Scraper - HeySeller Style
Scrapes product information directly from Taobao web pages without API
"""
import os
import re
import time
import logging
from typing import Dict, Any, Optional, List
from urllib.parse import urlparse, parse_qs

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class TaobaoScraper:
    """Taobao web scraper for product information extraction"""

    def __init__(self, headless: bool = True):
        """
        Initialize Taobao scraper

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
                chrome_options.add_argument('--headless=new')  # Use new headless mode

            # Railway/Docker required options
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--disable-software-rasterizer')
            chrome_options.add_argument('--disable-extensions')

            # Anti-bot detection (IMPORTANT for Taobao)
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')

            # Additional anti-detection
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--disable-infobars')
            chrome_options.add_argument('--start-maximized')

            # Memory optimization for Railway
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--memory-pressure-off')
            chrome_options.add_argument('--max_old_space_size=512')

            # Check if running on Railway (use system Chrome)
            chrome_bin = os.getenv('CHROME_BIN')
            if chrome_bin:
                chrome_options.binary_location = chrome_bin
                logger.info(f"🐳 Using Railway system Chrome: {chrome_bin}")
                # Use system chromedriver on Railway
                self.driver = webdriver.Chrome(options=chrome_options)
            else:
                # Local development - use ChromeDriverManager
                logger.info("💻 Using local ChromeDriverManager")
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(service=service, options=chrome_options)

            logger.info("✅ Chrome WebDriver initialized")

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

    def parse_product_url(self, url: str) -> Optional[str]:
        """
        Extract product ID from Taobao/1688 URL

        Supported formats:
        - https://item.taobao.com/item.htm?id=123456789
        - https://detail.tmall.com/item.htm?id=123456789
        - https://m.taobao.com/awp/core/detail.htm?id=123456789
        - https://detail.1688.com/offer/123456789.html

        Args:
            url: Product URL

        Returns:
            Product ID or None if invalid
        """
        try:
            parsed = urlparse(url)

            # Check domain
            valid_domains = ['taobao.com', 'tmall.com', '1688.com']
            if not any(domain in parsed.netloc for domain in valid_domains):
                logger.warning(f"⚠️ Invalid domain: {parsed.netloc}")
                return None

            # Extract ID from query string (Taobao/Tmall)
            query_params = parse_qs(parsed.query)
            if 'id' in query_params:
                product_id = query_params['id'][0]
                logger.info(f"✅ Extracted product ID: {product_id}")
                return product_id

            # Extract ID from path (1688)
            match = re.search(r'/offer/(\d+)\.html', url)
            if match:
                product_id = match.group(1)
                logger.info(f"✅ Extracted 1688 product ID: {product_id}")
                return product_id

            # Try to extract from path (mobile URLs)
            match = re.search(r'/(\d{10,})\.htm', url)
            if match:
                product_id = match.group(1)
                logger.info(f"✅ Extracted product ID from path: {product_id}")
                return product_id

            logger.warning(f"⚠️ Could not extract product ID from URL: {url}")
            return None

        except Exception as e:
            logger.error(f"❌ Error parsing URL: {str(e)}")
            return None

    def scrape_product(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Scrape product information from Taobao/1688 page

        Args:
            url: Product page URL

        Returns:
            Dictionary with product information or None if failed
        """
        try:
            logger.info(f"🔄 Scraping product from: {url}")

            # Initialize driver
            self._init_driver()

            # Load page
            self.driver.get(url)

            # Wait for JavaScript to execute (Taobao is heavily JS-based)
            time.sleep(5)

            # Execute script to remove webdriver flag
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            # Additional wait for dynamic content
            time.sleep(2)

            # Get page source
            html = self.driver.page_source
            soup = BeautifulSoup(html, 'lxml')

            # Debug: Log page title to verify we got the right page
            page_title = soup.find('title')
            if page_title:
                logger.info(f"📄 Page title: {page_title.get_text(strip=True)[:100]}")
            else:
                logger.warning("⚠️ No page title found - might be bot detection")

            # Determine platform (Taobao/Tmall vs 1688)
            if '1688.com' in url:
                return self._scrape_1688(url, soup)
            else:
                return self._scrape_taobao(url, soup)

        except Exception as e:
            logger.error(f"❌ Error scraping product: {str(e)}")
            return None
        finally:
            # Don't close driver here - reuse for multiple requests
            pass

    def _scrape_taobao(self, url: str, soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
        """
        Scrape Taobao/Tmall product page

        Args:
            url: Product URL
            soup: BeautifulSoup object

        Returns:
            Product information dictionary
        """
        try:
            product_data = {
                'source': 'taobao',
                'source_url': url,
            }

            # Extract product ID
            product_data['taobao_item_id'] = self.parse_product_url(url)

            # Extract title
            title_selectors = [
                {'name': 'h1', 'class': 'tb-main-title'},  # Taobao desktop
                {'name': 'div', 'attrs': {'data-spm': 'title'}},  # Taobao mobile
                {'name': 'h1', 'class': 'tb-detail-hd'},  # Tmall
            ]

            for selector in title_selectors:
                if 'class' in selector:
                    element = soup.find(selector['name'], class_=selector['class'])
                elif 'attrs' in selector:
                    element = soup.find(selector['name'], attrs=selector['attrs'])

                if element:
                    product_data['title'] = element.get_text(strip=True)
                    break

            if not product_data.get('title'):
                # Try meta og:title as fallback
                meta_title = soup.find('meta', property='og:title')
                if meta_title:
                    product_data['title'] = meta_title.get('content', '')

            # Extract price
            price_selectors = [
                {'name': 'span', 'class': 'tb-price'},
                {'name': 'em', 'class': 'tb-rmb-num'},
                {'name': 'span', 'class': 'price'},
            ]

            for selector in price_selectors:
                element = soup.find(selector['name'], class_=selector['class'])
                if element:
                    price_text = element.get_text(strip=True)
                    # Extract numeric value
                    price_match = re.search(r'[\d,.]+', price_text.replace(',', ''))
                    if price_match:
                        product_data['price'] = float(price_match.group())
                        break

            # Extract images
            images = []

            # Main image from meta og:image
            meta_image = soup.find('meta', property='og:image')
            if meta_image:
                img_url = meta_image.get('content', '')
                if img_url.startswith('//'):
                    img_url = 'https:' + img_url
                images.append(img_url)
                product_data['main_image'] = img_url
                product_data['pic_url'] = img_url

            # Additional images from gallery
            img_elements = soup.find_all('img', attrs={'data-src': True})
            for img in img_elements:
                img_url = img.get('data-src', '')
                if img_url and 'taobaocdn' in img_url:
                    if img_url.startswith('//'):
                        img_url = 'https:' + img_url
                    if img_url not in images:
                        images.append(img_url)

            product_data['images'] = images[:10]  # Limit to 10 images

            # Extract seller info
            seller_selectors = [
                {'name': 'a', 'class': 'tb-seller-name'},
                {'name': 'span', 'class': 'tb-shop-name'},
            ]

            for selector in seller_selectors:
                element = soup.find(selector['name'], class_=selector['class'])
                if element:
                    product_data['seller_nick'] = element.get_text(strip=True)
                    break

            # Extract description (meta description as fallback)
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc:
                product_data['desc'] = meta_desc.get('content', '')

            # Stock info (if available)
            stock_element = soup.find('span', class_='tb-count')
            if stock_element:
                stock_text = stock_element.get_text(strip=True)
                stock_match = re.search(r'\d+', stock_text)
                if stock_match:
                    product_data['num'] = int(stock_match.group())

            logger.info(f"✅ Scraped Taobao product: {product_data.get('title', '')[:50]}...")
            return product_data

        except Exception as e:
            logger.error(f"❌ Error parsing Taobao page: {str(e)}")
            return None

    def _scrape_1688(self, url: str, soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
        """
        Scrape 1688 product page

        Args:
            url: Product URL
            soup: BeautifulSoup object

        Returns:
            Product information dictionary
        """
        try:
            product_data = {
                'source': '1688',
                'source_url': url,
            }

            # Extract product ID
            product_data['taobao_item_id'] = self.parse_product_url(url)

            # Extract title
            title_element = soup.find('h1', class_='title')
            if not title_element:
                title_element = soup.find('div', class_='title-text')

            if title_element:
                product_data['title'] = title_element.get_text(strip=True)

            # Extract price
            price_element = soup.find('span', class_='price')
            if not price_element:
                price_element = soup.find('span', class_='price-now')

            if price_element:
                price_text = price_element.get_text(strip=True)
                price_match = re.search(r'[\d,.]+', price_text.replace(',', ''))
                if price_match:
                    product_data['price'] = float(price_match.group())

            # Extract images
            images = []
            img_elements = soup.find_all('img', class_='main-img')
            for img in img_elements:
                img_url = img.get('src', '') or img.get('data-src', '')
                if img_url:
                    if img_url.startswith('//'):
                        img_url = 'https:' + img_url
                    images.append(img_url)

            if images:
                product_data['main_image'] = images[0]
                product_data['pic_url'] = images[0]
                product_data['images'] = images

            # Extract seller info
            seller_element = soup.find('span', class_='company-name')
            if seller_element:
                product_data['seller_nick'] = seller_element.get_text(strip=True)

            logger.info(f"✅ Scraped 1688 product: {product_data.get('title', '')[:50]}...")
            return product_data

        except Exception as e:
            logger.error(f"❌ Error parsing 1688 page: {str(e)}")
            return None

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

def get_taobao_scraper() -> TaobaoScraper:
    """Get or create Taobao scraper singleton"""
    global _scraper
    if _scraper is None:
        _scraper = TaobaoScraper(headless=True)
    return _scraper
