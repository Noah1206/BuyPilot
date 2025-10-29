/**
 * Dashboard page - Main order management interface
 * HeySeller inspired clean design
 */

'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { getOrders, executePurchase, sendToForwarder, createOrder } from '@/lib/api'
import OrderCard from '@/components/OrderCard'
import Header from '@/components/Header'
import { RefreshCw, Plus, Package, Check, AlertCircle } from 'lucide-react'

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

  const statusColors: Record<string, string> = {
    '': 'from-slate-500 to-slate-600',
    'PENDING': 'from-yellow-500 to-orange-500',
    'ORDERED_SUPPLIER': 'from-blue-500 to-blue-600',
    'SENT_TO_FORWARDER': 'from-purple-500 to-purple-600',
    'DONE': 'from-green-500 to-green-600',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <Header />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-3 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                주문 관리
              </h1>
              <p className="text-lg text-slate-600 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                {orders.length}개의 {statusFilter ? statusLabels[statusFilter] : '전체'} 주문
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateDemo}
                className="group flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-white text-slate-700 border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 shadow-sm hover:shadow-lg transition-all duration-200"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-200" />
                <span>데모 생성</span>
              </button>
              <button
                onClick={() => mutate()}
                className="group flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-600/50 hover:scale-105 transition-all duration-200"
                title="새로고침"
              >
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                <span>새로고침</span>
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-3 shadow-lg">
            <div className="flex flex-wrap gap-2">
              {['', 'PENDING', 'ORDERED_SUPPLIER', 'SENT_TO_FORWARDER', 'DONE'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`
                    group px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-200
                    ${
                      statusFilter === status
                        ? `bg-gradient-to-r ${statusColors[status]} text-white shadow-lg scale-105`
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:scale-105'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    {statusFilter === status && (
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    )}
                    {statusLabels[status]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <RefreshCw size={48} className="text-blue-500 animate-spin mb-4" />
            <p className="text-slate-600 text-lg">주문 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-96 bg-red-50 rounded-2xl border border-red-200">
            <AlertCircle size={48} className="text-red-500 mb-4" />
            <p className="text-red-600 text-lg font-medium">주문을 불러올 수 없습니다</p>
            <p className="text-red-500 text-sm mt-2">API 연결을 확인해주세요</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border-2 border-dashed border-slate-300">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <Package size={40} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">주문이 없습니다</h3>
            <p className="text-slate-600 mb-6">새로운 주문을 생성해보세요</p>
            <button
              onClick={handleCreateDemo}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              <Plus size={20} />
              데모 주문 생성
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
            fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl animate-slide-up
            ${
              showToast.type === 'success'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
            }
          `}
        >
          <div className="flex items-center gap-3">
            {showToast.type === 'success' ? (
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <Check size={16} />
              </div>
            ) : (
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <AlertCircle size={16} />
              </div>
            )}
            <span className="font-medium">{showToast.message}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
