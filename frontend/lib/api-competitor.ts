/**
 * API client utilities for Competitor Analysis (Phase 4)
 * Handles SmartStore scraping, Taobao matching, price calculation, and Excel export
 */

// Determine API URL based on environment
function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    if (window.location.origin.includes('railway.app')) {
      return window.location.origin
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4070'
}

const API_URL = getApiUrl()

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
    details: any
  }
}

export interface SmartStoreProduct {
  title: string
  price: number
  image_url: string
  product_url: string
  review_count: number
  purchase_count: number
  rating: number
  rank: number
  popularity_score: number
}

export interface TaobaoCandidate {
  taobao_id: string
  title: string
  price_cny: number
  image_url: string
  rating: number
  sold_count: number
  similarity_score: number
  taobao_url: string
  score?: number // AI score from ProductScorer
}

export interface ProductMatch {
  smartstore_product: SmartStoreProduct
  taobao_candidates: TaobaoCandidate[]
  best_match: TaobaoCandidate
}

export interface ShippingDetails {
  weight_used: number
  calculation_method: string
  estimated: boolean
}

export interface PricedProduct {
  title: string
  taobao_id: string
  taobao_price_cny: number
  taobao_price_krw: number
  exchange_rate: number
  shipping_fee: number
  shipping_details?: ShippingDetails
  total_cost: number
  target_margin: number
  selling_price: number
  selling_price_rounded: number
  expected_profit: number
  actual_margin: number
  // Additional fields from matching
  image_url?: string
  taobao_url?: string
  rating?: number
  sold_count?: number
}

export interface FailedProduct {
  title: string
  error: string
}

// ============================================================
// API FUNCTIONS
// ============================================================

/**
 * Generic API fetch wrapper with timeout support
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs: number = 600000 // 10 minutes default for long operations
): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const data = await response.json()
    return data
  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      return {
        ok: false,
        error: {
          code: 'TIMEOUT_ERROR',
          message: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
          details: error,
        },
      }
    }

    console.error('API fetch error:', error)
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'API 연결에 실패했습니다.',
        details: error,
      },
    }
  }
}

/**
 * Step 1: Search popular products by keyword (Naver Shopping API)
 *
 * @param keyword - Search keyword (예: "청바지", "맨투맨")
 * @param maxProducts - Maximum number of products (default: 100)
 * @param minPrice - Minimum price filter (optional)
 * @param maxPrice - Maximum price filter (optional)
 * @param filterSmartstore - Filter only SmartStore products (optional)
 * @returns Popular products from Naver Shopping
 */
export async function analyzeCompetitor(
  keyword: string,
  maxProducts: number = 100,
  minPrice?: number,
  maxPrice?: number,
  filterSmartstore?: boolean
): Promise<ApiResponse<{
  keyword: string
  total_count: number
  products: SmartStoreProduct[]
}>> {
  return apiFetch('/api/v1/discovery/analyze-competitor', {
    method: 'POST',
    body: JSON.stringify({
      keyword,
      max_products: maxProducts,
      min_price: minPrice || 0,
      max_price: maxPrice || 0,
      filter_smartstore: filterSmartstore || false,
    }),
  }, 30000) // 30 seconds timeout for API call
}

/**
 * Step 2: Match SmartStore products with Taobao listings
 *
 * @param products - Array of SmartStore products from step 1
 * @param maxCandidates - Number of Taobao candidates per product (default: 3)
 * @returns Matched products with Taobao candidates
 */
export async function matchTaobaoBatch(
  products: SmartStoreProduct[],
  maxCandidates: number = 3
): Promise<ApiResponse<{
  total_products: number
  matched_count: number
  failed_count: number
  matches: ProductMatch[]
  failed_products: FailedProduct[]
}>> {
  return apiFetch('/api/v1/discovery/match-taobao-batch', {
    method: 'POST',
    body: JSON.stringify({
      products,
      max_candidates: maxCandidates,
    }),
  }, 600000) // 10 minutes timeout for matching (longest operation)
}

/**
 * Step 3: Calculate selling prices with shipping and margin
 *
 * @param products - Array of products with selected Taobao matches
 * @param targetMargin - Target profit margin ratio (default: 0.35 = 35%)
 * @returns Products with calculated selling prices
 */
export async function calculatePrices(
  products: Array<{
    title: string
    taobao_price_cny: number
    taobao_id: string
    image_url?: string
    taobao_url?: string
    rating?: number
    sold_count?: number
  }>,
  targetMargin: number = 0.35
): Promise<ApiResponse<{
  exchange_rate: number
  products: PricedProduct[]
}>> {
  return apiFetch('/api/v1/discovery/calculate-prices', {
    method: 'POST',
    body: JSON.stringify({
      products,
      target_margin: targetMargin,
    }),
  }, 30000) // 30 seconds timeout (fast operation)
}

