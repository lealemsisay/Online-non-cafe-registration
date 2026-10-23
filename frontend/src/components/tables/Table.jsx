import React from 'react'
import Icon from '@/components/icons/Icon'

const Table = ({ headers, data, className = '', noDataMessage = 'No records available' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 shadow-2xs">
        <Icon name="file-text" className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-700">{noDataMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs bg-white">
      <table className={`min-w-full divide-y divide-slate-200 ${className}`}>
        <thead className="bg-[#f1f5f3]">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider border-b border-slate-200"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-[#e8f5e9]/30 transition-colors">
              {headers.map((header) => {
                const value = row[header] !== undefined && row[header] !== null ? row[header] : ''
                return (
                  <td key={header} className="px-4 py-3.5 text-sm text-slate-800 font-normal">
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
