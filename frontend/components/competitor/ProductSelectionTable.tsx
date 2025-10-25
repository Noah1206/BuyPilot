/**
 * ProductSelectionTable component
 * Main table for product selection with Taobao candidates
 */

import { useState } from 'react'
import { ProductMatch, PricedProduct } from '@/lib/api-competitor'
import TaobaoCandidateCard from './TaobaoCandidateCard'
import PriceBreakdownTooltip from './PriceBreakdownTooltip'

interface ProductSelectionTableProps {
  matches: ProductMatch[]
  pricedProducts: PricedProduct[]
  selectedProducts: Set<string> // Set of taobao_ids
  onToggleSelect: (taobaoId: string, match: ProductMatch) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

export default function ProductSelectionTable({
  matches,
  pricedProducts,
  selectedProducts,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: ProductSelectionTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'rank' | 'price' | 'profit'>('rank')
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 20

  // Filter matches by search query
  const filteredMatches = matches.filter((match) =>
    match.smartstore_product.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort matches
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    switch (sortBy) {
      case 'rank':
        return a.smartstore_product.rank - b.smartstore_product.rank
      case 'price':
        return a.smartstore_product.price - b.smartstore_product.price
      case 'profit': {
        const aProfit = getPriceInfo(a.best_match.taobao_id)?.expected_profit || 0
        const bProfit = getPriceInfo(b.best_match.taobao_id)?.expected_profit || 0
        return bProfit - aProfit // Descending
      }
      default:
        return 0
    }
  })

  // Paginate
  const totalPages = Math.ceil(sortedMatches.length / itemsPerPage)
  const paginatedMatches = sortedMatches.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  )

  // Helper to get price info
  function getPriceInfo(taobaoId: string): PricedProduct | undefined {
    return pricedProducts.find((p) => p.taobao_id === taobaoId)
  }

  // Check if all visible products are selected
  const allSelectedOnPage = paginatedMatches.every((match) =>
    selectedProducts.has(match.best_match.taobao_id)
  )

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(0)
              }}
              placeholder="상품 검색..."
              className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8d96a0]">정렬:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] text-sm focus:outline-none focus:border-[#58a6ff]"
            >
              <option value="rank">인기 순위</option>
              <option value="price">가격 낮은 순</option>
              <option value="profit">수익 높은 순</option>
            </select>
          </div>

          {/* Selection Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAll}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-lg transition-colors"
            >
              전체 선택
            </button>
            <button
              onClick={onDeselectAll}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg transition-colors"
            >
              선택 해제
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-[#30363d] flex items-center gap-4 text-sm">
          <span className="text-[#8d96a0]">
            총 <span className="font-bold text-[#e6edf3]">{matches.length}</span>개 상품
          </span>
          <span className="text-[#8d96a0]">|</span>
          <span className="text-[#58a6ff]">
            <span className="font-bold">{selectedProducts.size}</span>개 선택됨
          </span>
        </div>
      </div>

      {/* Products Grid */}
      <div className="space-y-4">
        {paginatedMatches.map((match, index) => {
          const priceInfo = getPriceInfo(match.best_match.taobao_id)
          const isSelected = selectedProducts.has(match.best_match.taobao_id)

          return (
            <div
              key={index}
              className={`
                bg-[#161b22] border rounded-lg p-6 transition-all
                ${isSelected ? 'border-[#58a6ff] ring-2 ring-[#58a6ff]/20' : 'border-[#30363d]'}
              `}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: SmartStore Product */}
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#ffa657]/10 border border-[#ffa657] flex items-center justify-center">
                      <span className="text-lg font-bold text-[#ffa657]">
                        #{match.smartstore_product.rank}
                      </span>
                    </div>

                    {/* Image */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-[#0d1117]">
                      <img
                        src={match.smartstore_product.image_url}
                        alt={match.smartstore_product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23161b22" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236e7681" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-[#e6edf3] mb-2 line-clamp-2">
                        {match.smartstore_product.title}
                      </h3>

                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[#8d96a0]">스마트스토어 가격:</span>
                          <span className="font-bold text-[#e6edf3]">
                            {match.smartstore_product.price.toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#8d96a0]">구매수:</span>
                          <span className="text-[#e6edf3]">
                            {match.smartstore_product.purchase_count.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#8d96a0]">평점:</span>
                          <span className="text-[#ffa657]">
                            ⭐ {match.smartstore_product.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <a
                        href={match.smartstore_product.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-[#58a6ff] hover:text-[#388bfd]"
                      >
                        원본 보기
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right: Taobao Candidates */}
                <div>
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-[#e6edf3] mb-1">
                      타오바오 매칭 후보 ({match.taobao_candidates.length}개)
                    </h4>
                    <p className="text-xs text-[#6e7681]">
                      가장 유사한 상품을 선택하세요
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {match.taobao_candidates.map((candidate, idx) => (
                      <TaobaoCandidateCard
                        key={candidate.taobao_id}
                        candidate={candidate}
                        isSelected={selectedProducts.has(candidate.taobao_id)}
                        onSelect={() => onToggleSelect(candidate.taobao_id, match)}
                        rank={idx + 1}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Info */}
              {priceInfo && isSelected && (
                <div className="mt-4 pt-4 border-t border-[#30363d]">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <div className="text-xs text-[#8d96a0] mb-1">타오바오 가격</div>
                      <div className="text-sm font-bold text-[#ffa657]">
                        ¥{priceInfo.taobao_price_cny.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#8d96a0] mb-1">배송비</div>
                      <div className="text-sm font-bold text-[#e6edf3]">
                        {priceInfo.shipping_fee.toLocaleString()}원
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#8d96a0] mb-1">총 원가</div>
                      <div className="text-sm font-bold text-[#e6edf3]">
                        {priceInfo.total_cost.toLocaleString()}원
                      </div>
                    </div>
                    <div>
                      <PriceBreakdownTooltip priceInfo={priceInfo}>
                        <div className="text-xs text-[#8d96a0] mb-1 flex items-center gap-1 cursor-help">
                          판매가
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-sm font-bold text-[#58a6ff]">
                          {priceInfo.selling_price_rounded.toLocaleString()}원
                        </div>
                      </PriceBreakdownTooltip>
                    </div>
                    <div>
                      <div className="text-xs text-[#8d96a0] mb-1">예상 수익</div>
                      <div className="text-sm font-bold text-[#3fb950]">
                        {priceInfo.expected_profit.toLocaleString()}원
                      </div>
                      <div className="text-xs text-[#6e7681]">
                        ({(priceInfo.actual_margin * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] disabled:bg-[#161b22] disabled:text-[#6e7681] disabled:cursor-not-allowed border border-[#30363d] rounded-lg transition-colors"
          >
            이전
          </button>

          <span className="px-4 py-2 text-[#8d96a0]">
            {currentPage + 1} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] disabled:bg-[#161b22] disabled:text-[#6e7681] disabled:cursor-not-allowed border border-[#30363d] rounded-lg transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
