/**
 * FailedProductsList component
 * Displays list of products that failed to match with Taobao
 */

import { FailedProduct } from '@/lib/api-competitor'

interface FailedProductsListProps {
  failedProducts: FailedProduct[]
  onRetry?: (product: FailedProduct) => void
  onRetryAll?: () => void
}

export default function FailedProductsList({
  failedProducts,
  onRetry,
  onRetryAll,
}: FailedProductsListProps) {
  if (failedProducts.length === 0) {
    return null
  }

  return (
    <div className="bg-[#161b22] border border-[#f85149] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-lg font-semibold text-[#f85149]">
              매칭 실패 ({failedProducts.length}개)
            </h3>
            <p className="text-sm text-[#8d96a0] mt-1">
              다음 상품들은 타오바오에서 매칭되지 않았습니다.
            </p>
          </div>
        </div>

        {/* Retry All Button */}
        {onRetryAll && (
          <button
            onClick={onRetryAll}
            className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors"
          >
            전체 재시도
          </button>
        )}
      </div>

      {/* Failed Products List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {failedProducts.map((product, index) => (
          <div
            key={index}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 flex items-start justify-between gap-4"
          >
            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-[#e6edf3] truncate mb-1">
                {product.title}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-[#f85149]/10 border border-[#f85149] text-[#f85149] rounded">
                  실패
                </span>
                <span className="text-xs text-[#6e7681]">
                  {product.error}
                </span>
              </div>
            </div>

            {/* Retry Button */}
            {onRetry && (
              <button
                onClick={() => onRetry(product)}
                className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8d96a0] hover:text-[#e6edf3] text-xs rounded transition-colors whitespace-nowrap"
              >
                재시도
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-[#30363d]">
        <p className="text-xs text-[#8d96a0]">
          <span className="font-medium text-[#e6edf3]">참고:</span> 매칭 실패는 상품명이 너무 짧거나,
          타오바오에 유사한 상품이 없거나, 번역이 적절하지 않은 경우에 발생할 수 있습니다.
          직접 타오바오에서 검색하거나 다른 키워드로 시도해보세요.
        </p>
      </div>
    </div>
  )
}
