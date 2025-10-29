/**
 * Landing Page - HeySeller Style
 * Clean, modern, professional design for BuyPilot
 */

'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { ArrowRight, TrendingUp, Zap, Shield, DollarSign, Package, BarChart3, Globe } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              BuyPilot
            </h1>
            <p className="mt-2 text-lg text-slate-600">타오바오 소싱 자동화 플랫폼</p>
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            타오바오 소싱,
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              이제 자동으로
            </span>
          </h2>

          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            경쟁사 분석부터 상품 수입, 주문 처리까지<br />
            모든 과정을 자동화하는 스마트한 소싱 플랫폼
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a
              href="/competitor"
              className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
            >
              무료로 시작하기
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="/products"
              className="px-8 py-4 bg-white text-slate-700 rounded-xl font-semibold text-lg border-2 border-slate-200 hover:border-blue-300 hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200"
            >
              상품 관리하기
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-green-600" />
              <span>안전한 거래</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-600" />
              <span>빠른 처리</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <span>실시간 분석</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              왜 BuyPilot인가?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              타오바오 소싱의 모든 과정을 자동화하여 시간과 비용을 절약하세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">경쟁사 분석</h3>
              <p className="text-slate-600 leading-relaxed">
                스마트스토어 상품 URL만 입력하면 자동으로 타오바오 후보 상품을 찾고 비교 분석해드립니다
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">상품 자동 수입</h3>
              <p className="text-slate-600 leading-relaxed">
                타오바오 상품 정보, 이미지, 옵션을 자동으로 수집하고 번역하여 바로 판매 가능한 상태로 만들어드립니다
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">주문 자동화</h3>
              <p className="text-slate-600 leading-relaxed">
                스마트스토어 주문이 들어오면 자동으로 타오바오에서 구매하고 배대지로 발송 요청합니다
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 bg-gradient-to-br from-orange-50 to-white rounded-2xl border border-orange-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <DollarSign size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">가격 분석</h3>
              <p className="text-slate-600 leading-relaxed">
                타오바오 가격, 배송비, 수수료를 실시간으로 계산하여 최적의 마진을 확보할 수 있도록 도와드립니다
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 bg-gradient-to-br from-pink-50 to-white rounded-2xl border border-pink-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Globe size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">번역 자동화</h3>
              <p className="text-slate-600 leading-relaxed">
                중국어 상품명, 옵션, 설명을 자동으로 한국어로 번역하고 수정 가능한 에디터를 제공합니다
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">안전한 관리</h3>
              <p className="text-slate-600 leading-relaxed">
                모든 주문 내역과 상품 정보를 안전하게 보관하고 언제든지 확인하고 관리할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              어떻게 작동하나요?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              3단계로 간단하게 타오바오 소싱을 시작하세요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 h-full">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 mt-4">상품 찾기</h3>
                <p className="text-slate-600 leading-relaxed">
                  경쟁사 스마트스토어 URL을 입력하거나 타오바오 상품 URL을 직접 입력하세요
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <ArrowRight size={32} className="text-slate-300" />
            </div>

            {/* Step 2 */}
            <div className="relative md:col-start-3">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 h-full">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 mt-4">자동 분석</h3>
                <p className="text-slate-600 leading-relaxed">
                  AI가 자동으로 상품 정보를 수집하고 번역하며 가격을 분석합니다
                </p>
              </div>
            </div>

            {/* Arrow back */}
            <div className="hidden md:flex items-center justify-center md:col-start-2 md:row-start-2">
              <ArrowRight size={32} className="text-slate-300 transform rotate-180" />
            </div>

            {/* Step 3 */}
            <div className="relative md:col-start-1 md:row-start-2">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 h-full">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 mt-4">판매 시작</h3>
                <p className="text-slate-600 leading-relaxed">
                  준비된 상품으로 바로 판매를 시작하고 주문은 자동으로 처리됩니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            복잡한 타오바오 소싱, BuyPilot과 함께라면 쉽고 빠르게
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/competitor"
              className="group px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              경쟁사 분석 시작
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="/products"
              className="px-8 py-4 bg-transparent text-white rounded-xl font-semibold text-lg border-2 border-white hover:bg-white/10 transform hover:-translate-y-0.5 transition-all duration-200"
            >
              상품 둘러보기
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">BuyPilot</h3>
            <p className="text-sm">타오바오 소싱 자동화 플랫폼</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <a href="/competitor" className="hover:text-white transition-colors">경쟁사 분석</a>
            <a href="/products" className="hover:text-white transition-colors">상품 관리</a>
            <a href="/dashboard" className="hover:text-white transition-colors">주문 관리</a>
          </div>
          <p className="text-xs">© 2024 BuyPilot. All rights reserved.</p>
        </div>
      </footer>

      {/* Animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
