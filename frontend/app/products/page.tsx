/**
 * Products page - Clean & Professional Design
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { importProduct, getProducts, deleteProduct, updateProduct, registerToSmartStore, translateText as apiTranslateText } from '@/lib/api'
import Header from '@/components/Header'
import CategorySelectionModal from '@/components/CategorySelectionModal'
import { Plus, Search, RefreshCw, Trash2, ExternalLink, Image as ImageIcon, FileText, DollarSign, X, Save, ChevronLeft, ChevronRight, Package, ZoomIn, ZoomOut, Settings, Sparkles, CheckSquare, Square, Download, Upload, Eraser, Edit, Check, Layers } from 'lucide-react'
import * as XLSX from 'xlsx'

// Translation cache to avoid redundant API calls
const translationCache = new Map<string, string>()

/**
 * Translate Chinese text to Korean using backend API
 */
async function translateText(text: string): Promise<string> {
  // Check cache first
  if (translationCache.has(text)) {
    return translationCache.get(text)!
  }

  try {
    const response = await apiTranslateText(text)

    if (response.ok && response.data?.translated) {
      const translated = response.data.translated
      translationCache.set(text, translated)
      return translated
    }

    console.warn('Translation API failed:', response.error)
    return text
  } catch (error) {
    console.warn('Translation error:', error)
    return text
  }
}

// Product option value definition
interface ProductOptionValue {
  vid: string
  name: string
  image?: string
  available?: boolean
}

// Product option definition (e.g., Color, Size)
interface ProductOption {
  pid: string
  name: string
  values: ProductOptionValue[]
}

