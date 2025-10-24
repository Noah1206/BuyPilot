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
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyStep, setHistoryStep] = useState(-1)

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

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      onSave?.(url)
    }, 'image/png')
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

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-[#0d1117] border-b border-[#30363d]">
          {/* Tools */}
          <div className="flex gap-2">
            <button
              onClick={() => setTool('eraser')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                tool === 'eraser'
                  ? 'bg-gradient-to-r from-[#238636] to-[#2ea043] text-white shadow-lg shadow-[#238636]/30'
                  : 'bg-[#21262d] text-[#8d96a0] hover:bg-[#30363d] hover:text-[#e6edf3]'
              }`}
            >
              <span className="text-lg">🧹</span>
              지우개
            </button>
            <button
              onClick={() => setTool('brush')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                tool === 'brush'
                  ? 'bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] text-white shadow-lg shadow-[#1f6feb]/30'
                  : 'bg-[#21262d] text-[#8d96a0] hover:bg-[#30363d] hover:text-[#e6edf3]'
              }`}
            >
              <span className="text-lg">🖌️</span>
              브러시
            </button>
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-3 px-4 py-2 bg-[#21262d] rounded-lg border border-[#30363d]">
            <label className="text-sm font-medium text-[#e6edf3]">크기</label>
            <input
              type="range"
              min="5"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-32 h-2 bg-[#30363d] rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r
                [&::-webkit-slider-thumb]:from-[#238636] [&::-webkit-slider-thumb]:to-[#2ea043]
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#238636]/50"
            />
            <span className="text-sm font-mono text-[#58a6ff] w-10 text-right">{brushSize}px</span>
          </div>

          {/* History Controls */}
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={historyStep <= 0}
              className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] disabled:bg-[#21262d] disabled:opacity-30
                text-[#e6edf3] disabled:text-[#6e7681] rounded-lg text-sm transition-all flex items-center gap-2"
              title="실행 취소 (Ctrl+Z)"
            >
              <span className="text-lg">↶</span>
              실행취소
            </button>
            <button
              onClick={redo}
              disabled={historyStep >= history.length - 1}
              className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] disabled:bg-[#21262d] disabled:opacity-30
                text-[#e6edf3] disabled:text-[#6e7681] rounded-lg text-sm transition-all flex items-center gap-2"
              title="다시 실행 (Ctrl+Y)"
            >
              <span className="text-lg">↷</span>
              다시실행
            </button>
          </div>

          <div className="flex-1"></div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-[#6e7681]/20 hover:bg-[#6e7681]/30 text-[#8d96a0] hover:text-[#e6edf3]
              rounded-lg text-sm transition-all flex items-center gap-2 border border-[#6e7681]/30"
          >
            <span className="text-lg">🔄</span>
            초기화
          </button>
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

        {/* Footer with Actions */}
        <div className="flex items-center justify-between p-6 border-t border-[#30363d] bg-[#0d1117]">
          {/* Tips */}
          <div className="flex items-start gap-3 flex-1 mr-6">
            <div className="text-2xl">💡</div>
            <div className="text-xs text-[#8d96a0] space-y-1">
              <p><strong className="text-[#e6edf3]">사용 팁:</strong></p>
              <p>• 지우개로 워터마크, 로고, 배경 텍스트 제거</p>
              <p>• 브러시로 지운 부분을 흰색으로 복원</p>
              <p>• 브러시 크기를 조절하여 정밀하게 편집</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] rounded-lg transition-all font-medium border border-[#30363d]"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#238636]
                text-white font-bold rounded-lg transition-all shadow-lg shadow-[#238636]/30
                hover:shadow-xl hover:shadow-[#238636]/40 flex items-center gap-2"
            >
              <span className="text-lg">💾</span>
              저장하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
