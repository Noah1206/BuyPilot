'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Download, TrendingUp, Package, DollarSign, TruckIcon } from 'lucide-react'

interface Product {
  title: string
  price: number
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
  url?: string
}

interface AnalysisResult {
  store_url: string
  domain: string
  products: Product[]
  analyzed_at: string
}

export default function CompetitorAnalysisPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    if (!url) {
      setError('경쟁사 URL을 입력해주세요')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('http://localhost:4070/api/v1/competitor/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
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
      const response = await fetch('http://localhost:4070/api/v1/competitor/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: result.products,
          store_url: result.store_url,
          domain: result.domain
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
      a.download = `competitor_analysis_${new Date().getTime()}.xlsx`
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
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
            경쟁사 URL을 입력하면 상위 3개 상품을 분석하여 마진과 배송비를 자동 계산해드립니다
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
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="경쟁사 스토어 URL 입력 (쿠팡, 네이버 스마트스토어 등)"
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
            {/* Store Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">
                    {result.domain}
                  </h2>
                  <a
                    href={result.store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {result.store_url}
                  </a>
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
              {result.products.map((product, idx) => (
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
                          className="w-40 h-40 object-cover rounded-xl"
                        />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                              TOP {idx + 1}
                            </span>
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                              {product.category}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {product.title}
                          </h3>
                          {product.url && (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              상품 보기 →
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-bold ${getProfitColor(product.profit_rate)}`}>
                            {product.profit_rate.toFixed(1)}%
                          </div>
                          <div className="text-sm text-slate-600">마진율</div>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-slate-600" />
                            <div className="text-xs text-slate-600">경쟁사 가격</div>
                          </div>
                          <div className="text-lg font-bold text-slate-800">
                            {product.selling_price.toLocaleString()}원
                          </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-4 h-4 text-blue-600" />
                            <div className="text-xs text-blue-600">예상 원가</div>
                          </div>
                          <div className="text-lg font-bold text-blue-700">
                            {product.cost_price.toLocaleString()}원
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <TruckIcon className="w-4 h-4 text-purple-600" />
                            <div className="text-xs text-purple-600">배송비</div>
                          </div>
                          <div className="text-lg font-bold text-purple-700">
                            {product.shipping_cost.toLocaleString()}원
                          </div>
                          <div className="text-xs text-purple-600 mt-1">
                            {product.estimated_weight}kg
                          </div>
                        </div>

                        <div className={`rounded-lg p-3 ${getProfitBg(product.profit_rate)}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className={`w-4 h-4 ${getProfitColor(product.profit_rate)}`} />
                            <div className={`text-xs ${getProfitColor(product.profit_rate)}`}>예상 이익</div>
                          </div>
                          <div className={`text-lg font-bold ${getProfitColor(product.profit_rate)}`}>
                            {product.profit.toLocaleString()}원
                          </div>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <div className="text-sm font-medium text-slate-700 mb-1">
                          💡 추천 사항
                        </div>
                        <div className="text-sm text-slate-600">
                          {product.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

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