/**
 * Step 4: Export selected products to SmartStore-compatible Excel file
 *
 * @param products - Array of products with calculated prices
 * @returns Blob for Excel file download
 */
export async function exportExcel(
  products: PricedProduct[]
): Promise<{ ok: boolean; blob?: Blob; filename?: string; error?: { code: string; message: string } }> {
  try {
    const response = await fetch(`${API_URL}/api/v1/discovery/export-excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ products }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        ok: false,
        error: errorData.error || {
          code: 'EXPORT_ERROR',
          message: 'Excel 파일 생성에 실패했습니다.',
        },
      }
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition')
    const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/)
    const filename = filenameMatch?.[1] || `smartstore_products_${Date.now()}.xlsx`

    const blob = await response.blob()
    return {
      ok: true,
      blob,
      filename,
    }
  } catch (error) {
    console.error('Excel export error:', error)
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Excel 다운로드에 실패했습니다.',
      },
    }
  }
}

/**
 * Helper: Download blob as file
 *
 * @param blob - File blob to download
 * @param filename - Desired filename
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Helper: Save analysis state to localStorage
 */
export function saveAnalysisState(state: {
  smartstoreProducts: SmartStoreProduct[]
  matches: ProductMatch[]
  pricedProducts: PricedProduct[]
  currentStep: number
}): void {
  try {
    localStorage.setItem('competitor-analysis-state', JSON.stringify(state))
    localStorage.setItem('competitor-analysis-timestamp', Date.now().toString())
  } catch (error) {
    console.error('Failed to save analysis state:', error)
  }
}

/**
 * Helper: Load analysis state from localStorage
 */
export function loadAnalysisState(): {
  smartstoreProducts: SmartStoreProduct[]
  matches: ProductMatch[]
  pricedProducts: PricedProduct[]
  currentStep: number
} | null {
  try {
    const state = localStorage.getItem('competitor-analysis-state')
    const timestamp = localStorage.getItem('competitor-analysis-timestamp')

    if (!state || !timestamp) return null

    // Check if state is older than 24 hours
    const age = Date.now() - parseInt(timestamp)
    if (age > 24 * 60 * 60 * 1000) {
      clearAnalysisState()
      return null
    }

    return JSON.parse(state)
  } catch (error) {
    console.error('Failed to load analysis state:', error)
    return null
  }
}

/**
 * Helper: Clear analysis state from localStorage
 */
export function clearAnalysisState(): void {
  try {
    localStorage.removeItem('competitor-analysis-state')
    localStorage.removeItem('competitor-analysis-timestamp')
  } catch (error) {
    console.error('Failed to clear analysis state:', error)
  }
}

// ============================================================
// TRANSLATION FUNCTIONS
// ============================================================

export interface TranslationResult {
  original: string
  translated: string
  style: string
}

/**
 * Translate single product title (Chinese → Korean)
 */
export async function translateTitle(
  title: string,
  style: 'marketing' | 'formal' | 'casual' | 'seo' = 'marketing'
): Promise<ApiResponse<TranslationResult>> {
  return apiFetch('/api/v1/discovery/translate-title', {
    method: 'POST',
    body: JSON.stringify({ title, style }),
  }, 30000) // 30 seconds timeout
}

/**
 * Translate multiple titles in batch
 */
export async function translateBatch(
  titles: string[],
  style: 'marketing' | 'formal' | 'casual' | 'seo' = 'marketing'
): Promise<ApiResponse<{
  translations: Array<{
    original: string
    translated: string
    index: number
  }>
  total: number
  succeeded: number
  failed: number
}>> {
  return apiFetch('/api/v1/discovery/translate-batch', {
    method: 'POST',
    body: JSON.stringify({ titles, style }),
  }, 120000) // 2 minutes timeout for batch
}

// ============================================================
// TRANSLATION STATE MANAGEMENT
// ============================================================

/**
 * Save translations to localStorage
 */
export function saveTranslations(translations: Map<string, string>): void {
  try {
    const obj = Object.fromEntries(translations)
    localStorage.setItem('product-translations', JSON.stringify(obj))
  } catch (error) {
    console.error('Failed to save translations:', error)
  }
}

/**
 * Load translations from localStorage
 */
export function loadTranslations(): Map<string, string> {
  try {
    const stored = localStorage.getItem('product-translations')
    if (!stored) return new Map()

    const obj = JSON.parse(stored)
    return new Map(Object.entries(obj))
  } catch (error) {
    console.error('Failed to load translations:', error)
    return new Map()
  }
}

/**
 * Clear translations from localStorage
 */
export function clearTranslations(): void {
  try {
    localStorage.removeItem('product-translations')
  } catch (error) {
    console.error('Failed to clear translations:', error)
  }
}
