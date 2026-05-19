import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, isAdmin, isSuperAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navCls = ({ isActive }) =>
    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
      isActive ? 'bg-white/20' : 'hover:bg-white/10'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navbar ── */}
      <header className="bg-blue-600 text-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-base leading-tight">
            <span className="text-xl">🔧</span>
            <span className="hidden sm:inline">設備報修系統</span>
            <span className="sm:hidden">報修系統</span>
          </NavLink>

          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/" end className={navCls}>報修清單</NavLink>
            <NavLink to="/submit" className={navCls}>+ 新增報修</NavLink>
            {isAdmin && (
              <NavLink to="/dashboard" className={navCls}>📊 統計</NavLink>
            )}
            {isAdmin && (
              <NavLink to="/archive" className={navCls}>📦 歷史</NavLink>
            )}
            {isSuperAdmin && (
              <NavLink to="/admins" className={navCls}>👥 帳號</NavLink>
            )}
            {isSuperAdmin && (
              <NavLink to="/locations" className={navCls}>📍 地點</NavLink>
            )}

            {/* User info */}
            <div className="ml-2 pl-2 border-l border-white/30 flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs opacity-80 leading-none">{user?.displayName}</div>
                {isSuperAdmin ? (
                  <div className="text-xs mt-0.5 bg-amber-400/40 rounded px-1.5 py-0.5 inline-block leading-none">
                    超級管理員
                  </div>
                ) : isAdmin ? (
                  <div className="text-xs mt-0.5 bg-white/20 rounded px-1.5 py-0.5 inline-block leading-none">
                    總務人員
                  </div>
                ) : null}
              </div>
              <button
                onClick={handleLogout}
                className="text-xs px-2 py-1 rounded bg-white/15 hover:bg-white/25 transition-colors"
              >
                登出
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
        設備線上報修系統
        &nbsp;·&nbsp;
        <a
          href="/repair/docs/user-guide.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-500 underline underline-offset-2"
        >
          使用說明
        </a>
      </footer>
    </div>
  )
}
