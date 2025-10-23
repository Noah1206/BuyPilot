'use client'

import { useRef, useState, useEffect } from 'react'

interface ImageEditorProps {
  imageUrl: string
  onSave?: (editedImageUrl: string) => void
  onCancel?: () => void
}

export default function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<'eraser' | 'brush'>('eraser')

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
      drawImage(img)
    }
    img.src = imageUrl
  }, [imageUrl])

  const drawImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match image
    const maxWidth = 800
    const scale = Math.min(1, maxWidth / img.width)
    canvas.width = img.width * scale
    canvas.height = img.height * scale

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.fillStyle = tool === 'brush' ? '#ffffff' : 'rgba(0,0,0,1)'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) return

      // Create object URL
      const url = URL.createObjectURL(blob)
      onSave?.(url)
    }, 'image/png')
  }

  const handleReset = () => {
    if (image) {
      drawImage(image)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#e6edf3]">이미지 편집</h2>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[#8d96a0] hover:text-[#e6edf3] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#30363d]">
          <div className="flex gap-2">
            <button
              onClick={() => setTool('eraser')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tool === 'eraser'
                  ? 'bg-[#238636] text-white'
                  : 'bg-[#21262d] text-[#8d96a0] hover:bg-[#30363d]'
              }`}
            >
              지우개
            </button>
            <button
              onClick={() => setTool('brush')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tool === 'brush'
                  ? 'bg-[#238636] text-white'
                  : 'bg-[#21262d] text-[#8d96a0] hover:bg-[#30363d]'
              }`}
            >
              브러시
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-[#8d96a0]">크기:</label>
            <input
              type="range"
              min="5"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-[#e6edf3] w-8">{brushSize}</span>
          </div>

          <button
            onClick={handleReset}
            className="ml-auto px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#8d96a0] rounded-lg text-sm transition-colors"
          >
            초기화
          </button>
        </div>

        {/* Canvas */}
        <div className="bg-[#0d1117] rounded-lg p-4 mb-4 flex items-center justify-center overflow-auto max-h-[60vh]">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="cursor-crosshair border border-[#30363d]"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[#238636] hover:bg-[#2ea043] text-white font-medium rounded-lg transition-colors"
          >
            저장
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
          <p className="text-xs text-[#8d96a0]">
            💡 <strong>사용법:</strong> 지우개로 워터마크나 스티커를 제거할 수 있습니다.
            브러시 크기를 조절하여 정밀하게 편집하세요.
          </p>
        </div>
      </div>
    </div>
  )
}
