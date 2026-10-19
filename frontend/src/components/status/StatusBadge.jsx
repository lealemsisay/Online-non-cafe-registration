import React from 'react'

const StatusBadge = ({ status }) => {
  const statuses = {
    draft: { label: 'Draft', color: 'dillaGold' },
    submitted: { label: 'Submitted', color: 'dillaTeal' },
    'dean-review': { label: 'Campus Dean Review', color: 'dillaNavy' },
    'super-admin-review': { label: 'Super Admin Review', color: '#8e24aa' },
    approved: { label: 'Approved', color: 'green' },
    rejected: { label: 'Rejected', color: 'red' },
    'return-for-correction': { label: 'Correction Required', color: '#f57c00' },
    verified: { label: 'Verified', color: 'green' },
    not_registered: { label: 'Not Registered', color: 'red' },
    'unable-to-verify': { label: 'Unable to Verify', color: 'orange' },
    pending: { label: 'Pending', color: 'yellow' },
  }

  const s = statuses[status] || { label: status, color: 'gray' }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-white border border-dillaNavy/20 text-dillaNavy"
    >
      {s.label}
    </span>
  )
}

export { StatusBadge }
export default StatusBadge