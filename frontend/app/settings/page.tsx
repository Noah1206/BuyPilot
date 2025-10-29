/**
 * Settings page - User settings and preferences
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { User, Mail, Phone, MapPin, Save, AlertCircle, Check, Store } from 'lucide-react'

export default function Settings() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'KR',
    // SmartStore settings
    smartstore_category_id: '50000006', // Default: 선반
    smartstore_stock_quantity: '999',
    smartstore_origin_area: '0801', // Default: China
    smartstore_brand: '',
    smartstore_manufacturer: '',
  })

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    // Load SmartStore settings from localStorage
    const smartstoreSettings = localStorage.getItem('smartstore_settings')
    const parsedSettings = smartstoreSettings ? JSON.parse(smartstoreSettings) : {}

    // Load user data into form
    setFormData({
      name: parsedUser.name || '',
      email: parsedUser.email || '',
      phone: parsedUser.phone || '',
      address: parsedUser.address || '',
      city: parsedUser.city || '',
      country: parsedUser.country || 'KR',
      // SmartStore settings
      smartstore_category_id: parsedSettings.category_id || '50000006',
      smartstore_stock_quantity: parsedSettings.stock_quantity || '999',
      smartstore_origin_area: parsedSettings.origin_area || '0801',
      smartstore_brand: parsedSettings.brand || '',
      smartstore_manufacturer: parsedSettings.manufacturer || '',
    })

    setIsLoading(false)
  }, [router])

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type })
    setTimeout(() => setShowToast(null), 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Save user settings
      const { smartstore_category_id, smartstore_stock_quantity, smartstore_origin_area, smartstore_brand, smartstore_manufacturer, ...userFields } = formData
      const updatedUser = { ...user, ...userFields }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)

      // Save SmartStore settings separately
      const smartstoreSettings = {
        category_id: smartstore_category_id,
        stock_quantity: parseInt(smartstore_stock_quantity),
        origin_area: smartstore_origin_area,
        brand: smartstore_brand,
        manufacturer: smartstore_manufacturer,
      }
      localStorage.setItem('smartstore_settings', JSON.stringify(smartstoreSettings))

      toast('설정이 저장되었습니다!')
    } catch (error) {
      toast('설정 저장에 실패했습니다', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-3 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            설정
          </h1>
          <p className="text-lg text-slate-600">
            계정 정보와 환경 설정을 관리하세요
          </p>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <User size={24} className="text-blue-600" />
              개인 정보
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                  placeholder="홍길동"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  <Mail size={16} className="inline mr-1" />
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                  <Phone size={16} className="inline mr-1" />
                  전화번호
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                  placeholder="010-1234-5678"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <MapPin size={24} className="text-blue-600" />
              주소 정보
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
                  주소
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                  placeholder="서울시 강남구 테헤란로 123"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-2">
                    도시
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                    placeholder="서울"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-2">
                    국가
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                  >
                    <option value="KR">대한민국</option>
                    <option value="US">미국</option>
                    <option value="JP">일본</option>
                    <option value="CN">중국</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SmartStore Settings */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Store size={24} className="text-blue-600" />
              스마트스토어 기본 설정
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="smartstore_category_id" className="block text-sm font-medium text-slate-700 mb-2">
                    기본 카테고리 ID
                  </label>
                  <input
                    type="text"
                    id="smartstore_category_id"
                    name="smartstore_category_id"
                    value={formData.smartstore_category_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                    placeholder="50000006"
                  />
                  <p className="mt-1 text-xs text-slate-500">기본값: 50000006 (선반)</p>
                </div>

                <div>
                  <label htmlFor="smartstore_stock_quantity" className="block text-sm font-medium text-slate-700 mb-2">
                    기본 재고 수량
                  </label>
                  <input
                    type="number"
                    id="smartstore_stock_quantity"
                    name="smartstore_stock_quantity"
                    value={formData.smartstore_stock_quantity}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                    placeholder="999"
                  />
                  <p className="mt-1 text-xs text-slate-500">기본값: 999</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="smartstore_origin_area" className="block text-sm font-medium text-slate-700 mb-2">
                    원산지 코드
                  </label>
                  <select
                    id="smartstore_origin_area"
                    name="smartstore_origin_area"
                    value={formData.smartstore_origin_area}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                  >
                    <option value="0801">중국</option>
                    <option value="1101">대한민국</option>
                    <option value="0802">일본</option>
                    <option value="0803">미국</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">기본값: 중국</p>
                </div>

                <div>
                  <label htmlFor="smartstore_brand" className="block text-sm font-medium text-slate-700 mb-2">
                    브랜드명 (선택)
                  </label>
                  <input
                    type="text"
                    id="smartstore_brand"
                    name="smartstore_brand"
                    value={formData.smartstore_brand}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                    placeholder="브랜드명을 입력하세요"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="smartstore_manufacturer" className="block text-sm font-medium text-slate-700 mb-2">
                  제조사 (선택)
                </label>
                <input
                  type="text"
                  id="smartstore_manufacturer"
                  name="smartstore_manufacturer"
                  value={formData.smartstore_manufacturer}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-900"
                  placeholder="제조사를 입력하세요"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-600/50 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>변경사항 저장</span>
                </>
              )}
            </button>
          </div>
        </form>
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
