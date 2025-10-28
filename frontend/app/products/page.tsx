/**
 * Products page - Product management with horizontal list and inline editing
 */

'use client'

import { useState, useEffect } from 'react'
import { importProduct, getProducts, deleteProduct, updateProduct } from '@/lib/api'
import Header from '@/components/Header'
import { Plus, Search, RefreshCw, Trash2, ExternalLink, Image as ImageIcon, FileText, DollarSign, X, Save, ChevronLeft, ChevronRight, Package } from 'lucide-react'

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

type EditMode = 'main-image' | 'detail-images' | 'pricing' | null

export default function ProductsPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const limit = 10

  // Edit modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editMode, setEditMode] = useState<EditMode>(null)
  const [editData, setEditData] = useState<any>({})

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

  const openEditModal = (product: Product, mode: EditMode) => {
    setEditingProduct(product)
    setEditMode(mode)

    // Initialize edit data based on mode
    if (mode === 'main-image') {
      setEditData({
        mainImage: getValidImageUrl(product),
        allImages: product.data?.images || []
      })
    } else if (mode === 'detail-images') {
      setEditData({
        descImages: product.data?.desc_imgs || []
      })
    } else if (mode === 'pricing') {
      setEditData({
        price: product.price || 0,
        shippingCost: product.data?.shipping_cost || 0,
        margin: product.data?.margin || 30,
        finalPrice: 0
      })
    }
  }

  const closeEditModal = () => {
    setEditingProduct(null)
    setEditMode(null)
    setEditData({})
  }

  const saveEdit = async () => {
    if (!editingProduct) return

    try {
      const updateData: any = {}

      if (editMode === 'main-image') {
        updateData.image_url = editData.mainImage
      } else if (editMode === 'detail-images') {
        updateData.data = {
          ...editingProduct.data,
          desc_imgs: editData.descImages
        }
      } else if (editMode === 'pricing') {
        updateData.price = editData.price
        updateData.data = {
          ...editingProduct.data,
          shipping_cost: editData.shippingCost,
          margin: editData.margin
        }
      }

      const response = await updateProduct(editingProduct.id, updateData)

      if (response.ok) {
        toast('저장되었습니다!')
        loadProducts()
        closeEditModal()
      } else {
        toast('저장 실패', 'error')
      }
    } catch (err) {
      toast('저장 중 오류가 발생했습니다', 'error')
    }
  }

  const normalizeImageUrl = (url: string): string => {
    if (!url || url.startsWith('blob:')) return url
    if (url.startsWith('//')) return `https:${url}`
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`
    }
    return url
  }

  const getValidImageUrl = (product: Product): string => {
    if (product.data?.downloaded_images && Array.isArray(product.data.downloaded_images) && product.data.downloaded_images.length > 0) {
      const firstDownloadedImage = product.data.downloaded_images[0]
      if (firstDownloadedImage && !firstDownloadedImage.startsWith('blob:')) {
        return normalizeImageUrl(firstDownloadedImage)
      }
    }

    if (product.image_url && !product.image_url.startsWith('blob:')) {
      return normalizeImageUrl(product.image_url)
    }

    if (product.data?.pic_url && !product.data.pic_url.startsWith('blob:')) {
      return normalizeImageUrl(product.data.pic_url)
    }

    if (product.data?.images && Array.isArray(product.data.images) && product.data.images.length > 0) {
      const firstImage = product.data.images[0]
      if (firstImage && !firstImage.startsWith('blob:')) {
        return normalizeImageUrl(firstImage)
      }
    }

    return ''
  }

  const getProductTitle = (product: Product): string => {
    return product.data?.title_kr || product.title || product.data?.title_cn || '제품명 없음'
  }

  const getProductPrice = (product: Product): number => {
    return product.price || product.data?.price || 0
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">상품 관리</h1>
          <p className="text-slate-600 text-lg">{total}개의 등록된 상품</p>
        </div>

        {/* Import form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <form onSubmit={handleImport} className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="타오바오 상품 URL을 입력하세요..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>가져오는 중...</span>
                </>
              ) : (
                <>
                  <Plus size={20} />
                  <span>가져오기</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품명으로 검색..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => loadProducts()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
            >
              <RefreshCw size={20} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* Products horizontal list */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
            <Package size={64} className="text-slate-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">상품이 없습니다</h3>
            <p className="text-slate-600">타오바오에서 상품을 가져와보세요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => {
              const imageUrl = getValidImageUrl(product)
              const title = getProductTitle(product)
              const price = getProductPrice(product)
              const krwPrice = Math.round(price * 200)
              const platform = product.data?.platform || (product.source === 'taobao' ? '타오바오' : product.source)
              const hasDescImages = product.data?.desc_imgs && product.data.desc_imgs.length > 0

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6"
                >
                  <div className="flex gap-6">
                    {/* Product image */}
                    <div className="relative w-48 h-48 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={48} className="text-slate-300" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white">
                        {platform}
                      </div>
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">
                        {title}
                      </h3>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-2xl font-bold text-blue-600">
                          ₩{krwPrice.toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-500">
                          ¥{price.toLocaleString()} 원가
                        </div>
                      </div>

                      {/* Options */}
                      {product.data?.options && product.data.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {product.data.options.map((option: any, idx: number) => (
                            <div key={idx} className="px-3 py-1 bg-slate-100 rounded-lg text-sm">
                              <span className="font-semibold text-slate-700">{option.name}</span>
                              <span className="text-slate-500 ml-1">({option.values?.length || 0}개)</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex gap-6 text-sm text-slate-600 mb-6">
                        <div className="flex items-center gap-2">
                          <ImageIcon size={16} />
                          <span>{product.data?.images?.length || 0}개 이미지</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText size={16} />
                          <span>{hasDescImages ? `${product.data.desc_imgs.length}개 상세이미지` : '상세이미지 없음'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Edit buttons */}
                    <div className="flex flex-col gap-3 w-48 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(product, 'main-image')}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
                      >
                        <ImageIcon size={18} />
                        <span>대표이미지</span>
                      </button>

                      <button
                        onClick={() => openEditModal(product, 'detail-images')}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
                      >
                        <FileText size={18} />
                        <span>상세페이지</span>
                      </button>

                      <button
                        onClick={() => openEditModal(product, 'pricing')}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md"
                      >
                        <DollarSign size={18} />
                        <span>배송비&마진</span>
                      </button>

                      <button
                        onClick={() => handleDelete(product.id)}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all mt-auto"
                      >
                        <Trash2 size={18} />
                        <span>삭제</span>
                      </button>

                      {product.source_url && (
                        <a
                          href={product.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all text-sm"
                        >
                          <ExternalLink size={16} />
                          <span>원본 보기</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    page === i
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingProduct && editMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {editMode === 'main-image' && '대표 이미지 편집'}
                {editMode === 'detail-images' && '상세 페이지 편집'}
                {editMode === 'pricing' && '배송비 & 마진 설정'}
              </h2>
              <button
                onClick={closeEditModal}
                className="p-2 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {editMode === 'main-image' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      현재 대표 이미지
                    </label>
                    <div className="w-full h-96 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                      {editData.mainImage ? (
                        <img
                          src={editData.mainImage}
                          alt="Main"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Package size={64} className="text-slate-300" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      이미지 URL 직접 입력
                    </label>
                    <input
                      type="text"
                      value={editData.mainImage}
                      onChange={(e) => setEditData({ ...editData, mainImage: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder="https://..."
                    />
                  </div>

                  {editData.allImages && editData.allImages.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        다른 이미지 선택 ({editData.allImages.length}개)
                      </label>
                      <div className="grid grid-cols-4 gap-4">
                        {editData.allImages.map((img: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setEditData({ ...editData, mainImage: normalizeImageUrl(img) })}
                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                              editData.mainImage === normalizeImageUrl(img)
                                ? 'border-blue-500 ring-4 ring-blue-100'
                                : 'border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            <img
                              src={normalizeImageUrl(img)}
                              alt={`Image ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editMode === 'detail-images' && (
                <div className="space-y-6">
                  {editData.descImages && editData.descImages.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700">
                          상세 페이지 이미지 ({editData.descImages.length}개)
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {editData.descImages.map((img: string, idx: number) => (
                          <div
                            key={idx}
                            className="relative group rounded-xl overflow-hidden border border-slate-200"
                          >
                            <img
                              src={normalizeImageUrl(img)}
                              alt={`Detail ${idx + 1}`}
                              className="w-full h-auto"
                            />
                            <div className="absolute top-2 left-2 px-3 py-1 rounded-full bg-black/70 text-white text-sm font-semibold">
                              {idx + 1}
                            </div>
                            <button
                              onClick={() => {
                                const newImages = editData.descImages.filter((_: any, i: number) => i !== idx)
                                setEditData({ ...editData, descImages: newImages })
                              }}
                              className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                      <FileText size={48} className="text-slate-400 mb-2" />
                      <p className="text-slate-600">상세 페이지 이미지가 없습니다</p>
                    </div>
                  )}
                </div>
              )}

              {editMode === 'pricing' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      원가 (CNY)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.price}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value) || 0
                        const shipping = editData.shippingCost || 0
                        const margin = editData.margin || 30
                        const cost = (price * 200) + shipping
                        const final = Math.round(cost * (1 + margin / 100))
                        setEditData({ ...editData, price, finalPrice: final })
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-lg"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      한화: ₩{Math.round(editData.price * 200).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      배송비 (KRW)
                    </label>
                    <input
                      type="number"
                      value={editData.shippingCost}
                      onChange={(e) => {
                        const shipping = parseInt(e.target.value) || 0
                        const price = editData.price || 0
                        const margin = editData.margin || 30
                        const cost = (price * 200) + shipping
                        const final = Math.round(cost * (1 + margin / 100))
                        setEditData({ ...editData, shippingCost: shipping, finalPrice: final })
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      마진율 (%)
                    </label>
                    <input
                      type="number"
                      value={editData.margin}
                      onChange={(e) => {
                        const margin = parseInt(e.target.value) || 0
                        const price = editData.price || 0
                        const shipping = editData.shippingCost || 0
                        const cost = (price * 200) + shipping
                        const final = Math.round(cost * (1 + margin / 100))
                        setEditData({ ...editData, margin, finalPrice: final })
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-lg"
                    />
                  </div>

                  <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="text-sm text-slate-600 mb-2">최종 판매가</div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      ₩{editData.finalPrice?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-slate-500 mt-2">
                      원가 ₩{Math.round(editData.price * 200).toLocaleString()} +
                      배송비 ₩{editData.shippingCost?.toLocaleString() || '0'} +
                      마진 {editData.margin}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={closeEditModal}
                className="px-6 py-3 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
              >
                취소
              </button>
              <button
                onClick={saveEdit}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                <Save size={20} />
                <span>저장</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`px-6 py-4 rounded-xl shadow-lg ${
            showToast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {showToast.message}
          </div>
        </div>
      )}
    </div>
  )
}
