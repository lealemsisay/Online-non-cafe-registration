import React from 'react'

const Button = ({
  type = 'button',
  children,
  disabled,
  onClick,
  className = '',
  ...props
}) => {
  // If no background color provided in className, default to solid dillaNavy with white text
  const hasBg = className.includes('bg-')
  const hasText = className.includes('text-')
  const defaultBgText = `${!hasBg ? 'bg-dillaNavy hover:bg-opacity-95' : ''} ${!hasText ? 'text-white' : ''}`

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dillaGold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${defaultBgText} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

Button.displayName = 'Button'

export default Button