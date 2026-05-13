import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { StatusBadge } from '../components/StatusBadge'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 20
const CATEGORIES = ['電器設備', '水電管線', '門窗玻璃', '桌椅傢俱', '空調冷氣', '資訊設備', '環境清潔', '其他']

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function ArchiveList() {
  const [allArchived,    setAllArchived]    = useState([])
  const [loading,        setLoading]        = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm,     setSearchTerm]     = useState('')
  const [page,           setPage]           = useState(1)

  useEffect(() => {
    getDocs(query(collection(db, 'repairs'), where('archived', '==', true)))
      .then(snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        all.sort((a, b) => {
          const ta = a.submittedAt?.toDate?.() ?? new Date(a.submittedAt || 0)
          const tb = b.submittedAt?.toDate?.() ?? new Date(b.submittedAt || 0)
          return tb - ta
        })
        setAllArchived(all)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = allArchived.filter(r => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      const inTitle    = (r.title || '').toLowerCase().includes(term)
      const inLocation = (r.locationName || r.location || '').toLowerCase().includes(term)
      if (!inTitle && !inLocation) return false
    }
    return true
  })

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const clearFilters = () => { setSearchTerm(''); setCategoryFilter('all'); setPage(1) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">歷史封存紀錄</h1>
          <p className="text-sm text-gray-400 mt-0.5">已完成超過 12 個月、自動封存的報修單</p>
        </div>
      </div>

      {/* Search + Category */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          className="input flex-1"
          placeholder="搜尋標題或地點…"
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
        />
        <select
          className="input sm:w-36"
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
        >
          <option value="all">全部類別</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(searchTerm || categoryFilter !== 'all') && (
          <button onClick={clearFilters} className="btn-outline text-sm px-3">清除</button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">載入中…</div>
      ) : pageItems.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📦</div>
          <div className="text-sm">
            {allArchived.length === 0 ? '尚無封存紀錄' : '沒有符合條件的紀錄'}
          </div>
          {(searchTerm || categoryFilter !== 'all') && (
            <button onClick={clearFilters} className="btn-outline text-sm mt-3">清除篩選</button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-2">共 {filtered.length} 筆封存紀錄</p>
          <div className="space-y-2">
            {pageItems.map(r => (
              <Link
                key={r.id}
                to={`/repair/${r.id}`}
                className="card flex items-start gap-4 p-4 hover:border-gray-300 hover:shadow-sm transition-all block opacity-75 hover:opacity-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500">
                      已封存
                    </span>
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-gray-400">{r.category}</span>
                  </div>
                  <div className="font-semibold text-gray-700 truncate">{r.title}</div>
                  <div className="text-sm text-gray-400 mt-0.5 truncate">
                    📍 {r.locationName || r.location}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-400">{formatDate(r.submittedAt)}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px]">
                    {r.submitterName}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={currentPage}
              hasNext={currentPage < totalPages}
              onPrev={() => setPage(p => Math.max(1, p - 1))}
              onNext={() => setPage(p => Math.min(totalPages, p + 1))}
            />
          )}
        </>
      )}
    </div>
  )
}
