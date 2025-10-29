/**
 * API client utilities for BuyPilot backend
 */

// Determine API URL based on environment
function getApiUrl(): string {
  // In browser, check if we're on Railway (production)
  if (typeof window !== 'undefined') {
    // If origin is Railway domain, use same origin for API
    if (window.location.origin.includes('railway.app')) {
      return window.location.origin
    }
  }

  // Use environment variable or localhost for development
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4070'
}

const API_URL = getApiUrl()

interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
    details: any
  }
}

interface Order {
  id: string
  status: string
  platform: string
  platform_order_ref: string
  items: any[]
  buyer: any
  meta: any
  created_at: string
  updated_at: string
  supplier_id?: string
  supplier_order_id?: string
  forwarder_id?: string
  forwarder_job_id?: string
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
  data: any
  created_at: string
  updated_at: string
}

/**
 * Generate a UUID v4 for idempotency keys
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID()
}

/**
 * Generic API fetch wrapper
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('API fetch error:', error)
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to API',
        details: error,
      },
    }
  }
}

/**
 * Get list of orders
 */
export async function getOrders(params?: {
  status?: string
  platform?: string
  limit?: number
  offset?: number
}): Promise<ApiResponse<{ orders: Order[]; total: number; limit: number; offset: number }>> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.platform) searchParams.set('platform', params.platform)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const query = searchParams.toString()
  return apiFetch(`/api/v1/orders${query ? `?${query}` : ''}`)
}

/**
 * Get single order by ID
 */
export async function getOrder(orderId: string): Promise<ApiResponse<Order>> {
  return apiFetch(`/api/v1/orders/${orderId}`)
}

/**
 * Execute purchase for order (Approval Button 1)
 */
export async function executePurchase(
  orderId: string,
  options?: {
    payment_method?: any
    constraints?: any
    supplier_override?: any
  }
): Promise<ApiResponse<{ order_id: string; job_id: string; next_status: string }>> {
  return apiFetch(`/api/v1/orders/${orderId}/actions/execute-purchase`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': generateIdempotencyKey(),
    },
    body: JSON.stringify(options || {}),
  })
}

/**
 * Send order to forwarder (Approval Button 2)
 */
export async function sendToForwarder(
  orderId: string,
  options?: {
    forwarder_id?: string
    options?: any
  }
): Promise<ApiResponse<{ order_id: string; job_id: string; forwarder_id: string }>> {
  return apiFetch(`/api/v1/orders/${orderId}/actions/send-to-forwarder`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': generateIdempotencyKey(),
    },
    body: JSON.stringify(options || {}),
  })
}

/**
 * Retry failed order
 */
export async function retryOrder(orderId: string): Promise<ApiResponse<{ order_id: string; status: string }>> {
  return apiFetch(`/api/v1/orders/${orderId}/retry`, {
    method: 'POST',
  })
}

/**
 * Create new order (for testing)
 */
export async function createOrder(orderData: {
  platform: string
  platform_order_ref: string
  items: any[]
  buyer: any
  meta?: any
}): Promise<ApiResponse<{ order_id: string; status: string }>> {
  return apiFetch('/api/v1/events/order-created', {
    method: 'POST',
    body: JSON.stringify(orderData),
  })
}

/**
 * Health check
 */
export async function healthCheck(): Promise<ApiResponse<any>> {
  return apiFetch('/health')
}

/**
 * Import product from Taobao URL
 */
export async function importProduct(url: string): Promise<ApiResponse<{
  product_id: string
  message: string
  already_exists?: boolean
  product: Product
}>> {
  return apiFetch('/api/v1/products/import', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

/**
 * Get list of products
 */
export async function getProducts(params?: {
  source?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<ApiResponse<{ products: Product[]; total: number; limit: number; offset: number }>> {
  const searchParams = new URLSearchParams()
  if (params?.source) searchParams.set('source', params.source)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const query = searchParams.toString()
  return apiFetch(`/api/v1/products${query ? `?${query}` : ''}`)
}

/**
 * Get single product by ID
 */
export async function getProduct(productId: string): Promise<ApiResponse<Product>> {
  return apiFetch(`/api/v1/products/${productId}`)
}

/**
 * Update product
 */
export async function updateProduct(
  productId: string,
  updates: {
    title?: string
    price?: number
    stock?: number
    image_url?: string
    data?: any
  }
): Promise<ApiResponse<{ product_id: string; message: string; product: Product }>> {
  return apiFetch(`/api/v1/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

/**
 * Delete product
 */
export async function deleteProduct(productId: string): Promise<ApiResponse<{ product_id: string; message: string }>> {
  return apiFetch(`/api/v1/products/${productId}`, {
    method: 'DELETE',
  })
}

/**
 * Upload edited image for product
 */
export async function uploadProductImage(
  productId: string,
  imageBlob: Blob
): Promise<ApiResponse<{ image_url: string; filename: string; message: string }>> {
  try {
    const formData = new FormData()
    formData.append('image', imageBlob, 'edited.png')

    const response = await fetch(`${API_URL}/api/v1/products/${productId}/upload-image`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Image upload error:', error)
    return {
      ok: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Failed to upload image',
        details: error,
      },
    }
  }
}

/**
 * Register products to Naver SmartStore
 */
export async function registerToSmartStore(
  productIds: string[],
  settings?: {
    category_id?: string
    stock_quantity?: number
    origin_area?: string
    brand?: string
    manufacturer?: string
  }
): Promise<ApiResponse<{
  results: Array<{
    product_id: string
    product_name: string
    success: boolean
    smartstore_product_id?: string
    smartstore_url?: string
    error?: string
  }>
  summary: {
    total: number
    success: number
    failed: number
  }
}>> {
  return apiFetch('/api/v1/smartstore/register-products', {
    method: 'POST',
    body: JSON.stringify({
      product_ids: productIds,
      settings: settings || {},
    }),
  })
}

/**
 * Get SmartStore orders
 */
export async function getSmartStoreOrders(params?: {
  status?: string
  talktalk_status?: string
  limit?: number
  offset?: number
}): Promise<ApiResponse<{
  orders: any[]
  total: number
  limit: number
  offset: number
}>> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.talktalk_status) searchParams.set('talktalk_status', params.talktalk_status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const query = searchParams.toString()
  return apiFetch(`/api/v1/smartstore/orders${query ? `?${query}` : ''}`)
}
