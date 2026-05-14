import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

const EMPTY_FORM = { name: '', active: true }

export default function LocationManager() {
  const { isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const [locations, setLocations] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [editId,    setEditId]    = useState(null)
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [errors,    setErrors]    = useState({})

  useEffect(() => {
    if (!isSuperAdmin) navigate('/', { replace: true })
  }, [isSuperAdmin, navigate])

  const loadLocations = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'locations'))
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      all.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-TW'))
      setLocations(all)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLocations() }, [])

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (loc) => {
    setForm({ name: loc.name || '', active: loc.active ?? true })
    setEditId(loc.id)
    setErrors({})
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = '請填寫場域名稱'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const data = { name: form.name.trim(), active: form.active }
      if (editId) {
        await updateDoc(doc(db, 'locations', editId), { ...data, updatedAt: serverTimestamp() })
      } else {
        await addDoc(collection(db, 'locations'), { ...data, createdAt: serverTimestamp() })
      }
      await loadLocations()
      cancelForm()
    } catch (err) {
      console.error(err)
      alert('儲存失敗，請稍後再試。')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (loc) => {
    if (!window.confirm(`確定要永久刪除「${loc.name}」？\n\n此動作無法復原，已使用此場域的報修單不受影響。`)) return
    try {
      await deleteDoc(doc(db, 'locations', loc.id))
      setLocations(ls => ls.filter(l => l.id !== loc.id))
    } catch (err) {
      console.error(err)
      alert('刪除失敗，請稍後再試。')
    }
  }

  const toggleActive = async (loc) => {
    try {
      await updateDoc(doc(db, 'locations', loc.id), { active: !loc.active, updatedAt: serverTimestamp() })
      setLocations(ls => ls.map(l => l.id === loc.id ? { ...l, active: !l.active } : l))
    } catch (err) {
      console.error(err)
      alert('操作失敗')
    }
  }

  const activeCount   = locations.filter(l => l.active).length
  const inactiveCount = locations.filter(l => !l.active).length

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">地點管理</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            管理大樓 / 場域名稱（報修時再由填表人自填詳細位置）&nbsp;·&nbsp;
            共 {locations.length} 筆 &nbsp;·&nbsp;
            <span className="text-teal-600">啟用 {activeCount}</span> &nbsp;/&nbsp;
            <span className="text-gray-400">停用 {inactiveCount}</span>
          </p>
        </div>
        {!showForm && (
          <button onClick={openAdd} className="btn-primary text-sm">
            + 新增場域
          </button>
        )}
      </div>

      {/* ── 新增 / 編輯 表單 ── */}
      {showForm && (
        <form onSubmit={handleSave} className="card p-5 mb-4 border-blue-300">
          <h2 className="font-bold text-blue-700 text-sm mb-4">
            {editId ? '✏️ 編輯場域' : '＋ 新增場域'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">場域名稱 <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="input"
                placeholder="例：行政大樓、圖書館、操場、籃球場、游泳池"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                maxLength={30}
                autoFocus
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              <p className="text-xs text-gray-400 mt-1">只需填大樓或場域名稱，詳細位置由報修者自行填寫。</p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => set('active', e.target.checked)}
                  className="w-4 h-4 accent-teal-600"
                />
                啟用此場域
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
            <button type="submit" disabled={saving} className="btn-primary text-sm px-6">
              {saving ? '儲存中…' : (editId ? '儲存修改' : '新增場域')}
            </button>
            <button type="button" onClick={cancelForm} className="btn-outline text-sm">
              取消
            </button>
          </div>
        </form>
      )}

      {/* ── 場域清單 ── */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">載入中…</div>
      ) : locations.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📍</div>
          <div className="text-sm mb-3">尚未建立任何場域</div>
          <button onClick={openAdd} className="btn-primary text-sm">新增第一筆場域</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">場域名稱</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">狀態</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {locations.map(loc => (
                <tr key={loc.id} className={`border-b border-gray-100 last:border-0 transition-colors ${!loc.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{loc.name}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(loc)}
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold cursor-pointer transition-colors ${
                        loc.active
                          ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title="點擊切換啟用 / 停用"
                    >
                      {loc.active ? '啟用' : '停用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(loc)}
                      className="text-xs text-blue-600 hover:underline px-1"
                    >
                      編輯
                    </button>
                    <span className="text-gray-200 mx-1">|</span>
                    <button
                      onClick={() => handleDelete(loc)}
                      className="text-xs text-red-500 hover:underline px-1"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 leading-relaxed">
        • 只需管理大樓／場域名稱（例：正德樓、操場），無需逐間教室建立。<br />
        • 「停用」的場域不會出現在報修表單的下拉選單中，但已有的報修單不受影響。<br />
        • 點擊狀態標籤可以快速切換啟用 / 停用。<br />
        • 「刪除」會永久移除場域資料，已使用此場域的報修單內容不受影響。
      </div>
    </div>
  )
}