// Product variant definition (specific combination of options)
interface ProductVariant {
  sku_id: string
  options: Record<string, string>  // e.g., {"颜色分类": "红色", "尺码": "M"}
  price: number
  stock: number
  image?: string
}

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
  data: {
    options?: ProductOption[]
    variants?: ProductVariant[]
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

type EditMode = 'main-image' | 'detail-images' | 'pricing' | 'options' | null

// Queue item interface
interface ImportQueueItem {
  id: string
  url: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  addedAt: Date
  result?: string
}

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

  // Import queue state
  const [importQueue, setImportQueue] = useState<ImportQueueItem[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)

  // Edit modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editMode, setEditMode] = useState<EditMode>(null)
  const [editData, setEditData] = useState<any>({})
  const [zoom, setZoom] = useState(60)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [translating, setTranslating] = useState(false)
  const [removingText, setRemovingText] = useState(false)
  const [isDrawingMode, setIsDrawingMode] = useState(false)

  // Category selection modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null)
  const [brushSize, setBrushSize] = useState(30)

  // AI category suggestions cache (stores all suggestions, not just the best one)
  const [categoryCache, setCategoryCache] = useState<Map<string, any[]>>(new Map())

  // Category selection modal state
  const [showCategorySelectorModal, setShowCategorySelectorModal] = useState(false)
  const [selectedProductForCategory, setSelectedProductForCategory] = useState<string | null>(null)

  // Drag and drop state for image reordering
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Title editing state
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>('')

  // Category editing state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('')

  // Option name editing state
  const [editingOptionKey, setEditingOptionKey] = useState<string | null>(null) // format: "productId-optionIdx"
  const [editingOptionValue, setEditingOptionValue] = useState<string>('')
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [filteredCategories, setFilteredCategories] = useState<any[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [page, searchQuery])

  useEffect(() => {
    // Resize canvas to match image size
    if (isDrawingMode) {
      const img = document.getElementById('main-image-canvas') as HTMLImageElement
      const canvas = document.getElementById('mask-canvas') as HTMLCanvasElement
      if (img && canvas) {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
      }
    }
  }, [isDrawingMode, editData.mainImage])

  // Filter categories based on search query
  useEffect(() => {
    if (!categorySearchQuery.trim()) {
      setFilteredCategories(allCategories.slice(0, 50)) // Show first 50
      return
    }

    const query = categorySearchQuery.toLowerCase()
    const filtered = allCategories.filter((cat: any) =>
      cat.name.toLowerCase().includes(query) ||
      cat.path.toLowerCase().includes(query) ||
      cat.id.includes(query)
    ).slice(0, 50) // Limit to 50 results

    setFilteredCategories(filtered)
  }, [categorySearchQuery, allCategories])

  // ESC key handler to close edit modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingProduct && editMode) {
        closeEditModal()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [editingProduct, editMode])

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

      // Load AI category suggestions for each product
      loadAICategorySuggestions(response.data.products)
    }
  }

  const loadAICategorySuggestions = async (products: Product[]) => {
    const newCache = new Map(categoryCache)

    // Load category suggestions for each product
    for (const product of products) {
      // Priority 1: Check if DB has selected_category or ai_categories
      const selectedCategory = product.data?.selected_category
      const aiCategories = product.data?.ai_categories

      if (selectedCategory) {
        // User has manually selected a category - use it (put it first)
        const otherCategories = aiCategories || []
        const categoriesWithSelected = [selectedCategory, ...otherCategories.filter((c: any) => c.category_id !== selectedCategory.category_id)]
        newCache.set(product.id, categoriesWithSelected)
      } else if (aiCategories && aiCategories.length > 0) {
        // DB has AI-analyzed categories - use them
        newCache.set(product.id, aiCategories)
      } else if (!newCache.has(product.id)) {
        // No categories in DB - fetch from AI
        try {
          const response = await fetch('/api/v1/smartstore/suggest-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_data: {
                title: getProductTitle(product),
                price: getProductPrice(product),
                desc: product.data?.description || '',
                images: product.data?.images || []
              }
            })
          })

          const result = await response.json()

          if (result.ok && result.data?.suggestions && result.data.suggestions.length > 0) {
            newCache.set(product.id, result.data.suggestions) // Store ALL suggestions (top 3)

            // Save to DB for persistence
            await fetch(`/api/v1/products/${product.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  ...product.data,
                  ai_categories: result.data.suggestions
                }
              })
            })
          }
        } catch (err) {
          console.error(`Failed to get category for product ${product.id}:`, err)
        }
      }
    }

    setCategoryCache(newCache)
  }

  // Transform Taobao props/skus to options/variants format
  const transformProductData = async (product: Product): Promise<{ options: ProductOption[], variants: ProductVariant[] }> => {
    // Handle options/variants format (from Chrome Extension - already translated by backend)
    if (product.data?.options && product.data?.variants) {
      const rawOptions = product.data.options
      const rawVariants = product.data.variants

      // Options are already translated by backend, just return as-is
      const translatedOptions: ProductOption[] = rawOptions.map((option: any) => ({
        pid: option.pid,
        name: option.name, // Already translated by backend
        values: (option.values || []).map((val: any) => ({
          vid: val.vid,
          name: val.name, // Already translated by backend
          image: val.image,
          available: val.available !== false
        }))
      }))

      // Variants are already translated by backend, just return as-is
      const translatedVariants: ProductVariant[] = rawVariants.map((variant: any) => ({
        ...variant,
        options: variant.options // Already translated by backend
      }))

      return {
        options: translatedOptions,
        variants: translatedVariants
      }
    }

    // Transform from Taobao format (props/skus)
    const props = product.data?.props || []
    const skus = product.data?.skus || []

    // Convert props to options and translate to Korean
    const options: ProductOption[] = await Promise.all(
      props.map(async (prop: any) => ({
        pid: prop.pid,
        name: await translateText(prop.name),
        values: await Promise.all(
          (prop.values || []).map(async (val: any) => ({
            vid: val.vid,
            name: await translateText(val.name),
            image: val.image,
            available: val.available !== false
          }))
        )
      }))
    )

    // Convert skus to variants
    const variants: ProductVariant[] = skus.map((sku: any) => {
      const variantOptions = sku.properties || sku.props_name || {}

      // Try to find image from variant's option values
      let variantImage = sku.image

      if (!variantImage) {
        // Loop through each option in the variant
        for (const [optionName, optionValue] of Object.entries(variantOptions)) {
          // Find the corresponding option in options array
          const option = options.find(opt => opt.name === optionName)
          if (option) {
            // Find the value that matches
            const value = option.values.find(val => val.name === optionValue)
            if (value?.image) {
              variantImage = value.image
              break
            }
          }
        }
      }

      return {
        sku_id: sku.sku_id || sku.skuId || String(sku.id),
        options: variantOptions,
        price: sku.price || sku.originalPrice || 0,
        stock: sku.quantity || sku.stock || 0,
        image: variantImage
      }
    })

    return { options, variants }
  }

  // Process single item from queue
  const processQueueItem = async (item: ImportQueueItem) => {
    // Update status to processing
    setImportQueue(prev => prev.map(i =>
      i.id === item.id ? { ...i, status: 'processing' as const } : i
    ))

    try {
      const response = await importProduct(item.url)

      if (response.ok && response.data) {
        const result = response.data.already_exists
          ? '이미 등록된 상품'
          : '가져오기 완료'

        // Update status to completed
        setImportQueue(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'completed' as const, result } : i
        ))

        // Show toast only for first item or errors
        if (!response.data.already_exists) {
          toast(`상품 가져오기 완료: ${item.url.slice(0, 50)}...`)
        }

        loadProducts()
      } else {
        // Update status to failed
        setImportQueue(prev => prev.map(i =>
          i.id === item.id ? {
            ...i,
            status: 'failed' as const,
            result: response.error?.message || '가져오기 실패'
          } : i
        ))

        toast(`실패: ${response.error?.message || '상품 가져오기 실패'}`, 'error')
      }
    } catch (err) {
      // Update status to failed
      setImportQueue(prev => prev.map(i =>
        i.id === item.id ? {
          ...i,
          status: 'failed' as const,
          result: '네트워크 오류'
        } : i
      ))

      toast(`실패: 네트워크 오류`, 'error')
    }
  }

  // Watch queue and auto-process pending items one at a time
  useEffect(() => {
    if (isProcessingQueue) return

    const pendingItem = importQueue.find(item => item.status === 'pending')

    if (pendingItem) {
      setIsProcessingQueue(true)

      // Process item and wait before allowing next
      const process = async () => {
        await processQueueItem(pendingItem)
        await new Promise(resolve => setTimeout(resolve, 500))
        setIsProcessingQueue(false)
      }

      process()
    }
  }, [importQueue, isProcessingQueue])

  // Add URL to import queue
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      toast('URL을 입력해주세요', 'error')
      return
    }

    // Check if URL already in queue
    const isDuplicate = importQueue.some(item =>
      item.url === url && (item.status === 'pending' || item.status === 'processing')
    )

    if (isDuplicate) {
      toast('이미 대기열에 있는 URL입니다', 'error')
      return
    }

    // Add to queue
    const newItem: ImportQueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      url: url,
      status: 'pending',
      addedAt: new Date()
    }

    setImportQueue(prev => [...prev, newItem])
    setUrl('') // Clear input immediately
    toast(`대기열에 추가되었습니다 (${importQueue.filter(i => i.status === 'pending').length + 1}개 대기 중)`)
  }

  // Clear completed/failed items from queue
  const clearCompletedQueue = () => {
    setImportQueue(prev => prev.filter(item =>
      item.status === 'pending' || item.status === 'processing'
    ))
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

  const translateImage = async () => {
    if (!editingProduct || selectedImageIndex === undefined) return

    setTranslating(true)

    try {
      // Get current image URL based on edit mode
      const currentImages = editMode === 'main-image' ? editData.allImages : editData.descImages
      const imageUrl = normalizeImageUrl(currentImages[selectedImageIndex])

      const response = await fetch('/api/image/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      })

      const result = await response.json()

      if (result.ok && result.data?.result_image) {
        // Replace current image with translated version
        const newImages = [...currentImages]
        newImages[selectedImageIndex] = result.data.result_image

        if (editMode === 'main-image') {
          setEditData({ ...editData, allImages: newImages, mainImage: result.data.result_image })
        } else {
          setEditData({ ...editData, descImages: newImages })
        }

        toast('이미지 번역이 완료되었습니다!')
      } else {
        toast(result.error?.message || '번역 실패', 'error')
      }
    } catch (err) {
      toast('번역 중 오류가 발생했습니다.', 'error')
    } finally {
      setTranslating(false)
    }
  }

  const startDrawingMode = () => {
    setIsDrawingMode(true)
    setMaskCanvas(null)
    toast('마우스로 제거할 영역을 그려주세요')
  }

  const cancelDrawingMode = () => {
    setIsDrawingMode(false)
    setMaskCanvas(null)
    toast('자막 제거 취소')
  }

  const clearMask = () => {
    const canvas = document.getElementById('mask-canvas') as HTMLCanvasElement
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setMaskCanvas(null)
      }
    }
    toast('마스크 초기화')
  }

  const applyTextRemoval = async () => {
    if (!editingProduct || selectedImageIndex === undefined || !maskCanvas) return

    setRemovingText(true)

    try {
      // Get current image URL based on edit mode
      const currentImages = editMode === 'main-image' ? editData.allImages : editData.descImages
      const imageUrl = normalizeImageUrl(currentImages[selectedImageIndex])

      // Convert mask canvas to base64
      const maskDataUrl = maskCanvas.toDataURL('image/png')

      const response = await fetch('/api/image/remove-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          mask_data: maskDataUrl
        }),
      })

      const result = await response.json()

      if (result.ok && result.data?.result_image) {
        // Replace current image with text-removed version
        const newImages = [...currentImages]
        newImages[selectedImageIndex] = result.data.result_image

        if (editMode === 'main-image') {
          setEditData({ ...editData, allImages: newImages, mainImage: result.data.result_image })
        } else {
          setEditData({ ...editData, descImages: newImages })
        }

        toast('자막 제거 완료!')
        setIsDrawingMode(false)
        setMaskCanvas(null)
      } else {
        toast(result.error?.message || '자막 제거 실패', 'error')
      }
    } catch (err) {
      toast('자막 제거 중 오류가 발생했습니다.', 'error')
    } finally {
      setRemovingText(false)
    }
  }

  const openEditModal = (product: Product, mode: EditMode) => {
    setEditingProduct(product)
    setEditMode(mode)
    setZoom(60)
    setSelectedImageIndex(0)

    if (mode === 'main-image') {
      // Use edited images from DB if available (they include base64 edited images)
      const allImages = product.data?.images || []
      const mainImage = allImages.length > 0 ? allImages[0] : getValidImageUrl(product)

      setEditData({
        mainImage: mainImage,
        allImages: allImages.length > 0 ? allImages : [getValidImageUrl(product)]
      })
    } else if (mode === 'detail-images') {
      setEditData({
        descImages: product.data?.desc_imgs || []
      })
    } else if (mode === 'pricing') {
      // 배송비 계산 우선순위:
      // 1. 수동으로 설정한 배송비가 있으면 사용
      // 2. 무게 정보가 있으면 무게별 배송비 계산
      // 3. 둘 다 없으면 기본 배송비 사용
      const weight = product.data?.weight
      const manualShippingCost = product.data?.shipping_cost
      let shippingCost = 0

      if (manualShippingCost && manualShippingCost > 0) {
        // 수동 입력한 배송비 우선
        shippingCost = manualShippingCost
      } else {
        // 무게 기반 또는 기본 배송비 계산 (calculateShippingCost가 자동 처리)
        shippingCost = calculateShippingCost(weight)
      }

      const price = product.price || 0
      const costPrice = Math.round(price * 200)
      const margin = product.data?.margin || 25 // 기본 마진율 25%

      setEditData({
        price,
        shippingCost,
        margin,
        weight: weight || 0,
        finalPrice: Math.round((costPrice + shippingCost) * (1 + (margin / 100)))
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
        // Save both main image and all images (for translated/edited images)
        updateData.image_url = editData.mainImage
        updateData.data = {
          ...editingProduct.data,
          images: editData.allImages,  // Save all edited images
          downloaded_images: editData.allImages  // Update downloaded_images to reflect new order
        }
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
          margin: editData.margin,
          final_price: editData.finalPrice  // Save frontend calculated final price
        }
      } else if (editMode === 'options') {
        updateData.data = {
          ...editingProduct.data,
          options: editData.options,
          variants: editData.variants
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

  // Handle option name save
  const handleSaveOptionName = async (product: Product, optionIdx: number, newName: string) => {
    if (!newName.trim() || !product.data?.options) return

    try {
      const updatedOptions = [...product.data.options]
      const oldName = updatedOptions[optionIdx].name
      updatedOptions[optionIdx] = { ...updatedOptions[optionIdx], name: newName }

      // Update variants to use new option name
      const updatedVariants = product.data.variants?.map((variant: any) => {
        const newOptions = { ...variant.options }
        if (oldName in newOptions) {
          newOptions[newName] = newOptions[oldName]
          delete newOptions[oldName]
        }
        return { ...variant, options: newOptions }
      })

      const response = await updateProduct(product.id, {
        data: {
          ...product.data,
          options: updatedOptions,
          variants: updatedVariants
        }
      })

      if (response.ok) {
        toast('옵션명이 저장되었습니다!')
        loadProducts()
        setEditingOptionKey(null)
      } else {
        toast('저장 실패', 'error')
      }
    } catch (err) {
      toast('저장 중 오류가 발생했습니다', 'error')
    }
  }

  const normalizeImageUrl = (url: string): string => {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url
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

  const getShippingRatesFromLocalStorage = (): Array<{ weight: number; cost: number }> => {
    // Check if running in browser (not SSR)
    if (typeof window === 'undefined') {
      return [
        { weight: 0.5, cost: 5600 },
        { weight: 1.0, cost: 6400 },
        { weight: 1.5, cost: 7200 },
        { weight: 2.0, cost: 8000 },
        { weight: 2.5, cost: 8800 },
        { weight: 3.0, cost: 9600 },
        { weight: 3.5, cost: 10400 },
        { weight: 4.0, cost: 11200 },
        { weight: 4.5, cost: 12000 },
        { weight: 5.0, cost: 12800 },
      ]
    }

    try {
      const saved = localStorage.getItem('shippingRates')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Failed to load shipping rates:', e)
    }
    // Default rates if not found
    return [
      { weight: 0.5, cost: 5600 },
      { weight: 1.0, cost: 6400 },
      { weight: 1.5, cost: 7200 },
      { weight: 2.0, cost: 8000 },
      { weight: 2.5, cost: 8800 },
      { weight: 3.0, cost: 9600 },
      { weight: 3.5, cost: 10400 },
      { weight: 4.0, cost: 11200 },
      { weight: 4.5, cost: 12000 },
      { weight: 5.0, cost: 12800 },
    ]
  }

  const calculateShippingCost = (weight: number | undefined): number => {
    // 무게 정보가 없으면 기본 배송비 사용
    if (!weight || weight <= 0) {
      // Check if running in browser (not SSR)
      if (typeof window === 'undefined') {
        return 8000
      }
      const defaultCost = localStorage.getItem('defaultShippingCost')
      return defaultCost ? parseInt(defaultCost) : 8000 // 기본값 8000원
    }

    const rates = getShippingRatesFromLocalStorage()

    // Find the appropriate rate for this weight
    // Rates are sorted by weight, find the first rate where weight <= rate.weight
    for (const rate of rates) {
      if (weight <= rate.weight) {
        return rate.cost
      }
    }

    // If weight exceeds all rates, use the highest rate
    return rates[rates.length - 1]?.cost || 0
  }

  const getFinalPrice = (product: Product): { costPrice: number; finalPrice: number; margin: number; shippingCost: number } => {
    const price = getProductPrice(product)
    const costPrice = Math.round(price * 200) // CNY to KRW

    // 배송비 계산 우선순위:
    // 1. 수동 입력한 배송비가 있으면 사용
    // 2. 무게 정보가 있으면 무게별 배송비 계산
    // 3. 둘 다 없으면 기본 배송비 사용
    const weight = product.data?.weight
    const manualShippingCost = product.data?.shipping_cost
    let shippingCost = 0

    if (manualShippingCost && manualShippingCost > 0) {
      // 수동 입력한 배송비 우선
      shippingCost = manualShippingCost
    } else {
      // 무게 기반 또는 기본 배송비 계산 (calculateShippingCost가 자동 처리)
      shippingCost = calculateShippingCost(weight)
    }

    const margin = product.data?.margin || 25 // 기본 마진율 25%

    const totalCost = costPrice + shippingCost
    const finalPrice = Math.round(totalCost * (1 + margin / 100))

    return { costPrice, finalPrice, margin, shippingCost }
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
    if (products.length === 0) {
      toast('내보낼 상품이 없습니다', 'error')
      return
    }

    // Transform products data to Excel format
    const excelData = products.map((product, index) => {
      // Get category name from cache
      const cachedCategories = categoryCache.get(product.id)
      const categoryName = cachedCategories && cachedCategories.length > 0
        ? cachedCategories[0].category_name
        : '-'

      // Calculate shipping fee (0 for free shipping)
      const shippingFee = 0

      // Calculate margin percentage
      let marginPercent = 0
      if (product.data?.calculated_final_price && product.price > 0) {
        marginPercent = ((product.data.calculated_final_price - product.price) / product.price * 100)
      } else if (product.data?.margin) {
        marginPercent = product.data.margin
      }

      return {
        '순위': index + 1,
        '상품명': product.title || '-',
        '카테고리': categoryName,
        '배송비': shippingFee,
        '마진율(%)': marginPercent.toFixed(2),
        '상품 URL': product.source_url || '-'
      }
    })

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },   // 순위
      { wch: 50 },  // 상품명
      { wch: 20 },  // 카테고리
      { wch: 10 },  // 배송비
      { wch: 12 },  // 마진율(%)
      { wch: 60 }   // 상품 URL
    ]

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, '상품목록')

    // Generate filename with current date
    const date = new Date()
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    const filename = `대량수집_${dateStr}.xlsx`

    // Download file
    XLSX.writeFile(wb, filename)
    toast(`${products.length}개 상품이 엑셀로 다운로드되었습니다!`)
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

  const registerSmartStore = async () => {
    if (selectedProducts.size === 0) {
      toast('선택된 상품이 없습니다', 'error')
      return
    }

    // Build category mapping from cache
    const productCategoryMap: Record<string, string> = {}
    let missingCategoryCount = 0

    selectedProducts.forEach(productId => {
      const cachedCategories = categoryCache.get(productId)
      if (cachedCategories && cachedCategories.length > 0 && cachedCategories[0].category_id) {
        productCategoryMap[productId] = cachedCategories[0].category_id
      } else {
        missingCategoryCount++
      }
    })

    if (missingCategoryCount > 0) {
      toast(`${missingCategoryCount}개 상품의 카테고리가 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.`, 'error')
      return
    }

    setLoading(true)
    toast(`${selectedProducts.size}개 상품을 스마트스토어에 등록 중...`)

    try {
      // Load SmartStore settings from localStorage
      const settingsJson = localStorage.getItem('smartstore_settings')
      const baseSettings = settingsJson ? JSON.parse(settingsJson) : {}

      // Use cached categories
      const settings = {
        ...baseSettings,
        product_categories: productCategoryMap  // Use cached category for each product
      }

      const response = await registerToSmartStore(Array.from(selectedProducts), settings)

      if (response.ok && response.data) {
        const { summary, results } = response.data

        setSelectedProducts(new Set())
        loadProducts()

        if (summary.failed === 0) {
          toast(`${summary.success}개 상품이 스마트스토어에 등록되었습니다!`)
        } else {
          toast(`${summary.success}개 등록 성공, ${summary.failed}개 실패`, 'error')
        }

        // Show detailed results including AI category info
        console.log('Registration results:', results)

        // Show detailed results for failed products
        if (summary.failed > 0) {
          const failedProducts = results.filter(r => !r.success)
          console.log('Failed products:', failedProducts)
        }
      } else {
        toast(response.error?.message || '스마트스토어 등록 중 오류가 발생했습니다', 'error')
      }
    } catch (error) {
      console.error('SmartStore registration error:', error)
      toast('스마트스토어 등록 중 오류가 발생했습니다', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryConfirmed = async (categoryId: string) => {
    // This function is no longer used, but kept for backward compatibility
    setShowCategoryModal(false)
    setSelectedCategoryId(categoryId)
  }

  const selectCategoryFromModal = async (productId: string, categoryIndex: number) => {
    const categories = categoryCache.get(productId)
    if (!categories || categoryIndex >= categories.length) return

    // Reorder the suggestions array to put selected category first
    const newCategories = [...categories]
    const [selected] = newCategories.splice(categoryIndex, 1)
    newCategories.unshift(selected)

    // Update cache
    const newCache = new Map(categoryCache)
    newCache.set(productId, newCategories)
    setCategoryCache(newCache)

    // Save to DB
    try {
      const response = await fetch(`/api/v1/products/${productId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected)
      })

      const result = await response.json()

      if (!result.ok) {
        console.error('Failed to save category:', result.error)
        toast('카테고리 저장 실패', 'error')
        return
      }
    } catch (err) {
      console.error('Error saving category:', err)
      toast('카테고리 저장 중 오류 발생', 'error')
      return
    }

    // Close modal
    setShowCategorySelectorModal(false)
    setSelectedProductForCategory(null)

    toast(`카테고리가 "${selected.category_path}"(으)로 변경 및 저장되었습니다`)
  }

  const totalPages = Math.ceil(total / limit)

  const reorderImages = (fromIndex: number, toIndex: number) => {
    if (editMode === 'main-image') {
      const newImages = [...editData.allImages]
      const [movedImage] = newImages.splice(fromIndex, 1)
      newImages.splice(toIndex, 0, movedImage)

      setEditData({ ...editData, allImages: newImages, mainImage: normalizeImageUrl(newImages[0]) })

      // Update selected index if needed
      if (selectedImageIndex === fromIndex) {
        setSelectedImageIndex(toIndex)
      } else if (fromIndex < selectedImageIndex && toIndex >= selectedImageIndex) {
        setSelectedImageIndex(selectedImageIndex - 1)
      } else if (fromIndex > selectedImageIndex && toIndex <= selectedImageIndex) {
        setSelectedImageIndex(selectedImageIndex + 1)
      }
    } else if (editMode === 'detail-images') {
      const newImages = [...editData.descImages]
      const [movedImage] = newImages.splice(fromIndex, 1)
      newImages.splice(toIndex, 0, movedImage)

      setEditData({ ...editData, descImages: newImages })

      // Update selected index if needed
      if (selectedImageIndex === fromIndex) {
        setSelectedImageIndex(toIndex)
      } else if (fromIndex < selectedImageIndex && toIndex >= selectedImageIndex) {
        setSelectedImageIndex(selectedImageIndex - 1)
      } else if (fromIndex > selectedImageIndex && toIndex <= selectedImageIndex) {
        setSelectedImageIndex(selectedImageIndex + 1)
      }
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedImageIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (draggedImageIndex !== null && draggedImageIndex !== dropIndex) {
      reorderImages(draggedImageIndex, dropIndex)
    }

    setDraggedImageIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedImageIndex(null)
    setDragOverIndex(null)
  }

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

  const startEditingTitle = (productId: string, currentTitle: string) => {
    setEditingTitleId(productId)
    setEditingTitle(currentTitle)
  }

  const cancelEditingTitle = () => {
    setEditingTitleId(null)
    setEditingTitle('')
  }

  const saveProductTitle = async (productId: string, title: string) => {
    if (!title.trim()) {
      cancelEditingTitle()
      return
    }

    if (title.length > 25) {
      toast('상품명은 25자를 초과할 수 없습니다', 'error')
      return
    }

    console.log('💾 Saving product title:', { productId, oldTitle: products.find(p => p.id === productId)?.title, newTitle: title.trim() })

    try {
      const response = await fetch(`/api/v1/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim()
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Failed to save title:', errorText)
        throw new Error('상품명 저장 실패')
      }

      const result = await response.json()
      console.log('✅ Title saved successfully:', result)

      // Update local state with response data - force new array reference
      const updatedTitle = result.ok && result.data?.product ? result.data.product.title : title.trim()

      setProducts(prevProducts => {
        const newProducts = prevProducts.map(p => {
          if (p.id === productId) {
            // Update both title and data.title_kr to ensure UI updates
            return {
              ...p,
              title: updatedTitle,
              data: {
                ...p.data,
                title_kr: updatedTitle  // This is what getProductTitle() displays!
              }
            }
          }
          return p
        })
        console.log('✅ Local state updated with new title:', updatedTitle)
        console.log('📊 Updated product:', newProducts.find(p => p.id === productId))
        return newProducts
      })

      toast('상품명이 저장되었습니다', 'success')
      cancelEditingTitle()
    } catch (error) {
      console.error('❌ Error saving title:', error)
      toast('상품명 저장에 실패했습니다', 'error')
    }
  }

  const handleTitleBlur = async (productId: string) => {
    // Small delay to prevent race conditions with other events
    await new Promise(resolve => setTimeout(resolve, 100))

    // Save when clicking away from the input
    if (editingTitleId === productId) {
      await saveProductTitle(productId, editingTitle)
    }
  }

  const startEditingCategory = async (productId: string) => {
    setEditingCategoryId(productId)
    setCategorySearchQuery('')

    // Load all categories if not loaded
    if (allCategories.length === 0) {
      setLoadingCategories(true)
      try {
        const response = await fetch('/api/v1/smartstore/categories')
        if (response.ok) {
          const result = await response.json()
          if (result.ok && result.data?.categories) {
            setAllCategories(result.data.categories)
            setFilteredCategories(result.data.categories.slice(0, 50))
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        toast('카테고리 목록을 불러오는데 실패했습니다', 'error')
      } finally {
        setLoadingCategories(false)
      }
    }
  }

  const cancelEditingCategory = () => {
    setEditingCategoryId(null)
    setCategorySearchQuery('')
    setFilteredCategories(allCategories.slice(0, 50))
  }

  const selectCategoryFromSearch = async (productId: string, category: any) => {
    try {
      const categoryData = {
        category_id: category.id,
        category_path: category.path,
        confidence: 100, // User-selected
        reason: '사용자 직접 선택'
      }

      const response = await fetch(`/api/v1/products/${productId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      })

      if (!response.ok) {
        throw new Error('카테고리 저장 실패')
      }

      // Update cache with selected category at the top
      const newCache = new Map(categoryCache)
      const existingCategories = newCache.get(productId) || []
      const otherCategories = existingCategories.filter(c => c.category_id !== category.id)
      newCache.set(productId, [categoryData, ...otherCategories])
      setCategoryCache(newCache)

      toast(`카테고리가 "${category.name}"(으)로 변경되었습니다`)
      cancelEditingCategory()
    } catch (error) {
      console.error('Error saving category:', error)
      toast('카테고리 저장에 실패했습니다', 'error')
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
              className="flex-1 px-4 py-3 bg-white rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium placeholder:text-slate-400 text-slate-900"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!url}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-orange-500 text-white shadow-md hover:shadow-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Plus size={20} />
              <span>대기열 추가</span>
            </button>
          </form>

          {/* Import Queue Status */}
          {importQueue.length > 0 && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RefreshCw
                    size={16}
                    className={`${isProcessingQueue ? 'animate-spin text-orange-500' : 'text-slate-500'}`}
                  />
                  <span className="text-sm font-semibold text-slate-900">
                    가져오기 대기열 ({importQueue.length}개)
                  </span>
                </div>
                <button
                  onClick={clearCompletedQueue}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
                >
                  완료 항목 삭제
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {importQueue.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                      item.status === 'completed' ? 'bg-green-50 border-green-200' :
                      item.status === 'failed' ? 'bg-red-50 border-red-200' :
                      item.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                      'bg-white border-slate-200'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {item.status === 'pending' && (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-orange-500 animate-spin" />
                      )}
                      {item.status === 'processing' && (
                        <RefreshCw size={18} className="text-blue-500 animate-spin" />
                      )}
                      {item.status === 'completed' && (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Check size={14} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                      {item.status === 'failed' && (
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                          <X size={14} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* URL */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-600 truncate">
                        {item.url}
                      </div>
                      {item.result && (
                        <div className={`text-xs font-medium mt-0.5 ${
                          item.status === 'completed' ? 'text-green-700' :
                          item.status === 'failed' ? 'text-red-700' :
                          'text-slate-600'
                        }`}>
                          {item.result}
                        </div>
                      )}
                    </div>

                    {/* Status Label */}
                    <div className="flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'failed' ? 'bg-red-100 text-red-700' :
                        item.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status === 'pending' ? '대기 중' :
                         item.status === 'processing' ? '처리 중' :
                         item.status === 'completed' ? '완료' :
                         '실패'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Queue Summary */}
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="flex gap-4">
                  <span className="text-slate-600">
                    대기: <span className="font-semibold text-slate-900">
                      {importQueue.filter(i => i.status === 'pending').length}
                    </span>
                  </span>
                  <span className="text-slate-600">
                    처리 중: <span className="font-semibold text-blue-600">
                      {importQueue.filter(i => i.status === 'processing').length}
                    </span>
                  </span>
                  <span className="text-slate-600">
                    완료: <span className="font-semibold text-green-600">
                      {importQueue.filter(i => i.status === 'completed').length}
                    </span>
                  </span>
                  <span className="text-slate-600">
                    실패: <span className="font-semibold text-red-600">
                      {importQueue.filter(i => i.status === 'failed').length}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
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
                className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium placeholder:text-slate-400 text-slate-900"
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
                onClick={registerSmartStore}
                disabled={selectedProducts.size === 0 || loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm bg-blue-500 text-white shadow-md hover:shadow-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Upload size={18} />
                <span>스마트스토어 등록</span>
              </button>

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
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm bg-green-500 text-white shadow-md hover:shadow-lg hover:bg-green-600 transition-all"
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
              const priceInfo = getFinalPrice(product)
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

                  {/* Category Display/Edit - Top Right */}
                  {editingCategoryId === product.id ? (
                    <div className="absolute top-4 right-4 z-20 w-80 bg-white rounded-lg shadow-xl border-2 border-orange-500">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-slate-900">카테고리 선택</h4>
                          <button
                            onClick={cancelEditingCategory}
                            className="p-1 rounded hover:bg-slate-100"
                          >
                            <X size={16} className="text-slate-500" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          placeholder="카테고리 검색..."
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none mb-2"
                          autoFocus
                        />

                        <div className="max-h-64 overflow-y-auto">
                          {loadingCategories ? (
                            <div className="text-center py-4 text-sm text-slate-500">
                              카테고리 로딩 중...
                            </div>
                          ) : filteredCategories.length === 0 ? (
                            <div className="text-center py-4 text-sm text-slate-500">
                              검색 결과가 없습니다
                            </div>
                          ) : (
                            filteredCategories.map((cat: any) => (
                              <button
                                key={cat.id}
                                onClick={() => selectCategoryFromSearch(product.id, cat)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 rounded transition-colors border-b border-slate-100 last:border-b-0"
                              >
                                <div className="font-medium text-slate-900">{cat.name}</div>
                                <div className="text-slate-500 mt-0.5 truncate">{cat.path}</div>
                              </button>
                            ))
                          )}
                        </div>

                        {!loadingCategories && filteredCategories.length > 0 && (
                          <div className="mt-2 text-xs text-slate-500 text-center">
                            {filteredCategories.length}개 표시 중
                          </div>
                        )}
                      </div>
                    </div>
                  ) : categoryCache.get(product.id) && categoryCache.get(product.id)!.length > 0 ? (
                    <div className="absolute top-4 right-4 z-10 group">
                      <button
                        onClick={() => startEditingCategory(product.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer"
                      >
                        <Sparkles size={12} className="text-blue-500" />
                        <span className="text-xs font-medium text-blue-700">
                          {categoryCache.get(product.id)![0].category_path}
                        </span>
                        <span className="text-xs font-semibold text-blue-500">
                          ({categoryCache.get(product.id)![0].confidence}%)
                        </span>
                        <Edit size={12} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  ) : (
                    <div className="absolute top-4 right-4 z-10">
                      <button
                        onClick={() => startEditingCategory(product.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                      >
                        <Plus size={12} className="text-slate-500" />
                        <span className="text-xs font-medium text-slate-600">카테고리 선택</span>
                      </button>
                    </div>
                  )}

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

                      {/* Variants badge */}
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0 pl-6">
                      {/* Product title with edit */}
                      {editingTitleId === product.id ? (
                        <div className="mb-1.5">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            maxLength={25}
                            className="w-full px-2 py-1 text-base font-semibold text-slate-900 bg-white border-2 border-orange-500 rounded focus:outline-none focus:ring-2 focus:ring-orange-100"
                            autoFocus
                            onBlur={() => handleTitleBlur(product.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleTitleBlur(product.id)
                              } else if (e.key === 'Escape') {
                                cancelEditingTitle()
                              }
                            }}
                            placeholder="상품명 입력"
                          />
                          <div className="mt-0.5 text-xs text-slate-500">
                            {editingTitle.length}/25자
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 mb-1.5 group">
                          <h3
                            className="flex-1 text-base font-semibold text-slate-900 line-clamp-2 cursor-pointer hover:text-orange-500 transition-colors"
                            onClick={() => startEditingTitle(product.id, title)}
                            title="클릭하여 상품명 편집"
                          >
                            {title}
                          </h3>
                          <button
                            onClick={() => startEditingTitle(product.id, title)}
                            className="p-1 rounded hover:bg-orange-50 transition-all flex-shrink-0"
                            title="상품명 편집"
                          >
                            <Edit size={16} className="text-orange-500 hover:text-orange-600" />
                          </button>
                        </div>
                      )}

                      <div className="mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-lg font-bold text-orange-500">
                            ₩{priceInfo.finalPrice.toLocaleString()}
                          </div>
                          <div className="px-2 py-0.5 bg-orange-100 border border-orange-200 rounded">
                            <span className="text-xs font-semibold text-orange-600">
                              +{priceInfo.margin}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>원가 ¥{price.toLocaleString()}</span>
                          <span>•</span>
                          <span>₩{priceInfo.costPrice.toLocaleString()}</span>
                          {product.data?.weight && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-blue-600">{product.data.weight}kg</span>
                            </>
                          )}
                          {priceInfo.shippingCost > 0 && (
                            <>
                              <span>•</span>
                              <span className={
                                product.data?.shipping_cost > 0 ? 'text-green-600 font-semibold' :
                                product.data?.weight ? 'text-blue-600 font-semibold' :
                                'text-orange-600 font-semibold'
                              }>
                                {product.data?.shipping_cost > 0 && '✏️ '}
                                {!product.data?.weight && !product.data?.shipping_cost && '기본 '}
                                배송비 ₩{priceInfo.shippingCost.toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Options */}
                      {product.data?.options && product.data.options.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-3">
                          {product.data.options.map((option: any, idx: number) => {
                            const optionKey = `${product.id}-${idx}`
                            const isEditing = editingOptionKey === optionKey

                            return (
                              <div key={idx} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 rounded-lg px-4 py-3 border-2 border-blue-200 hover:border-blue-400 transition-all group cursor-pointer shadow-sm hover:shadow-md">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      defaultValue={option.name}
                                      autoFocus
                                      onBlur={(e) => {
                                        handleSaveOptionName(product, idx, e.target.value)
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveOptionName(product, idx, e.currentTarget.value)
                                        } else if (e.key === 'Escape') {
                                          setEditingOptionKey(null)
                                        }
                                      }}
                                      className="bg-white border-2 border-blue-500 rounded-md px-3 py-1.5 text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[200px]"
                                    />
                                    <button
                                      onClick={() => setEditingOptionKey(null)}
                                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                                    >
                                      <X size={20} />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span
                                      className="font-bold text-base text-slate-900"
                                      onClick={() => {
                                        setEditingOptionKey(optionKey)
                                        setEditingOptionValue(option.name)
                                      }}
                                    >
                                      {option.name}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingOptionKey(optionKey)
                                        setEditingOptionValue(option.name)
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 transition-all p-1 hover:bg-blue-200 rounded"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <span className="font-bold text-sm text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full">
                                      {option.values?.length || 0}개
                                    </span>
                                  </>
                                )}
                              </div>
                            )
                          })}
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

                    {product.data?.variants && product.data.variants.length > 0 && (
                      <button
                        onClick={async () => {
                          openEditModal(product, 'options')
                          const { options, variants } = await transformProductData(product)
                          setEditData({
                            options,
                            variants
                          })
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-blue-500 hover:text-blue-600 transition-all"
                      >
                        <Layers size={14} />
                        <span>옵션</span>
                      </button>
                    )}

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
                {/* Close button (X) */}
                <button
                  onClick={closeEditModal}
                  className="p-2 hover:bg-red-50 rounded-lg transition-all group"
                  title="닫기 (ESC)"
                >
                  <X size={20} className="text-slate-500 group-hover:text-red-500" />
                </button>
                <div className="w-px h-6 bg-slate-300"></div>
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
                    onClick={async () => {
                      if (editMode !== 'options') {
                        setEditMode('options')
                        const { options, variants } = await transformProductData(editingProduct)
                        setEditData({
                          options,
                          variants
                        })
                      }
                    }}
                    className={`px-5 py-2.5 font-medium text-sm rounded-lg border transition-all flex items-center gap-2 ${
                      editMode === 'options'
                        ? 'text-white bg-orange-500 border-orange-500 shadow-md'
                        : 'text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Layers size={16} />
                    옵션
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
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${
                        draggedImageIndex === idx
                          ? 'opacity-50 cursor-grabbing'
                          : dragOverIndex === idx
                          ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg cursor-grab scale-105'
                          : selectedImageIndex === idx
                          ? 'border-orange-500 ring-2 ring-orange-200 shadow-lg cursor-grab'
                          : 'border-slate-200 hover:border-orange-400 cursor-grab'
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
                      {editMode === 'main-image' && idx === 0 && (
                        <div className="absolute top-1 left-1 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded shadow-md">
                          대표
                        </div>
                      )}
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
                  <button
                    onClick={translateImage}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-orange-500 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={translating}
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Settings size={18} className={`text-orange-500 ${translating ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-900">
                        {translating ? '번역 중...' : '원클릭 번역'}
                      </div>
                      <div className="text-xs text-slate-500">(4)</div>
                    </div>
                  </button>
                  <button
                    onClick={startDrawingMode}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-blue-500 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDrawingMode || removingText}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Eraser size={18} className={`text-blue-500 ${isDrawingMode ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-900">
                        {isDrawingMode ? '영역 그리는 중...' : '자막 제거'}
                      </div>
                      <div className="text-xs text-slate-500">(5)</div>
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
              <div className={`flex-1 flex p-8 overflow-auto ${
                editMode === 'detail-images' ? 'items-start justify-start' :
                editMode === 'options' ? 'items-start justify-center' :
                'items-center justify-center'
              }`}>
                {editMode === 'main-image' && (
                  <div className="bg-white rounded-2xl shadow-xl border border-slate-200 relative" style={{ maxWidth: `${zoom}%` }}>
                    <img
                      src={editData.mainImage}
                      alt="Main"
                      className="w-full h-auto rounded-xl"
                      id="main-image-canvas"
                    />
                    {isDrawingMode && (
                      <>
                        <canvas
                          id="mask-canvas"
                          className="absolute top-0 left-0 w-full h-full rounded-xl cursor-crosshair"
                          style={{
                            imageRendering: 'pixelated',
                            backgroundColor: 'rgba(255, 0, 0, 0.15)'
                          }}
                          onMouseDown={(e) => {
                            setIsDrawing(true)
                            const canvas = e.currentTarget
                            const rect = canvas.getBoundingClientRect()
                            const scaleX = canvas.width / rect.width
                            const scaleY = canvas.height / rect.height
                            const x = (e.clientX - rect.left) * scaleX
                            const y = (e.clientY - rect.top) * scaleY
                            const ctx = canvas.getContext('2d')
                            if (ctx) {
                              ctx.beginPath()
                              ctx.moveTo(x, y)
                            }
                          }}
                          onMouseMove={(e) => {
                            if (!isDrawing) return
                            const canvas = e.currentTarget
                            const rect = canvas.getBoundingClientRect()
                            const scaleX = canvas.width / rect.width
                            const scaleY = canvas.height / rect.height
                            const x = (e.clientX - rect.left) * scaleX
                            const y = (e.clientY - rect.top) * scaleY
                            const ctx = canvas.getContext('2d')
                            if (ctx) {
                              ctx.strokeStyle = 'white'
                              ctx.lineWidth = brushSize
                              ctx.lineCap = 'round'
                              ctx.lineJoin = 'round'
                              ctx.lineTo(x, y)
                              ctx.stroke()
                            }
                          }}
                          onMouseUp={() => {
                            setIsDrawing(false)
                            const canvas = document.getElementById('mask-canvas') as HTMLCanvasElement
                            if (canvas) setMaskCanvas(canvas)
                          }}
                          onMouseLeave={() => setIsDrawing(false)}
                        />
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col gap-3">
                          {/* Brush size control */}
                          <div className="bg-white/95 backdrop-blur-sm px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-700">브러시 크기:</span>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={brushSize}
                              onChange={(e) => setBrushSize(Number(e.target.value))}
                              className="w-48 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((brushSize - 10) / 90) * 100}%, #e2e8f0 ${((brushSize - 10) / 90) * 100}%, #e2e8f0 100%)`
                              }}
                            />
                            <span className="text-sm font-bold text-slate-900 w-10">{brushSize}px</span>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={clearMask}
                              disabled={!maskCanvas}
                              className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-medium shadow-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              초기화
                            </button>
                            <button
                              onClick={applyTextRemoval}
                              disabled={removingText || !maskCanvas}
                              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium shadow-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {removingText ? '제거 중...' : '적용'}
                            </button>
                            <button
                              onClick={cancelDrawingMode}
                              className="px-6 py-3 bg-slate-500 text-white rounded-lg font-medium shadow-lg hover:bg-slate-600 transition-all"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {editMode === 'detail-images' && (
                  <div className="w-full">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 mx-auto" style={{ maxWidth: `${zoom}%` }}>
                      {/* 배송 안내 이미지 (항상 맨 위에 표시) */}
                      <div className="mb-4">
                        <img
                          src="/shipping-notice.png"
                          alt="배송 안내"
                          className="w-full h-auto rounded-lg"
                        />
                      </div>

                      {editData.descImages && editData.descImages.length > 0 ? (
                        <div className="space-y-4">
                          {editData.descImages.map((img: string, idx: number) => (
                            <div key={idx} className="relative group">
                              <img
                                src={normalizeImageUrl(img)}
                                alt={`Detail ${idx + 1}`}
                                className="w-full h-auto rounded-lg"
                              />
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => removeImage(idx)}
                                  className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg transition-all"
                                >
                                  <X size={16} strokeWidth={2} />
                                </button>
                              </div>
                              <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/70 text-white rounded-lg text-sm font-medium">
                                {idx + 1} / {editData.descImages.length}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-96 h-96 flex flex-col items-center justify-center mx-auto">
                          <FileText size={64} className="text-slate-300 mb-4" strokeWidth={2} />
                          <p className="text-slate-500 font-medium">상세페이지 이미지가 없습니다</p>
                        </div>
                      )}
                    </div>
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
                          className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-lg font-medium text-slate-900"
                        />
                        <p className="text-sm font-medium text-slate-600 mt-2">
                          한화: ₩{Math.round(editData.price * 200).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">
                          배송비 (KRW)
                          {editingProduct?.data?.shipping_cost > 0 ? (
                            <span className="ml-2 text-xs font-normal text-green-600">
                              • 수동 설정됨
                            </span>
                          ) : editData.weight > 0 ? (
                            <span className="ml-2 text-xs font-normal text-blue-600">
                              • {editData.weight}kg 기준 자동 계산
                            </span>
                          ) : (
                            <span className="ml-2 text-xs font-normal text-orange-600">
                              • 기본 배송비 자동 적용
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          value={editData.shippingCost}
                          onChange={(e) => {
                            const shipping = parseInt(e.target.value) || 0
                            const price = editData.price || 0
                            const margin = editData.margin || 25
                            const cost = (price * 200) + shipping
                            const final = Math.round(cost * (1 + margin / 100))
                            setEditData({ ...editData, shippingCost: shipping, finalPrice: final })
                          }}
                          className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-lg font-medium text-slate-900"
                        />
                        <p className="text-sm text-slate-600 mt-2 font-medium">
                          ✏️ 배송비를 직접 수정하면 수동 설정으로 저장됩니다
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-3">
                          마진율 (%)
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            • 기본 25%
                          </span>
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
                          className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-lg font-medium text-slate-900"
                        />
                        <p className="text-sm text-slate-600 mt-2">
                          최종 판매가 = (원가 + 배송비) × (1 + 마진율)
                        </p>
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

                {editMode === 'options' && (
                  <div className="w-full max-w-4xl mx-auto p-6">
                    {/* Variants List */}
                    {editData.variants && editData.variants.length > 0 ? (
                      <div className="space-y-4">
                        {editData.variants.map((variant: any, index: number) => {
                          const firstOptionName = Object.keys(variant.options)[0]
                          const firstOptionValue = variant.options[firstOptionName]
                          const variantImage = variant.image || editData.options?.find((opt: any) => opt.name === firstOptionName)?.values.find((val: any) => val.name === firstOptionValue)?.image

                          // Get option label (e.g., "원호: 白色")
                          const optionLabel = Object.entries(variant.options)
                            .map(([name, value]) => `${name}: ${value}`)
                            .join(', ')

                          return (
                            <div
                              key={variant.sku_id || index}
                              className="bg-white rounded-xl p-6 flex items-center gap-6 border-2 border-slate-200 hover:border-blue-300 transition-all"
                            >
                              {/* Index */}
                              <div className="text-slate-900 font-bold text-lg min-w-[3rem]">
                                {String(index + 1).padStart(2, '0')}
                              </div>

                              {/* Image */}
                              <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border-2 border-slate-200">
                                {variantImage ? (
                                  <img
                                    src={variantImage}
                                    alt="Variant"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package size={32} className="text-slate-400" />
                                  </div>
                                )}
                              </div>

                              {/* Vendor/Platform */}
                              <div className="flex flex-col min-w-[80px]">
                                <div className="text-sm text-slate-500 mb-1">판매자</div>
                                <div className="text-base text-slate-900 font-medium">판매자</div>
                              </div>

                              {/* Price Input */}
                              <div className="flex-1 min-w-[140px]">
                                <div className="text-sm text-slate-500 mb-2">가격 (CNY)</div>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.price}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0
                                    const updatedVariants = [...editData.variants]
                                    updatedVariants[index] = { ...variant, price: newPrice }
                                    setEditData({ ...editData, variants: updatedVariants })
                                  }}
                                  className="w-full px-4 py-3 text-base bg-white border-2 border-slate-300 rounded-lg text-slate-900 text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                              </div>

                              {/* Option Name Input - Editable (Larger) */}
                              <div className="flex-1 min-w-[400px]">
                                <div className="text-sm text-slate-500 mb-2">번역된 총 옵션명</div>
                                <input
                                  type="text"
                                  value={optionLabel}
                                  onChange={(e) => {
                                    const newOptionText = e.target.value
                                    // Parse "key: value, key: value" format
                                    const newOptions: { [key: string]: string } = {}
                                    const parts = newOptionText.split(',').map(p => p.trim())

                                    parts.forEach(part => {
                                      const [key, value] = part.split(':').map(s => s.trim())
                                      if (key && value) {
                                        newOptions[key] = value
                                      }
                                    })

                                    // Update variant with new options
                                    const updatedVariants = [...editData.variants]
                                    updatedVariants[index] = { ...variant, options: newOptions }
                                    setEditData({ ...editData, variants: updatedVariants })
                                  }}
                                  className="w-full px-4 py-3 text-base bg-white border-2 border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                  placeholder="옵션명: 값, 옵션명: 값"
                                />
                              </div>

                              {/* Stock Input */}
                              <div className="min-w-[100px]">
                                <div className="text-sm text-slate-500 mb-2">재고</div>
                                <input
                                  type="number"
                                  value={variant.stock}
                                  onChange={(e) => {
                                    const newStock = parseInt(e.target.value) || 0
                                    const updatedVariants = [...editData.variants]
                                    updatedVariants[index] = { ...variant, stock: newStock }
                                    setEditData({ ...editData, variants: updatedVariants })
                                  }}
                                  className="w-full px-4 py-3 text-base bg-white border-2 border-slate-300 rounded-lg text-slate-900 text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                              </div>

                              {/* Status Indicator */}
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500">
                                <Check size={20} className="text-white" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center">
                        <Package size={64} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">변형 정보가 없습니다</p>
                        <p className="text-sm text-slate-500 mt-2">단일 옵션 상품이거나 데이터를 가져오지 못했습니다</p>
                      </div>
                    )}
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

      {/* AI Category Selector Modal */}
      {showCategorySelectorModal && selectedProductForCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles size={24} className="text-blue-500" />
                AI 추천 카테고리 선택
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {products.find(p => p.id === selectedProductForCategory)?.title.substring(0, 50)}...
              </p>
            </div>

            {/* Category List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {categoryCache.get(selectedProductForCategory)?.map((category: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => selectCategoryFromModal(selectedProductForCategory, index)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      index === 0
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">
                              현재 선택됨
                            </span>
                          )}
                          <span className={`text-sm font-semibold ${
                            index === 0 ? 'text-blue-600' : 'text-slate-600'
                          }`}>
                            #{index + 1}
                          </span>
                        </div>
                        <div className={`text-base font-medium mb-2 ${
                          index === 0 ? 'text-blue-900' : 'text-slate-900'
                        }`}>
                          {category.category_path}
                        </div>
                        <div className="text-sm text-slate-600 line-clamp-2">
                          {category.reason}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`text-2xl font-bold ${
                          index === 0 ? 'text-blue-600' : 'text-slate-400'
                        }`}>
                          {category.confidence}%
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowCategorySelectorModal(false)
                  setSelectedProductForCategory(null)
                }}
                className="w-full px-4 py-2.5 rounded-lg font-medium text-sm bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && selectedProducts.size > 0 && (
        <CategorySelectionModal
          isOpen={showCategoryModal}
          productTitle={products.find(p => selectedProducts.has(p.id))?.title || '선택된 상품'}
          onConfirm={handleCategoryConfirmed}
          onCancel={() => setShowCategoryModal(false)}
        />
      )}

    </div>
  )
}
