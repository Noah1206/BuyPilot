"""
Shopify Excel Generator - Shopify 업로드용 CSV/Excel 파일 생성
Shopify Product Import CSV 형식 생성
"""
import os
import logging
from datetime import datetime
from typing import List, Dict, Any
import pandas as pd

logger = logging.getLogger(__name__)


class ShopifyExcelGenerator:
    """Shopify 업로드용 CSV/Excel 생성"""

    # Shopify Product Import 필수 컬럼
    REQUIRED_COLUMNS = [
        'Handle',  # 상품 고유 식별자 (URL slug)
        'Title',  # 상품명 (한글 번역된 제목)
        'Body (HTML)',  # 상품 설명 (HTML)
        'Vendor',  # 브랜드/제조사
        'Product Category',  # 카테고리
        'Type',  # 상품 유형
        'Tags',  # 태그 (쉼표로 구분)
        'Published',  # 공개 여부 (TRUE/FALSE)
        'Option1 Name',  # 옵션1 이름 (예: Size)
        'Option1 Value',  # 옵션1 값
        'Option2 Name',  # 옵션2 이름 (예: Color)
        'Option2 Value',  # 옵션2 값
        'Variant SKU',  # SKU 코드
        'Variant Grams',  # 무게 (그램)
        'Variant Inventory Tracker',  # 재고 추적 (shopify)
        'Variant Inventory Policy',  # 재고 정책 (deny)
        'Variant Fulfillment Service',  # 배송 서비스 (manual)
        'Variant Price',  # 판매가
        'Variant Compare At Price',  # 정가 (할인 전 가격)
        'Variant Requires Shipping',  # 배송 필요 여부 (TRUE)
        'Variant Taxable',  # 과세 대상 여부 (TRUE)
        'Image Src',  # 이미지 URL
        'Image Position',  # 이미지 순서
        'Image Alt Text',  # 이미지 대체 텍스트
        'Status',  # 상태 (active/draft)
        # 추가 메타 정보
        'Taobao ID',  # 타오바오 상품 ID
        'Taobao Price (CNY)',  # 타오바오 원가
        'Expected Margin (%)',  # 예상 마진율
        'Notes',  # 메모
    ]

    def generate_excel(
        self,
        products: List[Dict[str, Any]],
        output_dir: str = '/tmp'
    ) -> str:
        """
        Shopify CSV 파일 생성

        Args:
            products: 상품 데이터 리스트
            output_dir: 출력 디렉토리

        Returns:
            생성된 파일 경로
        """
        try:
            if not products:
                raise ValueError("상품 데이터가 없습니다")

            # 데이터 변환
            rows = []
            for idx, product in enumerate(products, 1):
                # 각 이미지마다 별도 행 생성 (Shopify 포맷)
                images = self._extract_images(product)

                # 첫 번째 행: 모든 정보 포함
                first_row = self._format_product_row(product, idx, image_position=1, image_url=images[0] if images else '')
                rows.append(first_row)

                # 추가 이미지들: 이미지 정보만 포함
                for img_idx, img_url in enumerate(images[1:], start=2):
                    image_row = self._format_image_row(product, img_idx, img_url)
                    rows.append(image_row)

            # DataFrame 생성
            df = pd.DataFrame(rows, columns=self.REQUIRED_COLUMNS)

            # 파일명 생성
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'shopify_products_{timestamp}.csv'
            filepath = os.path.join(output_dir, filename)

            # CSV 저장 (Shopify는 CSV 포맷 사용)
            df.to_csv(filepath, index=False, encoding='utf-8-sig')

            logger.info(f"✅ Shopify CSV 생성 완료: {filepath}")
            logger.info(f"📊 총 {len(products)}개 상품, {len(rows)}개 행")

            return filepath

        except Exception as e:
            logger.error(f"❌ Shopify Excel 생성 실패: {str(e)}", exc_info=True)
            raise

    def _extract_images(self, product: Dict[str, Any]) -> List[str]:
        """상품에서 이미지 URL 추출"""
        images = []

        # 대표 이미지
        if product.get('main_image'):
            images.append(product['main_image'])

        # 추가 이미지들
        for i in range(1, 10):  # 최대 9개 추가 이미지
            img_key = f'image_{i}'
            if product.get(img_key):
                images.append(product[img_key])

        return images[:10]  # Shopify 최대 이미지 제한

    def _format_product_row(
        self,
        product: Dict[str, Any],
        row_num: int,
        image_position: int = 1,
        image_url: str = ''
    ) -> List[Any]:
        """상품 데이터를 Shopify 행 형식으로 변환 (첫 번째 행)"""

        # Handle 생성 (URL-safe 식별자)
        handle = self._generate_handle(product, row_num)

        # 제목 (한글 번역 우선, 없으면 원제)
        title = product.get('korean_title') or product.get('title', '')
        title = title[:255]  # Shopify 제목 길이 제한

        # 가격 정보
        selling_price = product.get('selling_price', 0)
        original_price = product.get('original_price', 0)
        compare_price = original_price if original_price > selling_price else ''

        # 카테고리 및 태그
        category = product.get('category', 'General')
        tags = self._generate_tags(product)

        # 상품 설명 (HTML)
        description = self._generate_description(product)

        return [
            handle,  # Handle
            title,  # Title
            description,  # Body (HTML)
            product.get('brand', ''),  # Vendor
            category,  # Product Category
            product.get('type', 'Physical'),  # Type
            tags,  # Tags
            'TRUE',  # Published
            'Title',  # Option1 Name (기본값)
            'Default Title',  # Option1 Value
            '',  # Option2 Name
            '',  # Option2 Value
            product.get('taobao_id', f'SKU-{row_num}'),  # Variant SKU
            '0',  # Variant Grams (무게 정보 없음)
            'shopify',  # Variant Inventory Tracker
            'deny',  # Variant Inventory Policy
            'manual',  # Variant Fulfillment Service
            selling_price,  # Variant Price
            compare_price,  # Variant Compare At Price
            'TRUE',  # Variant Requires Shipping
            'TRUE',  # Variant Taxable
            image_url,  # Image Src
            image_position,  # Image Position
            title,  # Image Alt Text
            'active',  # Status
            # 추가 메타 정보
            product.get('taobao_id', ''),  # Taobao ID
            product.get('taobao_price', ''),  # Taobao Price (CNY)
            product.get('margin_percent', ''),  # Expected Margin (%)
            product.get('notes', ''),  # Notes
        ]

    def _format_image_row(
        self,
        product: Dict[str, Any],
        image_position: int,
        image_url: str
    ) -> List[Any]:
        """추가 이미지를 위한 행 생성 (나머지 필드는 비움)"""

        handle = self._generate_handle(product, 0)
        title = product.get('korean_title') or product.get('title', '')

        return [
            handle,  # Handle (동일한 상품)
            '',  # Title (비움)
            '',  # Body (HTML) (비움)
            '',  # Vendor (비움)
            '',  # Product Category (비움)
            '',  # Type (비움)
            '',  # Tags (비움)
            '',  # Published (비움)
            '',  # Option1 Name (비움)
            '',  # Option1 Value (비움)
            '',  # Option2 Name (비움)
            '',  # Option2 Value (비움)
            '',  # Variant SKU (비움)
            '',  # Variant Grams (비움)
            '',  # Variant Inventory Tracker (비움)
            '',  # Variant Inventory Policy (비움)
            '',  # Variant Fulfillment Service (비움)
            '',  # Variant Price (비움)
            '',  # Variant Compare At Price (비움)
            '',  # Variant Requires Shipping (비움)
            '',  # Variant Taxable (비움)
            image_url,  # Image Src
            image_position,  # Image Position
            title[:50],  # Image Alt Text
            '',  # Status (비움)
            '',  # Taobao ID (비움)
            '',  # Taobao Price (비움)
            '',  # Expected Margin (비움)
            '',  # Notes (비움)
        ]

    def _generate_handle(self, product: Dict[str, Any], row_num: int) -> str:
        """
        URL-safe handle 생성
        예: taobao-123456789 또는 product-1
        """
        taobao_id = product.get('taobao_id', '')
        if taobao_id:
            return f"taobao-{taobao_id}"
        return f"product-{row_num}"

    def _generate_tags(self, product: Dict[str, Any]) -> str:
        """
        상품 태그 생성 (쉼표로 구분)
        예: "타오바오, 중국직구, 의류, 여성"
        """
        tags = []

        # 기본 태그
        tags.append('타오바오')
        tags.append('중국직구')

        # 카테고리 태그
        if product.get('category'):
            tags.append(product['category'])

        # 가격대 태그
        price = product.get('selling_price', 0)
        if price > 0:
            if price < 10000:
                tags.append('1만원 이하')
            elif price < 30000:
                tags.append('3만원 이하')
            elif price < 50000:
                tags.append('5만원 이하')
            else:
                tags.append('프리미엄')

        return ', '.join(tags)

    def _generate_description(self, product: Dict[str, Any]) -> str:
        """
        HTML 형식의 상품 설명 생성
        """
        description_parts = []

        # 기본 설명
        if product.get('description'):
            description_parts.append(f"<p>{product['description']}</p>")

        # 타오바오 정보
        description_parts.append("<h3>상품 정보</h3>")
        description_parts.append("<ul>")

        if product.get('taobao_id'):
            description_parts.append(f"<li>타오바오 ID: {product['taobao_id']}</li>")

        if product.get('brand'):
            description_parts.append(f"<li>브랜드: {product['brand']}</li>")

        if product.get('material'):
            description_parts.append(f"<li>소재: {product['material']}</li>")

        description_parts.append("</ul>")

        # 배송 안내
        description_parts.append("<h3>배송 안내</h3>")
        description_parts.append("<p>중국 타오바오에서 직구하는 상품으로, 배송까지 7-14일 소요됩니다.</p>")

        return '\n'.join(description_parts)


# 싱글톤 인스턴스
_generator_instance = None


def get_shopify_generator() -> ShopifyExcelGenerator:
    """Shopify Excel Generator 싱글톤 인스턴스 반환"""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = ShopifyExcelGenerator()
    return _generator_instance
