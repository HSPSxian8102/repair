import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, PriorityBadge } from '../components/StatusBadge'
import Pagination from '../components/Pagination'

const STATUS_LABELS = { pending: '待處理', in_progress: '處理中', completed: '已完成', cancelled: '已取消' }

const PAGE_SIZE = 20

const STATUS_TABS = [
  { value: 'all',         label: '全部' },
  { value: 'pending',     label: '待處理' },
  { value: 'in_progress', label: '處理中' },
  { value: 'completed',   label: '已完成' },
]

const CATEGORIES = ['電器設備', '水電管線', '門窗玻璃', '桌椅傢俱', '空調冷氣', '資訊設備', '環境清潔', '其他']

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function RepairList() {
  const { isAdmin } = useAuth()

  const [allRepairs,     setAllRepairs]     = useState([])
  const [loading,        setLoading]        = useState(true)
  const [statusFilter,   setStatusFilter]   = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm,     setSearchTerm]     = useState('')
  const [page,           setPage]           = useState(1)

  const archiveDone = useRef(false)

  useEffect(() => {
    const q = query(collection(db, 'repairs'), orderBy('submittedAt', 'desc'))
    getDocs(q)
      .then(snap => setAllRepairs(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  // Auto-archive completed repairs older than 12 months (admin only, runs once)
  useEffect(() => {
    if (loading || !isAdmin || archiveDone.current) return
    archiveDone.current = true

    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 1)

    const toArchive = allRepairs.filter(r => {
      if (r.archived || r.status !== 'completed' || !r.completedAt) return false
      const d = r.completedAt.toDate ? r.completedAt.toDate() : new Date(r.completedAt)
      return d < cutoff
    })
    if (!toArchive.length) return

    const batch = writeBatch(db)
    toArchive.forEach(r => batch.update(doc(db, 'repairs', r.id), { archived: true }))
    batch.commit()
      .then(() =>
        setAllRepairs(p => p.map(r =>
          toArchive.find(a => a.id === r.id) ? { ...r, archived: true } : r
        ))
      )
      .catch(console.error)
  }, [loading, isAdmin])

  const filtered = allRepairs.filter(r => {
    if (r.archived) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      const inTitle    = (r.title || '').toLowerCase().includes(term)
      const locFull    = [r.locationName || r.location, r.locationDetail].filter(Boolean).join(' ')
      const inLocation = locFull.toLowerCase().includes(term)
      if (!inTitle && !inLocation) return false
    }
    return true
  })

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleStatusChange   = (val) => { setStatusFilter(val);   setPage(1) }
  const handleCategoryChange = (val) => { setCategoryFilter(val); setPage(1) }
  const handleSearchChange   = (val) => { setSearchTerm(val);     setPage(1) }

  const hasFilter = searchTerm.trim() || categoryFilter !== 'all'
  const clearFilters = () => { setSearchTerm(''); setCategoryFilter('all'); setPage(1) }

  const handleExportCSV = () => {
    const headers = ['提交日期', '標題', '地點', '詳細位置', '類別', '優先級', '狀態', '提交者', '完成時間', '完成說明']
    const rows = filtered.map(r => [
      formatDate(r.submittedAt),
      r.title,
      r.locationName || r.location || '',
      r.locationDetail || '',
      r.category || '',
      r.priority === 'urgent' ? '緊急' : '普通',
      STATUS_LABELS[r.status] || r.status,
      r.submitterName || '',
      r.completedAt ? formatDate(r.completedAt) : '',
      r.completionNote || '',
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `報修清單_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">報修清單</h1>
        <div className="flex gap-2">
          {isAdmin && !loading && filtered.length > 0 && (
            <button onClick={handleExportCSV} className="btn-outline text-sm px-3">
              ↓ CSV
            </button>
          )}
          <Link to="/submit" className="btn-primary text-sm">+ 新增報修</Link>
        </div>
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          className="input flex-1"
          placeholder="搜尋標題或地點…"
          value={searchTerm}
          onChange={e => handleSearchChange(e.target.value)}
        />
        <select
          className="input sm:w-36"
          value={categoryFilter}
          onChange={e => handleCategoryChange(e.target.value)}
        >
          <option value="all">全部類別</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {hasFilter && (
          <button onClick={clearFilters} className="btn-outline text-sm px-3">清除</button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-lg p-1 w-fit flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleStatusChange(tab.value)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">載入中…</div>
      ) : pageItems.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm">目前沒有符合條件的報修單</div>
          {hasFilter && (
            <button onClick={clearFilters} className="btn-outline text-sm mt-3">清除篩選條件</button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-2">共 {filtered.length} 筆</p>
          <div className="space-y-2">
            {pageItems.map(r => (
              <Link
                key={r.id}
                to={`/repair/${r.id}`}
                className="card flex items-start gap-4 p-4 hover:border-blue-300 hover:shadow-sm transition-all block"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StatusBadge status={r.status} />
                    {r.priority === 'urgent' && <PriorityBadge priority={r.priority} />}
                    <span className="text-xs text-gray-400">{r.category}</span>
                  </div>
                  <div className="font-semibold text-gray-800 truncate">{r.title}</div>
                  <div className="text-sm text-gray-500 mt-0.5 truncate">
                    📍 {[r.locationName || r.location, r.locationDetail].filter(Boolean).join(' — ')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-400">{formatDate(r.submittedAt)}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[120px]">
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
