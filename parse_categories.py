#!/usr/bin/env python3
"""
Parse Naver SmartStore category data from text format to JSON
"""
import json

# 카테고리 원본 데이터 (사용자가 제공한 데이터)
category_text = """50003307	가구/인테리어	DIY자재/용품	가구부속품	가구다리
50003308	가구/인테리어	DIY자재/용품	가구부속품	가구바퀴
50003309	가구/인테리어	DIY자재/용품	가구부속품	경첩/꺽쇠/자석철물류
..."""  # 전체 데이터는 너무 길어서 생략

# 실제 전체 데이터를 여기에 저장
full_data = """카테고리코드	대분류	중분류	소분류	세분류
50003307	가구/인테리어	DIY자재/용품	가구부속품	가구다리
50003308	가구/인테리어	DIY자재/용품	가구부속품	가구바퀴"""

def parse_categories(data_text):
    """
    Parse category data from tab-separated text to structured JSON
    """
    lines = data_text.strip().split('\n')

    categories = []

    for line in lines[1:]:  # Skip header row
        if not line.strip():
            continue

        parts = line.split('\t')
        if len(parts) < 2:
            continue

        category_id = parts[0].strip()

        # Build category path from available columns
        path_parts = []
        for i in range(1, len(parts)):
            if parts[i].strip():
                path_parts.append(parts[i].strip())

        if not category_id or not path_parts:
            continue

        category_name = path_parts[-1]  # Last non-empty part is the actual category name
        category_path = ' > '.join(path_parts)

        categories.append({
            'id': category_id,
            'name': category_name,
            'path': category_path,
            'level_1': path_parts[0] if len(path_parts) > 0 else '',
            'level_2': path_parts[1] if len(path_parts) > 1 else '',
            'level_3': path_parts[2] if len(path_parts) > 2 else '',
            'level_4': path_parts[3] if len(path_parts) > 3 else '',
        })

    return categories

# Note: This script structure is ready, but we'll create the actual file
# with the full category data directly in the next step
print("Category parser ready")
