/**
 * AnalysisProgress component
 * Displays real-time progress for long-running operations
 */

interface AnalysisProgressProps {
  step: 1 | 2 | 3 // Crawling, Matching, Price calculation
  progress: { current: number; total: number }
  message?: string
}

const stepConfig = {
  1: {
    icon: '🔍',
    title: '스마트스토어 크롤링 중...',
    color: 'text-[#58a6ff]',
    bgColor: 'bg-[#58a6ff]/10',
    borderColor: 'border-[#58a6ff]',
    estimatedTime: '약 2-3분',
  },
  2: {
    icon: '🔄',
    title: '타오바오 상품 매칭 중...',
    color: 'text-[#ffa657]',
    bgColor: 'bg-[#ffa657]/10',
    borderColor: 'border-[#ffa657]',
    estimatedTime: '약 5-8분',
  },
  3: {
    icon: '💰',
    title: '판매가 계산 중...',
    color: 'text-[#3fb950]',
    bgColor: 'bg-[#3fb950]/10',
    borderColor: 'border-[#3fb950]',
    estimatedTime: '약 10초',
  },
}

export default function AnalysisProgress({ step, progress, message }: AnalysisProgressProps) {
  const config = stepConfig[step]
  const { current, total } = progress

  // Ensure valid progress values
  const safeTotal = total || 100
  const safeCurrent = Math.min(current, safeTotal)
  const percentage = safeTotal > 0 ? Math.floor((safeCurrent / safeTotal) * 100) : 0

  return (
    <div
      className={`
        bg-[#161b22] border ${config.borderColor} rounded-lg p-6
        ${config.bgColor}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <h3 className={`text-lg font-semibold ${config.color}`}>
              {config.title}
            </h3>
            {message && (
              <p className="text-sm text-[#8d96a0] mt-1">{message}</p>
            )}
          </div>
        </div>
        <div className={`text-2xl font-bold ${config.color}`}>
          {percentage}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-[#0d1117] rounded-full h-3 overflow-hidden">
          <div
            className={`
              h-full transition-all duration-300 ease-out
              ${config.bgColor.replace('/10', '')}
            `}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-[#8d96a0]">
            {safeCurrent} / {safeTotal} 완료
          </span>
          <span className="text-xs text-[#6e7681]">
            예상 소요 시간: {config.estimatedTime}
          </span>
        </div>
      </div>

      {/* Spinner Animation */}
      <div className="flex items-center gap-2 text-sm text-[#8d96a0]">
        <svg
          className="animate-spin h-4 w-4"
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
        <span>처리 중입니다. 잠시만 기다려 주세요...</span>
      </div>

      {/* Warning for long operations */}
      {step === 2 && (
        <div className="mt-4 px-4 py-3 bg-[#ffa657]/10 border border-[#ffa657] rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-[#ffa657] mt-0.5">⚠️</span>
            <div className="text-sm text-[#e6edf3]">
              <p className="font-medium">타오바오 매칭은 시간이 오래 걸립니다</p>
              <p className="text-[#8d96a0] mt-1">
                상품 100개 기준 약 5-8분 소요됩니다. 페이지를 닫지 마세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
