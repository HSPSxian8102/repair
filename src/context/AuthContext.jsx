import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const ALLOWED_DOMAIN = 'gm.tntcsh.tn.edu.tw'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [adminRole,   setAdminRole]   = useState(null) // null | 'admin' | 'superadmin'
  const [loading,     setLoading]     = useState(true)
  const [domainError, setDomainError] = useState(false)

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

  const logout = () => signOut(auth)

  const isAdmin      = adminRole === 'admin'      || adminRole === 'superadmin'
  const isSuperAdmin = adminRole === 'superadmin'

  return (
    <AuthContext.Provider value={{ user, adminRole, isAdmin, isSuperAdmin, loading, domainError, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
