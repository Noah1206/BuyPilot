/**
 * Products page - Product management interface
 * HeySeller inspired clean design
 */

'use client'

import { useState, useEffect } from 'react'
import { importProduct, getProducts, deleteProduct, updateProduct } from '@/lib/api'
import Header from '@/components/Header'
import { Plus, Search, RefreshCw, Trash2, ExternalLink, Edit, Check, AlertCircle, ChevronLeft, ChevronRight, Package } from 'lucide-react'

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
      <Header />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">상품 관리</h1>
          <p className="text-slate-600">{total}개의 등록된 상품</p>
        </div>

        {/* Import form */}
        <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-3xl border-2 border-blue-100 shadow-lg shadow-blue-100/50 p-8 mb-8 hover:shadow-xl hover:shadow-blue-200/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <Plus size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">타오바오 상품 가져오기</h2>
              <p className="text-sm text-slate-500">상품 URL을 입력하면 자동으로 정보를 가져옵니다</p>
            </div>
          </div>
          <form onSubmit={handleImport} className="flex gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-10 blur transition-opacity duration-300"></div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://item.taobao.com/item.htm?id=..."
                className="relative w-full px-6 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-400 bg-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-600/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
            >
              {loading ? (
                <>
                  <RefreshCw size={22} className="animate-spin" />
                  <span>가져오는 중...</span>
                </>
              ) : (
                <>
                  <Plus size={22} className="group-hover:rotate-90 transition-transform duration-200" />
                  <span>가져오기</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Search */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-lg p-8 mb-8 hover:shadow-xl transition-all duration-300">
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search size={22} className="text-slate-400 group-hover:text-blue-500 transition-colors duration-200" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품명으로 검색..."
                className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-400 bg-slate-50 hover:bg-white hover:shadow-md"
              />
            </div>
            <button
              onClick={() => loadProducts()}
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold bg-white text-slate-700 border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 hover:shadow-lg transition-all duration-200"
            >
              <RefreshCw size={22} className="group-hover:rotate-180 transition-transform duration-500" />
              <span>새로고침</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {products.map((product) => {
                const imageUrl = getValidImageUrl(product)
                const krwPrice = Math.round((product.price || 0) * 200)

                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-3xl border-2 border-slate-200 overflow-hidden hover:shadow-2xl hover:border-blue-400 hover:-translate-y-2 transition-all duration-300"
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={64} className="text-slate-300 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                      )}

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      {/* Source badge */}
                      <div className="absolute top-4 left-4 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
                        {product.source === 'taobao' ? '타오바오' : product.source}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 line-clamp-2 min-h-[3.5rem] group-hover:text-blue-600 transition-colors">
                        {product.title}
                      </h3>

                      {/* Price */}
                      <div className="mb-5 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            ₩{krwPrice.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mt-1 font-medium">
                          ¥{(product.price || 0).toLocaleString()} <span className="text-slate-400">원가</span>
                        </div>
                      </div>

                      {/* Options preview */}
                      {product.data?.options && product.data.options.length > 0 && (
                        <div className="mb-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">옵션 정보</div>
                          </div>
                          <div className="space-y-2">
                            {product.data.options.slice(0, 2).map((option: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="font-semibold text-slate-700">{option.name}</span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                                  {option.values?.length || 0}개
                                </span>
                              </div>
                            ))}
                            {product.data.options.length > 2 && (
                              <div className="text-xs text-blue-600 font-bold pt-2 border-t border-slate-200">
                                +{product.data.options.length - 2}개 옵션 더보기
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        <a
                          href={product.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/link flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white shadow-sm hover:shadow-lg transition-all duration-200"
                        >
                          <ExternalLink size={18} className="group-hover/link:rotate-45 transition-transform duration-200" />
                          원본 보기
                        </a>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="group/delete px-5 py-3.5 rounded-2xl text-sm font-bold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white shadow-sm hover:shadow-lg transition-all duration-200"
                          title="삭제"
                        >
                          <Trash2 size={18} className="group-hover/delete:scale-110 transition-transform duration-200" />
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
