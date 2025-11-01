'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Package, TrendingUp, LogIn, UserPlus, LogOut, User, Settings, Truck, FileSpreadsheet } from 'lucide-react'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check for logged in user
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  const isActive = (path: string) => pathname === path
  const isDashboard = pathname === '/dashboard'

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-semibold text-slate-900">
              Buy<span className="text-orange-500">Pilot</span>
            </span>
          </a>

          {/* Menu */}
          <div className="hidden md:flex items-center gap-1">
            {!user && (
              <a
                href="/"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive('/')
                    ? 'text-orange-600 bg-orange-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Home size={18} />
                홈
              </a>
            )}
            {user && (
              <>
                <a
                  href="/dashboard"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/dashboard')
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Package size={18} />
                  주문 관리
                </a>
                <a
                  href="/settings"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/settings')
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Settings size={18} />
                  설정
                </a>
                <a
                  href="/products"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/products')
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Package size={18} />
                  상품 관리
                </a>
                <a
                  href="/shipping"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/shipping')
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Truck size={18} />
                  배송비 설정
                </a>
                <a
                  href="/bulk-import"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/bulk-import')
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet size={18} />
                  대량 수집
                </a>
                <a
                  href="/competitor"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/competitor')
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <TrendingUp size={18} />
                  경쟁사 분석
                </a>
              </>
            )}

            {/* Auth buttons */}
            <div className="ml-4 pl-4 border-l border-slate-200 flex items-center gap-2">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <User size={16} className="text-orange-600" />
                    </div>
                    <span className="font-medium">{user.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all"
                  >
                    <LogOut size={18} />
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
                  >
                    <LogIn size={18} />
                    로그인
                  </a>
                  <a
                    href="/register"
                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 hover:shadow-lg transition-all"
                  >
                    <UserPlus size={18} />
                    회원가입
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
