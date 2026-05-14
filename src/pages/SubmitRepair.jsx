import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['電器設備', '水電管線', '門窗玻璃', '桌椅傢俱', '空調冷氣', '資訊設備', '環境清潔', '其他']

export default function SubmitRepair() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [locations,  setLocations]  = useState([])
  const [locLoading, setLocLoading] = useState(true)

  const [form, setForm] = useState({
    title: '', locationId: '', locationName: '', locationDetail: '',
    category: '', priority: 'normal', description: '',
  })
  const [errors,     setErrors]     = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'locations'), where('active', '==', true)))
      .then(snap => {
        const locs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        locs.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-TW'))
        return locs
      })
      .then(locs => setLocations(locs))
      .catch(() => setLocations([]))
      .finally(() => setLocLoading(false))
  }, [])

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  const handleLocationChange = (e) => {
    const id = e.target.value
    const loc = locations.find(l => l.id === id)
    setForm(f => ({ ...f, locationId: id, locationName: loc ? loc.name : '' }))
    setErrors(e => ({ ...e, locationId: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim())       e.title       = '請填寫報修標題'
    if (!form.locationId)         e.locationId  = '請選擇地點'
    if (!form.category)           e.category    = '請選擇類別'
    if (!form.description.trim()) e.description = '請填寫問題說明'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const docRef = await addDoc(collection(db, 'repairs'), {
        title:          form.title.trim(),
        locationId:     form.locationId,
        locationName:   form.locationName,
        locationDetail: form.locationDetail.trim(),
        category:       form.category,
        priority:       form.priority,
        description:    form.description.trim(),
        status:         'pending',
        archived:       false,
        submittedBy:    user.uid,
        submitterName:  user.displayName || user.email,
        submitterEmail: user.email,
        submittedAt:    serverTimestamp(),
      })
      navigate(`/repair/${docRef.id}`)
    } catch (err) {
      console.error(err)
      alert('提交失敗，請稍後再試。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <h1 className="text-xl font-bold text-gray-800">新增報修單</h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">

        {/* Title */}
        <div>
          <label className="label">報修標題 <span className="text-red-500">*</span></label>
          <input
            type="text"
            className="input"
            placeholder="例：水龍頭損壞、投影機無法開機"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            maxLength={60}
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Location — two-tier */}
        <div className="space-y-2">
          <label className="label">地點 <span className="text-red-500">*</span></label>
          {locLoading ? (
            <div className="input text-gray-400">載入地點清單中…</div>
          ) : locations.length === 0 ? (
            <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              尚未設定地點清單，請聯絡管理員。
            </div>
          ) : (
            <select className="input" value={form.locationId} onChange={handleLocationChange}>
              <option value="">— 請選擇大樓 / 場域 —</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}
          {errors.locationId && <p className="text-xs text-red-500 mt-1">{errors.locationId}</p>}

          {/* Detail — shown after area is selected */}
          {form.locationId && (
            <input
              type="text"
              className="input"
              placeholder="詳細位置（選填）：例如 105教室、2樓男廁、舞台右側"
              value={form.locationDetail}
              onChange={e => set('locationDetail', e.target.value)}
              maxLength={40}
            />
          )}
        </div>

        {/* Category */}
        <div>
          <label className="label">類別 <span className="text-red-500">*</span></label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">— 請選擇類別 —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
        </div>

        {/* Priority */}
        <div>
          <label className="label">優先級</label>
          <div className="flex gap-4">
            {[
              { value: 'normal', label: '普通' },
              { value: 'urgent', label: '緊急' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="priority"
                  value={opt.value}
                  checked={form.priority === opt.value}
                  onChange={() => set('priority', opt.value)}
                  className="accent-blue-600"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">問題說明 <span className="text-red-500">*</span></label>
          <textarea
            className="input min-h-[100px] resize-y"
            placeholder="請詳細描述損壞情形或需要修繕的內容…"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            maxLength={500}
          />
          <div className="text-right text-xs text-gray-400 mt-1">{form.description.length} / 500</div>
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2.5">
            {submitting ? '提交中…' : '提交報修單'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-outline px-6">
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
