'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Package, TrendingUp, LogIn, UserPlus, LogOut, User } from 'lucide-react'

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

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              BuyPilot
            </span>
          </a>

          {/* Menu */}
          <div className="hidden md:flex items-center gap-1">
            <a
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/')
                  ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Home size={18} />
              홈
            </a>
            <a
              href="/dashboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/dashboard')
                  ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Package size={18} />
              주문 관리
            </a>
            <a
              href="/products"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/products')
                  ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Package size={18} />
              상품 관리
            </a>
            <a
              href="/competitor"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/competitor')
                  ? 'text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TrendingUp size={18} />
              경쟁사 분석
            </a>

            {/* Auth buttons */}
            <div className="ml-4 flex items-center gap-2 pl-4 border-l border-slate-200">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700">
                    <User size={16} />
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
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                  >
                    <LogIn size={18} />
                    로그인
                  </a>
                  <a
                    href="/register"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg transition-all"
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
