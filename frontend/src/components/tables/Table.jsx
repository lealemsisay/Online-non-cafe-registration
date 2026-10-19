import React from 'react'

const Table = ({ headers, data, className, noDataMessage = 'No data available' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-dillaGray text-center py-8">
        {noDataMessage}
      </div>
    )
  }

  return (
    <table className="min-w-full {className} bg-white rounded-lg overflow-hidden">
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} className="p-3 text-left text-dillaNavy font-medium border border-gray-200">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index} className="border-b border-gray-100 hover:bg-dillaGray/10">
            {headers.map((header) => {
              const value = row[header] || ''
              return (
                <td key={header} className="p-3 text-dillaGray">
                  {typeof value === 'object' ? JSON.stringify(value) : value}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

Table.displayName = 'Table'

export default Table