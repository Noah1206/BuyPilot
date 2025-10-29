/**
 * Shipping Cost Settings - Weight-based shipping rate table
 */

'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Save, Package, Trash2, Plus, Truck } from 'lucide-react'

interface ShippingRate {
  weight: number  // kg
  cost: number    // KRW
}

const DEFAULT_RATES: ShippingRate[] = [
  { weight: 0.5, cost: 5600 },
  { weight: 1.0, cost: 6400 },
  { weight: 1.5, cost: 7200 },
  { weight: 2.0, cost: 8000 },
  { weight: 2.5, cost: 8800 },
  { weight: 3.0, cost: 9600 },
  { weight: 3.5, cost: 10400 },
  { weight: 4.0, cost: 11200 },
  { weight: 4.5, cost: 12000 },
  { weight: 5.0, cost: 12800 },
  { weight: 5.5, cost: 13600 },
  { weight: 6.0, cost: 14400 },
  { weight: 6.5, cost: 15200 },
  { weight: 7.0, cost: 16000 },
  { weight: 7.5, cost: 16800 },
  { weight: 8.0, cost: 17600 },
  { weight: 8.5, cost: 18400 },
  { weight: 9.0, cost: 19200 },
  { weight: 9.5, cost: 20000 },
  { weight: 10.0, cost: 20800 },
]

export default function ShippingPage() {
  const [rates, setRates] = useState<ShippingRate[]>(DEFAULT_RATES)
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('shippingRates')
    if (saved) {
      try {
        setRates(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load shipping rates:', e)
      }
    }
  }, [])

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type })
    setTimeout(() => setShowToast(null), 3000)
  }

  const saveRates = () => {
    try {
      localStorage.setItem('shippingRates', JSON.stringify(rates))
      toast('배송비 테이블이 저장되었습니다!')
    } catch (e) {
      toast('저장 실패', 'error')
    }
  }

  const resetToDefault = () => {
    if (confirm('기본 배송비 테이블로 초기화하시겠습니까?')) {
      setRates(DEFAULT_RATES)
      localStorage.setItem('shippingRates', JSON.stringify(DEFAULT_RATES))
      toast('기본 테이블로 초기화되었습니다!')
    }
  }

  const updateRate = (index: number, field: 'weight' | 'cost', value: number) => {
    const newRates = [...rates]
    newRates[index][field] = value
    setRates(newRates)
  }

  const addRate = () => {
    const lastWeight = rates[rates.length - 1]?.weight || 0
    setRates([...rates, { weight: lastWeight + 0.5, cost: 0 }])
  }

  const removeRate = (index: number) => {
    if (rates.length <= 1) {
      toast('최소 1개의 배송비 설정이 필요합니다', 'error')
      return
    }
    setRates(rates.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
              <Truck size={24} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-4xl font-semibold text-slate-900">배송비 설정</h1>
              <p className="text-lg text-slate-600">무게 구간별 배송비를 관리하세요</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>💡 사용 방법:</strong> 타오바오 상품을 가져올 때 자동으로 무게 정보를 추출하여 해당 구간의 배송비를 적용합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={saveRates}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm bg-orange-500 text-white shadow-md hover:shadow-lg hover:bg-orange-600 transition-all"
          >
            <Save size={18} />
            <span>저장</span>
          </button>

          <button
            onClick={resetToDefault}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Trash2 size={18} />
            <span>기본값으로 초기화</span>
          </button>

          <button
            onClick={addRate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Plus size={18} />
            <span>구간 추가</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <div className="grid grid-cols-[1fr,2fr,auto] gap-4 p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
            <div>무게 (kg)</div>
            <div>배송비 (KRW)</div>
            <div className="w-10"></div>
          </div>

          <div className="divide-y divide-slate-200">
            {rates.map((rate, index) => (
              <div key={index} className="grid grid-cols-[1fr,2fr,auto] gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center">
                  <span className="text-slate-600 mr-2">~</span>
                  <input
                    type="number"
                    step="0.1"
                    value={rate.weight}
                    onChange={(e) => updateRate(index, 'weight', parseFloat(e.target.value) || 0)}
                    className="w-20 px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-medium text-slate-900"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="number"
                    step="100"
                    value={rate.cost}
                    onChange={(e) => updateRate(index, 'cost', parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-medium text-slate-900"
                  />
                  <span className="ml-2 text-slate-600 font-medium">원</span>
                </div>

                <div className="flex items-center">
                  <button
                    onClick={() => removeRate(index)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">미리보기</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rates.slice(0, 8).map((rate, index) => (
              <div key={index} className="bg-white rounded-lg border border-slate-200 p-3">
                <div className="text-xs text-slate-600 mb-1">~ {rate.weight}kg</div>
                <div className="text-base font-semibold text-orange-500">
                  ₩{rate.cost.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          {rates.length > 8 && (
            <p className="text-sm text-slate-500 mt-3">...외 {rates.length - 8}개</p>
          )}
        </div>
      </main>

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`px-6 py-4 rounded-xl shadow-lg font-medium ${
            showToast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}>
            {showToast.message}
          </div>
        </div>
      )}
    </div>
  )
}
