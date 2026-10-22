import React, { useState } from 'react'
import Icon from '@/components/icons/Icon'
import ChangePasswordModal from '@/components/auth/ChangePasswordModal'

const Header = ({ isSidebarOpen, onToggleSidebar, user, onLogout }) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="bg-purple-100 text-purple-800 border border-purple-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            Super Admin
          </span>
        )
      case 'dean':
        return (
          <span className="bg-blue-100 text-blue-800 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            Campus Dean
          </span>
        )
      case 'student':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            Student
          </span>
        )
      default:
        return null
    }
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm border-b border-gray-200 z-50 flex items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-100 text-dillaNavy focus:outline-none focus:ring-2 focus:ring-dillaGold transition-colors"
            aria-label="Toggle sidebar"
            title="Toggle Navigation Menu"
          >
            <Icon name="menu" className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-dillaNavy flex items-center justify-center shadow-xs">
              <Icon className="w-5 h-5 text-dillaGold" name="building" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-dillaNavy tracking-tight leading-none block">
                DILLA UNIVERSITY
              </span>
              <span className="text-[10px] text-gray-500 font-medium tracking-wide uppercase leading-none hidden sm:block">
                Online Cost-Sharing Registration System
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="flex items-center gap-2 sm:gap-3 text-right">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-dillaNavy leading-none">
                  {user.name || 'User'}
                </span>
                {user.campus && (
                  <span className="text-xs text-gray-500 mt-1 font-medium">{user.campus}</span>
                )}
              </div>
              {getRoleBadge(user.role)}
            </div>
          )}

          {user && (
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-dillaNavy hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
              title="Change your account password"
            >
              <Icon name="sliders-horizontal" className="w-3.5 h-3.5 text-dillaGold" />
              <span className="hidden sm:inline">Password</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 rounded-lg transition-colors focus:outline-none"
              title="Sign out of current account"
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  )
}

export default Header