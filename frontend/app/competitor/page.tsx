'use client'

import { useState, useEffect } from 'react'
import {
  analyzeCompetitor,
  matchTaobaoBatch,
  calculatePrices,
  exportExcel,
  downloadBlob,
  saveAnalysisState,
  loadAnalysisState,
  clearAnalysisState,
  saveTranslations,
  loadTranslations,
  clearTranslations,
  type SmartStoreProduct,
  type ProductMatch,
  type PricedProduct,
  type FailedProduct,
} from '@/lib/api-competitor'
import StepIndicator from '@/components/competitor/StepIndicator'
import AnalysisProgress from '@/components/competitor/AnalysisProgress'
import ProductSelectionTable from '@/components/competitor/ProductSelectionTable'
import FailedProductsList from '@/components/competitor/FailedProductsList'

export default function CompetitorAnalysisPage() {
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
    const savedTranslations = loadTranslations()
    if (savedTranslations.size > 0) {
      setTranslations(savedTranslations)
    }
  }, [])

  // Save translations when they change
  useEffect(() => {
    if (translations.size > 0) {
      saveTranslations(translations)
    }
  }, [translations])

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadAnalysisState()
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
        clearAnalysisState()
      }
    }
  }, [])

  // Save state when it changes
  useEffect(() => {
    if (smartstoreProducts.length > 0 || matches.length > 0 || pricedProducts.length > 0) {
      saveAnalysisState({
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
    console.log('🔍 Starting Taobao matching with products:', products.length)

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
      console.log('📤 Sending request to match-taobao-batch with', products.length, 'products')
      const response = await matchTaobaoBatch(products, 3)
      console.log('📥 Received response:', response)

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
        const errorMsg = response.error?.message || '타오바오 매칭에 실패했습니다.'
        const errorDetails = response.error?.details ? JSON.stringify(response.error.details) : ''
        console.error('❌ API Error:', response.error)
        setError(`${errorMsg}${errorDetails ? ` (${errorDetails})` : ''}`)
        setCurrentStep(1)
      }
    } catch (err: any) {
      console.error('❌ Network Error:', err)
      setError(err.message || '네트워크 오류가 발생했습니다.')
      setCurrentStep(1)
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Calculate prices
  const handleCalculatePrices = async (matchedProducts: ProductMatch[]) => {
    setLoading(true)
    setError(null)
    setCurrentStep(3)
    setPriceProgress({ current: 0, total: matchedProducts.length })

    try {
      // Prepare products for price calculation
      const productsForCalculation = matchedProducts.map((match) => ({
        title: match.smartstore_product.title,
        taobao_price_cny: match.best_match.price_cny,
        taobao_id: match.best_match.taobao_id,
        image_url: match.best_match.image_url,
        taobao_url: match.best_match.taobao_url,
        rating: match.best_match.rating,
        sold_count: match.best_match.sold_count,
      }))

      const response = await calculatePrices(productsForCalculation, 0.35)

      if (response.ok && response.data) {
        setPricedProducts(response.data.products)
        setPriceProgress({
          current: response.data.products.length,
          total: matchedProducts.length,
        })
        setSuccess(
          `${response.data.products.length}개 상품의 가격을 계산했습니다 (환율: ${response.data.exchange_rate.toFixed(1)}원)`
        )

        // Auto-select all best matches
        const autoSelected = new Set<string>()
        const autoMatchMap = new Map<string, ProductMatch>()
        matchedProducts.forEach((match) => {
          autoSelected.add(match.best_match.taobao_id)
          autoMatchMap.set(match.best_match.taobao_id, match)
        })
        setSelectedProducts(autoSelected)
        setSelectedMatches(autoMatchMap)

        // Move to step 4
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

  // Toggle product selection
  const handleToggleSelect = (taobaoId: string, match: ProductMatch) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taobaoId)) {
        newSet.delete(taobaoId)
        setSelectedMatches((prevMap) => {
          const newMap = new Map(prevMap)
          newMap.delete(taobaoId)
          return newMap
        })
      } else {
        newSet.add(taobaoId)
        setSelectedMatches((prevMap) => {
          const newMap = new Map(prevMap)
          newMap.set(taobaoId, match)
          return newMap
        })
      }
      return newSet
    })
  }

  // Select all
  const handleSelectAll = () => {
    const allIds = new Set<string>()
    const allMatches = new Map<string, ProductMatch>()
    matches.forEach((match) => {
      allIds.add(match.best_match.taobao_id)
      allMatches.set(match.best_match.taobao_id, match)
    })
    setSelectedProducts(allIds)
    setSelectedMatches(allMatches)
  }

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedProducts(new Set())
    setSelectedMatches(new Map())
  }

  // Download Excel
  const handleDownloadExcel = async () => {
    if (selectedProducts.size === 0) {
      setError('다운로드할 상품을 선택해주세요.')
      return
    }

    setDownloading(true)
    setError(null)

    try {
      // Filter priced products by selection and add translations
      const selectedPricedProducts = pricedProducts
        .filter((p) => selectedProducts.has(p.taobao_id))
        .map((p) => ({
          ...p,
          korean_title: translations.get(p.taobao_id) || '', // Add Korean translation
        }))

      const response = await exportExcel(selectedPricedProducts)

      if (response.ok && response.blob && response.filename) {
        downloadBlob(response.blob, response.filename)
        setSuccess(`${selectedProducts.size}개 상품을 Excel로 다운로드했습니다!`)
      } else {
        setError(response.error?.message || 'Excel 다운로드에 실패했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  // Handle translation change
  const handleTranslationChange = (taobaoId: string, translation: string) => {
    setTranslations((prev) => {
      const newMap = new Map(prev)
      newMap.set(taobaoId, translation)
      return newMap
    })
  }

  // Reset analysis
  const handleReset = () => {
    if (confirm('분석을 처음부터 다시 시작하시겠습니까?')) {
      setCurrentStep(0)
      setSmartStoreProducts([])
      setMatches([])
      setPricedProducts([])
      setFailedProducts([])
      setSelectedProducts(new Set())
      setSelectedMatches(new Map())
      setTranslations(new Map())
      setKeyword('')
      setError(null)
      setSuccess(null)
      clearAnalysisState()
      clearTranslations()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                BuyPilot
              </span>
            </a>

            <div className="hidden md:flex items-center gap-1">
              <a href="/" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                홈
              </a>
              <a href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                주문 관리
              </a>
              <a href="/products" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                상품 관리
              </a>
              <a href="/competitor" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                경쟁사 분석
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">경쟁사 상품 분석</h1>
                <p className="text-slate-600">
                  네이버 쇼핑 인기 상품을 검색하고 타오바오에서 매칭되는 상품을 찾아보세요
                </p>
              </div>
              {currentStep > 0 && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-600 rounded-xl transition-all text-sm font-semibold"
                >
                  처음부터 다시
                </button>
              )}
            </div>
          </div>

          {/* Step Indicator */}
          {currentStep > 0 && <StepIndicator currentStep={currentStep} />}

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span className="font-medium">{success}</span>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-6 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Step 0: Input Form */}
          {currentStep === 0 && (
            <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-3xl border-2 border-purple-100 shadow-xl shadow-purple-100/50 p-8 hover:shadow-2xl hover:shadow-purple-200/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">상품 검색</h2>
                  <p className="text-sm text-slate-500">네이버 쇼핑에서 인기 상품을 찾아보세요</p>
                </div>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleStartAnalysis()
                }}
                className="space-y-6"
              >
                <div className="group">
                  <label htmlFor="keyword" className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    검색 키워드 *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-10 blur transition-opacity duration-300"></div>
                    <input
                      id="keyword"
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="예: 청바지, 맨투맨, 운동화"
                      className="relative w-full px-6 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 ml-2 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    카테고리나 상품명을 입력하세요
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="group">
                    <label htmlFor="maxProducts" className="block text-sm font-bold text-slate-700 mb-3">
                      최대 상품 수
                    </label>
                    <div className="relative">
                      <input
                        id="maxProducts"
                        type="number"
                        value={maxProducts}
                        onChange={(e) => setMaxProducts(parseInt(e.target.value) || 100)}
                        min="10"
                        max="100"
                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 focus:bg-white transition-all duration-200 font-semibold"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        개
                      </div>
                    </div>
                  </div>

                  <div className="group">
                    <label htmlFor="minPrice" className="block text-sm font-bold text-slate-700 mb-3">
                      최소 가격
                    </label>
                    <div className="relative">
                      <input
                        id="minPrice"
                        type="number"
                        value={minPrice || ''}
                        onChange={(e) => setMinPrice(parseInt(e.target.value) || 0)}
                        min="0"
                        step="1000"
                        placeholder="0"
                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 focus:bg-white transition-all duration-200 font-semibold"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        원
                      </div>
                    </div>
                  </div>

                  <div className="group">
                    <label htmlFor="maxPrice" className="block text-sm font-bold text-slate-700 mb-3">
                      최대 가격
                    </label>
                    <div className="relative">
                      <input
                        id="maxPrice"
                        type="number"
                        value={maxPrice || ''}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value) || 0)}
                        min="0"
                        step="1000"
                        placeholder="제한없음"
                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 focus:bg-white transition-all duration-200 font-semibold"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        원
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !keyword}
                  className="group w-full px-8 py-5 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 hover:from-purple-700 hover:via-pink-600 hover:to-red-600 disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl shadow-2xl shadow-purple-500/50 hover:shadow-3xl hover:shadow-purple-600/50 hover:scale-105 disabled:hover:scale-100 transition-all duration-200"
                >
                  {loading ? '검색 중...' : '검색 시작'}
                </button>

                <div className="mt-4 p-4 bg-[#58a6ff]/10 border border-[#58a6ff] rounded-lg">
                  <p className="text-sm text-[#e6edf3]">
                    <strong>⏱️ 예상 소요 시간:</strong> 100개 상품 기준 약 6-10분
                  </p>
                  <ul className="mt-2 text-xs text-[#8d96a0] space-y-1 ml-4 list-disc">
                    <li>상품 검색: 5-10초</li>
                    <li>타오바오 매칭: 5-8분 (가장 오래 걸림)</li>
                    <li>가격 계산: 10초</li>
                  </ul>
                </div>
              </form>
            </div>
          )}

          {/* Step 1: Crawling Progress */}
          {currentStep === 1 && loading && (
            <AnalysisProgress step={1} progress={crawlProgress} />
          )}

          {/* Step 2: Matching Progress */}
          {currentStep === 2 && loading && (
            <AnalysisProgress
              step={2}
              progress={matchProgress}
              message={`${matchProgress.current}/${matchProgress.total} 상품 처리 중...`}
            />
          )}

          {/* Step 3: Price Calculation Progress */}
          {currentStep === 3 && loading && (
            <AnalysisProgress step={3} progress={priceProgress} />
          )}

          {/* Step 4: Product Selection and Download */}
          {currentStep === 4 && !loading && (
            <div className="space-y-6">
              {/* Download Section */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">상품 선택 및 다운로드</h2>
                    <p className="text-sm text-[#8d96a0]">
                      원하는 상품을 선택하고 Excel 파일로 다운로드하세요
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadExcel}
                    disabled={downloading || selectedProducts.size === 0}
                    className="px-6 py-3 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-[#6e7681] disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {downloading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        다운로드 중...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Excel 다운로드 ({selectedProducts.size}개)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Failed Products List */}
              {failedProducts.length > 0 && (
                <FailedProductsList failedProducts={failedProducts} />
              )}

              {/* Product Selection Table */}
              <ProductSelectionTable
                matches={matches}
                pricedProducts={pricedProducts}
                selectedProducts={selectedProducts}
                translations={translations}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onTranslationChange={handleTranslationChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
