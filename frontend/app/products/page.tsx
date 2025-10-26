'use client'

import { useState, useEffect } from 'react'
import { importProduct, getProducts, deleteProduct, updateProduct } from '@/lib/api'
import ImageEditorModal from '@/components/ImageEditorModal'
import EnhancedImageEditor from '@/components/EnhancedImageEditor'

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
  const [useEnhancedEditor, setUseEnhancedEditor] = useState(false)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
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

  const handleSaveImage = async (editedImageUrl: string, editType?: 'thumbnail' | 'detail') => {
    if (!editingImage) return

    // Update the product with the edited image URL
    const updateData: any = {
      data: {
        edited: true,
        edited_at: new Date().toISOString(),
      },
    }

    // Store different versions for thumbnail and detail
    if (editType === 'thumbnail') {
      updateData.data.thumbnail_image_url = editedImageUrl
      updateData.image_url = editedImageUrl  // Also update main image_url for thumbnail
    } else if (editType === 'detail') {
      updateData.data.detail_image_url = editedImageUrl
    } else {
      // Legacy support for basic editor - update both
      updateData.image_url = editedImageUrl
      updateData.data.thumbnail_image_url = editedImageUrl
    }

    const response = await updateProduct(editingImage.productId, updateData)

    if (response.ok) {
      setSuccess(`${editType ? (editType === 'thumbnail' ? '썸네일' : '상세 페이지') : '이미지'}가 저장되었습니다.`)
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
            <div className="space-y-2">
              {products.map((product) => {
                // Get valid image URL with fallback logic
                const getValidImageUrl = (product: Product): string => {
                  // If image_url is valid (not blob), use it
                  if (product.image_url && !product.image_url.startsWith('blob:')) {
                    // If it's a relative URL, make it absolute to backend
                    if (product.image_url.startsWith('/static/')) {
                      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                      return `${backendUrl}${product.image_url}`
                    }
                    return product.image_url
                  }

                  // Try to find a valid image from data
                  if (product.data) {
                    // Try downloaded_images (these should be absolute URLs from backend)
                    if (product.data.downloaded_images && Array.isArray(product.data.downloaded_images)) {
                      const validImage = product.data.downloaded_images.find((img: string) =>
                        img && !img.startsWith('blob:') && img.trim() !== ''
                      )
                      if (validImage) {
                        // If it's a relative URL, make it absolute to backend
                        if (validImage.startsWith('/static/')) {
                          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                          return `${backendUrl}${validImage}`
                        }
                        return validImage
                      }
                    }

                    // Try pic_url (original Taobao URL)
                    if (product.data.pic_url && !product.data.pic_url.startsWith('blob:')) {
                      // Fix protocol-relative URLs
                      if (product.data.pic_url.startsWith('//')) {
                        return `https:${product.data.pic_url}`
                      }
                      return product.data.pic_url
                    }

                    // Try images array (original Taobao URLs)
                    if (product.data.images && Array.isArray(product.data.images) && product.data.images.length > 0) {
                      const firstImage = product.data.images[0]
                      if (firstImage && !firstImage.startsWith('blob:')) {
                        // Fix protocol-relative URLs
                        if (firstImage.startsWith('//')) {
                          return `https:${firstImage}`
                        }
                        return firstImage
                      }
                    }
                  }

                  return '' // No valid image found
                }

                const validImageUrl = getValidImageUrl(product)

                return (
                <div
                  key={product.id}
                  className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#58a6ff] transition-colors flex items-center gap-4"
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-[#238636] focus:ring-[#238636] focus:ring-offset-0"
                  />

                  {/* Order number */}
                  <div className="text-lg font-semibold text-[#8d96a0] w-10">
                    {products.indexOf(product) + 1 + page * limit}
                  </div>

                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 bg-[#0d1117] rounded-lg overflow-hidden border border-[#30363d]">
                      {validImageUrl && (
                        <img
                          src={validImageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>

                  {/* Product Name */}
                  <div className="flex-shrink-0 w-32">
                    <div className="text-sm text-[#8d96a0] mb-1">판매가</div>
                    <div className="text-lg font-bold text-[#e6edf3]">
                      {Math.round(product.price * 200).toLocaleString()}
                    </div>
                    <div className="text-xs text-[#8d96a0]">¥ {product.price}</div>
                  </div>

                  {/* Options */}
                  <div className="flex-1 min-w-0">
                    {product.data?.options && product.data.options.length > 0 ? (
                      <div className="space-y-2">
                        {product.data.options.slice(0, 2).map((option: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="text-sm text-[#ffa657] font-medium w-16 flex-shrink-0 pt-1">
                              {option.name}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                              {option.values?.slice(0, 4).map((value: any, vidx: number) => (
                                <div key={vidx} className="flex items-center gap-1">
                                  <span className="text-xs text-[#6e7681]">
                                    원문: {value.text}
                                  </span>
                                </div>
                              ))}
                              {option.values?.length > 4 && (
                                <button
                                  onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                                  className="text-xs text-[#58a6ff] hover:text-[#79c0ff] transition-colors"
                                >
                                  +{option.values.length - 4}개 더
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {expandedProduct === product.id && product.data.options.length > 2 && (
                          <div className="space-y-2 mt-2">
                            {product.data.options.slice(2).map((option: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3">
                                <div className="text-sm text-[#ffa657] font-medium w-16 flex-shrink-0 pt-1">
                                  {option.name}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap flex-1">
                                  {option.values?.map((value: any, vidx: number) => (
                                    <span key={vidx} className="text-xs text-[#6e7681]">
                                      원문: {value.text}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-[#6e7681] line-clamp-2">
                        {product.title}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="text-center flex-shrink-0 w-20">
                    <div className="text-lg font-semibold text-[#e6edf3]">
                      {product.stock || 0}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {validImageUrl && (
                      <button
                        onClick={() => {
                          setUseEnhancedEditor(true)
                          handleEditImage(product.id, validImageUrl)
                        }}
                        className="p-2 bg-[#a855f7]/10 hover:bg-[#a855f7]/20 border border-[#a855f7] text-[#a855f7] rounded-lg transition-colors"
                        title="이미지 편집"
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 bg-[#da3633]/10 hover:bg-[#da3633]/20 border border-[#da3633] text-[#f85149] rounded-lg transition-colors"
                      title="삭제"
                    >
                      ❌
                    </button>
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

      {/* Image Editor Modals */}
      {editingImage && !useEnhancedEditor && (
        <ImageEditorModal
          imageUrl={editingImage.imageUrl}
          onClose={() => setEditingImage(null)}
          onSave={handleSaveImage}
        />
      )}

      {editingImage && useEnhancedEditor && (
        <EnhancedImageEditor
          imageUrl={editingImage.imageUrl}
          onClose={() => setEditingImage(null)}
          onSave={handleSaveImage}
        />
      )}
    </div>
  )
}
