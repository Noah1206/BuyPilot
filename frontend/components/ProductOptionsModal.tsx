/**
 * ProductOptionsModal - Display and edit product variants/options
 */

'use client'

import React from 'react'
import { X, Check, AlertCircle, Package2, Package, Edit2 } from 'lucide-react'

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

interface ProductOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  productTitle: string
  options: ProductOption[]
  variants: ProductVariant[]
  onSave?: (updatedVariants: ProductVariant[], updatedOptions?: ProductOption[]) => void
  editable?: boolean
}

export default function ProductOptionsModal({
  isOpen,
  onClose,
  productTitle,
  options,
  variants,
  onSave,
  editable = false
}: ProductOptionsModalProps) {
  const [editedVariants, setEditedVariants] = React.useState<ProductVariant[]>(variants)
  const [editedOptions, setEditedOptions] = React.useState<ProductOption[]>(options)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [selectedVariants, setSelectedVariants] = React.useState<Set<string>>(new Set())
  const [shippingCost, setShippingCost] = React.useState(13000)
  const [editingOptionName, setEditingOptionName] = React.useState<string | null>(null)
  const [editingVariantOption, setEditingVariantOption] = React.useState<string | null>(null)

  React.useEffect(() => {
    setEditedVariants(variants)
    setEditedOptions(options)
    setHasChanges(false)
    setEditingOptionName(null)
    setEditingVariantOption(null)
    // Select all by default
    setSelectedVariants(new Set(variants.map(v => v.sku_id)))
  }, [variants, options, isOpen])

  const handlePriceChange = (sku_id: string, newPrice: number) => {
    const updated = editedVariants.map(v =>
      v.sku_id === sku_id ? { ...v, price: newPrice } : v
    )
    setEditedVariants(updated)
    setHasChanges(true)
  }

  const handleStockChange = (sku_id: string, newStock: number) => {
    const updated = editedVariants.map(v =>
      v.sku_id === sku_id ? { ...v, stock: newStock } : v
    )
    setEditedVariants(updated)
    setHasChanges(true)
  }

  const toggleVariantSelection = (sku_id: string) => {
    const newSelected = new Set(selectedVariants)
    if (newSelected.has(sku_id)) {
      newSelected.delete(sku_id)
    } else {
      newSelected.add(sku_id)
    }
    setSelectedVariants(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedVariants.size === editedVariants.length) {
      setSelectedVariants(new Set())
    } else {
      setSelectedVariants(new Set(editedVariants.map(v => v.sku_id)))
    }
  }

  const handleOptionNameChange = (oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return

    // Update options
    const updatedOptions = editedOptions.map(opt =>
      opt.name === oldName ? { ...opt, name: newName } : opt
    )
    setEditedOptions(updatedOptions)

    // Update variants to use new option name
    const updatedVariants = editedVariants.map(variant => {
      const newOptions = { ...variant.options }
      if (oldName in newOptions) {
        newOptions[newName] = newOptions[oldName]
        delete newOptions[oldName]
      }
      return { ...variant, options: newOptions }
    })
    setEditedVariants(updatedVariants)
    setHasChanges(true)
    setEditingOptionName(null)
  }

  const handleVariantOptionTextChange = (sku_id: string, newOptionText: string) => {
    if (!newOptionText.trim()) return

    const updatedVariants = editedVariants.map(variant => {
      if (variant.sku_id === sku_id) {
        // Parse the new option text to extract key-value pairs
        // Expected format: "key1: value1 + key2: value2"
        const newOptions: { [key: string]: string } = {}
        const parts = newOptionText.split('+').map(p => p.trim())

        parts.forEach(part => {
          const [key, value] = part.split(':').map(s => s.trim())
          if (key && value) {
            newOptions[key] = value
          }
        })

        return { ...variant, options: newOptions }
      }
      return variant
    })

    setEditedVariants(updatedVariants)
    setHasChanges(true)
    setEditingVariantOption(null)
  }

  const handleSave = () => {
    if (onSave && hasChanges) {
      onSave(editedVariants, editedOptions)
      setHasChanges(false)
    }
  }

  if (!isOpen) return null

  const getOptionImage = (optionName: string, optionValue: string): string | undefined => {
    const option = editedOptions.find(opt => opt.name === optionName)
    if (!option) return undefined

    const value = option.values.find(val => val.name === optionValue)
    return value?.image
  }

  // Check if variant has validation issues
  const hasValidationIssue = (variant: ProductVariant) => {
    const optionText = Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(' + ')
    return optionText.length > 25
  }

  const selectedCount = selectedVariants.size
  const issueCount = editedVariants.filter(v => hasValidationIssue(v)).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900/50 to-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Package2 size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white tracking-tight">상품 옵션 관리</h2>
              <p className="text-sm text-slate-400 mt-0.5 truncate">{productTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-slate-800 transition-all group"
          >
            <X size={22} className="text-slate-400 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Info Bar */}
        <div className="px-8 py-4 bg-gradient-to-r from-slate-900/80 to-slate-800/50 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-slate-300 text-sm font-medium">배대지 비용</span>
                <div className="flex items-center gap-2 bg-slate-900/80 rounded-lg px-3 py-1.5 border border-slate-700">
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(parseInt(e.target.value) || 0)}
                    className="w-24 bg-transparent border-none text-white text-sm font-semibold focus:outline-none text-center"
                  />
                  <span className="text-slate-400 text-sm">원</span>
                </div>
              </div>
              <div className="h-6 w-px bg-slate-700"></div>
              <div className="text-sm">
                <span className="text-slate-400">총 </span>
                <span className="text-blue-400 font-bold">{variants.length}</span>
                <span className="text-slate-400"> 개 옵션</span>
              </div>
              {issueCount > 0 && (
                <>
                  <div className="h-6 w-px bg-slate-700"></div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertCircle size={14} className="text-red-400" />
                    <span className="text-red-400 text-sm font-medium">{issueCount}개 주의 필요</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>


        {/* Table Header */}
        <div className="px-8 py-3 bg-slate-900/50 border-b border-slate-800">
          <div className="flex items-center gap-6">
            <div className="w-10 flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedVariants.size === editedVariants.length && editedVariants.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 checked:bg-blue-500 cursor-pointer"
              />
            </div>
            <div className="w-12 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No.</span>
            </div>
            <div className="w-24">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">이미지</span>
            </div>
            <div className="flex-1 min-w-[220px]">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">옵션 정보</span>
            </div>
            <div className="w-36">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">가격 (CNY)</span>
            </div>
            <div className="w-28">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">재고</span>
            </div>
            <div className="w-24 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">글자수</span>
            </div>
            <div className="w-16 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">상태</span>
            </div>
          </div>
        </div>

        {/* Content - Variants List */}
        <div className="flex-1 overflow-y-auto px-8 py-4 bg-[#0a0a0a]">
          {variants.length > 0 ? (
            <div className="space-y-2">
              {editedVariants.map((variant, index) => {
                // Enhanced image search logic
                let variantImage = variant.image

                // If no direct variant image, try to find image from option values
                if (!variantImage) {
                  // Try each option to find one with an image
                  for (const [optionName, optionValue] of Object.entries(variant.options)) {
                    const img = getOptionImage(optionName, optionValue)
                    if (img) {
                      variantImage = img
                      break
                    }
                  }
                }

                const optionText = Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(' + ')
                const isSelected = selectedVariants.has(variant.sku_id)
                const hasIssue = hasValidationIssue(variant)

                return (
                  <div
                    key={variant.sku_id}
                    className={`flex items-center gap-6 p-4 rounded-xl transition-all group ${
                      hasIssue
                        ? 'bg-gradient-to-r from-red-950/30 to-red-900/20 border-2 border-red-500/50 shadow-lg shadow-red-500/10'
                        : isSelected
                        ? 'bg-gradient-to-r from-slate-900/90 to-slate-800/50 border-2 border-blue-500/30 hover:border-blue-500/50'
                        : 'bg-slate-900/30 border-2 border-slate-800/50 hover:border-slate-700/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="w-10 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleVariantSelection(variant.sku_id)}
                        className="w-5 h-5 rounded-md border-2 border-slate-600 bg-slate-800 checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-all"
                      />
                    </div>

                    {/* Index */}
                    <div className="w-12 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700">
                        <span className="text-slate-300 font-bold text-sm">{String(index + 1).padStart(2, '0')}</span>
                      </div>
                    </div>

                    {/* Image */}
                    <div className="w-24 flex-shrink-0">
                      {variantImage ? (
                        <div className="relative group/img">
                          <img
                            src={variantImage}
                            alt="Variant"
                            className="w-20 h-20 rounded-xl object-cover border-2 border-slate-700 group-hover/img:border-blue-500 transition-all shadow-lg"
                          />
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border-2 border-slate-700 border-dashed">
                          <Package2 size={24} className="text-slate-600" />
                        </div>
                      )}
                    </div>

                    {/* Option Info - List Style */}
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700 hover:border-blue-500/50 transition-all">
                        <span className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold rounded">
                          옵션
                        </span>
                        {editingVariantOption === variant.sku_id ? (
                          <input
                            type="text"
                            defaultValue={optionText}
                            autoFocus
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                handleVariantOptionTextChange(variant.sku_id, e.target.value)
                              } else {
                                setEditingVariantOption(null)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                handleVariantOptionTextChange(variant.sku_id, e.currentTarget.value)
                              } else if (e.key === 'Escape') {
                                setEditingVariantOption(null)
                              }
                            }}
                            className="flex-1 bg-slate-900/80 border-2 border-blue-500 rounded-md px-3 py-2 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            placeholder="옵션명: 값 + 옵션명: 값"
                          />
                        ) : (
                          <div
                            className={`flex-1 text-sm font-medium cursor-pointer hover:text-blue-300 transition-colors py-2 ${hasIssue ? 'text-red-400' : 'text-white'}`}
                            onClick={() => setEditingVariantOption(variant.sku_id)}
                          >
                            {optionText}
                          </div>
                        )}
                        <button
                          onClick={() => setEditingVariantOption(variant.sku_id)}
                          className="text-slate-400 hover:text-blue-400 transition-colors p-1.5 hover:bg-slate-700/50 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Price Input */}
                    <div className="w-36">
                      <input
                        type="number"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) => handlePriceChange(variant.sku_id, parseFloat(e.target.value) || 0)}
                        disabled={!editable}
                        className="w-full px-3 py-3 bg-slate-950/80 border-2 border-slate-700 rounded-xl text-white text-center text-base font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-inner"
                      />
                    </div>

                    {/* Stock Input */}
                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        value={variant.stock || 0}
                        onChange={(e) => handleStockChange(variant.sku_id, parseInt(e.target.value) || 0)}
                        disabled={!editable}
                        className={`w-full px-3 py-3 bg-slate-950/80 border-2 rounded-xl text-center text-base font-bold focus:ring-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-inner ${
                          (variant.stock || 0) === 0
                            ? 'border-yellow-500/50 text-yellow-400 focus:border-yellow-500 focus:ring-yellow-500/20'
                            : 'border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20'
                        }`}
                      />
                    </div>

                    {/* Character Count */}
                    <div className="w-24">
                      <div className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl">
                        <span className={`text-base font-bold ${
                          optionText.length > 25 ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          {optionText.length}
                        </span>
                        <span className="text-slate-600 font-medium text-sm">/</span>
                        <span className="text-slate-500 font-medium text-sm">25</span>
                      </div>
                    </div>

                    {/* Status Icon */}
                    <div className="w-16 flex items-center justify-center">
                      {hasIssue ? (
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center shadow-lg shadow-red-500/20">
                          <AlertCircle size={24} className="text-red-400" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                          <Check size={24} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 mx-auto mb-6 flex items-center justify-center border-2 border-slate-700">
                <Package2 size={48} className="text-slate-600" />
              </div>
              <p className="text-slate-400 text-xl font-medium mb-2">옵션 정보가 없습니다</p>
              <p className="text-slate-600 text-sm">단일 옵션 상품이거나 데이터를 가져오지 못했습니다</p>
            </div>
          )}
        </div>

        {/* Bottom Info & Actions */}
        <div className="px-8 py-5 border-t border-slate-800 bg-gradient-to-r from-slate-900/90 to-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-slate-400 text-sm">
                  <span className="text-blue-400 font-bold">{selectedCount}</span>개 선택됨
                </span>
              </div>
              {hasChanges && (
                <>
                  <div className="h-6 w-px bg-slate-700"></div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                    <span className="text-orange-400 text-sm font-medium">저장하지 않은 변경사항</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-600 transition-all"
              >
                취소
              </button>
              {editable && (
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className={`px-8 py-3 rounded-xl font-bold transition-all ${
                    hasChanges
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border-2 border-slate-700'
                  }`}
                >
                  {hasChanges ? '변경사항 저장' : '저장'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
