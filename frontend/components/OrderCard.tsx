/**
 * OrderCard component
 * Displays individual order with VS Code dark theme styling
 */

'use client'

import StatusBadge from './StatusBadge'
import ActionButtons from './ActionButtons'
import { Package, User, Calendar } from 'lucide-react'

interface OrderCardProps {
  order: {
    id: string
    status: string
    platform: string
    platform_order_ref: string
    items: any[]
    buyer: any
    created_at: string
    supplier_order_id?: string
    forwarder_job_id?: string
  }
  onPurchase: (orderId: string) => Promise<void>
  onForward: (orderId: string) => Promise<void>
}

export default function OrderCard({ order, onPurchase, onForward }: OrderCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPrice = order.items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0)

  return (
    <div className="bg-vscode-bg-card border border-vscode-border-primary rounded-lg hover:border-vscode-border-hover hover:shadow-lg transition-all duration-200 fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-vscode-border-primary bg-vscode-bg-secondary/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-vscode-accent-blue/20 to-vscode-accent-purple/20 flex items-center justify-center border border-vscode-border-primary">
            <Package size={18} className="text-vscode-accent-blue" />
          </div>
          <div>
            <div className="text-sm font-semibold text-vscode-text-primary">
              {order.platform_order_ref}
            </div>
            <div className="text-xs text-vscode-text-secondary flex items-center gap-1.5 mt-1">
              <Calendar size={12} />
              {formatDate(order.created_at)}
            </div>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Items */}
        <div className="space-y-2">
          {order.items.slice(0, 2).map((item: any, idx: number) => (
            <div key={idx} className="text-sm text-vscode-text-primary flex items-start gap-2 p-2 rounded bg-vscode-bg-tertiary/30 hover:bg-vscode-bg-tertiary/50 transition-colors">
              <span className="text-vscode-accent-blue font-bold">•</span>
              <span className="flex-1 line-clamp-1">
                {item.product_source_url?.split('/').pop()?.substring(0, 50) || 'Product'}
              </span>
              <span className="text-vscode-accent-green font-semibold">
                ${(item.price || 0).toFixed(2)}
              </span>
            </div>
          ))}
          {order.items.length > 2 && (
            <div className="text-xs text-vscode-text-muted pl-2">
              +{order.items.length - 2} more items
            </div>
          )}
        </div>

        {/* Buyer info */}
        <div className="flex items-center gap-2 pt-2 border-t border-vscode-border-primary">
          <User size={14} className="text-vscode-text-muted" />
          <span className="text-sm text-vscode-text-primary font-medium">
            {order.buyer?.name || 'Unknown'}
          </span>
          <span className="text-xs text-vscode-text-muted">•</span>
          <span className="text-xs text-vscode-text-secondary uppercase font-mono">
            {order.buyer?.country || 'KR'}
          </span>
        </div>

        {/* Meta info */}
        {(order.supplier_order_id || order.forwarder_job_id) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-vscode-border-primary">
            {order.supplier_order_id && (
              <div className="text-xs">
                <span className="text-vscode-text-muted">공급처:</span>{' '}
                <span className="text-vscode-accent-purple font-mono">
                  {order.supplier_order_id}
                </span>
              </div>
            )}
            {order.forwarder_job_id && (
              <div className="text-xs">
                <span className="text-vscode-text-muted">배대지:</span>{' '}
                <span className="text-vscode-accent-orange font-mono">
                  {order.forwarder_job_id}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-vscode-border-primary bg-gradient-to-r from-vscode-bg-secondary/30 to-vscode-bg-tertiary/30">
        <div className="text-sm">
          <span className="text-vscode-text-muted">총액:</span>{' '}
          <span className="text-vscode-accent-green font-bold text-base">
            ${totalPrice.toFixed(2)}
          </span>
        </div>
        <ActionButtons
          orderId={order.id}
          status={order.status}
          onPurchase={() => onPurchase(order.id)}
          onForward={() => onForward(order.id)}
        />
      </div>
    </div>
  )
}
