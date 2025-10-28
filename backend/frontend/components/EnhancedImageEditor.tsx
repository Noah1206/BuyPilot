'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Undo, Redo, Trash2, Download, Loader2, Edit3, Crop, Palette, Sliders, RotateCw, FlipHorizontal, FlipVertical, ZoomIn, ZoomOut, Move } from 'lucide-react'
import { inpaintImage, loadImage, canvasToBase64 } from '@/lib/api-image-edit'

interface EnhancedImageEditorProps {
  imageUrl: string
  onClose: () => void
  onSave: (editedImageUrl: string, editType: 'thumbnail' | 'detail') => void
}

interface HistoryState {
  imageData: ImageData
  maskData: ImageData
}

type EditMode = 'inpaint' | 'crop' | 'filter' | 'transform'
type EditSection = 'thumbnail' | 'detail'

export default function EnhancedImageEditor({ imageUrl, onClose, onSave }: EnhancedImageEditorProps) {
  // Canvas refs
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null)
  const detailCanvasRef = useRef<HTMLCanvasElement>(null)

  // State
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [editMode, setEditMode] = useState<EditMode>('inpaint')
  const [activeSection, setActiveSection] = useState<EditSection>('thumbnail')
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Crop state
  const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null)
  const [cropEnd, setCropEnd] = useState<{x: number, y: number} | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  // Filter state
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    sepia: 0,
    grayscale: 0
  })

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

        // Set up main canvas
        const imageCanvas = imageCanvasRef.current
        const maskCanvas = maskCanvasRef.current
        const thumbnailCanvas = thumbnailCanvasRef.current
        const detailCanvas = detailCanvasRef.current

        if (!imageCanvas || !maskCanvas || !thumbnailCanvas || !detailCanvas) return

        // Set canvas size to match image
        const canvases = [imageCanvas, maskCanvas, detailCanvas]
        canvases.forEach(canvas => {
          canvas.width = img.width
          canvas.height = img.height
        })

        // Set thumbnail canvas size (square aspect ratio for thumbnail)
        const thumbnailSize = Math.min(img.width, img.height)
        thumbnailCanvas.width = thumbnailSize
        thumbnailCanvas.height = thumbnailSize

        // Draw original image on all canvases
        const imageCtx = imageCanvas.getContext('2d')
        const thumbnailCtx = thumbnailCanvas.getContext('2d')
        const detailCtx = detailCanvas.getContext('2d')

        if (imageCtx) {
          imageCtx.drawImage(img, 0, 0)
        }

        if (thumbnailCtx) {
          // For thumbnail, crop to center square
          const sourceX = (img.width - thumbnailSize) / 2
          const sourceY = (img.height - thumbnailSize) / 2
          thumbnailCtx.drawImage(
            img,
            sourceX, sourceY, thumbnailSize, thumbnailSize,
            0, 0, thumbnailSize, thumbnailSize
          )
        }

        if (detailCtx) {
          detailCtx.drawImage(img, 0, 0)
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

  // Apply filters to active canvas
  const applyFilters = useCallback(() => {
    const canvas = activeSection === 'thumbnail' ? thumbnailCanvasRef.current : detailCanvasRef.current
    if (!canvas || !originalImage) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear and redraw with filters
    ctx.filter = `
      brightness(${filters.brightness}%)
      contrast(${filters.contrast}%)
      saturate(${filters.saturation}%)
      blur(${filters.blur}px)
      sepia(${filters.sepia}%)
      grayscale(${filters.grayscale}%)
    `

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (activeSection === 'thumbnail') {
      const size = Math.min(originalImage.width, originalImage.height)
      const sourceX = (originalImage.width - size) / 2
      const sourceY = (originalImage.height - size) / 2
      ctx.drawImage(originalImage, sourceX, sourceY, size, size, 0, 0, canvas.width, canvas.height)
    } else {
      ctx.drawImage(originalImage, 0, 0)
    }

    ctx.filter = 'none'
  }, [filters, activeSection, originalImage])

  // Apply filters when they change
  useEffect(() => {
    applyFilters()
  }, [filters, applyFilters])

  // Crop functionality
  const startCrop = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editMode !== 'crop') return
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCropStart({ x, y })
    setIsCropping(true)
  }

  const updateCrop = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editMode !== 'crop' || !isCropping || !cropStart) return
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCropEnd({ x, y })
  }

  const endCrop = () => {
    setIsCropping(false)
  }

  // Apply crop
  const applyCrop = () => {
    if (!cropStart || !cropEnd) return

    const canvas = activeSection === 'thumbnail' ? thumbnailCanvasRef.current : detailCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(
      Math.min(cropStart.x, cropEnd.x),
      Math.min(cropStart.y, cropEnd.y),
      Math.abs(cropEnd.x - cropStart.x),
      Math.abs(cropEnd.y - cropStart.y)
    )

    canvas.width = imageData.width
    canvas.height = imageData.height
    ctx.putImageData(imageData, 0, 0)

    setCropStart(null)
    setCropEnd(null)
    saveToHistory()
  }

  // Transform functions
  const rotateImage = (degrees: number) => {
    const canvas = activeSection === 'thumbnail' ? thumbnailCanvasRef.current : detailCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const newRotation = (rotation + degrees) % 360
    setRotation(newRotation)

    // Simple rotation implementation
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((newRotation * Math.PI) / 180)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)
    ctx.putImageData(imageData, 0, 0)
    ctx.restore()

    saveToHistory()
  }

  const flipImage = (direction: 'horizontal' | 'vertical') => {
    const canvas = activeSection === 'thumbnail' ? thumbnailCanvasRef.current : detailCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    ctx.save()
    if (direction === 'horizontal') {
      ctx.scale(-1, 1)
      ctx.translate(-canvas.width, 0)
    } else {
      ctx.scale(1, -1)
      ctx.translate(0, -canvas.height)
    }
    ctx.putImageData(imageData, 0, 0)
    ctx.restore()

    saveToHistory()
  }

  // Reset filters
  const resetFilters = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      sepia: 0,
      grayscale: 0
    })
  }

  // Save edited image
  const handleSaveImage = () => {
    const canvas = activeSection === 'thumbnail' ? thumbnailCanvasRef.current : detailCanvasRef.current
    if (!canvas) return

    const editedImageUrl = canvasToBase64(canvas)
    onSave(editedImageUrl, activeSection)
  }

  // Inpaint functionality (existing logic)
  const handleInpaint = async () => {
    const imageCanvas = imageCanvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!imageCanvas || !maskCanvas) return

    setLoading(true)
    setError(null)

    try {
      const imageBase64 = canvasToBase64(imageCanvas)
      const maskCopy = document.createElement('canvas')
      maskCopy.width = maskCanvas.width
      maskCopy.height = maskCanvas.height
      const maskCopyCtx = maskCopy.getContext('2d')
      if (!maskCopyCtx) return

      maskCopyCtx.drawImage(maskCanvas, 0, 0)
      const imageData = maskCopyCtx.getImageData(0, 0, maskCopy.width, maskCopy.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 50) {
          data[i] = 255
          data[i + 1] = 255
          data[i + 2] = 255
          data[i + 3] = 255
        } else {
          data[i] = 0
          data[i + 1] = 0
          data[i + 2] = 0
          data[i + 3] = 255
        }
      }

      maskCopyCtx.putImageData(imageData, 0, 0)
      const maskBase64 = canvasToBase64(maskCopy)

      const response = await inpaintImage(imageBase64, maskBase64)

      if (!response.ok || !response.data) {
        throw new Error(response.error?.message || 'Inpainting failed')
      }

      const resultImg = await loadImage(response.data.result)
      const imageCtx = imageCanvas.getContext('2d')
      if (imageCtx) {
        imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height)
        imageCtx.drawImage(resultImg, 0, 0)
      }

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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
          <h2 className="text-xl font-semibold text-white">🎨 Enhanced Image Editor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-[#30363d]">
          <button
            onClick={() => setActiveSection('thumbnail')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeSection === 'thumbnail'
                ? 'bg-[#21262d] text-white border-b-2 border-[#58a6ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📸 Thumbnail Editor
          </button>
          <button
            onClick={() => setActiveSection('detail')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeSection === 'detail'
                ? 'bg-[#21262d] text-white border-b-2 border-[#58a6ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🖼️ Detail Page Editor
          </button>
        </div>

        {/* Tool Tabs */}
        <div className="flex border-b border-[#30363d] bg-[#0d1117]">
          <button
            onClick={() => setEditMode('inpaint')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              editMode === 'inpaint'
                ? 'bg-[#21262d] text-white border-b-2 border-[#58a6ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Edit3 size={16} />
            AI Remove
          </button>
          <button
            onClick={() => setEditMode('crop')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              editMode === 'crop'
                ? 'bg-[#21262d] text-white border-b-2 border-[#58a6ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Crop size={16} />
            Crop
          </button>
          <button
            onClick={() => setEditMode('filter')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              editMode === 'filter'
                ? 'bg-[#21262d] text-white border-b-2 border-[#58a6ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders size={16} />
            Filters
          </button>
          <button
            onClick={() => setEditMode('transform')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              editMode === 'transform'
                ? 'bg-[#21262d] text-white border-b-2 border-[#58a6ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <RotateCw size={16} />
            Transform
          </button>
        </div>

        {/* Tool Controls */}
        <div className="p-4 border-b border-[#30363d] bg-[#0d1117]">
          {editMode === 'inpaint' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300">Brush Size:</label>
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
            </div>
          )}

          {editMode === 'filter' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-300">Brightness: {filters.brightness}%</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={filters.brightness}
                  onChange={(e) => setFilters(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Contrast: {filters.contrast}%</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={filters.contrast}
                  onChange={(e) => setFilters(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Saturation: {filters.saturation}%</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={filters.saturation}
                  onChange={(e) => setFilters(prev => ({ ...prev, saturation: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Blur: {filters.blur}px</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={filters.blur}
                  onChange={(e) => setFilters(prev => ({ ...prev, blur: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Sepia: {filters.sepia}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.sepia}
                  onChange={(e) => setFilters(prev => ({ ...prev, sepia: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Grayscale: {filters.grayscale}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.grayscale}
                  onChange={(e) => setFilters(prev => ({ ...prev, grayscale: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div className="col-span-3 flex justify-end">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}

          {editMode === 'transform' && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => rotateImage(90)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCw size={16} />
                Rotate 90°
              </button>
              <button
                onClick={() => flipImage('horizontal')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <FlipHorizontal size={16} />
                Flip H
              </button>
              <button
                onClick={() => flipImage('vertical')}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <FlipVertical size={16} />
                Flip V
              </button>
            </div>
          )}

          {editMode === 'crop' && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">Click and drag to select crop area</span>
              {cropStart && cropEnd && (
                <button
                  onClick={applyCrop}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Apply Crop
                </button>
              )}
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-4 bg-[#0d1117]">
          <div className="flex gap-6">
            {/* Main Editing Canvas */}
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white mb-4">
                {activeSection === 'thumbnail' ? '📸 Thumbnail Preview' : '🖼️ Detail Page Preview'}
              </h3>
              <div className="relative inline-block border border-[#30363d] rounded-lg overflow-hidden">
                {/* Show the appropriate canvas based on active section */}
                {activeSection === 'thumbnail' ? (
                  <canvas
                    ref={thumbnailCanvasRef}
                    onMouseDown={editMode === 'crop' ? startCrop : undefined}
                    onMouseMove={editMode === 'crop' ? updateCrop : undefined}
                    onMouseUp={editMode === 'crop' ? endCrop : undefined}
                    className="max-w-[400px] max-h-[400px] bg-white"
                    style={{ cursor: editMode === 'crop' ? 'crosshair' : 'default' }}
                  />
                ) : (
                  <canvas
                    ref={detailCanvasRef}
                    onMouseDown={editMode === 'crop' ? startCrop : undefined}
                    onMouseMove={editMode === 'crop' ? updateCrop : undefined}
                    onMouseUp={editMode === 'crop' ? endCrop : undefined}
                    className="max-w-[600px] max-h-[600px] bg-white"
                    style={{ cursor: editMode === 'crop' ? 'crosshair' : 'default' }}
                  />
                )}

                {/* Crop overlay */}
                {editMode === 'crop' && cropStart && cropEnd && (
                  <div
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20"
                    style={{
                      left: Math.min(cropStart.x, cropEnd.x),
                      top: Math.min(cropStart.y, cropEnd.y),
                      width: Math.abs(cropEnd.x - cropStart.x),
                      height: Math.abs(cropEnd.y - cropStart.y),
                    }}
                  />
                )}
              </div>
            </div>

            {/* AI Inpaint Canvas (only show for inpaint mode) */}
            {editMode === 'inpaint' && (
              <div className="w-96">
                <h3 className="text-lg font-medium text-white mb-4">🤖 AI Object Removal</h3>
                <div className="relative inline-block border border-[#30363d] rounded-lg overflow-hidden">
                  <canvas
                    ref={imageCanvasRef}
                    className="max-w-full h-auto bg-white"
                  />
                  <canvas
                    ref={maskCanvasRef}
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
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
                        ctx.beginPath()
                        ctx.arc(x, y, brushSize, 0, Math.PI * 2)
                        ctx.fill()
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
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
                        ctx.beginPath()
                        ctx.arc(x, y, brushSize, 0, Math.PI * 2)
                        ctx.fill()
                      }
                    }}
                    onMouseUp={() => {
                      if (isDrawing) {
                        setIsDrawing(false)
                        saveToHistory()
                      }
                    }}
                    onMouseLeave={() => setIsDrawing(false)}
                    className="absolute top-0 left-0 cursor-crosshair"
                  />
                </div>

                <div className="mt-4">
                  <button
                    onClick={handleInpaint}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        AI Processing...
                      </>
                    ) : (
                      <>
                        🤖 AI Remove
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg max-w-4xl">
            <p className="text-sm text-blue-300">
              💡 <strong>Quick Guide:</strong>
              {activeSection === 'thumbnail' && ' Thumbnail images are cropped to square format for optimal display in product lists.'}
              {activeSection === 'detail' && ' Detail page images maintain original aspect ratio for product details.'}
              {editMode === 'inpaint' && ' Paint over objects you want to remove with the red brush.'}
              {editMode === 'crop' && ' Click and drag to select the area you want to keep.'}
              {editMode === 'filter' && ' Adjust sliders to enhance your image appearance.'}
              {editMode === 'transform' && ' Use buttons to rotate and flip your image.'}
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
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              Editing: {activeSection === 'thumbnail' ? 'Thumbnail' : 'Detail Page'}
            </span>
            <button
              onClick={handleSaveImage}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Save {activeSection === 'thumbnail' ? 'Thumbnail' : 'Detail'} Image
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}