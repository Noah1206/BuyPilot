/**
 * Products page - Clean & Professional Design
 */

'use client'

import { useState, useEffect } from 'react'
import { importProduct, getProducts, deleteProduct, updateProduct } from '@/lib/api'
import Header from '@/components/Header'
import { Plus, Search, RefreshCw, Trash2, ExternalLink, Image as ImageIcon, FileText, DollarSign, X, Save, ChevronLeft, ChevronRight, Package, ZoomIn, ZoomOut, Settings, Sparkles, CheckSquare, Square, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

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
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
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

  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  const exportToExcel = () => {
    if (selectedProducts.size === 0) {
      toast('선택된 상품이 없습니다', 'error')
      return
    }

    const selectedProductsData = products.filter(p => selectedProducts.has(p.id))

    const excelData = selectedProductsData.map(product => ({
      '상품명 (한글)': getProductTitle(product),
      '상품명 (중문)': product.data?.title_cn || product.title,
      '원가 (CNY)': getProductPrice(product),
      '판매가 (KRW)': Math.round(getProductPrice(product) * 200),
      '플랫폼': product.data?.platform || product.source,
      '이미지 개수': product.data?.images?.length || 0,
      '상세이미지 개수': product.data?.desc_imgs?.length || 0,
      '옵션': product.data?.options?.map((opt: any) => `${opt.name}(${opt.values?.length || 0}개)`).join(', ') || '없음',
      '소스 URL': product.source_url,
      '등록일': new Date(product.created_at).toLocaleDateString('ko-KR')
    }))

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '상품목록')

    const fileName = `상품목록_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '-')}.xlsx`
    XLSX.writeFile(wb, fileName)

    toast(`${selectedProducts.size}개 상품을 엑셀로 내보냈습니다!`)
  }

  const deleteSelected = async () => {
    if (selectedProducts.size === 0) {
      toast('선택된 상품이 없습니다', 'error')
      return
    }

    if (!confirm(`선택된 ${selectedProducts.size}개 상품을 정말 삭제하시겠습니까?`)) {
      return
    }

    let successCount = 0
    let failCount = 0

    for (const productId of Array.from(selectedProducts)) {
      const response = await deleteProduct(productId)
      if (response.ok) {
        successCount++
      } else {
        failCount++
      }
    }

    setSelectedProducts(new Set())
    loadProducts()

    if (failCount === 0) {
      toast(`${successCount}개 상품이 삭제되었습니다!`)
    } else {
      toast(`${successCount}개 삭제 성공, ${failCount}개 실패`, 'error')
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-md">
              <Package size={24} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-4xl font-semibold text-slate-900">상품 관리</h1>
              <p className="text-lg text-slate-600">{total}개의 등록된 상품</p>
            </div>
          </div>
        </div>

        {/* Import form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-orange-500" />
            <h2 className="text-lg font-semibold text-slate-900">타오바오에서 상품 가져오기</h2>
          </div>
          <form onSubmit={handleImport} className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="타오바오 상품 URL을 입력하세요..."
              className="flex-1 px-4 py-3 bg-white rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium placeholder:text-slate-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-orange-500 text-white shadow-md hover:shadow-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

        {/* Search & Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 mb-8">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품명으로 검색..."
                className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => loadProducts()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
            >
              <RefreshCw size={20} />
              <span>새로고침</span>
            </button>
          </div>

          {/* Selection Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-orange-500 transition-all"
              >
                {selectedProducts.size === products.length && products.length > 0 ? (
                  <>
                    <CheckSquare size={18} className="text-orange-500" />
                    <span>전체 해제</span>
                  </>
                ) : (
                  <>
                    <Square size={18} />
                    <span>전체 선택</span>
                  </>
                )}
              </button>

              {selectedProducts.size > 0 && (
                <div className="px-3 py-1.5 bg-orange-100 border border-orange-200 rounded-lg">
                  <span className="text-sm font-semibold text-orange-600">
                    {selectedProducts.size}개 선택됨
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={deleteSelected}
                disabled={selectedProducts.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm bg-red-500 text-white shadow-md hover:shadow-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 size={18} />
                <span>선택 삭제</span>
              </button>

              <button
                onClick={exportToExcel}
                disabled={selectedProducts.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm bg-green-500 text-white shadow-md hover:shadow-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Download size={18} />
                <span>엑셀 내보내기</span>
              </button>
            </div>
          </div>
        </div>

        {/* Products list */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Package size={64} className="text-slate-300 mb-4" strokeWidth={2} />
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">상품이 없습니다</h3>
            <p className="text-slate-600">타오바오에서 상품을 가져와보세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => {
              const imageUrl = getValidImageUrl(product)
              const title = getProductTitle(product)
              const price = getProductPrice(product)
              const krwPrice = Math.round(price * 200)
              const platform = product.data?.platform || (product.source === 'taobao' ? '타오바오' : product.source)
              const hasDescImages = product.data?.desc_imgs && product.data.desc_imgs.length > 0

              const isSelected = selectedProducts.has(product.id)

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all p-4 relative ${
                    isSelected ? 'border-orange-500 ring-2 ring-orange-100' : 'border-slate-200'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectProduct(product.id)}
                    className="absolute top-4 left-4 z-10 w-6 h-6 flex items-center justify-center rounded-md border-2 transition-all hover:scale-110"
                    style={{
                      borderColor: isSelected ? '#f97316' : '#cbd5e1',
                      backgroundColor: isSelected ? '#f97316' : 'white'
                    }}
                  >
                    {isSelected && <CheckSquare size={16} className="text-white" strokeWidth={3} />}
                  </button>

                  {/* Top: Image + Info */}
                  <div className="flex gap-4 mb-3">
                    {/* Product image */}
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={32} className="text-slate-300" strokeWidth={2} />
                        </div>
                      )}
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-500 text-white">
                        {platform}
                      </div>
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0 pl-6">
                      <h3 className="text-base font-semibold text-slate-900 mb-1.5 line-clamp-2">
                        {title}
                      </h3>

                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-lg font-semibold text-orange-500">
                          ₩{krwPrice.toLocaleString()}
                        </div>
                        <div className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded">
                          <span className="text-xs font-medium text-slate-600">
                            ¥{price.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Options */}
                      {product.data?.options && product.data.options.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {product.data.options.slice(0, 3).map((option: any, idx: number) => (
                            <div key={idx} className="px-2 py-0.5 bg-slate-50 rounded border border-slate-200">
                              <span className="font-medium text-xs text-slate-900">{option.name}</span>
                              <span className="font-medium text-xs text-orange-500 ml-1">({option.values?.length || 0})</span>
                            </div>
                          ))}
                          {product.data.options.length > 3 && (
                            <div className="px-2 py-0.5 bg-slate-50 rounded border border-slate-200">
                              <span className="text-xs text-slate-600">+{product.data.options.length - 3}개</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                            <ImageIcon size={12} className="text-orange-500" />
                          </div>
                          <span className="font-medium text-slate-700">{product.data?.images?.length || 0}개</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                            <FileText size={12} className="text-slate-600" />
                          </div>
                          <span className="font-medium text-slate-700">
                            {hasDescImages ? `${product.data.desc_imgs.length}개` : '상세 없음'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Action buttons */}
                  <div className="flex items-center gap-1.5 pt-2.5 border-t border-slate-200">
                    <button
                      onClick={() => openEditModal(product, 'main-image')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-orange-500 hover:text-orange-600 transition-all"
                    >
                      <ImageIcon size={14} />
                      <span>대표</span>
                    </button>

                    <button
                      onClick={() => openEditModal(product, 'detail-images')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-orange-500 hover:text-orange-600 transition-all"
                    >
                      <FileText size={14} />
                      <span>상세</span>
                    </button>

                    <button
                      onClick={() => openEditModal(product, 'pricing')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-orange-500 hover:text-orange-600 transition-all"
                    >
                      <DollarSign size={14} />
                      <span>가격</span>
                    </button>

                    <button
                      onClick={() => handleDelete(product.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs border border-red-300 text-red-600 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={14} />
                      <span>삭제</span>
                    </button>

                    {product.source_url && (
                      <a
                        href={product.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <ExternalLink size={14} />
                        <span>원본</span>
                      </a>
                    )}
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
              className="p-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex gap-2">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    page === i
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingProduct && editMode && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Top bar with tabs */}
          <div className="bg-white border-b border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
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
                    className={`px-5 py-2.5 font-medium text-sm rounded-lg border transition-all ${
                      editMode === 'main-image'
                        ? 'text-white bg-orange-500 border-orange-500 shadow-md'
                        : 'text-slate-700 border-slate-300 hover:bg-slate-50'
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
                    className={`px-5 py-2.5 font-medium text-sm rounded-lg border transition-all ${
                      editMode === 'pricing'
                        ? 'text-white bg-orange-500 border-orange-500 shadow-md'
                        : 'text-slate-700 border-slate-300 hover:bg-slate-50'
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
                    className={`px-5 py-2.5 font-medium text-sm rounded-lg border transition-all ${
                      editMode === 'detail-images'
                        ? 'text-white bg-orange-500 border-orange-500 shadow-md'
                        : 'text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    상세페이지
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={closeEditModal}
                  className="px-5 py-2.5 rounded-lg font-medium text-sm bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all"
                >
                  나가기
                </button>
                <button
                  onClick={saveEdit}
                  className="px-5 py-2.5 rounded-lg font-medium text-sm bg-orange-500 text-white shadow-md hover:shadow-lg hover:bg-orange-600 transition-all"
                >
                  저장
                </button>
              </div>
            </div>

            {/* Image thumbnails */}
            {(editMode === 'main-image' || editMode === 'detail-images') && (
              <div className="px-6 pb-4">
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {(editMode === 'main-image' ? editData.allImages : editData.descImages)?.map((img: string, idx: number) => (
                    <div
                      key={idx}
                      className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedImageIndex === idx
                          ? 'border-orange-500 ring-2 ring-orange-200 shadow-lg'
                          : 'border-slate-200 hover:border-orange-400'
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
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md transition-all"
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  <div className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all">
                    <Plus size={28} className="text-slate-400" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main content area */}
          <div className="flex-1 flex overflow-hidden bg-slate-50">
            {/* Left sidebar tools */}
            {(editMode === 'main-image' || editMode === 'detail-images') && (
              <div className="w-56 bg-white border-r border-slate-200 p-4">
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-orange-500 transition-all flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Trash2 size={18} className="text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-900">영역 지우기</div>
                      <div className="text-xs text-slate-500">(2)</div>
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-orange-500 transition-all flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Settings size={18} className="text-orange-500" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-900">원클릭 번역</div>
                      <div className="text-xs text-slate-500">(4)</div>
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-orange-500 transition-all flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <ImageIcon size={18} className="text-slate-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-900">대표 이미지로</div>
                      <div className="text-xs text-slate-500">(f)</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Center canvas */}
            <div className="flex-1 flex flex-col">
              {/* Toolbar */}
              {(editMode === 'main-image' || editMode === 'detail-images') && (
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-all" title="Delete">
                    <Trash2 size={20} />
                  </button>
                  <div className="w-px h-6 bg-slate-300"></div>
                  <button className="px-4 py-2 hover:bg-slate-100 rounded-lg transition-all" title="Undo">
                    <span className="text-sm font-medium">Ctrl+Z</span>
                  </button>
                  <button className="px-4 py-2 hover:bg-slate-100 rounded-lg transition-all" title="Redo">
                    <span className="text-sm font-medium">Ctrl+R</span>
                  </button>
                </div>
              )}

              {/* Canvas area */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                {editMode === 'main-image' && (
                  <div className="bg-white rounded-2xl shadow-xl border border-slate-200" style={{ maxWidth: `${zoom}%` }}>
                    <img
                      src={editData.mainImage}
                      alt="Main"
                      className="w-full h-auto rounded-xl"
                    />
                  </div>
                )}

                {editMode === 'detail-images' && (
                  <div className="bg-white rounded-2xl shadow-xl border border-slate-200" style={{ maxWidth: `${zoom}%` }}>
                    {editData.descImages && editData.descImages[selectedImageIndex] ? (
                      <img
                        src={normalizeImageUrl(editData.descImages[selectedImageIndex])}
                        alt={`Detail ${selectedImageIndex + 1}`}
                        className="w-full h-auto rounded-xl"
                      />
                    ) : (
                      <div className="w-96 h-96 flex items-center justify-center">
                        <FileText size={64} className="text-slate-300" strokeWidth={2} />
                      </div>
                    )}
                  </div>
                )}

                {editMode === 'pricing' && (
                  <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <DollarSign size={16} className="text-orange-500" />
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
                          className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-lg font-medium"
                        />
                        <p className="text-sm font-medium text-slate-600 mt-2">
                          한화: ₩{Math.round(editData.price * 200).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">
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
                          className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-lg font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">
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
                          className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-lg font-medium"
                        />
                      </div>

                      <div className="p-8 bg-orange-500 rounded-2xl shadow-lg">
                        <div className="text-sm font-medium text-white/90 mb-3">최종 판매가</div>
                        <div className="text-5xl font-semibold text-white">
                          ₩{editData.finalPrice?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-white/80 mt-4">
                          원가 ₩{Math.round(editData.price * 200).toLocaleString()} +
                          배송비 ₩{editData.shippingCost?.toLocaleString() || '0'} +
                          마진 {editData.margin}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom controls */}
              {(editMode === 'main-image' || editMode === 'detail-images') && (
                <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-4">
                  <button
                    onClick={() => setZoom(Math.max(20, zoom - 10))}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <ZoomOut size={20} />
                  </button>
                  <span className="text-base font-medium w-14 text-center text-slate-900">{zoom}%</span>
                  <button
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <ZoomIn size={20} />
                  </button>
                  <div className="w-px h-6 bg-slate-300 mx-2"></div>
                  <button className="px-5 py-2.5 rounded-lg font-medium text-sm bg-orange-500 text-white shadow-md hover:shadow-lg hover:bg-orange-600 transition-all">
                    이미지 저장
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`px-6 py-4 rounded-xl shadow-lg font-medium ${
            showToast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}>
            {showToast.message}
          </div>
        </div>
      )}
    </div>
  )
}
