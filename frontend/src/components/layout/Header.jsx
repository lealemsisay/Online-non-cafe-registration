import React, { useState } from 'react'
import Icon from '@/components/icons/Icon'
import ChangePasswordModal from '@/components/auth/ChangePasswordModal'
import NotificationBell from '@/components/notifications/NotificationBell'

const Header = ({ isSidebarOpen, onToggleSidebar, user, onLogout }) => {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="bg-purple-50 text-purple-900 border border-purple-300 text-xs px-2.5 py-0.5 rounded-full font-bold shadow-2xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
            Super Admin
          </span>
        )
      case 'dean':
        return (
          <span className="bg-blue-50 text-blue-900 border border-blue-300 text-xs px-2.5 py-0.5 rounded-full font-bold shadow-2xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Campus Dean
          </span>
        )
      case 'student':
        return (
          <span className="bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold shadow-2xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Student
          </span>
        )
      default:
        return null
    }
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 shadow-sm print:hidden">
        {/* Top Official University Utility Bar */}
        <div className="bg-dillaDarkGreen text-white text-[11px] font-medium px-3 sm:px-6 py-1.5 border-b border-white/10 hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-dillaGold font-serif font-bold tracking-wide">
              ዲላ ዩኒቨርሲቲ • DILLA UNIVERSITY
            </span>
            <span className="text-white/40">|</span>
            <span className="italic text-emerald-200 font-medium">
              "University of the Green Land"
            </span>
          </div>

          <div className="flex items-center gap-4 text-white/90">
            <a
              href="tel:+251461310001"
              className="hover:text-dillaGold transition-colors inline-flex items-center gap-1"
            >
              <Icon name="phone" className="w-3 h-3 text-dillaGold" />
              <span>+251 46 131 0001</span>
            </a>
            <span className="text-white/40">•</span>
            <a
              href="mailto:info@du.edu.et"
              className="hover:text-dillaGold transition-colors inline-flex items-center gap-1"
            >
              <Icon name="mail" className="w-3 h-3 text-dillaGold" />
              <span>info@du.edu.et</span>
            </a>
            <span className="text-white/40">•</span>
            <span className="text-dillaGold font-semibold">
              Cost-Sharing Portal
            </span>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onToggleSidebar}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-dillaGold ${
                isSidebarOpen
                  ? 'bg-amber-50 border-dillaGold text-dillaDarkGreen ring-2 ring-dillaGold/30 shadow-xs'
                  : 'bg-white border-amber-300/80 hover:border-dillaGold hover:bg-amber-50/50 text-dillaDarkGreen shadow-2xs'
              }`}
              aria-expanded={isSidebarOpen}
              aria-controls="navigation-drawer"
              aria-label={isSidebarOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
              title={isSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            >
              <Icon
                name={isSidebarOpen ? 'x' : 'menu'}
                className="w-5 h-5 text-dillaDarkGreen transition-transform duration-200"
              />
            </button>

            {/* University Crest & Name */}
            <a href="/" className="flex items-center gap-2.5 sm:gap-3 group">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 overflow-hidden transition-transform group-hover:scale-105">
                <img
                  src="/dilla-logo.png"
                  alt="Dilla University Emblem"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-base sm:text-lg font-bold text-dillaGreen tracking-tight leading-none group-hover:text-dillaDarkGreen transition-colors">
                    DILLA UNIVERSITY
                  </span>
                  <span className="text-[10px] text-dillaGold font-serif font-bold hidden md:inline">
                    ዲላ ዩኒቨርሲቲ
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium tracking-wide leading-tight block mt-0.5">
                  Online Cost-Sharing Registration System
                </span>
              </div>
            </a>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <div className="flex items-center gap-2 sm:gap-3 text-right">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 leading-none">
                    {user.name || 'User'}
                  </span>
                  {user.campus && (
                    <span className="text-[11px] text-dillaGreen font-semibold mt-1">
                      {user.campus}
                    </span>
                  )}
                </div>
                {getRoleBadge(user.role)}
              </div>
            )}

            {user && <NotificationBell />}

            {user && (
              <a
                href="/profile"
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-dillaDarkGreen hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="View & Edit your profile"
              >
                <Icon name="user" className="w-3.5 h-3.5 text-dillaGreen" />
                <span className="hidden sm:inline">Profile</span>
              </a>
            )}

            {user && (
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-dillaDarkGreen hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Change account password"
              >
                <Icon name="key" className="w-3.5 h-3.5 text-dillaGoldDark" />
                <span className="hidden sm:inline">Password</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-700 border border-rose-300 hover:border-rose-700 rounded-lg transition-all focus:outline-none cursor-pointer shadow-2xs flex items-center gap-1"
                title="Sign out of current account"
              >
                <Icon name="logout" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
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
