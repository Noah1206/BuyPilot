"""
Amazon Product Scraper
아마존 상품 검색 및 상세 정보 스크래핑
"""
import logging
import time
import re
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

logger = logging.getLogger(__name__)


class AmazonScraper:
    """아마존 상품 스크래퍼"""

    def __init__(self, headless: bool = True):
        """
        Initialize Amazon scraper

        Args:
            headless: 헤드리스 모드 사용 여부
        """
        self.headless = headless
        self.driver = None
        self.base_url = "https://www.amazon.com"

    def _init_driver(self):
        """Selenium WebDriver 초기화"""
        if self.driver:
            return

        options = Options()
        if self.headless:
            options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

        self.driver = webdriver.Chrome(options=options)
        logger.info("✅ Selenium WebDriver initialized")

    def _close_driver(self):
        """WebDriver 종료"""
        if self.driver:
            self.driver.quit()
            self.driver = None
            logger.info("✅ WebDriver closed")

    def search_products(
        self,
        keyword: str,
        max_results: int = 20,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None
    ) -> List[Dict]:
        """
        아마존 상품 검색

        Args:
            keyword: 검색 키워드
            max_results: 최대 결과 수
            min_price: 최소 가격 (USD)
            max_price: 최대 가격 (USD)

        Returns:
            검색된 상품 리스트
        """
        try:
            self._init_driver()

            # 검색 URL 생성
            search_url = f"{self.base_url}/s?k={keyword.replace(' ', '+')}"

            # 가격 필터 추가
            if min_price or max_price:
                price_filter = f"&rh=p_36:"
                if min_price and max_price:
                    # Amazon price format: cents (e.g., $10 = 1000)
                    price_filter += f"{int(min_price * 100)}-{int(max_price * 100)}"
                elif min_price:
                    price_filter += f"{int(min_price * 100)}-"
                elif max_price:
                    price_filter += f"-{int(max_price * 100)}"
                search_url += price_filter

            logger.info(f"🔍 Searching Amazon: {search_url}")
            self.driver.get(search_url)

            # Wait for results to load
            time.sleep(3)

            products = []
            page = 1

            while len(products) < max_results:
                logger.info(f"📄 Scraping page {page}...")

                # Parse current page
                soup = BeautifulSoup(self.driver.page_source, 'html.parser')

                # Find product items
                items = soup.find_all('div', {'data-component-type': 's-search-result'})

                if not items:
                    logger.warning("⚠️ No more products found")
                    break

                for item in items:
                    if len(products) >= max_results:
                        break

                    try:
                        product = self._parse_search_result(item)
                        if product:
                            products.append(product)
                            logger.info(f"   [{len(products)}/{max_results}] {product['title'][:50]}...")
                    except Exception as e:
                        logger.warning(f"   ⚠️ Failed to parse product: {str(e)}")
                        continue

                # Check if there are more pages
                if len(products) < max_results:
                    try:
                        # Find "Next" button
                        next_button = self.driver.find_element(By.CSS_SELECTOR, 'a.s-pagination-next')
                        if 's-pagination-disabled' in next_button.get_attribute('class'):
                            logger.info("✅ Reached last page")
                            break

                        next_button.click()
                        time.sleep(3)
                        page += 1
                    except NoSuchElementException:
                        logger.info("✅ No more pages")
                        break

            logger.info(f"✅ Found {len(products)} products")
            return products

        except Exception as e:
            logger.error(f"❌ Amazon search failed: {str(e)}", exc_info=True)
            raise
        finally:
            self._close_driver()

    def _parse_search_result(self, item) -> Optional[Dict]:
        """검색 결과 아이템 파싱"""
        try:
            # ASIN (Amazon Product ID)
            asin = item.get('data-asin')
            if not asin:
                return None

            # Title
            title_elem = item.find('h2', class_='s-line-clamp-2')
            title = title_elem.get_text(strip=True) if title_elem else None
            if not title:
                return None

            # URL
            link_elem = item.find('a', class_='a-link-normal s-no-outline')
            product_url = f"{self.base_url}{link_elem['href']}" if link_elem and link_elem.get('href') else None

            # Price
            price_elem = item.find('span', class_='a-price')
            price = None
            if price_elem:
                price_whole = price_elem.find('span', class_='a-price-whole')
                price_fraction = price_elem.find('span', class_='a-price-fraction')
                if price_whole:
                    price_str = price_whole.get_text(strip=True).replace(',', '')
                    if price_fraction:
                        price_str += '.' + price_fraction.get_text(strip=True)
                    try:
                        price = float(price_str)
                    except ValueError:
                        pass

            # Rating
            rating_elem = item.find('span', class_='a-icon-alt')
            rating = None
            if rating_elem:
                rating_text = rating_elem.get_text(strip=True)
                match = re.search(r'([\d.]+)\s*out of 5', rating_text)
                if match:
                    rating = float(match.group(1))

            # Review count
            review_elem = item.find('span', class_='a-size-base s-underline-text')
            review_count = None
            if review_elem:
                review_text = review_elem.get_text(strip=True).replace(',', '')
                try:
                    review_count = int(review_text)
                except ValueError:
                    pass

            # Main image
            img_elem = item.find('img', class_='s-image')
            main_image = img_elem['src'] if img_elem and img_elem.get('src') else None

            return {
                'asin': asin,
                'title': title,
                'url': product_url,
                'price': price,
                'rating': rating,
                'review_count': review_count,
                'main_image': main_image,
            }

        except Exception as e:
            logger.warning(f"Failed to parse search result: {str(e)}")
            return None

    def get_product_details(self, asin: str) -> Optional[Dict]:
        """
        아마존 상품 상세 정보 스크래핑

        Args:
            asin: Amazon Product ID

        Returns:
            상품 상세 정보
        """
        try:
            self._init_driver()

            product_url = f"{self.base_url}/dp/{asin}"
            logger.info(f"🔍 Fetching product details: {product_url}")

            self.driver.get(product_url)
            time.sleep(3)

            soup = BeautifulSoup(self.driver.page_source, 'html.parser')

            # Title
            title_elem = soup.find('span', id='productTitle')
            title = title_elem.get_text(strip=True) if title_elem else None

            # Price
            price = self._extract_price(soup)

            # Description
            description = self._extract_description(soup)

            # Features
            features = self._extract_features(soup)

            # Images
            images = self._extract_images(soup)

            # Product details
            details = self._extract_product_details(soup)

            # Rating and reviews
            rating_elem = soup.find('span', class_='a-icon-alt')
            rating = None
            if rating_elem:
                rating_text = rating_elem.get_text(strip=True)
                match = re.search(r'([\d.]+)\s*out of 5', rating_text)
                if match:
                    rating = float(match.group(1))

            review_elem = soup.find('span', id='acrCustomerReviewText')
            review_count = None
            if review_elem:
                review_text = review_elem.get_text(strip=True).replace(',', '').replace(' ratings', '')
                try:
                    review_count = int(review_text)
                except ValueError:
                    pass

            product_info = {
                'asin': asin,
                'title': title,
                'url': product_url,
                'price': price,
                'description': description,
                'features': features,
                'images': images,
                'details': details,
                'rating': rating,
                'review_count': review_count,
            }

            logger.info(f"✅ Product details fetched: {title[:50]}...")
            return product_info

        except Exception as e:
            logger.error(f"❌ Failed to get product details: {str(e)}", exc_info=True)
            return None
        finally:
            self._close_driver()

    def _extract_price(self, soup) -> Optional[float]:
        """가격 추출"""
        # Try different price selectors
        price_selectors = [
            ('span', {'class': 'a-price-whole'}),
            ('span', {'id': 'priceblock_ourprice'}),
            ('span', {'id': 'priceblock_dealprice'}),
        ]

        for tag, attrs in price_selectors:
            elem = soup.find(tag, attrs)
            if elem:
                price_text = elem.get_text(strip=True).replace('$', '').replace(',', '')
                try:
                    return float(price_text)
                except ValueError:
                    continue

        return None

    def _extract_description(self, soup) -> Optional[str]:
        """상품 설명 추출"""
        desc_elem = soup.find('div', id='feature-bullets')
        if desc_elem:
            items = desc_elem.find_all('span', class_='a-list-item')
            if items:
                return '\n'.join([item.get_text(strip=True) for item in items])

        return None

    def _extract_features(self, soup) -> List[str]:
        """주요 특징 추출"""
        features = []
        feature_elem = soup.find('div', id='feature-bullets')
        if feature_elem:
            items = feature_elem.find_all('span', class_='a-list-item')
            features = [item.get_text(strip=True) for item in items if item.get_text(strip=True)]

        return features

    def _extract_images(self, soup) -> List[str]:
        """이미지 URL 추출"""
        images = []

        # Try image gallery
        img_gallery = soup.find('div', id='altImages')
        if img_gallery:
            img_items = img_gallery.find_all('img')
            for img in img_items:
                src = img.get('src')
                if src and 'https://' in src:
                    # Get high-res version
                    high_res = src.replace('_AC_US40_', '_AC_SL1500_')
                    images.append(high_res)

        # Fallback: main image
        if not images:
            main_img = soup.find('img', id='landingImage')
            if main_img and main_img.get('src'):
                images.append(main_img['src'])

        return images[:10]  # Limit to 10 images

    def _extract_product_details(self, soup) -> Dict[str, str]:
        """상품 상세 정보 추출 (브랜드, 치수, 무게 등)"""
        details = {}

        # Try product details section
        detail_section = soup.find('div', id='detailBullets_feature_div')
        if detail_section:
            items = detail_section.find_all('li')
            for item in items:
                text = item.get_text(strip=True)
                if ':' in text:
                    key, value = text.split(':', 1)
                    details[key.strip()] = value.strip()

        # Try technical details table
        tech_table = soup.find('table', id='productDetails_techSpec_section_1')
        if tech_table:
            rows = tech_table.find_all('tr')
            for row in rows:
                th = row.find('th')
                td = row.find('td')
                if th and td:
                    details[th.get_text(strip=True)] = td.get_text(strip=True)

        return details


# Singleton instance
_scraper_instance = None


def get_amazon_scraper() -> AmazonScraper:
    """Get Amazon scraper singleton instance"""
    global _scraper_instance
    if _scraper_instance is None:
        _scraper_instance = AmazonScraper()
    return _scraper_instance
