'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Package, TrendingUp, LogIn, UserPlus, LogOut, User, Settings } from 'lucide-react'

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
    <nav className="bg-white border-b-4 border-[#0F172A] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo with bold style */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-[#FF6B00] rounded-xl flex items-center justify-center border-3 border-[#0F172A] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] group-hover:shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] group-hover:-translate-y-0.5 transition-all">
              <span className="text-white font-black text-2xl">B</span>
            </div>
            <span className="text-2xl font-black text-[#0F172A]">
              Buy<span className="text-[#FF6B00]">Pilot</span>
            </span>
          </a>

          {/* Menu with bold buttons */}
          <div className="hidden md:flex items-center gap-2">
            {!isDashboard ? (
              <>
                <a
                  href="/"
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm border-3 transition-all ${
                    isActive('/')
                      ? 'text-white bg-[#FF6B00] border-[#0F172A] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
                      : 'text-[#0F172A] border-[#0F172A] hover:bg-[#FFFBF5] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                  }`}
                >
                  <Home size={18} strokeWidth={3} />
                  홈
                </a>
                <a
                  href="/dashboard"
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm border-3 transition-all ${
                    isActive('/dashboard')
                      ? 'text-white bg-[#FF6B00] border-[#0F172A] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
                      : 'text-[#0F172A] border-[#0F172A] hover:bg-[#FFFBF5] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                  }`}
                >
                  <Package size={18} strokeWidth={3} />
                  주문 관리
                </a>
                <a
                  href="/products"
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm border-3 transition-all ${
                    isActive('/products')
                      ? 'text-white bg-[#FF6B00] border-[#0F172A] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
                      : 'text-[#0F172A] border-[#0F172A] hover:bg-[#FFFBF5] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                  }`}
                >
                  <Package size={18} strokeWidth={3} />
                  상품 관리
                </a>
                <a
                  href="/competitor"
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm border-3 transition-all ${
                    isActive('/competitor')
                      ? 'text-white bg-[#FF6B00] border-[#0F172A] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
                      : 'text-[#0F172A] border-[#0F172A] hover:bg-[#FFFBF5] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                  }`}
                >
                  <TrendingUp size={18} strokeWidth={3} />
                  경쟁사 분석
                </a>
              </>
            ) : null}

            {/* Auth buttons with bold style */}
            <div className={`${isDashboard ? '' : 'ml-4 pl-4 border-l-3 border-[#0F172A]'} flex items-center gap-2`}>
              {user ? (
                <>
                  {isDashboard && (
                    <a
                      href="/settings"
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm border-3 transition-all ${
                        isActive('/settings')
                          ? 'text-white bg-[#FF6B00] border-[#0F172A] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
                          : 'text-[#0F172A] border-[#0F172A] hover:bg-[#FFFBF5] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                      }`}
                    >
                      <Settings size={18} strokeWidth={3} />
                      설정
                    </a>
                  )}
                  {!isDashboard && (
                    <div className="flex items-center gap-2 px-4 py-3 font-bold text-sm text-[#0F172A]">
                      <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center border-2 border-[#0F172A]">
                        <User size={16} className="text-white" strokeWidth={3} />
                      </div>
                      <span className="font-black">{user.name}</span>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm text-[#FF3D00] border-3 border-[#FF3D00] hover:bg-[#FF3D00] hover:text-white hover:shadow-[2px_2px_0px_0px_rgba(255,61,0,1)] transition-all"
                  >
                    <LogOut size={18} strokeWidth={3} />
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm text-[#0F172A] border-3 border-[#0F172A] hover:bg-[#FFFBF5] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all"
                  >
                    <LogIn size={18} strokeWidth={3} />
                    로그인
                  </a>
                  <a
                    href="/register"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm text-white bg-[#FF6B00] border-3 border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 transition-all"
                  >
                    <UserPlus size={18} strokeWidth={3} />
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
