import React from 'react'

const Select = ({
  name,
  placeholder,
  options,
  value,
  onChange,
  ...props
}) => {
  const handleChange = (e) => {
    onChange(e.target.value)
  }

  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGold focus:border-dillaGold transition-colors"
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

Select.displayName = 'Select'

export default Select