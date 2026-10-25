import React, { useEffect } from 'react'
import Icon from '@/components/icons/Icon'

/**
 * ConfirmModal — confirmation dialog for destructive actions.
 *
 * Props (supports two naming conventions for compatibility):
 *   isOpen         — bool
 *   title          — string
 *   description    — string (alias: message)
 *   confirmLabel   — string (alias: confirmText) — confirm button label
 *   cancelLabel    — string (alias: cancelText) — cancel button label
 *   onConfirm      — function
 *   onClose        — function (alias: onCancel)
 *   isLoading      — bool (alias: loading)
 *   danger         — bool shorthand for variant='danger'
 *   variant        — 'danger' | 'warning'
 *   itemName       — optional, shows inside a detail box
 *   itemDetails    — optional, shows inside a detail box
 */
const ConfirmModal = ({
  isOpen,
  title = 'Confirm Action',
  description,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  onConfirm,
  onClose,
  onCancel,
  isLoading,
  loading,
  danger = false,
  variant,
  itemName = '',
  itemDetails = '',
}) => {
  const displayMessage = description || message || 'Are you sure you want to proceed? This action cannot be undone.'
  const confirmBtnLabel = confirmLabel || confirmText || 'Confirm'
  const cancelBtnLabel = cancelLabel || cancelText || 'Cancel'
  const handleClose = onClose || onCancel || (() => {})
  const isProcessing = isLoading || loading || false
  const effectiveVariant = danger ? 'danger' : (variant || 'danger')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        handleClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isProcessing])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              effectiveVariant === 'danger'
                ? 'bg-rose-100 text-rose-600'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Icon
              name={effectiveVariant === 'danger' ? 'trash' : 'alert'}
              className="w-6 h-6"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 font-serif">
              {title}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {displayMessage}
            </p>

            {(itemName || itemDetails) && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                {itemName && (
                  <p className="font-bold text-slate-900 truncate">
                    {itemName}
                  </p>
                )}
                {itemDetails && (
                  <p className="text-slate-500 font-mono mt-0.5 text-[11px] truncate">
                    {itemDetails}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelBtnLabel}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-70 ${
              effectiveVariant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-2 focus:ring-rose-500'
                : 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-2 focus:ring-amber-500'
            }`}
          >
            {isProcessing && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{confirmBtnLabel}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
