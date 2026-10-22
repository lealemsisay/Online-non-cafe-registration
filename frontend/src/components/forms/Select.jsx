import React from 'react'

const Select = ({
  name,
  placeholder = 'Select an option',
  options = [],
  value,
  onChange,
  className = '',
  required = false,
  ...props
}) => {
  const handleChange = (e) => {
    if (typeof onChange === 'function') {
      onChange(e)
    }
  }

  return (
    <div className="relative w-full">
      <select
        name={name}
        value={value || ''}
        onChange={handleChange}
        required={required}
        className={`w-full px-3.5 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGold focus:border-dillaGold transition-colors ${className}`}
        {...props}
      >
        <option value="" disabled className="text-gray-400">
          {placeholder}
        </option>
        {options.map((option) => {
          const val = typeof option === 'object' ? option.value : option
          const lbl = typeof option === 'object' ? option.label : option
          return (
            <option key={val} value={val} className="text-gray-900">
              {lbl}
            </option>
          )
        })}
      </select>
    </div>
  )
}

Select.displayName = 'Select'

export default Select