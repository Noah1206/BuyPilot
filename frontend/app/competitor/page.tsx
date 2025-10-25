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
  const [url, setUrl] = useState('')
  const [maxProducts, setMaxProducts] = useState(100)
  const [minSales, setMinSales] = useState(1000)

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

  // Step 1: Start analysis - Scrape SmartStore
  const handleStartAnalysis = async () => {
    if (!url.trim()) {
      setError('스마트스토어 URL을 입력해주세요.')
      return
    }

    if (!url.includes('smartstore.naver.com')) {
      setError('올바른 스마트스토어 URL이 아닙니다.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setCurrentStep(1)
    setCrawlProgress({ current: 0, total: maxProducts })

    try {
      const response = await analyzeCompetitor(url, maxProducts, minSales)

      if (response.ok && response.data) {
        setSmartStoreProducts(response.data.products)
        setCrawlProgress({
          current: response.data.products.length,
          total: response.data.products.length,
        })
        setSuccess(
          `${response.data.filtered_products}개 상품을 수집했습니다 (총 ${response.data.total_products}개 중 ${minSales}개 이상 구매 필터링)`
        )
        // Auto-advance to step 2
        setTimeout(() => {
          setCurrentStep(2)
          handleMatchTaobao(response.data!.products)
        }, 1500)
      } else {
        setError(response.error?.message || '크롤링에 실패했습니다.')
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
      // Filter priced products by selection
      const selectedPricedProducts = pricedProducts.filter((p) =>
        selectedProducts.has(p.taobao_id)
      )

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
      setUrl('')
      setError(null)
      setSuccess(null)
      clearAnalysisState()
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-48 bg-[#161b22] border-r border-[#30363d]">
        <div className="p-4">
          <div className="text-xl font-bold text-[#e6edf3] mb-6">BuyPilot</div>
          <div className="text-xs font-semibold text-[#8d96a0] uppercase tracking-wider mb-2">
            메뉴
          </div>
          <div className="space-y-1">
            <a
              href="/"
              className="block w-full text-left px-2 py-1 rounded text-xs text-[#8d96a0] hover:bg-[#21262d] transition-colors"
            >
              주문 관리
            </a>
            <a
              href="/products"
              className="block w-full text-left px-2 py-1 rounded text-xs text-[#8d96a0] hover:bg-[#21262d] transition-colors"
            >
              상품 관리
            </a>
            <a
              href="/competitor"
              className="block w-full text-left px-2 py-1 rounded text-xs bg-[#21262d] text-[#e6edf3] font-semibold"
            >
              경쟁사 분석
            </a>
          </div>
        </div>
      </aside>

      <div className="ml-48 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">경쟁사 분석</h1>
                <p className="text-[#8d96a0]">
                  스마트스토어 베스트 상품을 분석하고 타오바오에서 매칭되는 상품을 찾아보세요
                </p>
              </div>
              {currentStep > 0 && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#f85149] rounded-lg transition-colors text-sm"
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
            <div className="mb-6 px-4 py-3 bg-[#238636]/10 border border-[#238636] rounded-lg text-[#3fb950]">
              ✓ {success}
            </div>
          )}
          {error && (
            <div className="mb-6 px-4 py-3 bg-[#da3633]/10 border border-[#da3633] rounded-lg text-[#f85149]">
              ✕ {error}
            </div>
          )}

          {/* Step 0: Input Form */}
          {currentStep === 0 && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">분석 시작</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleStartAnalysis()
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="url" className="block text-sm font-medium mb-2">
                    스마트스토어 베스트 상품 페이지 URL *
                  </label>
                  <input
                    id="url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://smartstore.naver.com/판매자ID/best?cp=1"
                    className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
                    required
                  />
                  <p className="text-xs text-[#8d96a0] mt-1">
                    예: https://smartstore.naver.com/wg0057/best?cp=1
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="maxProducts" className="block text-sm font-medium mb-2">
                      최대 상품 수
                    </label>
                    <input
                      id="maxProducts"
                      type="number"
                      value={maxProducts}
                      onChange={(e) => setMaxProducts(parseInt(e.target.value) || 100)}
                      min="10"
                      max="200"
                      className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] focus:outline-none focus:border-[#1f6feb]"
                    />
                  </div>

                  <div>
                    <label htmlFor="minSales" className="block text-sm font-medium mb-2">
                      최소 구매수
                    </label>
                    <input
                      id="minSales"
                      type="number"
                      value={minSales}
                      onChange={(e) => setMinSales(parseInt(e.target.value) || 1000)}
                      min="0"
                      step="100"
                      className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] focus:outline-none focus:border-[#1f6feb]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !url}
                  className="w-full px-6 py-3 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-[#6e7681] disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {loading ? '분석 시작 중...' : '분석 시작'}
                </button>

                <div className="mt-4 p-4 bg-[#58a6ff]/10 border border-[#58a6ff] rounded-lg">
                  <p className="text-sm text-[#e6edf3]">
                    <strong>⏱️ 예상 소요 시간:</strong> 100개 상품 기준 약 8-12분
                  </p>
                  <ul className="mt-2 text-xs text-[#8d96a0] space-y-1 ml-4 list-disc">
                    <li>크롤링: 2-3분</li>
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
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
