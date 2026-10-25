import React, { useState, useRef, useEffect } from 'react'
import Icon from '@/components/icons/Icon'

/**
 * ActionMenu — vertical three-dot (⋮) dropdown menu component.
 *
 * Each item can have:
 *   label       — display text
 *   icon        — Icon name string
 *   onClick     — handler function
 *   disabled    — bool
 *   hidden      — bool (item will be omitted entirely)
 *   separator   — bool (renders a divider line BEFORE this item)
 *   divider     — bool (alias for separator)
 *   variant     — 'danger' | 'warning' | 'success' | undefined
 *   className   — additional tailwind classes added to the button
 */
const ActionMenu = ({ items = [], align = 'right', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const visibleItems = items.filter((item) => item && !item.hidden)
  if (visibleItems.length === 0) return null

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen((prev) => !prev)
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="More actions"
        className={`p-1.5 rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-dillaGold ${
          isOpen
            ? 'bg-amber-100/60 border-dillaGold text-dillaDarkGreen shadow-xs'
            : 'bg-white border-slate-200 text-slate-600 hover:text-dillaDarkGreen hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <Icon name="more-vertical" className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } mt-1 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-[100] text-xs font-semibold focus:outline-none`}
          role="menu"
          aria-orientation="vertical"
          style={{ animation: 'fadeIn 0.1s ease' }}
        >
          {visibleItems.map((item, index) => {
            const showSeparator = item.separator || item.divider

            // Determine color based on variant or className hint
            const isDanger =
              item.variant === 'danger' ||
              (item.className && item.className.includes('rose'))
            const isWarning =
              item.variant === 'warning' ||
              (item.className && item.className.includes('amber'))
            const isSuccess =
              item.variant === 'success' ||
              (item.className && item.className.includes('emerald'))

            let colorClass = 'text-slate-700 hover:bg-slate-50 hover:text-dillaDarkGreen'
            if (isDanger) {
              colorClass = 'text-rose-700 hover:bg-rose-50 hover:text-rose-900'
            } else if (isWarning) {
              colorClass = 'text-amber-800 hover:bg-amber-50 hover:text-amber-950'
            } else if (isSuccess) {
              colorClass = 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
            }

            if (item.disabled) {
              colorClass = 'text-slate-400 cursor-not-allowed opacity-60'
            }

            return (
              <React.Fragment key={item.label || index}>
                {showSeparator && <div className="my-1 border-t border-slate-100" />}
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!item.disabled && item.onClick) {
                      item.onClick()
                      setIsOpen(false)
                    }
                  }}
                  className={`w-full text-left px-3.5 py-2 flex items-center gap-2.5 transition-colors cursor-pointer ${colorClass}`}
                  role="menuitem"
                >
                  {item.icon && (
                    <Icon
                      name={item.icon}
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isDanger
                          ? 'text-rose-500'
                          : isWarning
                          ? 'text-amber-500'
                          : isSuccess
                          ? 'text-emerald-500'
                          : item.disabled
                          ? 'text-slate-300'
                          : 'text-slate-400'
                      }`}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ActionMenu
