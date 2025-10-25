/**
 * Dashboard page - Main order management interface
 * VS Code Dark theme design
 */

'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { getOrders, executePurchase, sendToForwarder, createOrder } from '@/lib/api'
import OrderCard from '@/components/OrderCard'
import { RefreshCw, Plus, Filter } from 'lucide-react'

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Fetch orders with SWR
  const { data, error, isLoading, mutate } = useSWR(
    ['orders', statusFilter],
    () => getOrders({ status: statusFilter || undefined }),
    {
      refreshInterval: 5000, // Auto-refresh every 5 seconds
    }
  )

  const orders = data?.data?.orders || []

  // Toast notification
  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type })
    setTimeout(() => setShowToast(null), 3000)
  }

  // Handle purchase action
  const handlePurchase = async (orderId: string) => {
    const result = await executePurchase(orderId)
    if (result.ok) {
      toast('구매가 성공적으로 시작되었습니다!')
      mutate() // Refresh orders
    } else {
      toast(result.error?.message || '구매 실행에 실패했습니다', 'error')
    }
  }

  // Handle forward action
  const handleForward = async (orderId: string) => {
    const result = await sendToForwarder(orderId)
    if (result.ok) {
      toast('배대지 전송이 성공적으로 시작되었습니다!')
      mutate() // Refresh orders
    } else {
      toast(result.error?.message || '배대지 전송에 실패했습니다', 'error')
    }
  }

  // Create demo order (for testing)
  const handleCreateDemo = async () => {
    const result = await createOrder({
      platform: 'smartstore',
      platform_order_ref: `DEMO-${Date.now()}`,
      items: [
        {
          product_source_url: 'https://example.com/product/12345',
          qty: 1,
          price: 29.99,
        },
      ],
      buyer: {
        name: '홍길동',
        phone: '010-1234-5678',
        address1: '서울시 강남구 테헤란로 123',
        zip: '06234',
        country: 'KR',
        customs_id: 'P123456789012',
      },
    })

    if (result.ok) {
      toast('데모 주문이 생성되었습니다!')
      mutate()
    } else {
      toast('데모 주문 생성 실패', 'error')
    }
  }

  const statusLabels: Record<string, string> = {
    '': '전체 주문',
    'PENDING': '대기중',
    'ORDERED_SUPPLIER': '구매 완료',
    'SENT_TO_FORWARDER': '배송중',
    'DONE': '완료',
  }

  return (
    <div className="min-h-screen bg-vscode-bg-primary">
      {/* Sidebar */}
      <aside className="fixed left-0 top-10 bottom-6 w-48 bg-vscode-bg-secondary border-r border-vscode-border-primary">
        <div className="p-3">
          <div className="text-xs font-semibold text-vscode-text-muted uppercase tracking-wider mb-2">
            메뉴
          </div>
          <div className="space-y-1 mb-4">
            <a
              href="/"
              className="block w-full text-left px-2 py-1 rounded text-xs bg-vscode-bg-tertiary text-vscode-text-primary font-semibold"
            >
              주문 관리
            </a>
            <a
              href="/products"
              className="block w-full text-left px-2 py-1 rounded text-xs text-vscode-text-secondary hover:bg-vscode-bg-tertiary/50 transition-colors"
            >
              상품 관리
            </a>
            <a
              href="/competitor"
              className="block w-full text-left px-2 py-1 rounded text-xs text-vscode-text-secondary hover:bg-vscode-bg-tertiary/50 transition-colors"
            >
              스마트스토어
            </a>
            <a
              href="/shopify"
              className="block w-full text-left px-2 py-1 rounded text-xs text-vscode-text-secondary hover:bg-vscode-bg-tertiary/50 transition-colors"
            >
              쇼피파이
            </a>
          </div>

          <div className="text-xs font-semibold text-vscode-text-muted uppercase tracking-wider mb-2">
            필터
          </div>
          <div className="space-y-1">
            {['', 'PENDING', 'ORDERED_SUPPLIER', 'SENT_TO_FORWARDER', 'DONE'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`
                  w-full text-left px-2 py-1 rounded text-xs transition-colors
                  ${
                    statusFilter === status
                      ? 'bg-vscode-bg-tertiary text-vscode-text-primary font-semibold'
                      : 'text-vscode-text-secondary hover:bg-vscode-bg-tertiary/50'
                  }
                `}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-48 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-vscode-text-primary mb-1">
                주문 관리
              </h1>
              <p className="text-sm text-vscode-text-secondary">
                {orders.length}개의 {statusFilter ? statusLabels[statusFilter] : '전체'} 주문
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateDemo}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-vscode-bg-tertiary text-vscode-text-primary border border-vscode-border-primary hover:bg-vscode-bg-elevated hover:border-vscode-accent-blue transition-all"
              >
                <Plus size={16} />
                데모 생성
              </button>
              <button
                onClick={() => mutate()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-vscode-bg-tertiary text-vscode-text-primary border border-vscode-border-primary hover:bg-vscode-bg-elevated transition-all"
                title="새로고침"
              >
                <RefreshCw size={16} />
                새로고침
              </button>
            </div>
          </div>
        </div>

        {/* Orders grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-vscode-text-muted flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              주문 불러오는 중...
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-vscode-accent-red text-sm">
              주문을 불러올 수 없습니다. API 연결을 확인해주세요.
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="text-vscode-text-muted text-sm">주문이 없습니다</div>
            <button
              onClick={handleCreateDemo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-vscode-accent-blue to-vscode-accent-purple text-white hover:shadow-md transition-all"
            >
              <Plus size={16} />
              데모 주문 생성
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order: any) => (
              <OrderCard
                key={order.id}
                order={order}
                onPurchase={handlePurchase}
                onForward={handleForward}
              />
            ))}
          </div>
        )}
      </main>

      {/* Toast notification */}
      {showToast && (
        <div
          className={`
            fixed bottom-8 right-8 px-4 py-3 rounded shadow-lg fade-in
            ${
              showToast.type === 'success'
                ? 'bg-vscode-accent-green text-white'
                : 'bg-vscode-accent-red text-white'
            }
          `}
        >
          <div className="flex items-center gap-2 text-sm">
            {showToast.type === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm3.97 5.03a.75.75 0 00-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 00-1.06 1.06L6.97 11.03a.75.75 0 001.079-.02l3.992-4.99a.75.75 0 00-.071-1.05z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 110 16A8 8 0 018 0zM7 4v5h2V4H7zm0 6v2h2v-2H7z" />
              </svg>
            )}
            {showToast.message}
          </div>
        </div>
      )}
    </div>
  )
}
