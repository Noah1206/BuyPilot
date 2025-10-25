'use client'

import { useState, useEffect } from 'react'
import {
  analyzeCompetitor,
  matchTaobaoBatch,
  calculatePrices,
  exportShopifyCSV,
  downloadShopifyBlob,
  saveShopifyState,
  loadShopifyState,
  clearShopifyState,
  saveShopifyTranslations,
  loadShopifyTranslations,
  clearShopifyTranslations,
  type SmartStoreProduct,
  type ProductMatch,
  type PricedProduct,
  type FailedProduct,
  type ShopifyExportProduct,
} from '@/lib/api-shopify'
import StepIndicator from '@/components/competitor/StepIndicator'
import AnalysisProgress from '@/components/competitor/AnalysisProgress'
import ProductSelectionTable from '@/components/competitor/ProductSelectionTable'
import FailedProductsList from '@/components/competitor/FailedProductsList'

export default function ShopifyDiscoveryPage() {
  // Step control
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3 | 4>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Step 0: Input
  const [keyword, setKeyword] = useState('')
  const [maxProducts, setMaxProducts] = useState(100)
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(0)

  // Step 1: Scraping results
  const [smartstoreProducts, setSmartStoreProducts] = useState<SmartStoreProduct[]>([])
  const [crawlProgress, setCrawlProgress] = useState({ current: 0, total: 0 })

  // Step 2: Matching results
  const [matches, setMatches] = useState<ProductMatch[]>([])
  const [matchProgress, setMatchProgress] = useState({ current: 0, total: 0 })
  const [failedProducts, setFailedProducts] = useState<FailedProduct[]>([])

  // Step 3: Price calculation results
  const [pricedProducts, setPricedProducts] = useState<PricedProduct[]>([])
  const [priceProgress, setPriceProgress] = useState({ current: 0, total: 0 })

  // Step 4: Selection and download
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectedMatches, setSelectedMatches] = useState<Map<string, ProductMatch>>(new Map())
  const [downloading, setDownloading] = useState(false)

  // Translations: Map of taobao_id → Korean title
  const [translations, setTranslations] = useState<Map<string, string>>(new Map())

  // Load translations on mount
  useEffect(() => {
    const savedTranslations = loadShopifyTranslations()
    if (savedTranslations.size > 0) {
      setTranslations(savedTranslations)
    }
  }, [])

  // Save translations when they change
  useEffect(() => {
    if (translations.size > 0) {
      saveShopifyTranslations(translations)
    }
  }, [translations])

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadShopifyState()
    if (savedState && savedState.smartstoreProducts.length > 0) {
      const shouldRestore = confirm(
        '이전 분석 데이터가 있습니다. 불러올까요?\n(아니오를 선택하면 새로 시작합니다)'
      )
      if (shouldRestore) {
        setSmartStoreProducts(savedState.smartstoreProducts)
        setMatches(savedState.matches)
        setPricedProducts(savedState.pricedProducts)
        setCurrentStep(savedState.currentStep as any)
        setSuccess('이전 분석 데이터를 불러왔습니다.')
      } else {
        clearShopifyState()
      }
    }
  }, [])

  // Save state when it changes
  useEffect(() => {
    if (smartstoreProducts.length > 0 || matches.length > 0 || pricedProducts.length > 0) {
      saveShopifyState({
        smartstoreProducts,
        matches,
        pricedProducts,
        currentStep,
      })
    }
  }, [smartstoreProducts, matches, pricedProducts, currentStep])

  // Step 1: Start analysis - Search Naver Shopping
  const handleStartAnalysis = async () => {
    if (!keyword.trim()) {
      setError('검색 키워드를 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setCurrentStep(1)
    setCrawlProgress({ current: 0, total: maxProducts })

    try {
      const response = await analyzeCompetitor(keyword, maxProducts, minPrice, maxPrice)

      if (response.ok && response.data) {
        setSmartStoreProducts(response.data.products)
        setCrawlProgress({
          current: response.data.products.length,
          total: response.data.products.length,
        })
        const priceFilter = minPrice > 0 || maxPrice > 0
          ? ` (${minPrice > 0 ? minPrice.toLocaleString() + '원 이상' : ''}${minPrice > 0 && maxPrice > 0 ? ', ' : ''}${maxPrice > 0 ? maxPrice.toLocaleString() + '원 이하' : ''})`
          : ''
        setSuccess(
          `"${keyword}" 검색 결과: ${response.data.total_count}개 상품 수집${priceFilter}`
        )
        // Auto-advance to step 2
        setTimeout(() => {
          setCurrentStep(2)
          handleMatchTaobao(response.data!.products)
        }, 1500)
      } else {
        setError(response.error?.message || '상품 검색에 실패했습니다.')
        setCurrentStep(0)
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.')
      setCurrentStep(0)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Match with Taobao
  const handleMatchTaobao = async (products: SmartStoreProduct[]) => {
    if (!products || products.length === 0) {
      setError('매칭할 상품이 없습니다. 먼저 크롤링을 완료해주세요.')
      setCurrentStep(1)
      return
    }

    setLoading(true)
    setError(null)
    setCurrentStep(2)
    setMatchProgress({ current: 0, total: products.length })

    try {
      const response = await matchTaobaoBatch(products, 3)

      if (response.ok && response.data) {
        setMatches(response.data.matches)
        setFailedProducts(response.data.failed_products)
        setMatchProgress({
          current: response.data.matched_count,
          total: products.length,
        })

        if (response.data.failed_count > 0) {
          setSuccess(
            `${response.data.matched_count}개 매칭 성공, ${response.data.failed_count}개 실패`
          )
        } else {
          setSuccess(`모든 상품(${response.data.matched_count}개)이 매칭되었습니다!`)
        }

        // Auto-advance to step 3
        setTimeout(() => {
          setCurrentStep(3)
          handleCalculatePrices(response.data!.matches)
        }, 1500)
      } else {
        setError(response.error?.message || '타오바오 매칭에 실패했습니다.')
        setCurrentStep(1)
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.')
      setCurrentStep(1)
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Calculate prices
  const handleCalculatePrices = async (productMatches: ProductMatch[]) => {
    if (!productMatches || productMatches.length === 0) {
      setError('가격을 계산할 매칭 데이터가 없습니다.')
      setCurrentStep(2)
      return
    }

    setLoading(true)
    setError(null)
    setCurrentStep(3)
    setPriceProgress({ current: 0, total: productMatches.length })

    try {
      const response = await calculatePrices(productMatches)

      if (response.ok && response.data) {
        setPricedProducts(response.data.priced_products)
        setPriceProgress({
          current: response.data.priced_products.length,
          total: response.data.priced_products.length,
        })
        setSuccess(
          `${response.data.priced_products.length}개 상품의 가격이 계산되었습니다!`
        )
        // Auto-advance to step 4
        setTimeout(() => {
          setCurrentStep(4)
        }, 1500)
      } else {
        setError(response.error?.message || '가격 계산에 실패했습니다.')
        setCurrentStep(2)
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.')
      setCurrentStep(2)
    } finally {
      setLoading(false)
    }
  }

  // Step 4: Download Shopify CSV
  const handleDownloadCSV = async () => {
    if (selectedProducts.size === 0) {
      setError('다운로드할 상품을 선택해주세요.')
      return
    }

    setDownloading(true)
    setError(null)

    try {
      // Filter selected products and add Korean translations
      const selectedPricedProducts: ShopifyExportProduct[] = pricedProducts
        .filter((p) => selectedProducts.has(p.taobao_id))
        .map((p) => ({
          ...p,
          korean_title: translations.get(p.taobao_id) || '', // Add Korean translation
        }))

      // Generate and download CSV
      const blob = await exportShopifyCSV(selectedPricedProducts)
      downloadShopifyBlob(blob)

      setSuccess(`${selectedProducts.size}개 상품의 Shopify CSV 파일이 다운로드되었습니다!`)
    } catch (err: any) {
      setError(err.message || 'CSV 파일 생성에 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  // Product selection handlers
  const handleProductSelect = (taobaoId: string, match: ProductMatch) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taobaoId)) {
        newSet.delete(taobaoId)
      } else {
        newSet.add(taobaoId)
      }
      return newSet
    })

    setSelectedMatches((prev) => {
      const newMap = new Map(prev)
      if (newMap.has(taobaoId)) {
        newMap.delete(taobaoId)
      } else {
        newMap.set(taobaoId, match)
      }
      return newMap
    })
  }

  const handleSelectAll = () => {
    if (selectedProducts.size === pricedProducts.length) {
      setSelectedProducts(new Set())
      setSelectedMatches(new Map())
    } else {
      const allIds = new Set(pricedProducts.map((p) => p.taobao_id))
      setSelectedProducts(allIds)

      const allMatches = new Map<string, ProductMatch>()
      matches.forEach((match) => {
        if (allIds.has(match.best_match.taobao_id)) {
          allMatches.set(match.best_match.taobao_id, match)
        }
      })
      setSelectedMatches(allMatches)
    }
  }

  // Translation handler
  const handleTranslationChange = (taobaoId: string, translation: string) => {
    setTranslations((prev) => {
      const newMap = new Map(prev)
      newMap.set(taobaoId, translation)
      return newMap
    })
  }

  // Reset handler
  const handleReset = () => {
    if (
      confirm(
        '모든 데이터를 초기화하시겠습니까?\n(크롤링 결과, 매칭 데이터, 가격 계산 결과, 번역이 모두 삭제됩니다)'
      )
    ) {
      setSmartStoreProducts([])
      setMatches([])
      setPricedProducts([])
      setFailedProducts([])
      setSelectedProducts(new Set())
      setSelectedMatches(new Map())
      setTranslations(new Map())
      setCurrentStep(0)
      setError(null)
      setSuccess(null)
      clearShopifyState()
      clearShopifyTranslations()
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] py-6 px-8">
        <h1 className="text-3xl font-bold mb-2">🛍️ Shopify Discovery</h1>
        <p className="text-gray-400">
          네이버 쇼핑 → 타오바오 매칭 → Shopify CSV 생성
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        {/* Step Indicator */}
        <StepIndicator
          steps={[
            { number: 1, label: '검색', status: currentStep >= 1 ? 'completed' : 'pending' },
            { number: 2, label: '매칭', status: currentStep >= 2 ? (currentStep === 2 ? 'in-progress' : 'completed') : 'pending' },
            { number: 3, label: '가격계산', status: currentStep >= 3 ? (currentStep === 3 ? 'in-progress' : 'completed') : 'pending' },
            { number: 4, label: 'CSV 다운로드', status: currentStep === 4 ? 'in-progress' : 'pending' },
          ]}
        />

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-300">❌ {error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
            <p className="text-green-300">✅ {success}</p>
          </div>
        )}

        {/* Step 0: Input Form */}
        {currentStep === 0 && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🔍 검색 설정</h2>

            <div className="space-y-4">
              {/* Keyword */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  검색 키워드 *
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 청바지, 후드티"
                  className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Max Products */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  최대 상품 수
                </label>
                <input
                  type="number"
                  value={maxProducts}
                  onChange={(e) => setMaxProducts(parseInt(e.target.value) || 100)}
                  min={1}
                  max={1000}
                  className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    최소 가격 (원)
                  </label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(parseInt(e.target.value) || 0)}
                    min={0}
                    placeholder="0"
                    className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    최대 가격 (원)
                  </label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value) || 0)}
                    min={0}
                    placeholder="제한 없음"
                    className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartAnalysis}
                disabled={loading || !keyword.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? '검색 중...' : '🚀 검색 시작'}
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Crawling Progress */}
        {currentStep === 1 && (
          <AnalysisProgress
            title="네이버 쇼핑 검색 중..."
            current={crawlProgress.current}
            total={crawlProgress.total}
          />
        )}

        {/* Step 2: Matching Progress */}
        {currentStep === 2 && (
          <AnalysisProgress
            title="타오바오 상품 매칭 중..."
            current={matchProgress.current}
            total={matchProgress.total}
          />
        )}

        {/* Step 3: Price Calculation Progress */}
        {currentStep === 3 && (
          <AnalysisProgress
            title="가격 계산 중..."
            current={priceProgress.current}
            total={priceProgress.total}
          />
        )}

        {/* Step 4: Selection and Download */}
        {currentStep === 4 && pricedProducts.length > 0 && (
          <>
            {/* Action Bar */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {selectedProducts.size === pricedProducts.length
                    ? '전체 해제'
                    : '전체 선택'}
                </button>
                <span className="text-gray-400">
                  {selectedProducts.size} / {pricedProducts.length} 선택됨
                </span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleReset}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  🔄 초기화
                </button>
                <button
                  onClick={handleDownloadCSV}
                  disabled={selectedProducts.size === 0 || downloading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors"
                >
                  {downloading ? '생성 중...' : `📥 Shopify CSV 다운로드 (${selectedProducts.size}개)`}
                </button>
              </div>
            </div>

            {/* Product Selection Table */}
            <ProductSelectionTable
              matches={matches}
              pricedProducts={pricedProducts}
              selectedProducts={selectedProducts}
              onProductSelect={handleProductSelect}
              translations={translations}
              onTranslationChange={handleTranslationChange}
            />

            {/* Failed Products List */}
            {failedProducts.length > 0 && (
              <div className="mt-8">
                <FailedProductsList failedProducts={failedProducts} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
