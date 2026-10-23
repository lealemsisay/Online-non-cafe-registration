import React from 'react'

const Select = ({
  name,
  placeholder = 'Select an option',
  options = [],
  value,
  onChange,
  className = '',
  required = false,
  disabled = false,
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
        disabled={disabled}
        className={`w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer ${className}`}
        {...props}
      >
        <option value="" disabled className="text-slate-400">
          {placeholder}
        </option>
        {options.map((option) => {
          const val = typeof option === 'object' ? option.value : option
          const lbl = typeof option === 'object' ? option.label : option
          return (
            <option key={val} value={val} className="text-slate-900 bg-white py-1">
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
