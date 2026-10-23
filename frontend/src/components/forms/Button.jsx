import React from 'react'

const Button = ({
  type = 'button',
  variant = 'primary',
  children,
  disabled,
  onClick,
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-dillaGreen hover:bg-dillaDarkGreen text-white shadow-sm border border-transparent focus:ring-dillaGold',
    gold: 'bg-dillaGold hover:bg-dillaGoldDark text-dillaDarkGreen font-bold shadow-sm border border-transparent focus:ring-dillaGreen',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 focus:ring-slate-400',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 focus:ring-dillaGold',
    danger: 'bg-rose-700 hover:bg-rose-800 text-white shadow-sm border border-transparent focus:ring-rose-400',
    success: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm border border-transparent focus:ring-emerald-400',
  }

  // Check if caller supplied explicit bg- or text-
  const hasCustomBg = className.includes('bg-')
  const hasCustomText = className.includes('text-')

  const baseStyle = hasCustomBg || hasCustomText
    ? ''
    : (variantStyles[variant] || variantStyles.primary)

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${baseStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

Button.displayName = 'Button'

export default Button
