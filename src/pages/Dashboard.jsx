import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

const STATUS_COLORS  = { pending: '#f59e0b', in_progress: '#3b82f6', completed: '#14b8a6', cancelled: '#9ca3af' }
const STATUS_LABELS  = { pending: '待處理', in_progress: '處理中', completed: '已完成', cancelled: '已取消' }
const CAT_COLORS     = ['#6366f1','#ec4899','#f97316','#84cc16','#14b8a6','#06b6d4','#8b5cf6','#f43f5e']

function StatCard({ label, value, borderColor }) {
  return (
    <div className={`card p-4 border-l-4 ${borderColor}`}>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

function formatDate(ts) {
  if (!ts) return null
  return ts.toDate ? ts.toDate() : new Date(ts)
}

export default function Dashboard() {
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'repairs'), orderBy('submittedAt', 'desc')))
      .then(snap => setRepairs(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">載入中…</div>

  const active   = repairs.filter(r => !r.archived)
  const archived = repairs.filter(r => r.archived)

  // Status distribution
  const statusCounts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 }
  active.forEach(r => { if (r.status in statusCounts) statusCounts[r.status]++ })

  const statusData = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k], value: v, color: STATUS_COLORS[k] }))

  // Category distribution
  const catMap = {}
  active.forEach(r => { catMap[r.category] = (catMap[r.category] || 0) + 1 })
  const categoryData = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  // Monthly trend (last 6 months)
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return {
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${d.getMonth() + 1}月`,
      count: 0,
    }
  })
  repairs.forEach(r => {
    const d = formatDate(r.submittedAt)
    if (!d) return
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const m = months.find(m => m.key === key)
    if (m) m.count++
  })

  // Average resolution days (completed repairs with both timestamps)
  const resolved = active.filter(r => r.status === 'completed' && r.submittedAt && r.completedAt)
  const avgDays = resolved.length
    ? (resolved.reduce((sum, r) => {
        const s = formatDate(r.submittedAt)
        const e = formatDate(r.completedAt)
        return sum + (e - s) / 86400000
      }, 0) / resolved.length).toFixed(1)
    : null

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">報修統計</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="待處理"   value={statusCounts.pending}     borderColor="border-amber-400" />
        <StatCard label="處理中"   value={statusCounts.in_progress} borderColor="border-blue-400" />
        <StatCard label="已完成"   value={statusCounts.completed}   borderColor="border-teal-400" />
        <StatCard label="歷史封存" value={archived.length}          borderColor="border-gray-300" />
      </div>

      {avgDays !== null && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <div className="text-3xl font-bold text-blue-600">{avgDays}</div>
          <div className="text-sm text-gray-500">天 — 平均報修處理時間（已完成 {resolved.length} 筆）</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Status pie */}
        <div className="card p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">狀態分佈</h2>
          {statusData.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">尚無資料</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}`}
                  labelLine={false}
                >
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly trend */}
        <div className="card p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">近 6 個月提報數</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={months} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, '報修數']} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category bar */}
      {categoryData.length > 0 && (
        <div className="card p-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">各類別報修數量</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, '數量']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {categoryData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
