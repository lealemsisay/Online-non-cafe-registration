import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

// Student pages
import StudentPortal from '@/pages/student'
import RegisterPage from '@/pages/student/RegisterPage'

// Campus Dean pages
import CampusDeanPortal from '@/pages/campus-dean'
import CampusDeanReview from '@/pages/campus-dean/Review'
import DeanReports from '@/pages/campus-dean/Reports'
import DeanSettings from '@/pages/campus-dean/Settings'
import DeanUserManagement from '@/pages/campus-dean/UserManagement'

// Super Admin pages
import SuperAdminPortal from '@/pages/super-admin'
import CampusManagement from '@/pages/super-admin/CampusManagement'
import UserManagement from '@/pages/super-admin/UserManagement'
import StudentApplicationManagement from '@/pages/super-admin/StudentApplicationManagement'
import Reports from '@/pages/super-admin/Reports'
import Settings from '@/pages/super-admin/Settings'

// Auth pages
import LoginPage from '@/pages/auth/Login'
import StudentRegister from '@/pages/auth/StudentRegister'

// Profile page
import ProfilePage from '@/pages/profile/ProfilePage'

// Helper to get active user details from storage
function getAuthUser() {
  const role = localStorage.getItem('userRole')
  const name = localStorage.getItem('userName')
  const campus = localStorage.getItem('userCampus')
  const id = localStorage.getItem('userId')
  const token = localStorage.getItem('token')
  return { role, name, campus, id, token }
}

// Protected Route Guard with safe redirection (prevents loops)
const ProtectedRoute = ({ role, children }) => {
  const navigate = useNavigate()
  const user = getAuthUser()

  useEffect(() => {
    if (!user.role) {
      navigate('/login', { replace: true })
    } else if (user.role !== role) {
      if (user.role === 'admin') navigate('/admin', { replace: true })
      else if (user.role === 'dean') navigate('/dean', { replace: true })
      else if (user.role === 'student') navigate('/', { replace: true })
      else navigate('/login', { replace: true })
    }
  }, [user.role, role, navigate])

  if (!user.role || user.role !== role) {
    return null
  }

  return children
}

// Public/Login Route Guard (redirects already logged in users to their role dashboard)
const PublicRoute = ({ children }) => {
  const user = getAuthUser()
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'dean') return <Navigate to="/dean" replace />
  if (user.role === 'student') return <Navigate to="/" replace />
  return children
}

// Root Route handler for /
const RootRoute = () => {
  const user = getAuthUser()
  if (!user.role) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'dean') return <Navigate to="/dean" replace />
  if (user.role === 'student') return <StudentPortal />
  return <Navigate to="/login" replace />
}

// Global Application Layout with responsive Sidebar and Header
const AppLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()
  const user = getAuthUser()

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    localStorage.removeItem('userCampus')
    localStorage.removeItem('userId')
    localStorage.removeItem('studentId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  if (isAuthPage) {
    return <div className="min-h-screen bg-dillaGray flex flex-col">{children}</div>
  }

  return (
    <div className="min-h-screen bg-dillaGray flex flex-col">
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        user={{ name: user.name, role: user.role, campus: user.campus }}
        onLogout={handleLogout}
      />
      <div className="flex flex-1">
        {user.role && (
          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen((prev) => !prev)}
            userRole={user.role}
            userCampus={user.campus}
            onLogout={handleLogout}
          />
        )}
        <div className="flex-1 flex flex-col transition-all duration-300 pt-16 sm:pt-[5.85rem]">
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

const App = () => {
  return (
    <Router>
      <AppLayout>
        <Routes>
          {/* Public / Auth */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <StudentRegister />
              </PublicRoute>
            }
          />

          {/* Student routes */}
          <Route path="/" element={<RootRoute />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <StudentPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/register"
            element={
              <ProtectedRoute role="student">
                <RegisterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/apply"
            element={
              <ProtectedRoute role="student">
                <RegisterPage />
              </ProtectedRoute>
            }
          />

          {/* Campus Dean routes */}
          <Route
            path="/dean"
            element={
              <ProtectedRoute role="dean">
                <CampusDeanPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/review"
            element={
              <ProtectedRoute role="dean">
                <CampusDeanReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/review/:id"
            element={
              <ProtectedRoute role="dean">
                <CampusDeanReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/return/:id"
            element={
              <ProtectedRoute role="dean">
                <CampusDeanReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/reports"
            element={
              <ProtectedRoute role="dean">
                <DeanReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/settings"
            element={
              <ProtectedRoute role="dean">
                <DeanSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/users"
            element={
              <ProtectedRoute role="dean">
                <DeanUserManagement />
              </ProtectedRoute>
            }
          />

          {/* Super Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <SuperAdminPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/campuses"
            element={
              <ProtectedRoute role="admin">
                <CampusManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="admin">
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute role="admin">
                <StudentApplicationManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/application"
            element={
              <ProtectedRoute role="admin">
                <StudentApplicationManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/approved"
            element={
              <ProtectedRoute role="admin">
                <StudentApplicationManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rejected"
            element={
              <ProtectedRoute role="admin">
                <StudentApplicationManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/return"
            element={
              <ProtectedRoute role="admin">
                <StudentApplicationManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute role="admin">
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute role="admin">
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Profile routes for all roles */}
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute role="student">
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dean/profile"
            element={
              <ProtectedRoute role="dean">
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute role="admin">
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              getAuthUser().role === 'admin' ? (
                <Navigate to="/admin/profile" replace />
              ) : getAuthUser().role === 'dean' ? (
                <Navigate to="/dean/profile" replace />
              ) : getAuthUser().role === 'student' ? (
                <Navigate to="/student/profile" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Fallback */}
          <Route path="*" element={<RootRoute />} />
        </Routes>
      </AppLayout>
    </Router>
  )
}

export default App