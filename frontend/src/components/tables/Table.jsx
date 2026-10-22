import React from 'react'

const Table = ({ headers, data, className = '', noDataMessage = 'No data available' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8 text-sm">
        {noDataMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
      <table className={`min-w-full bg-white divide-y divide-gray-200 ${className}`}>
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-xs font-semibold text-dillaNavy uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-slate-50/70 transition-colors">
              {headers.map((header) => {
                const value = row[header] !== undefined && row[header] !== null ? row[header] : ''
                return (
                  <td key={header} className="px-4 py-3 text-sm text-gray-700 font-normal">
                    {typeof value === 'object' ? JSON.stringify(value) : value}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

Table.displayName = 'Table'

export default Table