import React from 'react'

const Input = ({
  type,
  placeholder,
  value,
  onChange,
  required,
  ...props
}) => {
  return (
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className=" w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGold focus:border-dillaGold transition-colors"
        {...props}
      />
    </div>
  )
}

Input.displayName = 'Input'

export default Input