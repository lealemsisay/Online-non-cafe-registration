import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon from '@/components/icons/Icon'

const Sidebar = ({ isOpen, onToggle, userRole, userCampus, onLogout }) => {
  const location = useLocation()

  const adminNavItems = [
    { label: 'Executive Overview', path: '/admin', icon: 'grid' },
    { label: 'Student Applications', path: '/admin/applications', icon: 'users' },
    { label: 'Campuses Management', path: '/admin/campuses', icon: 'building' },
    { label: 'User & Dean Accounts', path: '/admin/users', icon: 'user-check' },
    { label: 'Reports & Analytics', path: '/admin/reports', icon: 'file-text' },
    { label: 'System Settings', path: '/admin/settings', icon: 'sliders-horizontal' },
  ]

  const deanNavItems = [
    { label: 'Campus Dashboard', path: '/dean', icon: 'grid' },
    { label: 'Review Applications', path: '/dean/review', icon: 'user-check' },
    { label: 'Student Directory', path: '/dean/users', icon: 'users' },
    { label: 'Campus Reports', path: '/dean/reports', icon: 'file-text' },
    { label: 'Campus Settings', path: '/dean/settings', icon: 'sliders-horizontal' },
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

  const roleLabels = {
    admin: 'Super Admin Portal',
    dean: 'Campus Dean Portal',
    student: 'Student Self-Service',
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/60 z-30 sm:hidden transition-opacity backdrop-blur-2xs"
        />
      )}

      <aside
        className={`fixed left-0 top-16 sm:top-[calc(4rem+1.85rem)] h-[calc(100vh-4rem)] sm:h-[calc(100vh-4rem-1.85rem)] w-64 bg-gradient-to-b from-dillaDarkGreen via-[#0f442b] to-[#082517] text-white z-40 transition-transform duration-300 ease-in-out flex flex-col border-r border-white/10 shadow-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        {/* Sidebar Header / Branding */}
        <div className="p-4 border-b border-white/10 bg-black/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs flex-shrink-0">
              <img
                src="/dilla-logo.png"
                alt="DU Emblem"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-dillaGold uppercase tracking-wider block truncate">
                {roleLabels[userRole] || 'DU Cost-Sharing'}
              </span>
              <p className="text-[11px] text-emerald-200 truncate font-medium">
                {userCampus || 'Dilla University'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
            Main Menu
          </p>
          {items.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-dillaGold text-dillaDarkGreen shadow-md font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-dillaDarkGreen' : 'text-dillaGold'
                  }`}
                  name={item.icon}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer in Sidebar */}
        <div className="p-3 border-t border-white/10 mt-auto bg-black/15 space-y-2">
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-200 hover:text-white hover:bg-rose-900/40 border border-rose-500/30 transition-colors cursor-pointer"
            >
              <Icon name="logout" className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
          <button
            onClick={onToggle}
            className="w-full text-center text-xs text-white/60 hover:text-white py-1 sm:hidden cursor-pointer"
          >
            Close Navigation
          </button>
          <div className="text-center pt-1 text-[10px] text-white/40">
            Dilla University • DU-SIMS v2.4
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
