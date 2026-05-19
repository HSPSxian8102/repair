import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, domainError } = useAuth()
  const navigate = useNavigate()
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        // user closed popup — silent
      } else {
        setError('登入失敗，請再試一次。')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔧</div>
          <h1 className="text-3xl font-bold text-gray-900">設備線上報修系統</h1>

        </div>

        {/* Card */}
        <div className="card p-8">
          <p className="text-base text-gray-700 mb-6 text-center leading-relaxed">
            請使用學校 Google 帳號登入<br />
            <span className="text-sm text-gray-500">（限 @gm.tntcsh.tn.edu.tw）</span>
          </p>

          {domainError && (
            <div className="mb-4 rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              此帳號不屬於學校網域，無法登入。<br />
              請使用 @gm.tntcsh.tn.edu.tw 帳號。
            </div>
          )}

          {error && (
            <div className="mb-4 rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary w-full py-3 text-base gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2 14.1-5.2l-6.5-5.5C29.6 35 26.9 36 24 36c-5.3 0-9.7-3.3-11.4-8H6.3C9.6 35.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.5 5.5C37 37.1 44 32 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
            {loading ? '登入中…' : '使用 Google 帳號登入'}
          </button>
        </div>
      </div>
    </div>
  )
}
