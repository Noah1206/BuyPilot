'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Download, TrendingUp, Package, DollarSign, TruckIcon, ExternalLink, Copy, ArrowLeft } from 'lucide-react'

interface Product {
  title: string
  price: number
  url: string
  category: string
  estimated_weight: number
  cost_price: number
  shipping_cost: number
  total_cost: number
  selling_price: number
  profit: number
  profit_rate: number
  recommendation: string
  status: string
  image_url?: string
  store_name?: string
  rank: number
}

interface AnalysisResult {
  keyword: string
  total_found: number
  products: Product[]
  analyzed_at: string
}

export default function CompetitorAnalysisPage() {
  const [keyword, setKeyword] = useState('')
  const [count, setCount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100

  // Use Railway URL in production, localhost in development
  const API_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? window.location.origin
    : 'http://localhost:4070'

  // Load saved results on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedResult = localStorage.getItem('competitor_analysis_result')
      const savedKeyword = localStorage.getItem('competitor_analysis_keyword')
      const savedCount = localStorage.getItem('competitor_analysis_count')

      if (savedResult) {
        try {
          setResult(JSON.parse(savedResult))
          if (savedKeyword) setKeyword(savedKeyword)
          if (savedCount) setCount(parseInt(savedCount))
        } catch (e) {
          console.error('Failed to load saved results:', e)
        }
      }
    }
  }, [])

  // Save results to localStorage whenever they change
  useEffect(() => {
    if (result && typeof window !== 'undefined') {
      localStorage.setItem('competitor_analysis_result', JSON.stringify(result))
      localStorage.setItem('competitor_analysis_keyword', keyword)
      localStorage.setItem('competitor_analysis_count', count.toString())
    }
  }, [result, keyword, count])

  const handleAnalyze = async () => {
    if (!keyword) {
      setError('검색 키워드를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setCurrentPage(1) // Reset to first page on new search

    try {
      const response = await fetch(`${API_URL}/api/v1/competitor/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, count })
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(data.error?.message || '분석에 실패했습니다')
      }

      setResult(data.data)
    } catch (err: any) {
      setError(err.message || '분석 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!result) return

    try {
      const response = await fetch(`${API_URL}/api/v1/competitor/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: result.products,
          keyword: result.keyword
        })
      })

      if (!response.ok) {
        throw new Error('엑셀 다운로드에 실패했습니다')
      }

      // Download file
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `competitor_analysis_${result.keyword}_${new Date().getTime()}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message || '엑셀 다운로드 중 오류가 발생했습니다')
    }
  }

  const getProfitColor = (rate: number) => {
    if (rate >= 20) return 'text-green-600'
    if (rate >= 15) return 'text-blue-600'
    if (rate >= 10) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProfitBg = (rate: number) => {
    if (rate >= 20) return 'bg-green-50 border-green-200'
    if (rate >= 15) return 'bg-blue-50 border-blue-200'
    if (rate >= 10) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      alert('URL이 복사되었습니다!')
    } catch (err) {
      alert('URL 복사에 실패했습니다')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all text-slate-700 hover:text-blue-600"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">홈으로</span>
          </a>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            경쟁사 분석
          </h1>
          <p className="text-slate-600">
            상품 키워드와 분석할 제품 개수를 입력하면 네이버 쇼핑 상위 제품들을 분석하여 마진과 배송비를 자동 계산해드립니다
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="검색 키워드 입력 (예: 캠핑용 화로, 공구)"
                className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="w-32 relative">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(9999, parseInt(e.target.value) || 3)))}
                min="1"
                max="9999"
                placeholder="개수"
                className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  분석 시작
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}
        </motion.div>

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Keyword Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">
                    "{result.keyword}" 검색 결과
                  </h2>
                  <p className="text-sm text-slate-600">
                    상위 {result.products.length}개 제품 분석 완료
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  엑셀 다운로드
                </button>
              </div>
            </div>

            {/* Products */}
            <div className="space-y-6">
              {result.products
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((product, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className={`bg-white rounded-2xl shadow-lg p-6 border-2 ${getProfitBg(product.profit_rate)}`}
                >
                  <div className="flex gap-6">
                    {/* Product Image */}
                    {product.image_url && (
                      <div className="flex-shrink-0">
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              TOP {product.rank}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                              {product.category}
                            </span>
                            {product.store_name && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                {product.store_name}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-800 mb-1">
                            {product.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              상품 보기 <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              onClick={() => copyToClipboard(product.url)}
                              className="text-sm text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors"
                              title="URL 복사"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getProfitColor(product.profit_rate)}`}>
                            {product.profit_rate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-600">마진율</div>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <div className="flex items-center gap-1 mb-0.5">
                            <DollarSign className="w-3 h-3 text-slate-600" />
                            <div className="text-xs text-slate-600">경쟁사 가격</div>
                          </div>
                          <div className="text-sm font-bold text-slate-800">
                            {product.selling_price.toLocaleString()}원
                          </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-2">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Package className="w-3 h-3 text-blue-600" />
                            <div className="text-xs text-blue-600">예상 원가</div>
                          </div>
                          <div className="text-sm font-bold text-blue-700">
                            {product.cost_price.toLocaleString()}원
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-2">
                          <div className="flex items-center gap-1 mb-0.5">
                            <TruckIcon className="w-3 h-3 text-purple-600" />
                            <div className="text-xs text-purple-600">배송비</div>
                          </div>
                          <div className="text-sm font-bold text-purple-700">
                            {product.shipping_cost.toLocaleString()}원
                          </div>
                          <div className="text-xs text-purple-600 mt-0.5">
                            {product.estimated_weight}kg
                          </div>
                        </div>

                        <div className={`rounded-lg p-2 ${getProfitBg(product.profit_rate)}`}>
                          <div className="flex items-center gap-1 mb-0.5">
                            <TrendingUp className={`w-3 h-3 ${getProfitColor(product.profit_rate)}`} />
                            <div className={`text-xs ${getProfitColor(product.profit_rate)}`}>예상 이익</div>
                          </div>
                          <div className={`text-sm font-bold ${getProfitColor(product.profit_rate)}`}>
                            {product.profit.toLocaleString()}원
                          </div>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="bg-white rounded-lg p-2 border border-slate-200">
                        <div className="text-xs font-medium text-slate-700 mb-0.5">
                          💡 추천 사항
                        </div>
                        <div className="text-xs text-slate-600">
                          {product.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {result.products.length > itemsPerPage && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  이전
                </button>

                {Array.from({ length: Math.ceil(result.products.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border-2 border-slate-200 hover:border-blue-500'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(result.products.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(result.products.length / itemsPerPage)}
                  className="px-4 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  다음
                </button>
              </div>
            )}

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 mt-6 text-white"
            >
              <h3 className="text-xl font-bold mb-4">분석 요약</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-sm opacity-90 mb-1">평균 마진율</div>
                  <div className="text-2xl font-bold">
                    {(result.products.reduce((sum, p) => sum + p.profit_rate, 0) / result.products.length).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm opacity-90 mb-1">평균 이익</div>
                  <div className="text-2xl font-bold">
                    {Math.round(result.products.reduce((sum, p) => sum + p.profit, 0) / result.products.length).toLocaleString()}원
                  </div>
                </div>
                <div>
                  <div className="text-sm opacity-90 mb-1">수익성 있는 상품</div>
                  <div className="text-2xl font-bold">
                    {result.products.filter(p => p.profit > 0).length}/{result.products.length}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
