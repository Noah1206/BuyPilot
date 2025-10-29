/**
 * TranslationButton component
 * Button to trigger AI translation for a product title
 */

import { useState } from 'react'

interface TranslationButtonProps {
  title: string // Chinese title to translate
  onTranslate: (translated: string) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export default function TranslationButton({
  title,
  onTranslate,
  disabled = false,
  size = 'sm',
}: TranslationButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleTranslate = async () => {
    setLoading(true)

    try {
      const { translateTitle } = await import('@/lib/api-competitor')
      const response = await translateTitle(title)

      if (response.ok && response.data) {
        onTranslate(response.data.translated)
      } else {
        alert(`번역 실패: ${response.error?.message || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('Translation error:', error)
      alert(`번역 실패: ${error.message || '네트워크 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  }

  return (
    <button
      onClick={handleTranslate}
      disabled={disabled || loading}
      className={`
        ${sizeClasses[size]}
        bg-[#58a6ff] hover:bg-[#1f6feb]
        disabled:bg-[#21262d] disabled:text-[#6e7681] disabled:cursor-not-allowed
        text-white font-medium rounded
        transition-colors
        flex items-center gap-1.5
      `}
      title="AI로 한글 번역하기"
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-3 w-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          번역중...
        </>
      ) : (
        <>
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          한글 번역
        </>
      )}
    </button>
  )
}
