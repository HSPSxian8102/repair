import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import RepairList from './pages/RepairList'
import SubmitRepair from './pages/SubmitRepair'
import RepairDetail from './pages/RepairDetail'
import LocationManager from './pages/LocationManager'
import ArchiveList from './pages/ArchiveList'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/"           element={<RepairList />} />
              <Route path="/submit"     element={<SubmitRepair />} />
              <Route path="/repair/:id" element={<RepairDetail />} />
              <Route path="/archive"    element={<ArchiveList />} />
              <Route path="/locations"  element={<LocationManager />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
