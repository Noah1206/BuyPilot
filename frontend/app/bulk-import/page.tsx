/**
 * Bulk Import page - Excel-based mass product import
 */

'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { Download, Upload, FileSpreadsheet, Sparkles, CheckCircle, XCircle, Loader } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ExcelRow {
  타오바오_링크: string
  카테고리?: string
  배송비?: number
  마진율?: number
  무게?: number
  관세율?: number
  부가세율?: number
  메모?: string
}

interface ParsedProduct {
  row: number
  taobao_url: string
  category_name?: string  // 한국어 카테고리명 (예: "슬리퍼")
  shipping_cost?: number
  margin?: number
  weight?: number
  customs_rate?: number
  vat_rate?: number
  memo?: string
  error?: string
}

export default function BulkImportPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type })
    setTimeout(() => setShowToast(null), 3000)
  }

  // Download Excel template
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Product Data Template
    const templateData = [
      ['타오바오_링크', '카테고리', '배송비', '마진율', '무게', '관세율', '부가세율', '메모'],
      ['필수 입력', '선택 (비우면 AI)', '원 단위', '% 단위', 'kg 단위', '% 단위', '% 단위', ''],
      ['https://item.taobao.com/item.htm?id=123456', '슬리퍼', '3000', '30', '0.5', '8', '10', 'VIP 고객용'],
      ['https://item.taobao.com/item.htm?id=789012', '', '2500', '25', '', '', '', 'AI 자동 분석']
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(templateData)
    XLSX.utils.book_append_sheet(wb, ws1, '상품정보')

    // Sheet 2: Instructions
    const instructions = [
      ['엑셀 대량 상품 수집 사용 방법'],
      [''],
      ['1. 타오바오_링크 (필수)'],
      ['   - 타오바오 상품 URL을 입력하세요'],
      ['   - 예: https://item.taobao.com/item.htm?id=123456'],
      [''],
      ['2. 카테고리 (선택)'],
      ['   - 네이버 스마트스토어 카테고리명을 한글로 입력하세요'],
      ['   - 예: "슬리퍼", "운동화", "티셔츠" 등'],
      ['   - 비워두면 AI가 자동으로 분석합니다'],
      ['   - "네이버 카테고리 목록" 파일을 다운받아 참고하세요'],
      [''],
      ['3. 배송비, 마진율, 무게 등 (선택)'],
      ['   - 선택 사항이며, 비우면 기본값이 적용됩니다'],
      ['   - 배송비: 원 단위 (예: 3000)'],
      ['   - 마진율: % 단위 (예: 30)'],
      ['   - 무게: kg 단위 (예: 0.5)'],
      [''],
      ['4. 파일 저장 후 업로드'],
      ['   - 작성 완료 후 파일을 저장하세요'],
      ['   - BuyPilot 대량 수집 페이지에서 파일을 업로드하세요']
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(instructions)
    XLSX.utils.book_append_sheet(wb, ws2, '사용방법')

    // Download file
    XLSX.writeFile(wb, `BuyPilot_상품수집_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast('엑셀 템플릿이 다운로드되었습니다')
  }

  // Download category list
  const downloadCategoryList = async () => {
    try {
      const response = await fetch('/api/v1/smartstore/categories')
      const result = await response.json()

      if (result.ok && result.data?.categories) {
        const categories = result.data.categories

        const wb = XLSX.utils.book_new()
        const data = [
          ['카테고리명', '전체_경로', '카테고리_ID'],
          ...categories.map((cat: any) => [cat.name, cat.path, cat.id])
        ]

        const ws = XLSX.utils.aoa_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, '네이버 카테고리')

        XLSX.writeFile(wb, `네이버_카테고리_목록_${new Date().toISOString().split('T')[0]}.xlsx`)
        toast('네이버 카테고리 목록이 다운로드되었습니다')
      } else {
        toast('카테고리 목록을 가져오는데 실패했습니다', 'error')
      }
    } catch (error) {
      console.error('Failed to download category list:', error)
      toast('카테고리 목록 다운로드 중 오류가 발생했습니다', 'error')
    }
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast('엑셀 파일만 업로드 가능합니다 (.xlsx, .xls)', 'error')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast('파일 크기는 10MB 이하여야 합니다', 'error')
      return
    }

    setUploadedFile(file)
    parseExcelFile(file)
  }

  // Parse Excel file
  const parseExcelFile = (file: File) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: ExcelRow[] = XLSX.utils.sheet_to_json(firstSheet)

        // Parse and validate each row
        const products: ParsedProduct[] = rows.map((row, index) => {
          const product: ParsedProduct = {
            row: index + 2, // Excel row number (1-indexed + header)
            taobao_url: row.타오바오_링크?.trim() || '',
            category_name: row.카테고리?.toString().trim() || undefined,
            shipping_cost: row.배송비 ? Number(row.배송비) : undefined,
            margin: row.마진율 ? Number(row.마진율) : undefined,
            weight: row.무게 ? Number(row.무게) : undefined,
            customs_rate: row.관세율 ? Number(row.관세율) : undefined,
            vat_rate: row.부가세율 ? Number(row.부가세율) : undefined,
            memo: row.메모?.trim() || undefined
          }

          // Validation
          if (!product.taobao_url) {
            product.error = '타오바오 링크가 필요합니다'
          } else if (!product.taobao_url.includes('taobao.com') && !product.taobao_url.includes('1688.com')) {
            product.error = '유효한 타오바오/1688 링크가 아닙니다'
          } else if (product.shipping_cost && (product.shipping_cost < 0 || product.shipping_cost > 100000)) {
            product.error = '배송비는 0-100,000원 사이여야 합니다'
          } else if (product.margin && (product.margin < 0 || product.margin > 100)) {
            product.error = '마진율은 0-100% 사이여야 합니다'
          }

          return product
        })

        setParsedProducts(products)
        toast(`${products.length}개 상품을 불러왔습니다`)
      } catch (error) {
        console.error('Failed to parse Excel:', error)
        toast('엑셀 파일 파싱 중 오류가 발생했습니다', 'error')
      }
    }

    reader.readAsBinaryString(file)
  }

  // Start bulk import
  const startBulkImport = async () => {
    // Filter out products with errors
    const validProducts = parsedProducts.filter(p => !p.error)

    if (validProducts.length === 0) {
      toast('유효한 상품이 없습니다', 'error')
      return
    }

    if (!confirm(`${validProducts.length}개 상품을 수집하시겠습니까?`)) {
      return
    }

    setImporting(true)
    setProgress({ current: 0, total: validProducts.length })

    toast('상품 수집을 시작합니다...')

    try {
      // Prepare products data for API
      const products = validProducts.map(p => ({
        taobao_url: p.taobao_url,
        category_name: p.category_name,  // 한국어 카테고리명
        shipping_cost: p.shipping_cost,
        margin: p.margin,
        weight: p.weight,
        customs_rate: p.customs_rate,
        vat_rate: p.vat_rate,
        memo: p.memo
      }))

      const response = await fetch('/api/v1/products/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products,
          use_ai_category: true
        })
      })

      const result = await response.json()

      if (result.ok && result.data) {
        const { summary, results } = result.data

        setImporting(false)
        setProgress({ current: summary.total, total: summary.total })

        if (summary.failed === 0) {
          toast(`✅ ${summary.success}개 상품이 성공적으로 수집되었습니다!`)
        } else {
          toast(`⚠️ ${summary.success}개 성공, ${summary.failed}개 실패`, 'error')
        }

        // Log detailed results
        console.log('Bulk import results:', results)

        // Show failed products
        const failedProducts = results.filter((r: any) => !r.success)
        if (failedProducts.length > 0) {
          console.error('Failed products:', failedProducts)
        }
      } else {
        throw new Error(result.error?.message || '대량 수집 중 오류가 발생했습니다')
      }
    } catch (error) {
      console.error('Bulk import error:', error)
      toast('대량 수집 중 오류가 발생했습니다', 'error')
    } finally {
      setImporting(false)
    }
  }

  const validCount = parsedProducts.filter(p => !p.error).length
  const errorCount = parsedProducts.filter(p => p.error).length
  const manualCategoryCount = parsedProducts.filter(p => p.category_id && !p.error).length
  const aiCategoryCount = parsedProducts.filter(p => !p.category_id && !p.error).length

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <FileSpreadsheet size={36} className="text-orange-500" />
            엑셀 대량 상품 수집
          </h1>
          <p className="text-slate-600">
            엑셀 템플릿을 다운로드하여 타오바오 링크와 정보를 입력한 후 업로드하세요
          </p>
        </div>

        {/* Step 1: Download Templates */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold">
              1
            </span>
            엑셀 템플릿 다운로드
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={downloadTemplate}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
            >
              <Download size={20} />
              상품 수집 템플릿 다운로드
            </button>

            <button
              onClick={downloadCategoryList}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
            >
              <Download size={20} />
              네이버 카테고리 목록 다운로드
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">💡 카테고리 입력 방법:</p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4">
              <li>• <strong>수동 입력</strong>: 카테고리 ID를 직접 입력 (정확한 카테고리 지정)</li>
              <li>• <strong>AI 자동</strong>: 비워두면 AI가 자동으로 분석 (편리함)</li>
              <li>• 혼합 사용 가능 (일부는 수동, 일부는 AI)</li>
            </ul>
          </div>
        </div>

        {/* Step 2: Upload Excel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold">
              2
            </span>
            엑셀 파일 업로드
          </h2>

          <label className="block">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={importing}
            />
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-orange-500 hover:bg-orange-50 transition-all cursor-pointer">
              <Upload size={48} className="mx-auto mb-4 text-slate-400" />
              <p className="text-lg font-medium text-slate-700 mb-1">
                {uploadedFile ? uploadedFile.name : '파일 선택 또는 드래그 & 드롭'}
              </p>
              <p className="text-sm text-slate-500">
                .xlsx, .xls 파일 (최대 10MB)
              </p>
            </div>
          </label>

          {uploadedFile && parsedProducts.length > 0 && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{parsedProducts.length}</div>
                  <div className="text-xs text-slate-600">총 상품 수</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{validCount}</div>
                  <div className="text-xs text-slate-600">유효</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{manualCategoryCount}</div>
                  <div className="text-xs text-slate-600">수동 카테고리</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{aiCategoryCount}</div>
                  <div className="text-xs text-slate-600">AI 카테고리</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Preview & Start */}
        {parsedProducts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold">
                3
              </span>
              미리보기 및 수집 시작
            </h2>

            {/* Preview Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">행</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">링크</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">카테고리</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">배송비</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">마진</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedProducts.slice(0, 10).map((product, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-slate-600">{product.row}</td>
                      <td className="px-4 py-3 text-slate-900 font-mono text-xs truncate max-w-xs">
                        {product.taobao_url.substring(0, 50)}...
                      </td>
                      <td className="px-4 py-3">
                        {product.category_id ? (
                          <span className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs font-medium text-green-700">
                            ✅ {product.category_id}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs font-medium text-blue-700">
                            🤖 AI 분석
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {product.shipping_cost ? `₩${product.shipping_cost.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {product.margin ? `${product.margin}%` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {product.error ? (
                          <span className="text-xs text-red-600">❌ {product.error}</span>
                        ) : (
                          <CheckCircle size={16} className="text-green-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedProducts.length > 10 && (
                <p className="text-sm text-slate-500 mt-2 text-center">
                  ... 외 {parsedProducts.length - 10}개 (총 {parsedProducts.length}개)
                </p>
              )}
            </div>

            {/* Error Summary */}
            {errorCount > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  ⚠️ {errorCount}개 상품에 오류가 있습니다:
                </p>
                <ul className="text-sm text-red-800 space-y-1 ml-4">
                  {parsedProducts.filter(p => p.error).slice(0, 5).map((product, index) => (
                    <li key={index}>
                      • {product.row}번 행: {product.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Start Import Button */}
            <button
              onClick={startBulkImport}
              disabled={importing || validCount === 0}
              className="w-full px-6 py-4 bg-orange-500 text-white rounded-lg font-bold text-lg hover:bg-orange-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {importing ? (
                <>
                  <Loader size={24} className="animate-spin" />
                  수집 중... ({progress.current}/{progress.total})
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  {validCount}개 상품 수집 시작
                </>
              )}
            </button>

            {/* Progress Bar */}
            {importing && (
              <div className="mt-4">
                <div className="w-full bg-slate-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-orange-500 h-6 rounded-full transition-all duration-300 flex items-center justify-center text-white text-sm font-semibold"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  >
                    {Math.round((progress.current / progress.total) * 100)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
            showToast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {showToast.message}
          </div>
        </div>
      )}
    </div>
  )
}
