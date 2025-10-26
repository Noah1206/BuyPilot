'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Undo, Redo, Trash2, Download, Loader2 } from 'lucide-react'
import { inpaintImage, loadImage, canvasToBase64 } from '@/lib/api-image-edit'

interface ImageEditorModalProps {
  imageUrl: string
  onClose: () => void
  onSave: (editedImageUrl: string) => void
}

interface HistoryState {
  imageData: ImageData
  maskData: ImageData
}

export default function ImageEditorModal({ imageUrl, onClose, onSave }: ImageEditorModalProps) {
  // Canvas refs
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)

  // State
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)

  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Load image on mount
  useEffect(() => {
    const loadAndDrawImage = async () => {
      try {
        // Fix image URL if needed
        let fixedImageUrl = imageUrl

        // Handle relative URLs
        if (imageUrl.startsWith('/static/')) {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
          fixedImageUrl = `${backendUrl}${imageUrl}`
        }

        // Handle protocol-relative URLs
        if (imageUrl.startsWith('//')) {
          fixedImageUrl = `https:${imageUrl}`
        }

        const img = await loadImage(fixedImageUrl)
        setOriginalImage(img)

        const imageCanvas = imageCanvasRef.current
        const maskCanvas = maskCanvasRef.current

        if (!imageCanvas || !maskCanvas) return

        // Set canvas size to match image
        imageCanvas.width = img.width
        imageCanvas.height = img.height
        maskCanvas.width = img.width
        maskCanvas.height = img.height

        // Draw original image
        const imageCtx = imageCanvas.getContext('2d')
        if (imageCtx) {
          imageCtx.drawImage(img, 0, 0)
        }

        // Initialize mask (transparent)
        const maskCtx = maskCanvas.getContext('2d')
        if (maskCtx) {
          maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
        }

        // Save initial state
        saveToHistory()
      } catch (err) {
        setError('Failed to load image')
        console.error(err)
      }
    }

    loadAndDrawImage()
  }, [imageUrl])

  // Save current state to history
  const saveToHistory = useCallback(() => {
    const imageCanvas = imageCanvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!imageCanvas || !maskCanvas) return

    const imageCtx = imageCanvas.getContext('2d')
    const maskCtx = maskCanvas.getContext('2d')
    if (!imageCtx || !maskCtx) return

    const newState: HistoryState = {
      imageData: imageCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height),
      maskData: maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height),
    }

    // Remove future states if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)

    // Limit history to 20 states
    if (newHistory.length > 20) {
      newHistory.shift()
    } else {
      setHistoryIndex(historyIndex + 1)
    }

    setHistory(newHistory)
  }, [history, historyIndex])

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return

    const newIndex = historyIndex - 1
    const state = history[newIndex]

    const imageCanvas = imageCanvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!imageCanvas || !maskCanvas) return

    const imageCtx = imageCanvas.getContext('2d')
    const maskCtx = maskCanvas.getContext('2d')
    if (!imageCtx || !maskCtx) return

    imageCtx.putImageData(state.imageData, 0, 0)
    maskCtx.putImageData(state.maskData, 0, 0)

    setHistoryIndex(newIndex)
  }, [history, historyIndex])

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return

    const newIndex = historyIndex + 1
    const state = history[newIndex]

    const imageCanvas = imageCanvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!imageCanvas || !maskCanvas) return

    const imageCtx = imageCanvas.getContext('2d')
    const maskCtx = maskCanvas.getContext('2d')
    if (!imageCtx || !maskCtx) return

    imageCtx.putImageData(state.imageData, 0, 0)
    maskCtx.putImageData(state.maskData, 0, 0)

    setHistoryIndex(newIndex)
  }, [history, historyIndex])

  // Clear mask
  const handleClearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const maskCtx = maskCanvas.getContext('2d')
    if (!maskCtx) return

    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
    saveToHistory()
  }, [saveToHistory])

  // Get mouse position relative to canvas
  const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // Draw on mask
  const drawOnMask = (x: number, y: number) => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    const ctx = maskCanvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)' // Red semi-transparent
    ctx.beginPath()
    ctx.arc(x, y, brushSize, 0, Math.PI * 2)
    ctx.fill()
  }

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const pos = getMousePos(e.currentTarget, e)
    drawOnMask(pos.x, pos.y)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const pos = getMousePos(e.currentTarget, e)
    drawOnMask(pos.x, pos.y)
  }

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveToHistory()
    }
  }

  // Inpaint (AI removal)
  const handleInpaint = async () => {
    const imageCanvas = imageCanvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!imageCanvas || !maskCanvas) return

    setLoading(true)
    setError(null)

    try {
      // Convert canvases to base64
      const imageBase64 = canvasToBase64(imageCanvas)

      // Convert red mask to white/black mask (white = remove)
      const maskCopy = document.createElement('canvas')
      maskCopy.width = maskCanvas.width
      maskCopy.height = maskCanvas.height
      const maskCopyCtx = maskCopy.getContext('2d')
      if (!maskCopyCtx) return

      // Draw original mask
      maskCopyCtx.drawImage(maskCanvas, 0, 0)

      // Convert red to white
      const imageData = maskCopyCtx.getImageData(0, 0, maskCopy.width, maskCopy.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        // If pixel has some red (from our red mask)
        if (data[i] > 50) {
          // Make it white
          data[i] = 255     // R
          data[i + 1] = 255 // G
          data[i + 2] = 255 // B
          data[i + 3] = 255 // A
        } else {
          // Make it black
          data[i] = 0
          data[i + 1] = 0
          data[i + 2] = 0
          data[i + 3] = 255
        }
      }

      maskCopyCtx.putImageData(imageData, 0, 0)
      const maskBase64 = canvasToBase64(maskCopy)

      // Call inpainting API
      const response = await inpaintImage(imageBase64, maskBase64)

      if (!response.ok || !response.data) {
        throw new Error(response.error?.message || 'Inpainting failed')
      }

      // Load result image
      const resultImg = await loadImage(response.data.result)

      // Draw result on canvas
      const imageCtx = imageCanvas.getContext('2d')
      if (imageCtx) {
        imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height)
        imageCtx.drawImage(resultImg, 0, 0)
      }

      // Clear mask
      const maskCtx = maskCanvas.getContext('2d')
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
      }

      saveToHistory()
    } catch (err: any) {
      setError(err.message || 'Failed to inpaint image')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Save edited image
  const handleSaveImage = () => {
    const imageCanvas = imageCanvasRef.current
    if (!imageCanvas) return

    const editedImageUrl = canvasToBase64(imageCanvas)
    onSave(editedImageUrl)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
          <h2 className="text-xl font-semibold text-white">✏️ 이미지 편집 - AI 배경 제거</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 p-4 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">브러시 크기:</label>
            <input
              type="range"
              min="5"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-gray-400 w-12">{brushSize}px</span>
          </div>

          <div className="flex-1" />

          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
            실행 취소
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            title="Redo (Ctrl+Y)"
          >
            <Redo size={16} />
            다시 실행
          </button>

          <button
            onClick={handleClearMask}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            title="Clear mask"
          >
            <Trash2 size={16} />
            마스크 초기화
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-4 bg-[#0d1117]">
          <div className="relative inline-block">
            {/* Image canvas (bottom layer) */}
            <canvas
              ref={imageCanvasRef}
              className="border border-[#30363d] rounded-lg max-w-full h-auto"
            />

            {/* Mask canvas (top layer) */}
            <canvas
              ref={maskCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="absolute top-0 left-0 border border-transparent rounded-lg cursor-crosshair"
            />
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg max-w-2xl">
            <p className="text-sm text-blue-300">
              💡 <strong>사용 방법:</strong> 제거하고 싶은 영역을 브러시로 드래그하세요. 빨간색으로 표시된 영역이 AI로 자동 제거됩니다.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-300 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#30363d]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            취소
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleInpaint}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  AI 처리 중...
                </>
              ) : (
                <>
                  🤖 AI로 제거
                </>
              )}
            </button>

            <button
              onClick={handleSaveImage}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
