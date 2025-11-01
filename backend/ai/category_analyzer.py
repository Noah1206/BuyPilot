"""
Category Analyzer - AI-powered Naver category suggestion
Uses Gemini AI to analyze product data and suggest appropriate categories
"""
import os
import logging
import json
import re
from typing import List, Dict, Optional
import google.generativeai as genai

logger = logging.getLogger(__name__)


class CategoryAnalyzer:
    """
    AI-powered category analyzer using Gemini
    Suggests appropriate Naver SmartStore categories based on product data
    """

    def __init__(self):
        """Initialize Gemini AI client"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

        # Safety settings - relaxed for product analysis
        self.safety_settings = {
            'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
            'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
            'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
            'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
        }

        logger.info("✅ CategoryAnalyzer initialized with Gemini 2.0 Flash")

    def flatten_categories(self, categories: List[Dict], parent_path: str = "") -> List[Dict]:
        """
        Flatten hierarchical category tree to leaf categories only

        Args:
            categories: Hierarchical category tree from Naver API
            parent_path: Path of parent categories (for breadcrumb)

        Returns:
            List of leaf categories with full paths
        """
        flat_categories = []

        for category in categories:
            category_name = category.get('name', category.get('categoryName', ''))
            category_id = category.get('id', category.get('categoryId', ''))

            # Build full path
            current_path = f"{parent_path} > {category_name}" if parent_path else category_name

            # Check if leaf category (no children or has wholeCategoryId which indicates leaf)
            children = category.get('children', category.get('childCategories', []))
            is_leaf = len(children) == 0 or 'wholeCategoryId' in category

            if is_leaf and category_id:
                flat_categories.append({
                    'id': str(category_id),
                    'name': category_name,
                    'path': current_path
                })

            # Recursively process children
            if children:
                flat_categories.extend(
                    self.flatten_categories(children, current_path)
                )

        return flat_categories

    def suggest_categories(
        self,
        product_data: Dict,
        categories_tree: List[Dict],
        top_k: int = 3
    ) -> List[Dict]:
        """
        Suggest appropriate Naver categories for a product using AI

        Args:
            product_data: {
                'title': Korean product title,
                'price': Product price,
                'desc': Optional product description,
                'images': Optional image URLs
            }
            categories_tree: Full Naver category hierarchy
            top_k: Number of suggestions to return (default: 3)

        Returns:
            List of suggestions:
            [
                {
                    'category_id': '50000790',
                    'category_path': '패션의류/잡화 > 여성신발 > 운동화',
                    'confidence': 95,
                    'reason': '상품명에 "운동화" 키워드 포함'
                },
                ...
            ]
        """
        try:
            # Flatten categories to leaf nodes only
            leaf_categories = self.flatten_categories(categories_tree)

            if not leaf_categories:
                logger.error("❌ No leaf categories found in category tree")
                return []

            logger.info(f"📊 Analyzing product with {len(leaf_categories)} available categories")

            # Prepare product info
            title = product_data.get('title', '')
            price = product_data.get('price', 0)
            desc = product_data.get('desc', product_data.get('description', ''))

            if not title:
                logger.error("❌ Product title is required for category analysis")
                return []

            # Build prompt
            prompt = self._build_analysis_prompt(title, price, desc, leaf_categories, top_k)

            # Call Gemini API
            logger.info(f"🤖 Calling Gemini AI for category analysis...")
            response = self.model.generate_content(
                prompt,
                safety_settings=self.safety_settings
            )

            # Parse response
            suggestions = self._parse_ai_response(response.text, leaf_categories)

            logger.info(f"✅ Generated {len(suggestions)} category suggestions")
            return suggestions[:top_k]

        except Exception as e:
            logger.error(f"❌ Category analysis failed: {str(e)}", exc_info=True)
            return []

    def _extract_keywords(self, title: str) -> List[str]:
        """
        Extract relevant keywords from product title for category filtering

        Handles Korean compound nouns like:
        - 실내화 (indoor shoes)
        - 운동화 (sneakers)
        - 슬리퍼 (slippers)

        Args:
            title: Product title in Korean

        Returns:
            List of keywords to match against categories
        """
        import re

        # Common Korean product category keywords (주요 상품 카테고리 키워드)
        category_keywords = [
            # 신발
            '운동화', '슬리퍼', '실내화', '샌들', '부츠', '구두', '로퍼', '스니커즈', '워커',

            # 의류
            '청바지', '원피스', '티셔츠', '후드', '맨투맨', '바지', '치마', '재킷', '코트', '패딩',
            '레깅스', '조거팬츠', '카디건', '니트', '블라우스', '셔츠', '점퍼',

            # 패션잡화
            '가방', '지갑', '벨트', '모자', '장갑', '목도리', '스카프', '양말', '스타킹',

            # 화장품/미용
            '화장품', '로션', '크림', '세럼', '마스크팩', '립스틱', '파운데이션', '선크림',
            '클렌징', '토너', '에센스', '아이크림', '팩트', '쿠션', '아이섀도우',

            # 전자제품
            '케이스', '충전기', '이어폰', '헤드폰', '키보드', '마우스', '스피커', '배터리',
            '거치대', '보조배터리', '케이블', '어댑터',

            # 침구/생활
            '담요', '쿠션', '방석', '이불', '베개', '커튼', '러그', '매트',

            # 가구
            '의자', '책상', '침대', '수납장', '선반', '행거', '옷장', '서랍장', '소파',

            # 공구 (전동공구)
            '드릴', '드라이버', '그라인더', '샌더', '대패', '톱', '루터', '임팩트',
            '전동드릴', '충전드릴', '전동드라이버', '충전드라이버', '각도절단기', '원형톱',
            '전기톱', '컷쏘', '멀티툴', '광택기', '믹서기', '에어컴프레서',

            # 공구 (수작업공구)
            '렌치', '펜치', '니퍼', '망치', '드라이버', '몽키', '톱', '줄', '끌',
            '바이스', '클램프', '칼', '커터', '가위', '펀치', '리벳', '정',

            # 측정기
            '줄자', '수평계', '각도기', '레이저측정기', '온도계', '습도계',

            # 원예/농업
            '예초기', '분무기', '호스', '삽', '괭이', '갈퀴', '전지가위', '잔디깎이',

            # 안전용품
            '장갑', '마스크', '고글', '헬멧', '귀마개', '안전화', '안전모',

            # 주방용품
            '냄비', '프라이팬', '칼', '도마', '믹서기', '블렌더', '에어프라이어',

            # 식품
            '과자', '음료', '라면', '커피', '차', '쌀', '간식', '건과류',
        ]

        keywords = []

        # 1. Extract known category keywords from compound words
        for cat_keyword in category_keywords:
            if cat_keyword in title:
                keywords.append(cat_keyword)

        # 2. Remove common symbols and split
        title_clean = re.sub(r'[/\-_\[\](){}]', ' ', title)
        words = title_clean.split()

        # 3. Add individual words (길이 >= 2, 숫자 제외)
        for word in words:
            word = word.strip()
            if len(word) >= 2 and not word.isdigit() and word not in keywords:
                keywords.append(word)

        # 4. Add original title for full context matching
        if title not in keywords:
            keywords.append(title)

        logger.info(f"🔍 Extracted keywords: {keywords[:10]}")
        return keywords

    def _build_analysis_prompt(
        self,
        title: str,
        price: float,
        desc: str,
        categories: List[Dict],
        top_k: int
    ) -> str:
        """Build structured prompt for Gemini AI"""

        # Smart filtering: extract keywords from product title
        keywords = self._extract_keywords(title)

        # Filter categories based on keywords for better relevance
        relevant_categories = []
        other_categories = []

        for cat in categories:
            # Check if any keyword matches category path
            is_relevant = any(keyword.lower() in cat['path'].lower() for keyword in keywords)

            if is_relevant:
                relevant_categories.append(cat)
            else:
                other_categories.append(cat)

        # Combine: prioritize relevant categories, then add others
        # Gemini 2.0 Flash has 1M token context, so we can include many categories
        selected_categories = relevant_categories[:500] + other_categories[:500]

        logger.info(f"📊 Filtered {len(relevant_categories)} relevant categories (keywords: {keywords})")

        # Group by main category
        category_groups = {}
        for cat in selected_categories:
            parts = cat['path'].split(' > ')
            main_cat = parts[0] if parts else 'Unknown'

            if main_cat not in category_groups:
                category_groups[main_cat] = []

            category_groups[main_cat].append({
                'id': cat['id'],
                'path': cat['path']
            })

        # Format for prompt - include more categories for better accuracy
        categories_text = []
        for main_cat, subcats in category_groups.items():
            categories_text.append(f"\n[{main_cat}]")
            for subcat in subcats[:50]:  # Increased from 10 to 50 subcategories per main
                categories_text.append(f"  ID: {subcat['id']} - {subcat['path']}")

        categories_formatted = '\n'.join(categories_text)

        prompt = f"""당신은 네이버 스마트스토어 상품 카테고리 분석 전문가입니다.
