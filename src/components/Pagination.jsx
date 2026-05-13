export default function Pagination({ page, hasNext, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
      <span className="text-sm text-gray-500">第 {page} 頁</span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="btn-outline text-sm px-3 py-1.5 disabled:opacity-40"
        >
          ← 上一頁
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="btn-outline text-sm px-3 py-1.5 disabled:opacity-40"
        >
          下一頁 →
        </button>
      </div>
    </div>
  )
}
