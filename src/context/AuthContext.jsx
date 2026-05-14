import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const ALLOWED_DOMAIN  = 'gm.tntcsh.tn.edu.tw'
const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 分鐘

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [adminRole,   setAdminRole]   = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [domainError, setDomainError] = useState(false)

  const timerRef = useRef(null)

  const clearIdleTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const resetIdleTimer = () => {
    clearIdleTimer()
    timerRef.current = setTimeout(() => signOut(auth), IDLE_TIMEOUT_MS)
  }

  // 當使用者登入時啟動閒置計時器；登出時停止
  useEffect(() => {
    if (!user) {
      clearIdleTimer()
      return
    }

    resetIdleTimer()
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }))

    return () => {
      clearIdleTimer()
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetIdleTimer))
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || ''
        if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          setDomainError(true)
          setUser(null)
          setAdminRole(null)
          await signOut(auth)
        } else {
          setDomainError(false)
          setUser(firebaseUser)
          try {
            const snap = await getDoc(doc(db, 'admins', firebaseUser.uid))
            setAdminRole(snap.exists() ? (snap.data().role || 'admin') : null)
          } catch {
            setAdminRole(null)
          }
        }
      } else {
        setUser(null)
        setAdminRole(null)
        setDomainError(false)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const logout = () => {
    clearIdleTimer()
    return signOut(auth)
  }

  const isAdmin      = adminRole === 'admin'      || adminRole === 'superadmin'
  const isSuperAdmin = adminRole === 'superadmin'

  return (
    <AuthContext.Provider value={{ user, adminRole, isAdmin, isSuperAdmin, loading, domainError, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
