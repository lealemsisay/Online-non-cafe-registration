import React from 'react'

const Input = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  disabled,
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
        disabled={disabled}
        className={`w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    </div>
  )
}

Input.displayName = 'Input'

export default Input
