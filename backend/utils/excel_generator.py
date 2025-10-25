"""
Excel Generator - 스마트스토어 업로드용 엑셀 파일 생성
네이버 스마트스토어 판매자센터 일괄 업로드 형식
"""
import os
import logging
from datetime import datetime
from typing import List, Dict, Any
import pandas as pd

logger = logging.getLogger(__name__)


class SmartStoreExcelGenerator:
    """스마트스토어 업로드용 엑셀 생성"""

    # 스마트스토어 필수 컬럼
    REQUIRED_COLUMNS = [
        '상품명',
        '판매가',
        '대표이미지',
        '추가이미지1',
        '추가이미지2',
        '추가이미지3',
        '추가이미지4',
        '상품상태',
        '과세여부',
        '원산지',
        '배송방법',
        '배송비',
        '제조사',
        '브랜드',
        '카테고리',
        '상세설명',
        # 추가 정보 (선택)
        '타오바오ID',
        '타오바오가격',
        '예상마진',
        '메모'
    ]

    def generate_excel(
        self,
        products: List[Dict[str, Any]],
        output_dir: str = '/tmp'
    ) -> str:
        """
        엑셀 파일 생성

        Args:
            products: [{
                'title': '맨투맨 기모 오버핏...',
                'price': 29900,
                'images': ['url1', 'url2', ...],
                'taobao_item_id': '660094726752',
                'taobao_url': 'https://item.taobao.com/...',
                'taobao_price_cny': 89,
                'shipping_fee': 7000,
                'total_cost': 23900,
                'expected_profit': 6000,
                'actual_margin': 0.35,
                'origin': '중국',
                'category': '패션의류 > 남성의류 > 상의',
            }]
            output_dir: 출력 디렉토리

        Returns:
            파일 경로
        """
        try:
            logger.info(f"📊 Generating Excel for {len(products)} products...")

            # DataFrame 생성
            rows = []
            for idx, product in enumerate(products, 1):
                row = self._format_product_row(product, idx)
                rows.append(row)

            df = pd.DataFrame(rows, columns=self.REQUIRED_COLUMNS)

            # 파일명 생성
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'smartstore_products_{timestamp}.xlsx'
            filepath = os.path.join(output_dir, filename)

            # 엑셀 저장
            df.to_excel(filepath, index=False, engine='openpyxl')

            logger.info(f"✅ Excel file created: {filepath}")
            return filepath

        except Exception as e:
            logger.error(f"❌ Excel generation failed: {str(e)}")
            raise

    def _format_product_row(self, product: Dict[str, Any], row_num: int) -> list:
        """
        단일 상품을 엑셀 행으로 변환

        Returns:
            [값1, 값2, ...] 형태의 리스트
        """
        try:
            # 이미지 처리
            images = product.get('images', [])
            if isinstance(images, str):
                images = [images]

            # 타오바오 정보
            taobao_id = product.get('taobao_item_id') or product.get('taobao_id', '')
            taobao_url = product.get('taobao_url') or product.get('source_url', '')
            taobao_price_cny = product.get('taobao_price_cny') or product.get('price_cny', 0)

            # 가격 정보
            selling_price = product.get('price') or product.get('selling_price', 0)
            shipping_fee = product.get('shipping_fee', 0)
            total_cost = product.get('total_cost', 0)
            expected_profit = product.get('expected_profit', 0)
            actual_margin = product.get('actual_margin', 0)

            # 상세 설명 생성
            description = self._generate_description(
                taobao_url=taobao_url,
                taobao_price_cny=taobao_price_cny,
                total_cost=total_cost,
                expected_profit=expected_profit,
                actual_margin=actual_margin
            )

            return [
                # 기본 정보
                product.get('title', '')[:50],  # 상품명 (50자 제한)
                selling_price,  # 판매가

                # 이미지 (최대 5개)
                images[0] if len(images) > 0 else '',  # 대표이미지
                images[1] if len(images) > 1 else '',  # 추가이미지1
                images[2] if len(images) > 2 else '',  # 추가이미지2
                images[3] if len(images) > 3 else '',  # 추가이미지3
                images[4] if len(images) > 4 else '',  # 추가이미지4

                # 상품 속성
                '신상품',  # 상품상태
                '과세',    # 과세여부
                product.get('origin', '중국'),  # 원산지
                '택배',    # 배송방법
                shipping_fee,  # 배송비
                '수입',    # 제조사
                product.get('brand', '노브랜드'),  # 브랜드
                product.get('category', ''),  # 카테고리
                description,  # 상세설명

                # 추가 정보 (참고용)
                taobao_id,
                f'¥{taobao_price_cny}' if taobao_price_cny else '',
                f'{int(actual_margin * 100)}%' if actual_margin else '',
                product.get('memo', '')
            ]

        except Exception as e:
            logger.warning(f"Error formatting product row: {str(e)}")
            # Return minimal row
            return [product.get('title', '오류')] + [''] * (len(self.REQUIRED_COLUMNS) - 1)

    def _generate_description(
        self,
        taobao_url: str,
        taobao_price_cny: float,
        total_cost: int,
        expected_profit: int,
        actual_margin: float
    ) -> str:
        """상세 설명 생성"""
        description_parts = []

        # 기본 설명
        description_parts.append("중국 직구 상품입니다.")
        description_parts.append("")

        # 가격 정보
        if taobao_price_cny:
            description_parts.append(f"타오바오 원가: ¥{taobao_price_cny}")

        if total_cost:
            description_parts.append(f"총 원가 (배송비 포함): {total_cost:,}원")

        if expected_profit:
            description_parts.append(f"예상 순이익: {expected_profit:,}원")

        if actual_margin:
            description_parts.append(f"마진율: {int(actual_margin * 100)}%")

        description_parts.append("")

        # 타오바오 링크
        if taobao_url:
            description_parts.append("타오바오 원본:")
            description_parts.append(taobao_url)

        return '\n'.join(description_parts)

    def generate_csv(
        self,
        products: List[Dict[str, Any]],
        output_dir: str = '/tmp'
    ) -> str:
        """
        CSV 파일 생성 (엑셀 대신)

        Returns:
            파일 경로
        """
        try:
            logger.info(f"📊 Generating CSV for {len(products)} products...")

            rows = []
            for idx, product in enumerate(products, 1):
                row = self._format_product_row(product, idx)
                rows.append(row)

            df = pd.DataFrame(rows, columns=self.REQUIRED_COLUMNS)

            # 파일명 생성
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'smartstore_products_{timestamp}.csv'
            filepath = os.path.join(output_dir, filename)

            # CSV 저장 (UTF-8 with BOM for Excel compatibility)
            df.to_csv(filepath, index=False, encoding='utf-8-sig')

            logger.info(f"✅ CSV file created: {filepath}")
            return filepath

        except Exception as e:
            logger.error(f"❌ CSV generation failed: {str(e)}")
            raise


# Singleton instance
_excel_generator = None

def get_excel_generator() -> SmartStoreExcelGenerator:
    """Get singleton ExcelGenerator instance"""
    global _excel_generator
    if _excel_generator is None:
        _excel_generator = SmartStoreExcelGenerator()
    return _excel_generator
