'use client'

import { useState, useEffect } from 'react'
import {
  searchAmazonProducts,
  exportAmazonToShopify,
  downloadShopifyCSV,
  saveAmazonProducts,
  loadAmazonProducts,
  clearAmazonProducts,
  saveAmazonTranslations,
  loadAmazonTranslations,
  clearAmazonTranslations,
  translateAmazonTitle,
  type AmazonProduct,
} from '@/lib/api-amazon'
import { Search, Download, RefreshCw } from 'lucide-react'
import TranslationButton from '@/components/competitor/TranslationButton'
import TranslationEditor from '@/components/competitor/TranslationEditor'

export default function AmazonToShopifyPage() {
  // UI State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Search Input
  const [keyword, setKeyword] = useState('')
  const [maxResults, setMaxResults] = useState(20)
  const [minPrice, setMinPrice] = useState<number | undefined>()
  const [maxPrice, setMaxPrice] = useState<number | undefined>()

  // Results
  const [products, setProducts] = useState<AmazonProduct[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())

  // Translations: ASIN → Korean title
  const [translations, setTranslations] = useState<Map<string, string>>(new Map())

  // Download state
  const [downloading, setDownloading] = useState(false)

  // Load saved data on mount
  useEffect(() => {
    const savedProducts = loadAmazonProducts()
    if (savedProducts && savedProducts.products.length > 0) {
      const shouldRestore = confirm(
        `이전 검색 결과가 있습니다 ("${savedProducts.keyword}").\n불러올까요?`
      )
      if (shouldRestore) {
        setProducts(savedProducts.products)
        setKeyword(savedProducts.keyword)
        setSuccess(`이전 검색 결과를 불러왔습니다 (${savedProducts.products.length}개 상품)`)
      } else {
        clearAmazonProducts()
      }
    }

    const savedTranslations = loadAmazonTranslations()
    if (savedTranslations.size > 0) {
      setTranslations(savedTranslations)
    }
  }, [])

  // Save products when they change
  useEffect(() => {
    if (products.length > 0 && keyword) {
      saveAmazonProducts(products, keyword)
    }
  }, [products, keyword])

  // Save translations when they change
  useEffect(() => {
    if (translations.size > 0) {
      saveAmazonTranslations(translations)
    }
  }, [translations])

  // Search Amazon
  const handleSearch = async () => {
    if (!keyword.trim()) {
      setError('검색 키워드를 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setProducts([])
    setSelectedProducts(new Set())

    try {
      const response = await searchAmazonProducts(keyword, maxResults, minPrice, maxPrice)

      if (response.ok && response.data) {
        setProducts(response.data.products)
        setSuccess(`"${keyword}" 검색 결과: ${response.data.total}개 상품 발견`)
      } else {
        setError(response.error?.message || 'Amazon 검색에 실패했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // Toggle product selection
  const toggleProductSelection = (asin: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(asin)) {
        newSet.delete(asin)
      } else {
        newSet.add(asin)
      }
      return newSet
    })
  }

  // Select all / Deselect all
  const handleToggleAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map((p) => p.asin)))
    }
  }

  // Translation handler
  const handleTranslate = async (asin: string, title: string) => {
    try {
      const response = await translateAmazonTitle(title)
      if (response.ok && response.data) {
        setTranslations((prev) => {
          const newMap = new Map(prev)
          newMap.set(asin, response.data!.translated)
          return newMap
        })
      } else {
        throw new Error(response.error?.message || '번역 실패')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleTranslationChange = (asin: string, translation: string) => {
    setTranslations((prev) => {
      const newMap = new Map(prev)
      newMap.set(asin, translation)
      return newMap
    })
  }

  // Download Shopify CSV
  const handleDownloadCSV = async () => {
    if (selectedProducts.size === 0) {
      setError('다운로드할 상품을 선택해주세요.')
      return
    }

    setDownloading(true)
    setError(null)

    try {
      // Add Korean titles to selected products
      const selectedProductsData = products
        .filter((p) => selectedProducts.has(p.asin))
        .map((p) => ({
          ...p,
          korean_title: translations.get(p.asin) || p.title,
        }))

      const blob = await exportAmazonToShopify(selectedProductsData)
      downloadShopifyCSV(blob)

      setSuccess(`${selectedProducts.size}개 상품의 Shopify CSV가 다운로드되었습니다!`)
    } catch (err: any) {
      setError(err.message || 'CSV 생성에 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  // Reset all
  const handleReset = () => {
    if (confirm('모든 데이터를 초기화하시겠습니까?')) {
      setProducts([])
      setSelectedProducts(new Set())
      setTranslations(new Map())
      setKeyword('')
      setError(null)
      setSuccess(null)
      clearAmazonProducts()
      clearAmazonTranslations()
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] py-6 px-8">
        <h1 className="text-3xl font-bold mb-2">🛒 Amazon → Shopify</h1>
        <p className="text-gray-400">
          Amazon 상품 검색 → 한글 번역 → Shopify CSV 다운로드
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
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

        {/* Search Form */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Amazon 상품 검색</h2>

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
                placeholder="예: wireless headphones, yoga mat"
                className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Max Results */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                최대 상품 수
              </label>
              <input
                type="number"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value) || 20)}
                min={1}
                max={100}
                className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  최소 가격 (USD)
                </label>
                <input
                  type="number"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="0"
                  className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  최대 가격 (USD)
                </label>
                <input
                  type="number"
                  value={maxPrice || ''}
                  onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="제한 없음"
                  className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={loading || !keyword.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  검색 중...
                </>
              ) : (
                <>
                  <Search size={20} />
                  검색 시작
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {products.length > 0 && (
          <>
            {/* Action Bar */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleToggleAll}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {selectedProducts.size === products.length ? '전체 해제' : '전체 선택'}
                </button>
                <span className="text-gray-400">
                  {selectedProducts.size} / {products.length} 선택됨
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
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  {downloading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Shopify CSV 다운로드 ({selectedProducts.size}개)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.asin}
                  className={`bg-[#161b22] border rounded-lg overflow-hidden transition-all ${
                    selectedProducts.has(product.asin)
                      ? 'border-blue-500 shadow-lg'
                      : 'border-[#30363d] hover:border-gray-600'
                  }`}
                >
                  {/* Product Image */}
                  <div className="relative">
                    {product.main_image ? (
                      <img
                        src={product.main_image}
                        alt={product.title}
                        className="w-full h-48 object-contain bg-white"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-800 flex items-center justify-center">
                        <span className="text-gray-500">No Image</span>
                      </div>
                    )}

                    {/* Checkbox */}
                    <div className="absolute top-2 right-2">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.asin)}
                        onChange={() => toggleProductSelection(product.asin)}
                        className="w-5 h-5 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    {/* Title */}
                    <h3 className="text-sm font-medium text-white mb-2 line-clamp-2">
                      {product.title}
                    </h3>

                    {/* Price & Rating */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-blue-400">
                        {product.price ? `$${product.price.toFixed(2)}` : 'N/A'}
                      </span>
                      {product.rating && (
                        <span className="text-sm text-yellow-400">
                          ⭐ {product.rating} ({product.review_count?.toLocaleString() || 0})
                        </span>
                      )}
                    </div>

                    {/* ASIN */}
                    <div className="text-xs text-gray-500 mb-3">ASIN: {product.asin}</div>

                    {/* Translation Section */}
                    {selectedProducts.has(product.asin) && (
                      <div className="mt-4 pt-4 border-t border-[#30363d]">
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">한글 제목 번역</h4>

                        {!translations.get(product.asin) ? (
                          <TranslationButton
                            title={product.title}
                            onTranslate={(translated) => handleTranslationChange(product.asin, translated)}
                            size="sm"
                          />
                        ) : (
                          <TranslationEditor
                            original={product.title}
                            translated={translations.get(product.asin) || null}
                            onSave={(newTranslation) => handleTranslationChange(product.asin, newTranslation)}
                          />
                        )}
                      </div>
                    )}

                    {/* View on Amazon */}
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Amazon에서 보기 →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <p>검색 키워드를 입력하고 Amazon 상품을 찾아보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