주어진 상품 정보를 분석하여 가장 적합한 카테고리 {top_k}개를 추천해주세요.

**상품 정보:**
- 제목: {title}
- 가격: {price:,}원
- 설명: {desc[:200] if desc else '없음'}

**사용 가능한 카테고리 (일부):**
{categories_formatted}

**요구사항:**
1. 상품 제목과 설명을 분석하여 가장 적합한 카테고리를 선택하세요
2. 반드시 위 목록에 있는 카테고리 ID만 사용하세요
3. 가능한 구체적인 (하위) 카테고리를 선택하세요
4. 각 추천에 대한 신뢰도(0-100)와 이유를 제공하세요

**응답 형식 (JSON only):**
```json
[
  {{
    "category_id": "카테고리ID",
    "category_path": "전체 카테고리 경로",
    "confidence": 95,
    "reason": "추천 이유 (한국어)"
  }}
]
```

JSON으로만 응답하세요. 다른 텍스트는 포함하지 마세요."""

        return prompt

    def _parse_ai_response(self, response_text: str, available_categories: List[Dict]) -> List[Dict]:
        """Parse Gemini AI response and validate category IDs"""

        try:
            # Extract JSON from response (may be wrapped in markdown code blocks)
            json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group(1)
            else:
                # Try to find JSON array directly
                json_match = re.search(r'\[.*?\]', response_text, re.DOTALL)
                if json_match:
                    json_text = json_match.group(0)
                else:
                    logger.error(f"❌ No JSON found in AI response: {response_text[:200]}")
                    return []

            # Parse JSON
            suggestions = json.loads(json_text)

            if not isinstance(suggestions, list):
                logger.error(f"❌ AI response is not a list: {type(suggestions)}")
                return []

            # Validate and enrich suggestions
            valid_suggestions = []
            category_map = {cat['id']: cat for cat in available_categories}

            for suggestion in suggestions:
                category_id = str(suggestion.get('category_id', ''))

                # Validate category ID exists
                if category_id not in category_map:
                    logger.warning(f"⚠️ Invalid category ID from AI: {category_id}")
                    continue

                # Enrich with actual category path from database
                valid_category = category_map[category_id]

                valid_suggestions.append({
                    'category_id': category_id,
                    'category_path': valid_category['path'],
                    'confidence': min(100, max(0, int(suggestion.get('confidence', 50)))),
                    'reason': suggestion.get('reason', '추천 카테고리')
                })

            return valid_suggestions

        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse JSON from AI response: {str(e)}")
            logger.error(f"Response text: {response_text[:500]}")
            return []
        except Exception as e:
            logger.error(f"❌ Failed to parse AI response: {str(e)}", exc_info=True)
            return []


# Singleton instance
_category_analyzer_instance = None


def get_category_analyzer() -> CategoryAnalyzer:
    """Get or create singleton CategoryAnalyzer instance"""
    global _category_analyzer_instance

    if _category_analyzer_instance is None:
        _category_analyzer_instance = CategoryAnalyzer()

    return _category_analyzer_instance
