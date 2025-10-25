'use client'

import { useState, useEffect } from 'react'
import { importProduct, getProducts, deleteProduct, updateProduct } from '@/lib/api'
import ImageEditor from '@/components/ImageEditor'

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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingImage, setEditingImage] = useState<{ productId: string; imageUrl: string } | null>(null)
  const limit = 12

  // Load products on mount and when page changes
  useEffect(() => {
    loadProducts()
  }, [page, searchQuery])

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
    setError(null)
    setSuccess(null)

    try {
      const response = await importProduct(url)

      if (response.ok && response.data) {
        if (response.data.already_exists) {
          setSuccess('상품이 이미 등록되어 있습니다.')
        } else {
          setSuccess('상품을 성공적으로 가져왔습니다!')
        }
        setUrl('')
        loadProducts() // Reload list
      } else {
        setError(response.error?.message || '상품 가져오기 실패')
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return

    const response = await deleteProduct(productId)
    if (response.ok) {
      setSuccess('상품이 삭제되었습니다.')
      loadProducts()
    } else {
      setError(response.error?.message || '상품 삭제 실패')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0) // Reset to first page
    loadProducts()
  }

  const handleEditImage = (productId: string, imageUrl: string) => {
    setEditingImage({ productId, imageUrl })
  }

  const handleSaveImage = async (editedImageUrl: string) => {
    if (!editingImage) return

    // In production, upload to Supabase Storage here
    // For now, just update the product with the edited image URL
    const response = await updateProduct(editingImage.productId, {
      image_url: editedImageUrl,
      data: {
        edited: true,
        edited_at: new Date().toISOString(),
      },
    })

    if (response.ok) {
      setSuccess('이미지가 저장되었습니다.')
      setEditingImage(null)
      loadProducts()
    } else {
      setError(response.error?.message || '이미지 저장 실패')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-48 bg-[#161b22] border-r border-[#30363d]">
        <div className="p-4">
          <div className="text-xl font-bold text-[#e6edf3] mb-6">
            BuyPilot
          </div>
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
              className="block w-full text-left px-2 py-1 rounded text-xs bg-[#21262d] text-[#e6edf3] font-semibold"
            >
              상품 관리
            </a>
            <a
              href="/competitor"
              className="block w-full text-left px-2 py-1 rounded text-xs text-[#8d96a0] hover:bg-[#21262d] transition-colors"
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
          <h1 className="text-3xl font-bold mb-2">상품 관리</h1>
          <p className="text-[#8d96a0]">타오바오/1688 상품을 URL로 가져오기</p>
        </div>

        {/* Import Form */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">상품 가져오기</h2>
          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                타오바오/1688 상품 URL
              </label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://item.taobao.com/item.htm?id=..."
                className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
                disabled={loading}
              />
              <p className="text-xs text-[#8d96a0] mt-1">
                지원: item.taobao.com, detail.tmall.com, m.taobao.com, 1688.com
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !url}
              className="px-6 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-[#6e7681] disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? '가져오는 중...' : '상품 가져오기'}
            </button>
          </form>

          {/* Success/Error Messages */}
          {success && (
            <div className="mt-4 px-4 py-3 bg-[#238636]/10 border border-[#238636] rounded-lg text-[#3fb950]">
              ✓ {success}
            </div>
          )}
          {error && (
            <div className="mt-4 px-4 py-3 bg-[#da3633]/10 border border-[#da3633] rounded-lg text-[#f85149]">
              ✕ {error}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="상품 검색..."
              className="flex-1 px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#e6edf3] font-medium rounded-lg transition-colors"
            >
              검색
            </button>
          </form>
        </div>

        {/* Products Grid */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              등록된 상품 ({total}개)
            </h2>
          </div>

          {products.length === 0 ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 text-center">
              <p className="text-[#8d96a0]">등록된 상품이 없습니다.</p>
              <p className="text-sm text-[#6e7681] mt-2">
                위에서 타오바오 URL로 상품을 가져오세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => {
                // Filter out blob URLs and use fallback image
                const getValidImageUrl = (product: Product): string => {
                  // If image_url is valid (not blob), use it
                  if (product.image_url && !product.image_url.startsWith('blob:')) {
                    return product.image_url
                  }

                  // Try to find a valid image from data
                  if (product.data) {
                    // Try downloaded_images
                    if (product.data.downloaded_images && Array.isArray(product.data.downloaded_images)) {
                      const validImage = product.data.downloaded_images.find((img: string) => !img.startsWith('blob:'))
                      if (validImage) return validImage
                    }

                    // Try pic_url
                    if (product.data.pic_url && !product.data.pic_url.startsWith('blob:')) {
                      return product.data.pic_url
                    }

                    // Try images array
                    if (product.data.images && Array.isArray(product.data.images) && product.data.images.length > 0) {
                      return product.data.images[0]
                    }
                  }

                  return '' // No valid image found
                }

                const validImageUrl = getValidImageUrl(product)

                return (
                <div
                  key={product.id}
                  className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden hover:border-[#58a6ff] transition-colors group"
                >
                  {/* Product Image */}
                  {validImageUrl && (
                    <div className="aspect-square bg-[#0d1117] overflow-hidden">
                      <img
                        src={validImageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-[#e6edf3] mb-2 line-clamp-2 h-10">
                      {product.title}
                    </h3>

                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[#58a6ff] font-bold">
                        ¥{product.price}
                      </div>
                      {product.score && (
                        <div className="text-xs text-[#ffa657]">
                          ★ {product.score}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3 text-xs text-[#8d96a0]">
                      <span className="px-2 py-1 bg-[#0d1117] border border-[#30363d] rounded">
                        {product.source}
                      </span>
                      {product.stock !== undefined && (
                        <span className="px-2 py-1 bg-[#0d1117] border border-[#30363d] rounded">
                          재고 {product.stock}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <a
                          href={product.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs text-center rounded transition-colors"
                        >
                          원본 보기
                        </a>
                        {validImageUrl && (
                          <button
                            onClick={() => handleEditImage(product.id, validImageUrl)}
                            className="flex-1 px-3 py-1.5 bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 border border-[#58a6ff] text-[#58a6ff] text-xs rounded transition-colors"
                          >
                            이미지 편집
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="w-full px-3 py-1.5 bg-[#da3633]/10 hover:bg-[#da3633]/20 border border-[#da3633] text-[#f85149] text-xs rounded transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] disabled:bg-[#161b22] disabled:text-[#6e7681] disabled:cursor-not-allowed border border-[#30363d] rounded-lg transition-colors"
            >
              이전
            </button>

            <span className="px-4 py-2 text-[#8d96a0]">
              {page + 1} / {totalPages}
            </span>

            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] disabled:bg-[#161b22] disabled:text-[#6e7681] disabled:cursor-not-allowed border border-[#30363d] rounded-lg transition-colors"
            >
              다음
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Image Editor Modal */}
      {editingImage && (
        <ImageEditor
          imageUrl={editingImage.imageUrl}
          productId={editingImage.productId}
          onSave={handleSaveImage}
          onCancel={() => setEditingImage(null)}
        />
      )}
    </div>
  )
}
