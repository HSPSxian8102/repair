import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, PriorityBadge } from '../components/StatusBadge'

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide sm:w-28 shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-700">{value || '—'}</span>
    </div>
  )
}

function formatDateTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function RepairDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()

  const [repair,    setRepair]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [note,      setNote]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'repairs', id))
      .then(snap => {
        if (!snap.exists()) { setNotFound(true); return }
        const data = { id: snap.id, ...snap.data() }
        setRepair(data)
        setNote(data.completionNote || '')
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const updateStatus = async (newStatus) => {
    setSaving(true)
    try {
      const updates = { status: newStatus }
      if (newStatus === 'in_progress') {
        updates.inProgressAt  = serverTimestamp()
        updates.assignedTo    = user.displayName || user.email
      }
      if (newStatus === 'completed') {
        updates.completedAt   = serverTimestamp()
        updates.completedBy   = user.displayName || user.email
        updates.completionNote = note.trim()
      }
      if (newStatus === 'cancelled') {
        updates.cancelledAt = serverTimestamp()
      }
      await updateDoc(doc(db, 'repairs', id), updates)
      setRepair(r => ({ ...r, ...updates }))
    } catch (err) {
      console.error(err)
      alert('操作失敗，請稍後再試。')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('確定要刪除這筆報修單？此動作無法復原。')) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'repairs', id))
      navigate('/')
    } catch (err) {
      console.error(err)
      alert('刪除失敗，請稍後再試。')
      setDeleting(false)
    }
  }

  const handleUnarchive = async () => {
    try {
      await updateDoc(doc(db, 'repairs', id), { archived: false })
      setRepair(r => ({ ...r, archived: false }))
    } catch (err) {
      console.error(err)
      alert('操作失敗，請稍後再試。')
    }
  }

  const isOwner = repair && user && repair.submittedBy === user.uid

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">載入中…</div>
  if (notFound) return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3">🔍</div>
      <div className="text-gray-500 text-sm">找不到此報修單</div>
      <button onClick={() => navigate('/')} className="btn-outline mt-4 text-sm">返回清單</button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back + title */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-lg mt-0.5">←</button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <StatusBadge status={repair.status} />
            <PriorityBadge priority={repair.priority} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 leading-snug">{repair.title}</h1>
        </div>
      </div>

      {/* Archived notice */}
      {repair.archived && (
        <div className="card p-4 border-gray-300 bg-gray-50 flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-semibold text-gray-500">📦 此報修單已封存</span>
            <p className="text-xs text-gray-400 mt-0.5">完成超過 12 個月，已自動封存。</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/archive" className="text-xs text-gray-400 hover:underline">← 回封存清單</Link>
            {isAdmin && (
              <button onClick={handleUnarchive} className="btn-outline text-xs px-3 py-1">
                取消封存
              </button>
            )}
          </div>
        </div>
      )}

      {/* Basic info */}
      <div className="card p-4">
        <InfoRow label="地點"     value={repair.locationName || repair.location} />
        <InfoRow label="類別"     value={repair.category} />
        <InfoRow label="問題說明" value={repair.description} />
        <InfoRow label="提交者"   value={`${repair.submitterName}（${repair.submitterEmail}）`} />
        <InfoRow label="提交時間" value={formatDateTime(repair.submittedAt)} />
      </div>

      {/* Process info */}
      {(repair.inProgressAt || repair.completedAt) && (
        <div className="card p-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">處理紀錄</h2>
          {repair.inProgressAt  && <InfoRow label="開始處理" value={`${formatDateTime(repair.inProgressAt)}（${repair.assignedTo}）`} />}
          {repair.completedAt   && <InfoRow label="完成時間" value={`${formatDateTime(repair.completedAt)}（${repair.completedBy}）`} />}
          {repair.completionNote && <InfoRow label="完成說明" value={repair.completionNote} />}
        </div>
      )}

      {/* ── Admin action panel ── */}
      {isAdmin && repair.status !== 'cancelled' && (
        <div className="card p-4 border-blue-200 bg-blue-50">
          <h2 className="text-sm font-bold text-blue-700 mb-3">總務處操作</h2>

          {repair.status === 'pending' && (
            <button
              onClick={() => updateStatus('in_progress')}
              disabled={saving}
              className="btn-primary text-sm w-full sm:w-auto"
            >
              {saving ? '處理中…' : '✔ 接受處理 → 處理中'}
            </button>
          )}

          {repair.status === 'in_progress' && (
            <div className="space-y-3">
              <div>
                <label className="label text-blue-700">完成說明（選填）</label>
                <textarea
                  className="input min-h-[80px] resize-y"
                  placeholder="說明修繕方式或備注…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={300}
                />
              </div>
              <button
                onClick={() => updateStatus('completed')}
                disabled={saving}
                className="btn-teal text-sm w-full sm:w-auto"
              >
                {saving ? '儲存中…' : '✅ 標記為已完成'}
              </button>
            </div>
          )}

          {repair.status === 'completed' && (
            <p className="text-sm text-teal-700">此報修單已完成，無需進一步操作。</p>
          )}

          {/* Delete button — all statuses for admin */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger text-sm"
            >
              {deleting ? '刪除中…' : '🗑 刪除此報修單'}
            </button>
          </div>
        </div>
      )}

      {/* ── Owner: cancel if pending ── */}
      {!isAdmin && isOwner && repair.status === 'pending' && (
        <div className="card p-4 border-gray-200">
          <button
            onClick={() => updateStatus('cancelled')}
            disabled={saving}
            className="btn-outline text-sm text-red-600 border-red-200 hover:bg-red-50"
          >
            {saving ? '處理中…' : '取消這筆報修'}
          </button>
        </div>
      )}
    </div>
  )
}
