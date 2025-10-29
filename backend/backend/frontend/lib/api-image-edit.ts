/**
 * Image Editing API Client
 * AI 이미지 인페인팅 (배경 제거, 객체 제거)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export interface InpaintRequest {
  image: string // base64
  mask: string // base64
  model?: 'lama' | 'ldm' | 'mat'
}

export interface InpaintResponse {
  ok: boolean
  data?: {
    result: string // base64
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface ServiceStatusResponse {
  ok: boolean
  data?: {
    service_running: boolean
    service_url: string
    message: string
  }
  error?: {
    code: string
    message: string
  }
}

/**
 * AI 이미지 인페인팅
 * @param image - 원본 이미지 (base64)
 * @param mask - 마스크 (base64, 흰색=제거 영역)
 * @param model - 인페인팅 모델 (default: lama)
 */
export async function inpaintImage(
  image: string,
  mask: string,
  model: 'lama' | 'ldm' | 'mat' = 'lama'
): Promise<InpaintResponse> {
  const response = await fetch(`${API_BASE}/api/image/inpaint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image,
      mask,
      model,
    }),
  })

  return await response.json()
}

/**
 * IOPaint 서비스 상태 확인
 */
export async function checkInpaintServiceStatus(): Promise<ServiceStatusResponse> {
  const response = await fetch(`${API_BASE}/api/image/inpaint/status`, {
    method: 'GET',
  })

  return await response.json()
}

/**
 * 이미지를 base64로 변환
 * @param file - File 객체
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Canvas를 base64로 변환
 * @param canvas - HTMLCanvasElement
 */
export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}

/**
 * base64 이미지를 Image 객체로 로드
 * @param base64 - base64 인코딩된 이미지
 */
export function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = base64
  })
}
