/**
 * Landing Page - Korean E-commerce + Unique Branding
 * Bold, trustworthy, memorable design for BuyPilot
 */

'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { ArrowRight, TrendingUp, Zap, Shield, DollarSign, Package, BarChart3, Globe, Check, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#FF6B00] rounded-full mb-6">
                <Zap size={16} className="text-[#FF6B00]" fill="#FF6B00" />
                <span className="text-sm font-bold text-[#0F172A]">매달 500+ 셀러가 선택한</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-[#0F172A] mb-6 leading-tight">
                타오바오 소싱
                <br />
                <span className="text-[#FF6B00]">3배 빠르게</span>
              </h1>

              <p className="text-xl text-[#1F2937] mb-8 leading-relaxed font-medium">
                경쟁사 분석부터 주문 자동화까지<br />
                한 번의 클릭으로 모든 과정 완료
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="bg-white p-4 rounded-xl border-2 border-[#0F172A]">
                  <div className="text-3xl font-black text-[#FF6B00]">95%</div>
                  <div className="text-sm font-bold text-[#1F2937]">시간 절약</div>
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-[#0F172A]">
                  <div className="text-3xl font-black text-[#FF6B00]">2.5억</div>
                  <div className="text-sm font-bold text-[#1F2937]">월 거래액</div>
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-[#0F172A]">
                  <div className="text-3xl font-black text-[#FF6B00]">500+</div>
                  <div className="text-sm font-bold text-[#1F2937]">활성 셀러</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a
                  href="/competitor"
                  className="group px-8 py-5 bg-[#FF6B00] text-white rounded-xl font-black text-lg border-4 border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  무료로 시작하기
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="/products"
                  className="px-8 py-5 bg-white text-[#0F172A] rounded-xl font-black text-lg border-4 border-[#0F172A] hover:bg-[#0F172A] hover:text-white transition-all duration-200"
                >
                  데모 보기
                </a>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-[#FF6B00]" strokeWidth={3} />
                  <span className="font-bold text-[#1F2937]">카드 등록 불필요</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-[#FF6B00]" strokeWidth={3} />
                  <span className="font-bold text-[#1F2937]">5분만에 시작</span>
                </div>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl border-4 border-[#0F172A] shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                <div className="aspect-video bg-gradient-to-br from-[#FF6B00] to-[#FF8A3D] rounded-xl flex items-center justify-center">
                  <div className="text-center text-white">
                    <BarChart3 size={64} strokeWidth={3} />
                    <p className="mt-4 font-black text-2xl">실시간 대시보드</p>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-6 -right-6 bg-[#FF3D00] text-white px-6 py-3 rounded-full border-4 border-[#0F172A] shadow-lg rotate-12">
                <p className="font-black text-lg">HOT!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-[#FF6B00] text-white rounded-full font-black text-sm mb-4">
              핵심 기능
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] mb-4">
              왜 BuyPilot을 써야 할까요?
            </h2>
            <p className="text-xl text-[#1F2937] font-medium">
              복잡했던 소싱 과정을 단순하게
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-[#FFFBF5] p-8 rounded-2xl border-4 border-[#0F172A] hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-2 transition-all duration-300">
              <div className="w-14 h-14 bg-[#FF6B00] rounded-xl flex items-center justify-center mb-4 border-2 border-[#0F172A]">
                <BarChart3 size={28} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-[#0F172A] mb-3">경쟁사 분석</h3>
              <p className="text-[#1F2937] leading-relaxed font-medium mb-4">
                스마트스토어 URL만 입력하면 타오바오 후보 상품 자동 검색
              </p>
              <div className="flex items-center gap-2 text-[#FF6B00] font-black">
                <span>평균 30초 소요</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#FFFBF5] p-8 rounded-2xl border-4 border-[#0F172A] hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-2 transition-all duration-300">
              <div className="w-14 h-14 bg-[#FF6B00] rounded-xl flex items-center justify-center mb-4 border-2 border-[#0F172A]">
                <Package size={28} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-[#0F172A] mb-3">자동 수입</h3>
              <p className="text-[#1F2937] leading-relaxed font-medium mb-4">
                이미지, 옵션, 설명 자동 수집 및 번역
              </p>
              <div className="flex items-center gap-2 text-[#FF6B00] font-black">
                <span>클릭 한 번으로</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#FFFBF5] p-8 rounded-2xl border-4 border-[#0F172A] hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-2 transition-all duration-300">
              <div className="w-14 h-14 bg-[#FF6B00] rounded-xl flex items-center justify-center mb-4 border-2 border-[#0F172A]">
                <Zap size={28} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-[#0F172A] mb-3">주문 자동화</h3>
              <p className="text-[#1F2937] leading-relaxed font-medium mb-4">
                주문 접수부터 타오바오 구매까지 자동 처리
              </p>
              <div className="flex items-center gap-2 text-[#FF6B00] font-black">
                <span>24/7 자동 운영</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#FFFBF5] p-8 rounded-2xl border-4 border-[#0F172A] hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-2 transition-all duration-300">
              <div className="w-14 h-14 bg-[#FF6B00] rounded-xl flex items-center justify-center mb-4 border-2 border-[#0F172A]">
                <DollarSign size={28} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-[#0F172A] mb-3">실시간 가격</h3>
              <p className="text-[#1F2937] leading-relaxed font-medium mb-4">
                환율, 배송비, 수수료 자동 계산으로 최적 마진 확보
              </p>
              <div className="flex items-center gap-2 text-[#FF6B00] font-black">
                <span>실시간 업데이트</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Feature 5 */}
            <div className="bg-[#FFFBF5] p-8 rounded-2xl border-4 border-[#0F172A] hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-2 transition-all duration-300">
              <div className="w-14 h-14 bg-[#FF6B00] rounded-xl flex items-center justify-center mb-4 border-2 border-[#0F172A]">
                <Globe size={28} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-[#0F172A] mb-3">AI 번역</h3>
              <p className="text-[#1F2937] leading-relaxed font-medium mb-4">
                상품명, 옵션, 상세 설명 자동 번역 및 수정
              </p>
              <div className="flex items-center gap-2 text-[#FF6B00] font-black">
                <span>99% 정확도</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Feature 6 */}
            <div className="bg-[#FFFBF5] p-8 rounded-2xl border-4 border-[#0F172A] hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-2 transition-all duration-300">
              <div className="w-14 h-14 bg-[#FF6B00] rounded-xl flex items-center justify-center mb-4 border-2 border-[#0F172A]">
                <Shield size={28} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-[#0F172A] mb-3">안전 관리</h3>
              <p className="text-[#1F2937] leading-relaxed font-medium mb-4">
                모든 주문과 상품 정보 안전 보관 및 관리
              </p>
              <div className="flex items-center gap-2 text-[#FF6B00] font-black">
                <span>클라우드 저장</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              이미 많은 셀러가 사용 중입니다
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white text-[#0F172A] p-8 rounded-2xl border-4 border-[#FF6B00]">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} fill="#FF6B00" stroke="#FF6B00" />
                ))}
              </div>
              <p className="font-medium mb-4 leading-relaxed">
                "하루에 5시간 걸리던 상품 등록이 30분으로 줄었어요. 이제 마케팅에 집중할 수 있게 됐습니다."
              </p>
              <div className="font-black">김OO 셀러</div>
              <div className="text-sm text-[#1F2937]">의류 카테고리 · 월 5000만원</div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white text-[#0F172A] p-8 rounded-2xl border-4 border-[#FF6B00]">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} fill="#FF6B00" stroke="#FF6B00" />
                ))}
              </div>
              <p className="font-medium mb-4 leading-relaxed">
                "경쟁사 분석 기능이 정말 유용해요. 어떤 상품을 팔아야 할지 감이 잡혀요."
              </p>
              <div className="font-black">이OO 셀러</div>
              <div className="text-sm text-[#1F2937]">생활용품 · 월 3000만원</div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white text-[#0F172A] p-8 rounded-2xl border-4 border-[#FF6B00]">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} fill="#FF6B00" stroke="#FF6B00" />
                ))}
              </div>
              <p className="font-medium mb-4 leading-relaxed">
                "주문 자동화로 밤에 자면서도 주문이 처리돼요. 진짜 자동화가 가능하네요!"
              </p>
              <div className="font-black">박OO 셀러</div>
              <div className="text-sm text-[#1F2937]">잡화 · 월 2000만원</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-[#FF6B00]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            지금 시작하면<br />
            첫 달 무료!
          </h2>
          <p className="text-xl text-white/90 mb-10 font-bold">
            신용카드 등록 없이 바로 시작하세요
          </p>
          <a
            href="/competitor"
            className="inline-flex items-center gap-2 px-10 py-6 bg-[#0F172A] text-white rounded-xl font-black text-xl border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-200"
          >
            무료로 시작하기
            <ArrowRight size={24} strokeWidth={3} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-[#0F172A] text-white border-t-4 border-[#FF6B00]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-black mb-4">BuyPilot</h3>
              <p className="text-white/70 font-medium">타오바오 소싱 자동화</p>
            </div>
            <div>
              <h4 className="font-black mb-4">제품</h4>
              <div className="space-y-2">
                <a href="/competitor" className="block text-white/70 hover:text-white font-medium">경쟁사 분석</a>
                <a href="/products" className="block text-white/70 hover:text-white font-medium">상품 관리</a>
                <a href="/dashboard" className="block text-white/70 hover:text-white font-medium">주문 관리</a>
              </div>
            </div>
            <div>
              <h4 className="font-black mb-4">지원</h4>
              <div className="space-y-2">
                <a href="#" className="block text-white/70 hover:text-white font-medium">고객센터</a>
                <a href="#" className="block text-white/70 hover:text-white font-medium">사용 가이드</a>
                <a href="#" className="block text-white/70 hover:text-white font-medium">FAQ</a>
              </div>
            </div>
            <div>
              <h4 className="font-black mb-4">회사</h4>
              <div className="space-y-2">
                <a href="#" className="block text-white/70 hover:text-white font-medium">소개</a>
                <a href="#" className="block text-white/70 hover:text-white font-medium">이용약관</a>
                <a href="#" className="block text-white/70 hover:text-white font-medium">개인정보처리방침</a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/20 text-center text-white/70 font-medium">
            <p>© 2024 BuyPilot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
