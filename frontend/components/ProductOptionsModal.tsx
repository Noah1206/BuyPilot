/**
 * ProductOptionsModal - Display and edit product variants/options
 */

'use client'

import React from 'react'
import { X, Package } from 'lucide-react'

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
  basePrice,
  currency,
  onSave,
  editable = false
}: ProductOptionsModalProps) {
  const [editedVariants, setEditedVariants] = React.useState<ProductVariant[]>(variants)
  const [hasChanges, setHasChanges] = React.useState(false)

  React.useEffect(() => {
    setEditedVariants(variants)
    setHasChanges(false)
  }, [variants, isOpen])

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

  const handleSave = () => {
    if (onSave && hasChanges) {
      onSave(editedVariants)
      setHasChanges(false)
    }
  }

  if (!isOpen) return null

  const formatPrice = (price: number) => {
    if (currency === 'CNY' || currency === 'cny') {
      return `¥${price.toFixed(2)}`
    }
    return `₩${Math.round(price * 170).toLocaleString()}`
  }

  const getOptionImage = (optionName: string, optionValue: string): string | undefined => {
    const option = options.find(opt => opt.name === optionName)
    if (!option) return undefined

    const value = option.values.find(val => val.name === optionValue)
    return value?.image
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 truncate">상품 옵션</h2>
            <p className="text-sm text-slate-600 mt-1 truncate">{productTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/80 transition-all"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Options Display */}
          {options.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">옵션 종류</h3>
              <div className="space-y-4">
                {options.map((option) => (
                  <div key={option.pid} className="bg-slate-50 rounded-xl p-4">
                    <div className="font-medium text-slate-700 mb-3">{option.name}</div>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value) => (
                        <div
                          key={value.vid}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-400 transition-all"
                        >
                          {value.image && (
                            <img
                              src={value.image}
                              alt={value.name}
                              className="w-6 h-6 rounded object-cover border border-slate-200"
                            />
                          )}
                          <span className="text-sm text-slate-900">{value.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variants Table */}
          {variants.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                변형 목록 ({variants.length}개)
              </h3>
              <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b-2 border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          이미지
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          옵션
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          원가 (CNY)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          한국 가격
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          재고
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {editedVariants.map((variant, index) => {
                        // Get first option value's image as variant image
                        const firstOptionName = Object.keys(variant.options)[0]
                        const firstOptionValue = variant.options[firstOptionName]
                        const variantImage = variant.image || getOptionImage(firstOptionName, firstOptionValue)

                        return (
                          <tr key={variant.sku_id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-4 py-3">
                              {variantImage ? (
                                <img
                                  src={variantImage}
                                  alt="Variant"
                                  className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                                  <Package size={20} className="text-slate-400" />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(variant.options).map(([optName, optValue]) => (
                                  <span
                                    key={optName}
                                    className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded"
                                  >
                                    {optName}: {optValue}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {editable ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.price}
                                  onChange={(e) => handlePriceChange(variant.sku_id, parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 text-right border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-900"
                                />
                              ) : (
                                <span className="font-medium text-slate-900">
                                  {formatPrice(variant.price)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-orange-600">
                                ₩{Math.round(variant.price * 170).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {editable ? (
                                <input
                                  type="number"
                                  value={variant.stock}
                                  onChange={(e) => handleStockChange(variant.sku_id, parseInt(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 text-right border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-900"
                                />
                              ) : (
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  variant.stock > 100 ? 'bg-green-100 text-green-700' :
                                  variant.stock > 10 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {variant.stock.toLocaleString()}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">총 변형</div>
                    <div className="text-2xl font-bold text-blue-600">{editedVariants.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-1">가격 범위 (CNY)</div>
                    <div className="text-lg font-semibold text-slate-900">
                      ¥{Math.min(...editedVariants.map(v => v.price)).toFixed(2)} - ¥{Math.max(...editedVariants.map(v => v.price)).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600 mb-1">총 재고</div>
                    <div className="text-2xl font-bold text-green-600">
                      {editedVariants.reduce((sum, v) => sum + v.stock, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">변형 정보가 없습니다</p>
              <p className="text-sm text-slate-500 mt-2">단일 옵션 상품이거나 데이터를 가져오지 못했습니다</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center gap-3">
          {editable && hasChanges && (
            <span className="text-sm text-orange-600 font-medium">
              ⚠️ 저장하지 않은 변경사항이 있습니다
            </span>
          )}
          {!editable || !hasChanges ? <div /> : null}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg font-medium text-slate-700 bg-white border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all"
            >
              {editable && hasChanges ? '취소' : '닫기'}
            </button>
            {editable && (
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  hasChanges
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                저장
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
