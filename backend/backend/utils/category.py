"""
Category-based weight estimation for products
Designed to cover 50% of product types in search results
"""

# Category weight estimates (kg) - covers common product types
CATEGORY_WEIGHTS = {
    # 의류 (Clothing)
    "의류": 0.5,
    "티셔츠": 0.3,
    "후드": 0.6,
    "자켓": 0.8,
    "코트": 1.2,
    "청바지": 0.7,
    "바지": 0.5,
    "반바지": 0.3,
    "치마": 0.4,
    "원피스": 0.6,

    # 신발 (Shoes)
    "신발": 1.0,
    "운동화": 0.8,
    "슬리퍼": 0.5,
    "부츠": 1.2,
    "구두": 0.9,

    # 가방 (Bags)
    "가방": 0.8,
    "백팩": 1.0,
    "크로스백": 0.6,
    "숄더백": 0.7,
    "지갑": 0.3,

    # 악세서리 (Accessories)
    "악세사리": 0.3,
    "목걸이": 0.2,
    "팔찌": 0.2,
    "반지": 0.1,
    "귀걸이": 0.1,
    "시계": 0.3,
    "선글라스": 0.2,
    "모자": 0.3,
    "벨트": 0.4,

    # 전자제품 (Electronics)
    "전자제품": 2.0,
    "이어폰": 0.3,
    "헤드폰": 0.5,
    "스피커": 1.5,
    "보조배터리": 0.5,
    "충전기": 0.3,
    "케이블": 0.2,
    "마우스": 0.3,
    "키보드": 1.0,
    "웹캠": 0.4,

    # 생활용품 (Household)
    "생활용품": 1.5,
    "텀블러": 0.5,
    "머그컵": 0.4,
    "그릇": 0.6,
    "수저": 0.3,
    "조리도구": 0.8,
    "청소도구": 1.2,
    "수납": 1.5,
    "인테리어": 2.0,

    # 화장품 (Cosmetics)
    "화장품": 0.5,
    "립스틱": 0.2,
    "파운데이션": 0.3,
    "아이섀도우": 0.2,
    "향수": 0.4,
    "스킨케어": 0.5,
    "마스크팩": 0.3,

    # 식품 (Food)
    "식품": 1.0,
    "과자": 0.5,
    "차": 0.4,
    "커피": 0.5,
    "조미료": 0.6,

    # 캠핑 (Camping) - 사용자의 검색 예시 기준
    "캠핑": 2.5,
    "화로": 3.0,
    "화로대": 3.5,
    "바베큐": 4.0,
    "그릴": 3.5,
    "텐트": 5.0,
    "침낭": 2.0,
    "매트": 2.5,
    "랜턴": 1.5,
    "코펠": 1.0,
    "버너": 1.5,
    "의자": 2.0,
    "테이블": 4.0,

    # 스포츠 (Sports)
    "스포츠": 2.0,
    "요가매트": 1.5,
    "덤벨": 3.0,
    "운동복": 0.5,
    "운동화": 0.8,

    # 완구 (Toys)
    "완구": 1.0,
    "인형": 0.8,
    "블록": 1.2,
    "피규어": 0.5,

    # 반려동물 (Pets)
    "반려동물": 1.5,
    "사료": 2.0,
    "간식": 0.5,
    "장난감": 0.5,
    "목줄": 0.3,

    # 문구 (Stationery)
    "문구": 0.5,
    "노트": 0.4,
    "펜": 0.2,
    "파일": 0.3,

    # 기타 (Other)
    "기타": 1.0
}

# Keywords for category matching (50% coverage rule)
CATEGORY_KEYWORDS = {
    "의류": ["옷", "의류", "티", "셔츠", "후드", "자켓", "코트", "바지", "청", "치마", "원피스", "패딩", "니트", "맨투맨", "가디건"],
    "신발": ["신발", "운동화", "스니커즈", "슬리퍼", "부츠", "구두", "샌들", "슈즈"],
    "가방": ["가방", "백팩", "크로스백", "숄더백", "지갑", "파우치", "에코백", "토트백"],
    "악세사리": ["악세사리", "목걸이", "팔찌", "반지", "귀걸이", "시계", "선글라스", "모자", "벨트", "스카프"],
    "전자제품": ["전자", "이어폰", "헤드폰", "스피커", "배터리", "충전", "케이블", "마우스", "키보드", "웹캠", "USB"],
    "생활용품": ["생활", "텀블러", "컵", "그릇", "수저", "조리", "청소", "수납", "인테리어", "주방"],
    "화장품": ["화장품", "립스틱", "파운데이션", "아이섀도우", "향수", "스킨", "로션", "크림", "마스크팩", "클렌징"],
    "식품": ["식품", "과자", "차", "커피", "조미료", "간식", "음료"],
    "캠핑": ["캠핑", "화로", "화로대", "바베큐", "그릴", "BBQ", "텐트", "침낭", "매트", "랜턴", "코펠", "버너", "불멍"],
    "스포츠": ["스포츠", "운동", "요가", "덤벨", "헬스", "피트니스"],
    "완구": ["완구", "장난감", "인형", "블록", "피규어", "레고"],
    "반려동물": ["반려", "펫", "강아지", "고양이", "사료", "간식"],
    "문구": ["문구", "노트", "펜", "필통", "파일", "스티커"]
}


def estimate_weight_from_title(title: str) -> float:
    """
    Estimate product weight from title using keyword matching

    Algorithm:
    1. Match title against category keywords
    2. Return first matched category weight
    3. Default to 1.0kg if no match

    This achieves ~50% coverage for common search results

    Args:
        title: Product title in Korean

    Returns:
        Estimated weight in kg
    """
    title_lower = title.lower()

    # First pass: exact category name match
    for category, weight in CATEGORY_WEIGHTS.items():
        if category in title_lower:
            return weight

    # Second pass: keyword matching
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in title_lower:
                if category in CATEGORY_WEIGHTS:
                    return CATEGORY_WEIGHTS[category]
                return CATEGORY_WEIGHTS.get(category, 1.0)

    # Default weight for unmatched items
    return 1.0


def estimate_weight_from_price(price_krw: int) -> float:
    """
    Fallback: estimate weight from price
    Used when title matching fails

    Args:
        price_krw: Product price in KRW

    Returns:
        Estimated weight in kg
    """
    if price_krw < 10000:
        return 0.5
    elif price_krw < 30000:
        return 1.0
    elif price_krw < 50000:
        return 2.0
    elif price_krw < 100000:
        return 3.0
    else:
        return 5.0


def get_category_from_title(title: str) -> str:
    """
    Get category name from product title

    Args:
        title: Product title in Korean

    Returns:
        Category name or "기타"
    """
    title_lower = title.lower()

    # Exact match first
    for category in CATEGORY_WEIGHTS.keys():
        if category in title_lower:
            return category

    # Keyword match
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in title_lower:
                return category

    return "기타"
