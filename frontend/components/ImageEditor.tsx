'use client'

import { useRef, useState, useEffect } from 'react'
import { uploadProductImage } from '@/lib/api'

interface ImageEditorProps {
  imageUrl: string
  productId: string
  onSave?: (editedImageUrl: string) => void
  onCancel?: () => void
}

export default function ImageEditor({ imageUrl, productId, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<'eraser' | 'brush'>('eraser')
  const [_forceUpdate] = useState(0) // Force rebuild trigger
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyStep, setHistoryStep] = useState(-1)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
      drawImage(img)
      saveHistory()
    }
    img.src = imageUrl
  }, [imageUrl])

  const drawImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match image with max constraint
    const maxWidth = 1000
    const maxHeight = 700
    const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)

    canvas.width = img.width * scale
    canvas.height = img.height * scale

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }

  const saveHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(imageData)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
  }

  const undo = () => {
    if (historyStep <= 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const newStep = historyStep - 1
    ctx.putImageData(history[newStep], 0, 0)
    setHistoryStep(newStep)
  }

  const redo = () => {
    if (historyStep >= history.length - 1) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const newStep = historyStep + 1
    ctx.putImageData(history[newStep], 0, 0)
    setHistoryStep(newStep)
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveHistory()
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.fillStyle = tool === 'brush' ? '#ffffff' : 'rgba(0,0,0,1)'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas || isUploading) return

    setIsUploading(true)

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png')
      })

      if (!blob) {
        console.error('Failed to create blob from canvas')
        setIsUploading(false)
        return
      }

      // Upload to backend
      const response = await uploadProductImage(productId, blob)

      if (response.ok && response.data) {
        // Pass the permanent image URL back to parent
        onSave?.(response.data.image_url)
      } else {
        console.error('Upload failed:', response.error)
        alert(`업로드 실패: ${response.error?.message || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('Error saving image:', error)
      alert('이미지 저장 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    if (image) {
      drawImage(image)
      setHistory([])
      setHistoryStep(-1)
      saveHistory()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#30363d]">
          <div>
            <h2 className="text-2xl font-bold text-[#e6edf3] mb-1">🎨 이미지 편집기</h2>
            <p className="text-sm text-[#8d96a0]">워터마크와 배경을 지우고 깔끔한 이미지를 만드세요</p>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#30363d] text-[#8d96a0] hover:text-[#e6edf3] transition-all text-xl"
            title="닫기 (ESC)"
          >
            ✕
          </button>
        </div>


        {/* Main Content Area - Flex Row */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Controls */}
          <div className="w-80 bg-[#0d1117] border-r border-[#30363d] p-6 overflow-y-auto">
            {/* Tool Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#e6edf3] mb-3">편집 도구</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTool('eraser')}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-2 ${
                    tool === 'eraser'
                      ? 'bg-gradient-to-r from-[#238636] to-[#2ea043] text-white shadow-lg shadow-[#238636]/30'
                      : 'bg-[#21262d] text-[#8d96a0] hover:bg-[#30363d] hover:text-[#e6edf3]'
                  }`}
                >
                  <span className="text-2xl">🧹</span>
                  지우개
                </button>
                <button
                  onClick={() => setTool('brush')}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-2 ${
                    tool === 'brush'
                      ? 'bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] text-white shadow-lg shadow-[#1f6feb]/30'
                      : 'bg-[#21262d] text-[#8d96a0] hover:bg-[#30363d] hover:text-[#e6edf3]'
                  }`}
                >
                  <span className="text-2xl">🖌️</span>
                  브러시
                </button>
              </div>
            </div>

            {/* History Controls */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#e6edf3] mb-3">실행 취소/복구</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={undo}
                  disabled={historyStep <= 0}
                  className="px-3 py-3 bg-[#21262d] hover:bg-[#30363d] disabled:bg-[#21262d] disabled:opacity-30
                    text-[#e6edf3] disabled:text-[#6e7681] rounded-lg text-sm transition-all flex flex-col items-center gap-1"
                  title="실행 취소 (Ctrl+Z)"
                >
                  <span className="text-xl">↶</span>
                  <span className="text-xs">실행취소</span>
                </button>
                <button
                  onClick={redo}
                  disabled={historyStep >= history.length - 1}
                  className="px-3 py-3 bg-[#21262d] hover:bg-[#30363d] disabled:bg-[#21262d] disabled:opacity-30
                    text-[#e6edf3] disabled:text-[#6e7681] rounded-lg text-sm transition-all flex flex-col items-center gap-1"
                  title="다시 실행 (Ctrl+Y)"
                >
                  <span className="text-xl">↷</span>
                  <span className="text-xs">다시실행</span>
                </button>
              </div>
            </div>

            {/* Reset Button */}
            <div className="mb-6">
              <button
                onClick={handleReset}
                className="w-full px-4 py-3 bg-[#6e7681]/20 hover:bg-[#6e7681]/30 text-[#8d96a0] hover:text-[#e6edf3]
                  rounded-lg text-sm transition-all flex items-center justify-center gap-2 border border-[#6e7681]/30"
              >
                <span className="text-lg">🔄</span>
                초기화
              </button>
            </div>

            {/* Brush Size Control */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#e6edf3] mb-3">브러시 크기</h3>
              <div className="space-y-3">
                <input
                  type="range"
                  min="5"
                  max="150"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full h-3 bg-[#30363d] rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r
                    [&::-webkit-slider-thumb]:from-[#238636] [&::-webkit-slider-thumb]:to-[#2ea043]
                    [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#238636]/50
                    [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-webkit-slider-thumb]:transition-transform"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8d96a0]">5px</span>
                  <span className="text-2xl font-bold text-[#58a6ff]">{brushSize}px</span>
                  <span className="text-xs text-[#8d96a0]">150px</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mb-6 p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
              <div className="flex items-start gap-2 mb-2">
                <div className="text-xl">💡</div>
                <h3 className="text-sm font-bold text-[#e6edf3]">사용 팁</h3>
              </div>
              <div className="text-xs text-[#8d96a0] space-y-2">
                <p>• 지우개로 워터마크, 로고, 배경 텍스트 제거</p>
                <p>• 브러시로 지운 부분을 흰색으로 복원</p>
                <p>• 브러시 크기를 조절하여 정밀하게 편집</p>
                <p>• 하단 중앙 자막도 자유롭게 제거 가능</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#238636]
                  text-white font-bold rounded-lg transition-all shadow-lg shadow-[#238636]/30
                  hover:shadow-xl hover:shadow-[#238636]/40 flex items-center justify-center gap-2
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">{isUploading ? '⏳' : '💾'}</span>
                {isUploading ? '업로드 중...' : '저장하기'}
              </button>
              <button
                onClick={onCancel}
                className="w-full px-6 py-3 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] rounded-lg transition-all font-medium border border-[#30363d]"
              >
                취소
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-gradient-to-br from-[#0d1117] to-[#161b22] p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="relative">
                {/* Checkerboard background pattern */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: `
                    repeating-conic-gradient(#30363d 0% 25%, transparent 0% 50%) 50% / 20px 20px
                  `,
                }}></div>

                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="cursor-crosshair border-2 border-[#30363d] rounded-lg shadow-2xl relative bg-white"
                  style={{
                    cursor: tool === 'eraser' ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'><circle cx=\'12\' cy=\'12\' r=\'10\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\'/></svg>") 12 12, crosshair' : 'crosshair'
                  }}
                />

                {/* Brush preview cursor */}
                <div
                  className="pointer-events-none absolute hidden"
                  style={{
                    width: brushSize + 'px',
                    height: brushSize + 'px',
                    border: '2px solid ' + (tool === 'eraser' ? '#ff6b6b' : '#4dabf7'),
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
