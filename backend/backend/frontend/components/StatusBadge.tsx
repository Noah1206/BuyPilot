/**
 * StatusBadge component
 * Displays order status with VS Code themed colors
 */

interface StatusBadgeProps {
  status: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: '대기중',
    className: 'status-pending',
  },
  SUPPLIER_ORDERING: {
    label: '구매 진행중',
    className: 'status-ordering',
  },
  ORDERED_SUPPLIER: {
    label: '구매 완료',
    className: 'status-ordered',
  },
  BUYER_INFO_SET: {
    label: '배송 준비',
    className: 'status-ordered',
  },
  FORWARDER_SENDING: {
    label: '배대지 전송중',
    className: 'status-sending',
  },
  SENT_TO_FORWARDER: {
    label: '배송중',
    className: 'status-sending',
  },
  DONE: {
    label: '완료',
    className: 'status-done',
  },
  FAILED: {
    label: '실패',
    className: 'status-failed',
  },
  MANUAL_REVIEW: {
    label: '검토 필요',
    className: 'status-review',
  },
  RETRYING: {
    label: '재시도중',
    className: 'status-ordering',
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-vscode-bg-tertiary text-vscode-text-secondary',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {config.label}
    </span>
  )
}
