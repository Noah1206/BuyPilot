/**
 * ProductOptionsModal - Display and edit product variants/options
 */

'use client'

import React from 'react'
import { X, Check, AlertCircle } from 'lucide-react'

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
  basePrice: number
  currency: string
  onSave?: (updatedVariants: ProductVariant[]) => void
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
  const [hasChanges, setHasChanges] = React.useState(false)
  const [selectedVariants, setSelectedVariants] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    setEditedVariants(variants)
    setHasChanges(false)
    // Select all by default
    setSelectedVariants(new Set(variants.map(v => v.sku_id)))
  }, [variants, isOpen])

  const handlePriceChange = (sku_id: string, newPrice: number) => {
    const updated = editedVariants.map(v =>
      v.sku_id === sku_id ? { ...v, price: newPrice } : v
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

  const handleSave = () => {
    if (onSave && hasChanges) {
      onSave(editedVariants)
      setHasChanges(false)
    }
  }

  if (!isOpen) return null

  const getOptionImage = (optionName: string, optionValue: string): string | undefined => {
    const option = options.find(opt => opt.name === optionName)
    if (!option) return undefined

    const value = option.values.find(val => val.name === optionValue)
    return value?.image
  }

  // Check if variant has validation issues
  const hasValidationIssue = (variant: ProductVariant) => {
    const optionText = Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(' + ')
    return optionText.length > 25
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">상품 옵션 편집</h2>
            <p className="text-sm text-slate-400 mt-1 truncate">{productTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 transition-all"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Top Info Bar */}
        <div className="px-6 py-3 bg-[#1f1f1f] border-b border-slate-700 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-400">
              <AlertCircle size={16} />
              <span>상품가격에 배대지 비용</span>
              <input
                type="number"
                defaultValue={13000}
                className="w-20 px-2 py-1 bg-[#2a2a2a] border border-slate-600 rounded text-white text-center"
              />
              <span>원</span>
              <span className="text-red-400 ml-2">"13,000원"이 추가되었습니다.</span>
            </div>
          </div>
        </div>

        {/* Content - Variants List */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#1a1a1a]">
          {variants.length > 0 ? (
            <div className="space-y-4">
              {editedVariants.map((variant, index) => {
                // Try to get variant image from multiple sources
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
                    className={`flex items-center gap-6 p-5 rounded-lg border-2 transition-all ${
                      hasIssue
                        ? 'border-red-500 bg-[#2a2a2a]'
                        : 'border-slate-700 bg-[#2a2a2a] hover:border-slate-600'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleVariantSelection(variant.sku_id)}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 checked:bg-blue-500 cursor-pointer flex-shrink-0"
                    />

                    {/* Index */}
                    <div className="w-10 text-center flex-shrink-0">
                      <span className="text-slate-400 font-medium text-base">{String(index + 1).padStart(2, '0')}</span>
                    </div>

                    {/* Image */}
                    <div className="w-20 h-20 flex-shrink-0">
                      {variantImage ? (
                        <img
                          src={variantImage}
                          alt="Variant"
                          className="w-full h-full rounded-lg object-cover border border-slate-600"
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-slate-800 flex items-center justify-center border border-slate-600">
                          <span className="text-slate-600 text-xs">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Category Label */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-3 py-1.5 bg-slate-700 text-slate-300 text-sm rounded whitespace-nowrap flex-shrink-0">
                        {options.length > 0 ? '옵션명' : '편리카'}
                      </span>
                      <span className={`text-sm ${hasIssue ? 'text-red-400' : 'text-slate-300'}`}>
                        {options.length > 0 ? (
                          <span>
                            원문: <span className={hasIssue ? 'text-red-400' : 'text-blue-400'}>{optionText}</span>
                          </span>
                        ) : (
                          optionText
                        )}
                      </span>
                    </div>

                    {/* Price Input */}
                    <div className="flex-1 flex items-center gap-4 min-w-[200px]">
                      <input
                        type="number"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) => handlePriceChange(variant.sku_id, parseFloat(e.target.value) || 0)}
                        disabled={!editable}
                        className="flex-1 px-5 py-3 bg-[#1a1a1a] border-2 border-slate-600 rounded-lg text-white text-center text-base font-medium focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Character Count & Status */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
                        <span className={`text-base font-semibold ${
                          optionText.length > 25 ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          {optionText.length}
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-500 text-base">25</span>
                      </div>

                      {hasIssue ? (
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertCircle size={20} className="text-red-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <Check size={20} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-800 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle size={32} className="text-slate-600" />
              </div>
              <p className="text-slate-400 text-lg">옵션 정보가 없습니다</p>
              <p className="text-slate-600 text-sm mt-2">단일 옵션 상품이거나 데이터를 가져오지 못했습니다</p>
            </div>
          )}
        </div>

        {/* Bottom Info */}
        {variants.length > 0 && (
          <div className="px-6 py-3 bg-[#1f1f1f] border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-400">
                <span className="text-red-400 font-medium">{editedVariants.filter(v => hasValidationIssue(v)).length}개</span>
                의 옵션명 상품이 선택되었습니다.
              </div>
              {hasChanges && (
                <span className="text-orange-400 text-xs">
                  ⚠️ 저장하지 않은 변경사항이 있습니다
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-[#2a2a2a] flex justify-end items-center gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-all"
          >
            취소
          </button>
          {editable && (
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                hasChanges
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              저장
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
