/**
 * TaobaoCandidateCard component
 * Displays a single Taobao product candidate with selection capability
 */

import { TaobaoCandidate } from '@/lib/api-competitor'

interface TaobaoCandidateCardProps {
  candidate: TaobaoCandidate
  isSelected: boolean
  onSelect: () => void
  rank?: number // 1, 2, 3 for display
}

export default function TaobaoCandidateCard({
  candidate,
  isSelected,
  onSelect,
  rank,
}: TaobaoCandidateCardProps) {
  return (
    <div
      className={`
        bg-[#0d1117] border rounded-lg overflow-hidden
        transition-all duration-200 cursor-pointer
        ${isSelected
          ? 'border-[#58a6ff] ring-2 ring-[#58a6ff]/20'
          : 'border-[#30363d] hover:border-[#58a6ff]/50'
        }
      `}
      onClick={onSelect}
    >
      {/* Rank Badge */}
      {rank && (
        <div className="absolute top-2 left-2 z-10">
          <span
            className={`
              px-2 py-0.5 rounded text-xs font-bold
              ${rank === 1
                ? 'bg-[#ffa657] text-[#0d1117]'
                : rank === 2
                ? 'bg-[#8d96a0] text-[#0d1117]'
                : 'bg-[#6e7681] text-[#0d1117]'
              }
            `}
          >
            #{rank}
          </span>
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-6 h-6 rounded-full bg-[#58a6ff] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Product Image */}
      <div className="relative aspect-square bg-[#161b22] overflow-hidden">
        <img
          src={candidate.image_url}
          alt={candidate.title}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23161b22" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236e7681" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E'
          }}
        />
      </div>

      {/* Product Info */}
      <div className="p-3">
        {/* Chinese Title */}
        <h4 className="text-xs text-[#8d96a0] mb-1 line-clamp-2 h-8" title={candidate.title}>
          {candidate.title}
        </h4>

        {/* Price */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-[#ffa657] font-bold text-lg">¥{candidate.price_cny}</span>
          <span className="text-xs text-[#6e7681]">
            ≈ {Math.floor(candidate.price_cny * 190).toLocaleString()}원
          </span>
        </div>

        {/* Rating & Sales */}
        <div className="flex items-center gap-3 mb-2 text-xs">
          <div className="flex items-center gap-1 text-[#ffa657]">
            <span>⭐</span>
            <span>{candidate.rating.toFixed(1)}</span>
          </div>
          <div className="text-[#8d96a0]">
            판매 {candidate.sold_count >= 10000
              ? `${(candidate.sold_count / 10000).toFixed(1)}만`
              : candidate.sold_count.toLocaleString()
            }
          </div>
        </div>

        {/* Similarity Score */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#8d96a0]">유사도</span>
            <span className={`font-medium ${
              candidate.similarity_score >= 0.8
                ? 'text-[#3fb950]'
                : candidate.similarity_score >= 0.6
                ? 'text-[#ffa657]'
                : 'text-[#f85149]'
            }`}>
              {Math.floor(candidate.similarity_score * 100)}%
            </span>
          </div>
          <div className="w-full bg-[#161b22] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all ${
                candidate.similarity_score >= 0.8
                  ? 'bg-[#3fb950]'
                  : candidate.similarity_score >= 0.6
                  ? 'bg-[#ffa657]'
                  : 'bg-[#f85149]'
              }`}
              style={{ width: `${candidate.similarity_score * 100}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className={`
              flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors
              ${isSelected
                ? 'bg-[#58a6ff] text-white hover:bg-[#388bfd]'
                : 'bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d] border border-[#30363d]'
              }
            `}
          >
            {isSelected ? '선택됨 ✓' : '선택하기'}
          </button>
          <a
            href={candidate.taobao_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8d96a0] hover:text-[#e6edf3] text-xs rounded transition-colors"
            title="타오바오에서 보기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
