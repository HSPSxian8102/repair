const STATUS_MAP = {
  pending:     { label: '待處理', cls: 'bg-amber-100 text-amber-700'  },
  in_progress: { label: '處理中', cls: 'bg-blue-100  text-blue-700'   },
  completed:   { label: '已完成', cls: 'bg-teal-100  text-teal-700'   },
  cancelled:   { label: '已取消', cls: 'bg-gray-100  text-gray-500'   },
}

const PRIORITY_MAP = {
  urgent: { label: '緊急', cls: 'bg-red-100 text-red-600' },
  normal: { label: '普通', cls: 'bg-gray-100 text-gray-500' },
}

export function StatusBadge({ status }) {
  const { label, cls } = STATUS_MAP[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  if (priority !== 'urgent') return null
  const { label, cls } = PRIORITY_MAP.urgent
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}
