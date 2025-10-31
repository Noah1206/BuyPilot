'use client'

import { useState, useEffect } from 'react'
import { X, Search, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react'

interface CategorySuggestion {
  category_id: string
  category_path: string
  confidence: number
  reason: string
}

interface CategorySelectionModalProps {
  isOpen: boolean
  productTitle: string
  onConfirm: (categoryId: string) => void
  onCancel: () => void
}

export default function CategorySelectionModal({
  isOpen,
  productTitle,
  onConfirm,
  onCancel
}: CategorySelectionModalProps) {
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Fetch AI suggestions when modal opens
  useEffect(() => {
    if (isOpen && productTitle) {
      fetchSuggestions()
    }
  }, [isOpen, productTitle])

  const fetchSuggestions = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/smartstore/suggest-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_data: {
            title: productTitle
          }
        })
      })

      const data = await response.json()

      if (data.ok && data.data.suggestions) {
        setSuggestions(data.data.suggestions)
        // Auto-select first suggestion if available
        if (data.data.suggestions.length > 0) {
          setSelectedCategory(data.data.suggestions[0].category_id)
        }
      } else {
        setError(data.error?.message || 'Failed to fetch category suggestions')
      }
    } catch (err) {
      console.error('Category suggestion error:', err)
      setError('Failed to fetch category suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (selectedCategory) {
      onConfirm(selectedCategory)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400'
    if (confidence >= 60) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500/10 border-green-500/20'
    if (confidence >= 60) return 'bg-yellow-500/10 border-yellow-500/20'
    return 'bg-orange-500/10 border-orange-500/20'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1117] border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              카테고리 선택
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              AI가 추천하는 카테고리를 선택하세요
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Info */}
        <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-700">
          <p className="text-sm text-slate-400">상품명</p>
          <p className="text-slate-100 font-medium mt-1">{productTitle}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400">AI가 카테고리를 분석하는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchSuggestions}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">추천 카테고리를 찾을 수 없습니다.</p>
              <p className="text-slate-500 text-sm mt-2">설정 페이지에서 기본 카테고리를 지정해주세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-300">AI 추천 카테고리</h3>
              </div>

              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.category_id}
                  onClick={() => setSelectedCategory(suggestion.category_id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedCategory === suggestion.category_id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Category Path */}
                      <div className="flex items-center gap-1 text-sm text-slate-300 mb-2">
                        {suggestion.category_path.split(' > ').map((part, idx, arr) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className={idx === arr.length - 1 ? 'font-semibold text-slate-100' : ''}>
                              {part}
                            </span>
                            {idx < arr.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Reason */}
                      <p className="text-sm text-slate-400 mt-2">
                        {suggestion.reason}
                      </p>
                    </div>

                    {/* Confidence Badge */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className={`px-3 py-1.5 rounded-full border ${getConfidenceBgColor(suggestion.confidence)}`}>
                        <span className={`text-xs font-semibold ${getConfidenceColor(suggestion.confidence)}`}>
                          {suggestion.confidence}%
                        </span>
                      </div>

                      {selectedCategory === suggestion.category_id && (
                        <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-700 bg-slate-800/30">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCategory || loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
