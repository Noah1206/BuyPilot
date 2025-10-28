/**
 * Shopify Discovery API Client
 * 쇼피파이 상품 발굴 및 타오바오 매칭 API
 */

import {
  analyzeCompetitor,
  matchTaobaoBatch,
  calculatePrices,
  translateTitle,
  translateBatch,
  type SmartStoreProduct,
  type ProductMatch,
  type PricedProduct,
  type FailedProduct,
  type TranslationResult,
} from './api-competitor'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// ============================================================
// Type Definitions (Shopify-specific)
// ============================================================

export interface ShopifyExportProduct extends PricedProduct {
  korean_title?: string
  category?: string
  brand?: string
  type?: string
  notes?: string
}

export interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

// ============================================================
// Re-export SmartStore API functions (compatible with Shopify)
// ============================================================

// Shopify도 네이버 쇼핑 검색 사용 (동일한 소스)
export { analyzeCompetitor, type SmartStoreProduct }

// Shopify도 타오바오 매칭 사용 (동일한 로직)
export { matchTaobaoBatch, type ProductMatch, type FailedProduct }

// Shopify도 가격 계산 사용 (동일한 마진율)
export { calculatePrices, type PricedProduct }

// Shopify도 AI 번역 사용 (동일한 Gemini API)
export { translateTitle, translateBatch, type TranslationResult }

// ============================================================
// Shopify-Specific API Functions
// ============================================================

/**
 * Shopify CSV 다운로드
 * @param products - 상품 배열 (한글 번역 포함)
 * @returns Blob 파일
 */
export async function exportShopifyCSV(
  products: ShopifyExportProduct[]
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/discovery/shopify/export-excel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ products }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error?.message || 'Shopify CSV 생성 실패')
  }

  return await response.blob()
}

/**
 * Shopify CSV 다운로드 (브라우저)
 * @param blob - CSV Blob
 * @param filename - 파일명 (기본: shopify_products_YYYYMMDD_HHMMSS.csv)
 */
export function downloadShopifyBlob(blob: Blob, filename?: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `shopify_products_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

// ============================================================
// State Management (Shopify)
// ============================================================

const SHOPIFY_STORAGE_KEY = 'buypilot_shopify_analysis_state'
const SHOPIFY_TRANSLATIONS_KEY = 'buypilot_shopify_translations'

export interface ShopifyAnalysisState {
  smartstoreProducts: SmartStoreProduct[]
  matches: ProductMatch[]
  pricedProducts: PricedProduct[]
  currentStep: number
  timestamp: string
}

/**
 * Shopify 분석 상태 저장
 */
export function saveShopifyState(state: Omit<ShopifyAnalysisState, 'timestamp'>): void {
  const stateWithTimestamp: ShopifyAnalysisState = {
    ...state,
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(SHOPIFY_STORAGE_KEY, JSON.stringify(stateWithTimestamp))
}

/**
 * Shopify 분석 상태 불러오기
 */
export function loadShopifyState(): ShopifyAnalysisState | null {
  const saved = localStorage.getItem(SHOPIFY_STORAGE_KEY)
  if (!saved) return null

  try {
    return JSON.parse(saved)
  } catch (e) {
    console.error('Failed to parse Shopify analysis state:', e)
    return null
  }
}

/**
 * Shopify 분석 상태 초기화
 */
export function clearShopifyState(): void {
  localStorage.removeItem(SHOPIFY_STORAGE_KEY)
}

/**
 * Shopify 번역 데이터 저장
 */
export function saveShopifyTranslations(translations: Map<string, string>): void {
  const obj = Object.fromEntries(translations)
  localStorage.setItem(SHOPIFY_TRANSLATIONS_KEY, JSON.stringify(obj))
}

/**
 * Shopify 번역 데이터 불러오기
 */
export function loadShopifyTranslations(): Map<string, string> {
  const saved = localStorage.getItem(SHOPIFY_TRANSLATIONS_KEY)
  if (!saved) return new Map()

  try {
    const obj = JSON.parse(saved)
    return new Map(Object.entries(obj))
  } catch (e) {
    console.error('Failed to parse Shopify translations:', e)
    return new Map()
  }
}

/**
 * Shopify 번역 데이터 초기화
 */
export function clearShopifyTranslations(): void {
  localStorage.removeItem(SHOPIFY_TRANSLATIONS_KEY)
}
