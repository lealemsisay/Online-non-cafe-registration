import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon from '@/components/icons/Icon'

const Sidebar = ({ isOpen, onToggle, userRole, userCampus, onLogout }) => {
  const location = useLocation()

  const adminNavItems = [
    { label: 'Dashboard', path: '/admin', icon: 'grid' },
    { label: 'Applications', path: '/admin/applications', icon: 'users' },
    { label: 'Campuses', path: '/admin/campuses', icon: 'building' },
    { label: 'Deans / Users', path: '/admin/users', icon: 'user-check' },
    { label: 'Reports', path: '/admin/reports', icon: 'grid' },
    { label: 'Settings', path: '/admin/settings', icon: 'sliders-horizontal' },
  ]

  const deanNavItems = [
    { label: 'Dashboard', path: '/dean', icon: 'grid' },
    { label: 'Review Applications', path: '/dean/review', icon: 'user-check' },
  ]

  const studentNavItems = [
    { label: 'Student Portal', path: '/', icon: 'grid' },
    { label: 'Registration Form', path: '/student/register', icon: 'upload' },
  ]

  let items = studentNavItems
  if (userRole === 'admin') items = adminNavItems
  else if (userRole === 'dean') items = deanNavItems

  const handleLinkClick = () => {
    if (isOpen && onToggle) {
      onToggle()
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/50 z-30 sm:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-dillaNavy text-white z-40 transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2 text-dillaGold font-bold text-lg">
            <Icon className="w-5 h-5 text-dillaGold" name="building" />
            <span>NAVIGATION</span>
          </div>
          {userCampus && (
            <p className="text-xs text-gray-300 mt-1">{userCampus}</p>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {items.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-dillaGold text-dillaNavy font-semibold shadow-sm'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-dillaNavy' : 'text-dillaGold'}`} name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10 mt-auto space-y-2">
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-red-300 hover:text-white hover:bg-red-900/40 border border-red-500/30 transition-colors"
            >
              <span>Sign Out</span>
            </button>
          )}
          <button
            onClick={onToggle}
            className="w-full text-center text-xs text-gray-400 hover:text-white py-1 sm:hidden"
          >
            Close Menu
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar