/**
 * StepIndicator component
 * Displays current step in the competitor analysis workflow
 */

interface StepIndicatorProps {
  currentStep: 0 | 1 | 2 | 3 | 4
}

const steps = [
  { number: 1, label: '크롤링', description: '스마트스토어 상품 수집' },
  { number: 2, label: '매칭', description: '타오바오 상품 검색' },
  { number: 3, label: '가격계산', description: '판매가 자동 계산' },
  { number: 4, label: '다운로드', description: 'Excel 파일 생성' },
]

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number
          const isCurrent = currentStep === step.number
          const isPending = currentStep < step.number

          return (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                    transition-all duration-300
                    ${isCompleted
                      ? 'bg-[#238636] text-white'
                      : isCurrent
                      ? 'bg-[#58a6ff] text-white ring-4 ring-[#58a6ff]/20'
                      : 'bg-[#21262d] text-[#6e7681] border border-[#30363d]'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <div
                    className={`
                      text-sm font-medium
                      ${isCurrent ? 'text-[#e6edf3]' : 'text-[#8d96a0]'}
                    `}
                  >
                    {step.label}
                  </div>
                  <div className="text-xs text-[#6e7681] mt-0.5 whitespace-nowrap">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 -mt-8">
                  <div
                    className={`
                      h-full transition-all duration-300
                      ${isCompleted
                        ? 'bg-[#238636]'
                        : 'bg-[#30363d]'
                      }
                    `}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
