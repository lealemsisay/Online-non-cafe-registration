import React from 'react'

const Input = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  className = '',
  ...props
}) => {
  return (
    <div className="relative w-full">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full px-3.5 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dillaGold focus:border-dillaGold transition-colors ${className}`}
        {...props}
      />
    </div>
  )
}

Input.displayName = 'Input'

export default Input