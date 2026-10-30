import React, { useState, useEffect, useRef } from 'react'
import Icon from '@/components/icons/Icon'
import { isTokenValid } from '@/lib/auth'

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token')
    if (!token || !isTokenValid(token)) return

    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        return
      }
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      // Ignore polling errors silently
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds for live notifications
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (id, link) => {
    const token = localStorage.getItem('token')
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
      // Update locally
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      if (link) {
        setIsOpen(false)
        window.location.href = link
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem('token')
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success':
        return <Icon name="check-circle" className="w-4 h-4 text-emerald-600" />
      case 'warning':
        return <Icon name="alert-circle" className="w-4 h-4 text-amber-600" />
      case 'action':
        return <Icon name="bell" className="w-4 h-4 text-dillaGoldDark" />
      default:
        return <Icon name="info" className="w-4 h-4 text-dillaGreen" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen((prev) => !prev)
          if (!isOpen) fetchNotifications()
        }}
        className="relative p-2 rounded-lg hover:bg-dillaLightGreen text-slate-700 hover:text-dillaDarkGreen border border-slate-300 hover:border-dillaGreen/30 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-dillaGold shadow-2xs"
        title="Notifications"
        aria-label="View notifications"
      >
        <Icon name="bell" className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-dillaLightGreen/50 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-dillaDarkGreen font-serif">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full border border-rose-200">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-dillaGreen hover:text-dillaDarkGreen font-semibold hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <Icon name="bell" className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-medium">No notifications at this time</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.link)}
                  className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                    !n.isRead ? 'bg-emerald-50/50' : ''
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">{getTypeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-dillaGreen flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
