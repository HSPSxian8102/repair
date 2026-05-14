import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { fns } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

const callListAdmins   = httpsCallable(fns, 'listAdmins')
const callSetAdminRole = httpsCallable(fns, 'setAdminRole')

export default function AdminManager() {
  const { isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const [admins,   setAdmins]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [addEmail, setAddEmail] = useState('')
  const [addRole,  setAddRole]  = useState('admin')
  const [adding,   setAdding]   = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    if (!isSuperAdmin) navigate('/', { replace: true })
  }, [isSuperAdmin, navigate])

  const loadAdmins = async () => {
    setLoading(true)
    try {
      const res = await callListAdmins()
      setAdmins(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAdmins() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addEmail.trim()) return
    setAdding(true)
    setAddError('')
    try {
      await callSetAdminRole({ email: addEmail.trim(), role: addRole })
      setAddEmail('')
      await loadAdmins()
    } catch (err) {
      setAddError(err.message || '新增失敗，請確認對方已使用學校帳號登入過系統。')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (adm) => {
    if (!window.confirm(`確定要移除「${adm.displayName || adm.email}」的管理員權限？`)) return
    try {
      await callSetAdminRole({ email: adm.email, role: null })
      setAdmins(p => p.filter(a => a.uid !== adm.uid))
    } catch (err) {
      alert(err.message || '移除失敗')
    }
  }

  const handleRoleChange = async (adm, newRole) => {
    try {
      await callSetAdminRole({ email: adm.email, role: newRole })
      setAdmins(p => p.map(a => a.uid === adm.uid ? { ...a, role: newRole } : a))
    } catch (err) {
      alert(err.message || '更新失敗')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">管理員帳號管理</h1>
        <p className="text-sm text-gray-400 mt-0.5">管理可操作報修狀態的總務人員帳號</p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="card p-5 mb-4 border-blue-200">
        <h2 className="font-bold text-blue-700 text-sm mb-4">新增管理員</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            className="input flex-1"
            placeholder="學校 Email（@gm.tntcsh.tn.edu.tw）"
            value={addEmail}
            onChange={e => { setAddEmail(e.target.value); setAddError('') }}
            required
          />
          <select
            className="input sm:w-36"
            value={addRole}
            onChange={e => setAddRole(e.target.value)}
          >
            <option value="admin">總務人員</option>
            <option value="superadmin">超級管理員</option>
          </select>
          <button type="submit" disabled={adding} className="btn-primary text-sm px-6">
            {adding ? '新增中…' : '新增'}
          </button>
        </div>
        {addError && <p className="text-xs text-red-500 mt-2">{addError}</p>}
        <p className="text-xs text-gray-400 mt-2">
          ※ 對方必須先以學校帳號登入過系統一次，才能被加入為管理員。
        </p>
      </form>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">載入中…</div>
      ) : admins.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 text-sm">尚無管理員帳號</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">電子郵件</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden sm:table-cell">姓名</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">角色</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {admins.map(adm => (
                <tr key={adm.uid} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-700 text-xs">{adm.email}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{adm.displayName || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={adm.role}
                      onChange={e => handleRoleChange(adm, e.target.value)}
                      className={`text-xs rounded px-2 py-1 font-semibold border border-transparent cursor-pointer ${
                        adm.role === 'superadmin'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      <option value="admin">總務人員</option>
                      <option value="superadmin">超級管理員</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(adm)}
                      className="text-xs text-red-500 hover:underline px-1"
                    >
                      移除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 leading-relaxed">
        • 總務人員：可接受報修、更新狀態、標記完成。<br />
        • 超級管理員：另可刪除報修單、管理地點及管理員帳號。<br />
        • 移除後對方立即失去管理員權限，已提交的報修單不受影響。
      </div>
    </div>
  )
}
