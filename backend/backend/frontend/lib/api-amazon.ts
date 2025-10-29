/**
 * Amazon to Shopify API Client
 * Amazon 상품 검색 → Shopify CSV 생성
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// ============================================================
// Type Definitions
// ============================================================

export interface AmazonProduct {
  asin: string
  title: string
  url: string
  price: number | null
  rating: number | null
  review_count: number | null
  main_image: string | null
  images?: string[]
  description?: string
  features?: string[]
  details?: Record<string, string>
  korean_title?: string  // For translated title
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
// API Functions
// ============================================================

/**
 * Amazon 상품 검색
 * @param keyword - 검색 키워드
 * @param maxResults - 최대 결과 수 (default: 20)
 * @param minPrice - 최소 가격 (USD)
 * @param maxPrice - 최대 가격 (USD)
 */
export async function searchAmazonProducts(
  keyword: string,
  maxResults: number = 20,
  minPrice?: number,
  maxPrice?: number
): Promise<ApiResponse<{ products: AmazonProduct[]; total: number; keyword: string }>> {
  const response = await fetch(`${API_BASE}/discovery/amazon/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyword,
      max_results: maxResults,
      min_price: minPrice,
      max_price: maxPrice,
    }),
  })

  return await response.json()
}

/**
 * Amazon 상품 상세 정보 조회
 * @param asin - Amazon Product ID
 */
export async function getAmazonProductDetails(
  asin: string
): Promise<ApiResponse<{ product: AmazonProduct }>> {
  const response = await fetch(`${API_BASE}/discovery/amazon/product/${asin}`, {
    method: 'GET',
  })

  return await response.json()
}

/**
 * Amazon 상품을 Shopify CSV로 변환 및 다운로드
 * @param products - Amazon 상품 배열
 */
export async function exportAmazonToShopify(products: AmazonProduct[]): Promise<Blob> {
  const response = await fetch(`${API_BASE}/discovery/amazon/export-shopify`, {
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
 * @param filename - 파일명
 */
export function downloadShopifyCSV(blob: Blob, filename?: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `shopify_amazon_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/**
 * AI 한글 번역 (Gemini)
 * @param title - 영어 제목
 * @param style - 번역 스타일
 */
export async function translateAmazonTitle(
  title: string,
  style: 'marketing' | 'formal' | 'casual' | 'seo' = 'marketing'
): Promise<ApiResponse<{ original: string; translated: string; style: string }>> {
  const response = await fetch(`${API_BASE}/discovery/translate-title`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, style }),
  })

  return await response.json()
}

// ============================================================
// State Management (localStorage)
// ============================================================

const AMAZON_STORAGE_KEY = 'buypilot_amazon_products'
const AMAZON_TRANSLATIONS_KEY = 'buypilot_amazon_translations'

export interface AmazonSessionState {
  products: AmazonProduct[]
  keyword: string
  timestamp: string
}

/**
 * Amazon 검색 결과 저장
 */
export function saveAmazonProducts(products: AmazonProduct[], keyword: string): void {
  const state: AmazonSessionState = {
    products,
    keyword,
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(AMAZON_STORAGE_KEY, JSON.stringify(state))
}

/**
 * Amazon 검색 결과 불러오기
 */
export function loadAmazonProducts(): AmazonSessionState | null {
  const saved = localStorage.getItem(AMAZON_STORAGE_KEY)
  if (!saved) return null

  try {
    return JSON.parse(saved)
  } catch (e) {
    console.error('Failed to parse Amazon products:', e)
    return null
  }
}

/**
 * Amazon 검색 결과 초기화
 */
export function clearAmazonProducts(): void {
  localStorage.removeItem(AMAZON_STORAGE_KEY)
}

/**
 * 번역 데이터 저장 (ASIN → Korean title)
 */
export function saveAmazonTranslations(translations: Map<string, string>): void {
  const obj = Object.fromEntries(translations)
  localStorage.setItem(AMAZON_TRANSLATIONS_KEY, JSON.stringify(obj))
}

/**
 * 번역 데이터 불러오기
 */
export function loadAmazonTranslations(): Map<string, string> {
  const saved = localStorage.getItem(AMAZON_TRANSLATIONS_KEY)
  if (!saved) return new Map()

  try {
    const obj = JSON.parse(saved)
    return new Map(Object.entries(obj))
  } catch (e) {
    console.error('Failed to parse Amazon translations:', e)
    return new Map()
  }
}

/**
 * 번역 데이터 초기화
 */
export function clearAmazonTranslations(): void {
  localStorage.removeItem(AMAZON_TRANSLATIONS_KEY)
}
