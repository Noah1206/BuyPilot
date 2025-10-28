/**
 * Products page - Product management with bold Korean e-commerce style
 */

'use client'

import { useState, useEffect } from 'react'
import { importProduct, getProducts, deleteProduct, updateProduct } from '@/lib/api'
import Header from '@/components/Header'
import { Plus, Search, RefreshCw, Trash2, ExternalLink, Image as ImageIcon, FileText, DollarSign, X, Save, ChevronLeft, ChevronRight, Package, ZoomIn, ZoomOut, Settings, Sparkles } from 'lucide-react'

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
  const [zoom, setZoom] = useState(60)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

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
    setZoom(60)
    setSelectedImageIndex(0)

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
        finalPrice: Math.round(((product.price || 0) * 200 + (product.data?.shipping_cost || 0)) * (1 + ((product.data?.margin || 30) / 100)))
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

  const removeImage = (index: number) => {
    if (editMode === 'main-image') {
      const newImages = editData.allImages.filter((_: any, i: number) => i !== index)
      setEditData({ ...editData, allImages: newImages })
      if (selectedImageIndex >= newImages.length) {
        setSelectedImageIndex(Math.max(0, newImages.length - 1))
      }
    } else if (editMode === 'detail-images') {
      const newImages = editData.descImages.filter((_: any, i: number) => i !== index)
      setEditData({ ...editData, descImages: newImages })
      if (selectedImageIndex >= newImages.length) {
        setSelectedImageIndex(Math.max(0, newImages.length - 1))
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      <Header />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with bold style */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-[#FF6B00] rounded-xl flex items-center justify-center border-3 border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <Package size={28} className="text-white" strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-5xl font-black text-[#0F172A]">상품 관리</h1>
              <p className="text-xl font-bold text-[#FF6B00]">{total}개의 등록된 상품</p>
            </div>
          </div>
        </div>

        {/* Import form with bold style */}
        <div className="bg-white rounded-2xl border-4 border-[#0F172A] shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-[#FF6B00]" strokeWidth={3} />
            <h2 className="text-xl font-black text-[#0F172A]">타오바오에서 상품 가져오기</h2>
          </div>
          <form onSubmit={handleImport} className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="타오바오 상품 URL을 입력하세요..."
              className="flex-1 px-6 py-4 rounded-xl border-3 border-[#0F172A] focus:border-[#FF6B00] focus:ring-4 focus:ring-[#FF6B00]/20 outline-none transition-all text-lg font-medium placeholder:text-slate-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url}
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-black text-lg bg-[#FF6B00] text-white border-3 border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw size={20} className="animate-spin" strokeWidth={3} />
                  <span>가져오는 중...</span>
                </>
              ) : (
                <>
                  <Plus size={20} strokeWidth={3} />
                  <span>가져오기</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Search with bold style */}
        <div className="bg-white rounded-2xl border-4 border-[#0F172A] shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-6 mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#FF6B00]" strokeWidth={3} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품명으로 검색..."
                className="w-full pl-14 pr-6 py-4 rounded-xl border-3 border-[#0F172A] focus:border-[#FF6B00] focus:ring-4 focus:ring-[#FF6B00]/20 outline-none transition-all text-lg font-medium placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => loadProducts()}
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-black text-lg bg-[#0F172A] text-white border-3 border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(255,107,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(255,107,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <RefreshCw size={20} strokeWidth={3} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* Products list with bold cards */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border-4 border-dashed border-[#0F172A]">
            <Package size={80} className="text-[#FF6B00] mb-4" strokeWidth={2.5} />
            <h3 className="text-3xl font-black text-[#0F172A] mb-2">상품이 없습니다</h3>
            <p className="text-lg font-bold text-slate-600">타오바오에서 상품을 가져와보세요</p>
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
                  className="bg-white rounded-2xl border-4 border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all p-6"
                >
                  {/* Top: Image + Info */}
                  <div className="flex gap-6 mb-4">
                    {/* Product image with bold styling */}
                    <div className="relative w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-[#FFFBF5] border-3 border-[#0F172A]">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={56} className="text-slate-300" strokeWidth={2} />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-3 py-1 rounded-lg font-black text-xs bg-[#FF6B00] text-white border-2 border-[#0F172A]">
                        {platform}
                      </div>
                    </div>

                    {/* Product info with bold typography */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-black text-[#0F172A] mb-3 line-clamp-2">
                        {title}
                      </h3>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-3xl font-black text-[#FF6B00]">
                          ₩{krwPrice.toLocaleString()}
                        </div>
                        <div className="px-3 py-1 bg-[#FFFBF5] border-2 border-[#0F172A] rounded-lg">
                          <span className="text-sm font-bold text-slate-600">
                            ¥{price.toLocaleString()} 원가
                          </span>
                        </div>
                      </div>

                      {/* Options with bold chips */}
                      {product.data?.options && product.data.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {product.data.options.map((option: any, idx: number) => (
                            <div key={idx} className="px-3 py-1.5 bg-[#FFFBF5] rounded-lg border-2 border-[#0F172A]">
                              <span className="font-black text-sm text-[#0F172A]">{option.name}</span>
                              <span className="font-bold text-sm text-[#FF6B00] ml-1.5">({option.values?.length || 0}개)</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Stats with icons */}
                      <div className="flex gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center border-2 border-[#0F172A]">
                            <ImageIcon size={16} className="text-white" strokeWidth={3} />
                          </div>
                          <span className="font-bold text-[#0F172A]">{product.data?.images?.length || 0}개 이미지</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center border-2 border-[#0F172A]">
                            <FileText size={16} className="text-white" strokeWidth={3} />
                          </div>
                          <span className="font-bold text-[#0F172A]">
                            {hasDescImages ? `${product.data.desc_imgs.length}개 상세이미지` : '상세이미지 없음'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Bold action buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t-3 border-[#0F172A]">
                    <button
                      onClick={() => openEditModal(product, 'main-image')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm border-3 border-[#0F172A] text-[#0F172A] hover:bg-[#FF6B00] hover:text-white hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      <ImageIcon size={18} strokeWidth={3} />
                      <span>대표이미지</span>
                    </button>

                    <button
                      onClick={() => openEditModal(product, 'detail-images')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm border-3 border-[#0F172A] text-[#0F172A] hover:bg-[#FF6B00] hover:text-white hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      <FileText size={18} strokeWidth={3} />
                      <span>상세페이지</span>
                    </button>

                    <button
                      onClick={() => openEditModal(product, 'pricing')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm border-3 border-[#0F172A] text-[#0F172A] hover:bg-[#FF6B00] hover:text-white hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      <DollarSign size={18} strokeWidth={3} />
                      <span>배송비&마진</span>
                    </button>

                    <button
                      onClick={() => handleDelete(product.id)}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm border-3 border-[#FF3D00] text-[#FF3D00] hover:bg-[#FF3D00] hover:text-white hover:shadow-[2px_2px_0px_0px_rgba(255,61,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      <Trash2 size={18} strokeWidth={3} />
                      <span>삭제</span>
                    </button>

                    {product.source_url && (
                      <a
                        href={product.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm border-3 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        <ExternalLink size={18} strokeWidth={3} />
                        <span>원본</span>
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination with bold style */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-3 rounded-xl bg-white border-3 border-[#0F172A] hover:bg-[#FF6B00] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={24} strokeWidth={3} />
            </button>

            <div className="flex gap-2">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`px-5 py-3 rounded-xl font-black text-lg border-3 border-[#0F172A] transition-all ${
                    page === i
                      ? 'bg-[#FF6B00] text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'
                      : 'bg-white text-[#0F172A] hover:bg-[#FFFBF5]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-3 rounded-xl bg-white border-3 border-[#0F172A] hover:bg-[#FF6B00] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={24} strokeWidth={3} />
            </button>
          </div>
        )}
      </main>

      {/* Professional Edit Modal - Bold redesign */}
      {editingProduct && editMode && (
        <div className="fixed inset-0 bg-[#FFFBF5] z-50 flex flex-col">
          {/* Top bar with tabs - Bold style */}
          <div className="bg-white border-b-4 border-[#0F172A]">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#FF6B00] rounded-xl flex items-center justify-center text-white font-black text-2xl border-3 border-[#0F172A]">
                  B
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (editMode !== 'main-image') {
                        setEditMode('main-image')
                        setEditData({
                          mainImage: getValidImageUrl(editingProduct),
                          allImages: editingProduct.data?.images || []
                        })
                      }
                    }}
                    className={`px-6 py-3 font-black text-sm rounded-xl border-3 transition-all ${
                      editMode === 'main-image'
                        ? 'text-white bg-[#FF6B00] border-[#0F172A] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                        : 'text-[#0F172A] border-[#0F172A] hover:bg-[#FFFBF5]'
                    }`}
                  >
                    대표 이미지
                  </button>
                  <button
                    onClick={() => {
                      if (editMode !== 'pricing') {
                        setEditMode('pricing')
                        setEditData({
                          price: editingProduct.price || 0,
                          shippingCost: editingProduct.data?.shipping_cost || 0,
                          margin: editingProduct.data?.margin || 30,
                          finalPrice: Math.round(((editingProduct.price || 0) * 200 + (editingProduct.data?.shipping_cost || 0)) * (1 + ((editingProduct.data?.margin || 30) / 100)))
                        })
                      }
                    }}
                    className={`px-6 py-3 font-black text-sm rounded-xl border-3 transition-all ${
                      editMode === 'pricing'
                        ? 'text-white bg-[#FF6B00] border-[#0F172A] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                        : 'text-[#0F172A] border-[#0F172A] hover:bg-[#FFFBF5]'
                    }`}
                  >
                    가격 설정
                  </button>
                  <button
                    onClick={() => {
                      if (editMode !== 'detail-images') {
                        setEditMode('detail-images')
                        setEditData({
                          descImages: editingProduct.data?.desc_imgs || []
                        })
                      }
                    }}
                    className={`px-6 py-3 font-black text-sm rounded-xl border-3 transition-all ${
                      editMode === 'detail-images'
                        ? 'text-white bg-[#FF6B00] border-[#0F172A] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                        : 'text-[#0F172A] border-[#0F172A] hover:bg-[#FFFBF5]'
                    }`}
                  >
                    상세페이지
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={closeEditModal}
                  className="px-6 py-3 rounded-xl font-black text-sm bg-white text-[#0F172A] border-3 border-[#0F172A] hover:bg-[#FFFBF5] transition-all"
                >
                  나가기
                </button>
                <button
                  onClick={saveEdit}
                  className="px-6 py-3 rounded-xl font-black text-sm bg-[#FF6B00] text-white border-3 border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  저장
                </button>
              </div>
            </div>

            {/* Image thumbnails with bold borders */}
            {(editMode === 'main-image' || editMode === 'detail-images') && (
              <div className="px-6 pb-4">
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {(editMode === 'main-image' ? editData.allImages : editData.descImages)?.map((img: string, idx: number) => (
                    <div
                      key={idx}
                      className={`relative flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden border-3 cursor-pointer transition-all ${
                        selectedImageIndex === idx
                          ? 'border-[#FF6B00] ring-4 ring-[#FF6B00]/30 shadow-lg'
                          : 'border-[#0F172A] hover:border-[#FF6B00]'
                      }`}
                      onClick={() => {
                        setSelectedImageIndex(idx)
                        if (editMode === 'main-image') {
                          setEditData({ ...editData, mainImage: normalizeImageUrl(img) })
                        }
                      }}
                    >
                      <img
                        src={normalizeImageUrl(img)}
                        alt={`Thumb ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(idx)
                        }}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-[#FF3D00] text-white rounded-full flex items-center justify-center hover:bg-[#FF6B00] border-2 border-[#0F172A] transition-all"
                      >
                        <X size={14} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                  <div className="flex-shrink-0 w-28 h-28 rounded-xl border-3 border-dashed border-[#0F172A] flex items-center justify-center cursor-pointer hover:border-[#FF6B00] hover:bg-[#FFFBF5] transition-all">
                    <Plus size={36} className="text-[#FF6B00]" strokeWidth={3} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main content area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left sidebar tools with bold style */}
            {(editMode === 'main-image' || editMode === 'detail-images') && (
              <div className="w-56 bg-white border-r-4 border-[#0F172A] p-4">
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-4 rounded-xl border-3 border-[#0F172A] hover:bg-[#FFFBF5] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FF3D00] rounded-lg flex items-center justify-center border-2 border-[#0F172A]">
                      <Trash2 size={20} className="text-white" strokeWidth={3} />
                    </div>
                    <div>
                      <div className="font-black text-sm text-[#0F172A]">영역 지우기</div>
                      <div className="text-xs font-bold text-slate-500">(2)</div>
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-4 rounded-xl border-3 border-[#0F172A] hover:bg-[#FFFBF5] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FF6B00] rounded-lg flex items-center justify-center border-2 border-[#0F172A]">
                      <Settings size={20} className="text-white" strokeWidth={3} />
                    </div>
                    <div>
                      <div className="font-black text-sm text-[#0F172A]">원클릭 번역</div>
                      <div className="text-xs font-bold text-slate-500">(4)</div>
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-4 rounded-xl border-3 border-[#0F172A] hover:bg-[#FFFBF5] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center border-2 border-[#0F172A]">
                      <ImageIcon size={20} className="text-white" strokeWidth={3} />
                    </div>
                    <div>
                      <div className="font-black text-sm text-[#0F172A]">대표 이미지로</div>
                      <div className="text-xs font-bold text-slate-500">(f)</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Center canvas */}
            <div className="flex-1 flex flex-col bg-[#FFFBF5]">
              {/* Toolbar with bold buttons */}
              {(editMode === 'main-image' || editMode === 'detail-images') && (
                <div className="bg-white border-b-4 border-[#0F172A] px-6 py-3 flex items-center gap-4">
                  <button className="p-3 hover:bg-[#FFFBF5] rounded-xl border-2 border-[#0F172A] transition-all" title="Delete">
                    <Trash2 size={20} strokeWidth={3} />
                  </button>
                  <div className="w-px h-8 bg-[#0F172A]"></div>
                  <button className="px-4 py-2 hover:bg-[#FFFBF5] rounded-xl border-2 border-[#0F172A] transition-all" title="Undo">
                    <span className="text-sm font-black">Ctrl+Z</span>
                  </button>
                  <button className="px-4 py-2 hover:bg-[#FFFBF5] rounded-xl border-2 border-[#0F172A] transition-all" title="Redo">
                    <span className="text-sm font-black">Ctrl+R</span>
                  </button>
                </div>
              )}

              {/* Canvas area */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                {editMode === 'main-image' && (
                  <div className="bg-white rounded-2xl shadow-2xl border-4 border-[#0F172A]" style={{ maxWidth: `${zoom}%` }}>
                    <img
                      src={editData.mainImage}
                      alt="Main"
                      className="w-full h-auto rounded-xl"
                    />
                  </div>
                )}

                {editMode === 'detail-images' && (
                  <div className="bg-white rounded-2xl shadow-2xl border-4 border-[#0F172A]" style={{ maxWidth: `${zoom}%` }}>
                    {editData.descImages && editData.descImages[selectedImageIndex] ? (
                      <img
                        src={normalizeImageUrl(editData.descImages[selectedImageIndex])}
                        alt={`Detail ${selectedImageIndex + 1}`}
                        className="w-full h-auto rounded-xl"
                      />
                    ) : (
                      <div className="w-96 h-96 flex items-center justify-center">
                        <FileText size={80} className="text-slate-300" strokeWidth={2} />
                      </div>
                    )}
                  </div>
                )}

                {editMode === 'pricing' && (
                  <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border-4 border-[#0F172A] p-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-black text-[#0F172A] mb-3 flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center border-2 border-[#0F172A]">
                            <DollarSign size={16} className="text-white" strokeWidth={3} />
                          </div>
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
                          className="w-full px-6 py-4 rounded-xl border-4 border-[#0F172A] focus:border-[#FF6B00] focus:ring-4 focus:ring-[#FF6B00]/20 outline-none text-xl font-bold"
                        />
                        <p className="text-sm font-bold text-slate-600 mt-2">
                          한화: ₩{Math.round(editData.price * 200).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-black text-[#0F172A] mb-3">
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
                          className="w-full px-6 py-4 rounded-xl border-4 border-[#0F172A] focus:border-[#FF6B00] focus:ring-4 focus:ring-[#FF6B00]/20 outline-none text-xl font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-black text-[#0F172A] mb-3">
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
                          className="w-full px-6 py-4 rounded-xl border-4 border-[#0F172A] focus:border-[#FF6B00] focus:ring-4 focus:ring-[#FF6B00]/20 outline-none text-xl font-bold"
                        />
                      </div>

                      <div className="p-8 bg-[#FF6B00] rounded-2xl border-4 border-[#0F172A] shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                        <div className="text-sm font-black text-white mb-3">최종 판매가</div>
                        <div className="text-6xl font-black text-white">
                          ₩{editData.finalPrice?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm font-bold text-white/80 mt-4">
                          원가 ₩{Math.round(editData.price * 200).toLocaleString()} +
                          배송비 ₩{editData.shippingCost?.toLocaleString() || '0'} +
                          마진 {editData.margin}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom controls with bold style */}
              {(editMode === 'main-image' || editMode === 'detail-images') && (
                <div className="bg-white border-t-4 border-[#0F172A] px-6 py-4 flex items-center justify-end gap-4">
                  <button
                    onClick={() => setZoom(Math.max(20, zoom - 10))}
                    className="p-3 hover:bg-[#FFFBF5] rounded-xl border-3 border-[#0F172A] transition-all"
                  >
                    <ZoomOut size={20} strokeWidth={3} />
                  </button>
                  <span className="text-lg font-black w-16 text-center text-[#0F172A]">{zoom}%</span>
                  <button
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="p-3 hover:bg-[#FFFBF5] rounded-xl border-3 border-[#0F172A] transition-all"
                  >
                    <ZoomIn size={20} strokeWidth={3} />
                  </button>
                  <div className="w-px h-8 bg-[#0F172A] mx-2"></div>
                  <button className="px-6 py-3 rounded-xl font-black text-sm bg-[#FF6B00] text-white border-3 border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    이미지 저장
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast with bold style */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-50">
          <div className={`px-8 py-5 rounded-2xl shadow-lg border-4 border-[#0F172A] font-black text-lg ${
            showToast.type === 'success'
              ? 'bg-[#FF6B00] text-white'
              : 'bg-[#FF3D00] text-white'
          }`}>
            {showToast.message}
          </div>
        </div>
      )}
    </div>
  )
}
