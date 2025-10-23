/**
 * ActionButtons component
 * Purchase and Forwarder action buttons with loading states
 */

'use client'

import { useState } from 'react'
import { ShoppingCart, Truck } from 'lucide-react'

interface ActionButtonsProps {
  orderId: string
  status: string
  onPurchase: () => Promise<void>
  onForward: () => Promise<void>
}

export default function ActionButtons({
  orderId,
  status,
  onPurchase,
  onForward,
}: ActionButtonsProps) {
  const [purchasing, setPurchasing] = useState(false)
  const [forwarding, setForwarding] = useState(false)

  const canPurchase = ['PENDING', 'MANUAL_REVIEW'].includes(status)
  const canForward = ['ORDERED_SUPPLIER', 'BUYER_INFO_SET'].includes(status)

  const handlePurchase = async () => {
    setPurchasing(true)
    try {
      await onPurchase()
    } finally {
      setPurchasing(false)
    }
  }

  const handleForward = async () => {
    setForwarding(true)
    try {
      await onForward()
    } finally {
      setForwarding(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={!canPurchase || purchasing}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
          transition-all duration-200 shadow-sm
          ${
            canPurchase
              ? 'bg-gradient-to-r from-vscode-accent-blue to-vscode-accent-purple text-white hover:shadow-md hover:scale-105 active:scale-95'
              : 'bg-vscode-bg-tertiary text-vscode-text-muted cursor-not-allowed opacity-50'
          }
          ${purchasing ? 'opacity-70 cursor-wait animate-pulse' : ''}
        `}
        title={canPurchase ? '공급처에서 구매 실행' : '구매 불가'}
      >
        <ShoppingCart size={16} className={purchasing ? 'animate-pulse' : ''} />
        {purchasing ? '구매중...' : '구매 실행'}
      </button>

      {/* Forward Button */}
      <button
        onClick={handleForward}
        disabled={!canForward || forwarding}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
          transition-all duration-200 shadow-sm
          ${
            canForward
              ? 'bg-vscode-bg-elevated text-vscode-text-primary border-2 border-vscode-accent-green hover:bg-vscode-accent-green hover:text-white hover:shadow-md hover:scale-105 active:scale-95'
              : 'bg-vscode-bg-tertiary text-vscode-text-muted cursor-not-allowed opacity-50'
          }
          ${forwarding ? 'opacity-70 cursor-wait animate-pulse' : ''}
        `}
        title={canForward ? '배대지로 전송' : '배대지 전송 불가'}
      >
        <Truck size={16} className={forwarding ? 'animate-pulse' : ''} />
        {forwarding ? '전송중...' : '배대지 전송'}
      </button>
    </div>
  )
}
