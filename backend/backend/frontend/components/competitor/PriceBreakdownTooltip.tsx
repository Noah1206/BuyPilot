/**
 * PriceBreakdownTooltip component
 * Displays detailed price calculation breakdown on hover
 */

import { useState } from 'react'

interface PriceBreakdownTooltipProps {
  priceInfo: {
    taobao_price_cny: number
    exchange_rate: number
    taobao_price_krw: number
    shipping_fee: number
    total_cost: number
    selling_price_rounded: number
    expected_profit: number
    actual_margin: number
  }
  children: React.ReactNode
}

export default function PriceBreakdownTooltip({ priceInfo, children }: PriceBreakdownTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>

      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl p-4 w-64">
            {/* Title */}
            <div className="mb-3 pb-2 border-b border-[#30363d]">
              <h4 className="text-sm font-semibold text-[#e6edf3]">원가 분석</h4>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-2 mb-3 pb-3 border-b border-[#30363d]">
              {/* Taobao Price */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8d96a0]">타오바오 가격</span>
                <span className="text-[#e6edf3] font-medium">
                  ¥{priceInfo.taobao_price_cny.toFixed(2)}
                </span>
              </div>

              {/* Exchange Rate */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8d96a0]">환율 ({priceInfo.exchange_rate.toFixed(0)}원)</span>
                <span className="text-[#e6edf3] font-medium">
                  {priceInfo.taobao_price_krw.toLocaleString()}원
                </span>
              </div>

              {/* Shipping Fee */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8d96a0]">배송비</span>
                <span className="text-[#e6edf3] font-medium">
                  +{priceInfo.shipping_fee.toLocaleString()}원
                </span>
              </div>

              {/* Total Cost */}
              <div className="flex justify-between items-center text-xs pt-2 border-t border-[#30363d]/50">
                <span className="text-[#8d96a0] font-medium">총 원가</span>
                <span className="text-[#e6edf3] font-bold">
                  {priceInfo.total_cost.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* Selling Price */}
            <div className="space-y-2">
              {/* Selling Price */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8d96a0]">판매가</span>
                <span className="text-[#58a6ff] font-bold text-sm">
                  {priceInfo.selling_price_rounded.toLocaleString()}원
                </span>
              </div>

              {/* Expected Profit */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8d96a0]">예상 수익</span>
                <span className="text-[#3fb950] font-bold">
                  {priceInfo.expected_profit.toLocaleString()}원
                </span>
              </div>

              {/* Margin */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8d96a0]">마진율</span>
                <span className={`font-bold ${
                  priceInfo.actual_margin >= 0.35
                    ? 'text-[#3fb950]'
                    : priceInfo.actual_margin >= 0.25
                    ? 'text-[#ffa657]'
                    : 'text-[#f85149]'
                }`}>
                  {(priceInfo.actual_margin * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Formula */}
            <div className="mt-3 pt-3 border-t border-[#30363d]">
              <p className="text-xs text-[#6e7681] text-center">
                판매가 = (원가 + 배송비) ÷ (1 - 마진율)
              </p>
            </div>

            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
              <div className="border-8 border-transparent border-t-[#30363d]" />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
                <div className="border-7 border-transparent border-t-[#161b22]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
