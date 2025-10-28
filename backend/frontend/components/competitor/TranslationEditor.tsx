/**
 * TranslationEditor component
 * Inline editor for translated product titles
 */

import { useState, useEffect } from 'react'

interface TranslationEditorProps {
  original: string // Original Chinese title
  translated: string | null // Current Korean translation
  onSave: (newTranslation: string) => void
  onCancel?: () => void
}

export default function TranslationEditor({
  original,
  translated,
  onSave,
  onCancel,
}: TranslationEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(translated || '')

  useEffect(() => {
    if (translated) {
      setEditedText(translated)
    }
  }, [translated])

  const handleSave = () => {
    if (editedText.trim()) {
      onSave(editedText.trim())
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditedText(translated || '')
    setIsEditing(false)
    onCancel?.()
  }

  if (!translated) {
    return (
      <div className="text-xs text-[#6e7681] italic">
        번역을 시작하려면 "한글 번역" 버튼을 클릭하세요
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        {/* Original title for reference */}
        <div className="text-xs text-[#8d96a0]">
          <span className="font-medium">원본:</span> {original}
        </div>

        {/* Edit input */}
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] text-sm resize-none"
          rows={2}
          placeholder="번역된 한글 제목을 입력하세요"
          autoFocus
        />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!editedText.trim()}
            className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-[#6e7681] disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
          >
            저장
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#e6edf3] text-xs rounded transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {/* Show original */}
      <div className="text-xs text-[#6e7681]">
        <span className="font-medium">원본:</span> {original}
      </div>

      {/* Show translated with edit button */}
      <div className="flex items-start gap-2">
        <div className="flex-1 text-sm text-[#e6edf3]">
          <span className="font-medium text-[#58a6ff]">한글:</span> {translated}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="flex-shrink-0 px-2 py-0.5 text-xs text-[#8d96a0] hover:text-[#e6edf3] hover:bg-[#21262d] rounded transition-colors"
          title="번역 수정하기"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
