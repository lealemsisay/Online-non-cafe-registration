import React from 'react'
import Icon from '@/components/icons/Icon'

const Header = ({ isSidebarOpen, onToggleSidebar, user, onLogout }) => {
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded font-semibold">Super Admin</span>
      case 'dean':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded font-semibold">Campus Dean</span>
      case 'student':
        return <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded font-semibold">Student</span>
      default:
        return null
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm border-b border-gray-200 z-50 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded hover:bg-gray-100 text-dillaNavy focus:outline-none"
          aria-label="Toggle sidebar"
          title="Toggle Navigation Menu"
        >
          <Icon name="menu" className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Icon className="w-6 h-6 text-dillaGold" name="building" />
          <span className="text-lg sm:text-xl font-bold text-dillaNavy tracking-tight">DILLA UNIV.</span>
        </div>
        <span className="hidden sm:inline-block text-gray-400">|</span>
        <span className="hidden sm:inline-block text-sm sm:text-base text-dillaNavy font-medium">Cost-Sharing System</span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {user && (
          <div className="flex items-center gap-2 sm:gap-3 text-right">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-dillaNavy leading-none">{user.name || 'User'}</span>
              {user.campus && (
                <span className="text-xs text-gray-500 mt-0.5">{user.campus}</span>
              )}
            </div>
            {getRoleBadge(user.role)}
          </div>
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
  )
}

export default Header