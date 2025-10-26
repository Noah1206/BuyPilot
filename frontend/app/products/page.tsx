/**
 * Products page - Product management interface
 * HeySeller inspired clean design
 */

'use client'

import { useState, useEffect } from 'react'
import { importProduct, getProducts, deleteProduct, updateProduct } from '@/lib/api'
import { Plus, Search, RefreshCw, Trash2, ExternalLink, Home, Package, TrendingUp, Edit, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

interface Product {
  id: string
  source: string
  source_url: string
  supplier_id?: string
  title: string
  price: number
  currency: string
  stock?: number
  image_url?: string
  score?: number
  data: any
  created_at: string
  updated_at: string
}

export default function ProductsPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const limit = 12

  useEffect(() => {
    loadProducts()
  }, [page, searchQuery])

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type })
    setTimeout(() => setShowToast(null), 3000)
  }

  const loadProducts = async () => {
    const response = await getProducts({
      search: searchQuery || undefined,
      limit,
      offset: page * limit,
    })

    if (response.ok && response.data) {
      setProducts(response.data.products)
      setTotal(response.data.total)
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await importProduct(url)

      if (response.ok && response.data) {
        if (response.data.already_exists) {
          toast('상품이 이미 등록되어 있습니다.', 'error')
        } else {
          toast('상품을 성공적으로 가져왔습니다!')
        }
        setUrl('')
        loadProducts()
      } else {
        toast(response.error?.message || '상품 가져오기 실패', 'error')
      }
    } catch (err) {
      toast('네트워크 오류가 발생했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return

    const response = await deleteProduct(productId)
    if (response.ok) {
      toast('상품이 삭제되었습니다.')
      loadProducts()
    } else {
      toast(response.error?.message || '상품 삭제 실패', 'error')
    }
  }

  const getValidImageUrl = (product: Product): string => {
    // Try image_url first
    if (product.image_url && !product.image_url.startsWith('blob:')) {
      return product.image_url.startsWith('//') ? `https:${product.image_url}` : product.image_url
    }

    // Try images array
    if (product.data?.images && Array.isArray(product.data.images) && product.data.images.length > 0) {
      const firstImage = product.data.images[0]
      if (firstImage && !firstImage.startsWith('blob:')) {
        return firstImage.startsWith('//') ? `https:${firstImage}` : firstImage
      }
    }

    return ''
  }

  const totalPages = Math.ceil(total / limit)

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
                <Home size={18} />
                홈
              </a>
              <a href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all">
                <Package size={18} />
                주문 관리
              </a>
              <a href="/products" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-sm">
                <Package size={18} />
                상품 관리
              </a>
              <a href="/competitor" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all">
                <TrendingUp size={18} />
                경쟁사 분석
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">상품 관리</h1>
          <p className="text-slate-600">{total}개의 등록된 상품</p>
        </div>

        {/* Import form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">타오바오 상품 가져오기</h2>
          <form onSubmit={handleImport} className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="타오바오 상품 URL을 입력하세요"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:outline-none transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  가져오는 중...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  상품 가져오기
                </>
              )}
            </button>
          </form>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품명으로 검색..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={() => loadProducts()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <RefreshCw size={20} />
              새로고침
            </button>
          </div>
        </div>

        {/* Products grid */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border-2 border-dashed border-slate-300">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <Package size={40} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">상품이 없습니다</h3>
            <p className="text-slate-600 mb-6">타오바오에서 상품을 가져와보세요</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {products.map((product) => {
                const imageUrl = getValidImageUrl(product)
                const krwPrice = Math.round(product.price * 200)

                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-300"
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-slate-100 overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={64} className="text-slate-300" />
                        </div>
                      )}

                      {/* Source badge */}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-slate-700">
                        {product.source === 'taobao' ? '타오바오' : product.source}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-base font-semibold text-slate-900 mb-3 line-clamp-2 min-h-[3rem]">
                        {product.title}
                      </h3>

                      {/* Price */}
                      <div className="mb-4">
                        <div className="text-2xl font-bold text-slate-900 mb-1">
                          ₩{krwPrice.toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-500">
                          ¥{product.price.toLocaleString()} (타오바오)
                        </div>
                      </div>

                      {/* Options preview */}
                      {product.data?.options && product.data.options.length > 0 && (
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs font-semibold text-slate-700 mb-2">옵션</div>
                          <div className="space-y-1">
                            {product.data.options.slice(0, 2).map((option: any, idx: number) => (
                              <div key={idx} className="text-xs text-slate-600">
                                <span className="font-medium">{option.name}:</span>{' '}
                                {option.values?.length || 0}개
                              </div>
                            ))}
                            {product.data.options.length > 2 && (
                              <div className="text-xs text-blue-600 font-medium">
                                +{product.data.options.length - 2}개 더
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <a
                          href={product.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                        >
                          <ExternalLink size={16} />
                          원본 보기
                        </a>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={18} />
                  이전
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(0, Math.min(page - 2 + i, totalPages - 1))
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                          page === pageNum
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                            : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  다음
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Toast */}
      {showToast && (
        <div
          className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl animate-slide-up ${
            showToast.type === 'success'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
              : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            {showToast.type === 'success' ? (
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <Check size={16} />
              </div>
            ) : (
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <AlertCircle size={16} />
              </div>
            )}
            <span className="font-medium">{showToast.message}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
