/**
 * Landing Page - Clean & Professional Design
 */

'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { ArrowRight, TrendingUp, Zap, Shield, DollarSign, Package, BarChart3, Globe, Check, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-6">
                <Zap size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-700">매달 500+ 셀러가 선택</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 mb-6 leading-tight">
                타오바오 소싱<br />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">3배 빠르게</span>
              </h1>

              <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                경쟁사 분석부터 주문 자동화까지<br />
                한 번의 클릭으로 모든 과정 완료
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-3xl font-semibold text-blue-600">95%</div>
                  <div className="text-sm text-slate-600 mt-1">시간 절약</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-3xl font-semibold text-blue-600">2.5억</div>
                  <div className="text-sm text-slate-600 mt-1">월 거래액</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-3xl font-semibold text-blue-600">500+</div>
                  <div className="text-sm text-slate-600 mt-1">활성 셀러</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a
                  href="/competitor"
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  무료로 시작하기
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="/products"
                  className="px-8 py-4 bg-white text-slate-900 rounded-xl font-medium border border-slate-300 hover:bg-slate-50 hover:shadow-md transition-all"
                >
                  데모 보기
                </a>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-6 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-blue-600" />
                  <span>카드 등록 불필요</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-blue-600" />
                  <span>5분만에 시작</span>
                </div>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
                <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <div className="text-center text-white">
                    <BarChart3 size={64} strokeWidth={2} />
                    <p className="mt-4 font-semibold text-2xl">실시간 대시보드</p>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-red-500 text-white px-5 py-2 rounded-full shadow-lg">
                <p className="font-semibold text-sm">HOT</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium text-sm mb-4">
              핵심 기능
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 mb-4">
              왜 BuyPilot을 써야 할까요?
            </h2>
            <p className="text-xl text-slate-600">
              복잡했던 소싱 과정을 단순하게
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 size={24} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">경쟁사 분석</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                스마트스토어 URL만 입력하면 타오바오 후보 상품 자동 검색
              </p>
              <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                <span>평균 30초 소요</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Package size={24} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">자동 수입</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                이미지, 옵션, 설명 자동 수집 및 번역
              </p>
              <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                <span>클릭 한 번으로</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Zap size={24} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">주문 자동화</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                주문 접수부터 타오바오 구매까지 자동 처리
              </p>
              <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                <span>24/7 자동 운영</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <DollarSign size={24} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">실시간 가격</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                환율, 배송비, 수수료 자동 계산으로 최적 마진 확보
              </p>
              <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                <span>실시간 업데이트</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Globe size={24} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">AI 번역</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                상품명, 옵션, 상세 설명 자동 번역 및 수정
              </p>
              <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                <span>99% 정확도</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Shield size={24} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">안전 관리</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                모든 주문과 상품 정보 안전 보관 및 관리
              </p>
              <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                <span>클라우드 저장</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-4 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              이미 많은 셀러가 사용 중입니다
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-200">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="#2563EB" stroke="#2563EB" />
                ))}
              </div>
              <p className="mb-4 leading-relaxed text-slate-700">
                "하루에 5시간 걸리던 상품 등록이 30분으로 줄었어요. 이제 마케팅에 집중할 수 있게 됐습니다."
              </p>
              <div className="font-semibold text-slate-900">김OO 셀러</div>
              <div className="text-sm text-slate-600">의류 카테고리 · 월 5000만원</div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-200">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="#2563EB" stroke="#2563EB" />
                ))}
              </div>
              <p className="mb-4 leading-relaxed text-slate-700">
                "경쟁사 분석 기능이 정말 유용해요. 어떤 상품을 팔아야 할지 감이 잡혀요."
              </p>
              <div className="font-semibold text-slate-900">이OO 셀러</div>
              <div className="text-sm text-slate-600">생활용품 · 월 3000만원</div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-200">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="#2563EB" stroke="#2563EB" />
                ))}
              </div>
              <p className="mb-4 leading-relaxed text-slate-700">
                "주문 자동화로 밤에 자면서도 주문이 처리돼요. 진짜 자동화가 가능하네요!"
              </p>
              <div className="font-semibold text-slate-900">박OO 셀러</div>
              <div className="text-sm text-slate-600">잡화 · 월 2000만원</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-semibold text-white mb-6 leading-tight">
            지금 시작하면<br />
            첫 달 무료!
          </h2>
          <p className="text-xl text-white/90 mb-10">
            신용카드 등록 없이 바로 시작하세요
          </p>
          <a
            href="/competitor"
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-blue-600 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
          >
            무료로 시작하기
            <ArrowRight size={24} strokeWidth={2} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="text-2xl font-semibold mb-4">BuyPilot</h3>
              <p className="text-slate-400">타오바오 소싱 자동화</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">제품</h4>
              <div className="space-y-3">
                <a href="/competitor" className="block text-slate-400 hover:text-white transition-colors">경쟁사 분석</a>
                <a href="/products" className="block text-slate-400 hover:text-white transition-colors">상품 관리</a>
                <a href="/dashboard" className="block text-slate-400 hover:text-white transition-colors">주문 관리</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">지원</h4>
              <div className="space-y-3">
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">고객센터</a>
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">사용 가이드</a>
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">FAQ</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">회사</h4>
              <div className="space-y-3">
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">소개</a>
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">이용약관</a>
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">개인정보처리방침</a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-slate-400">
            <p>© 2024 BuyPilot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
