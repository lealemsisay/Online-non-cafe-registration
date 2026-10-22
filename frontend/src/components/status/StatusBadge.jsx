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

  const badgeStyles = {
    draft: 'bg-slate-100 text-slate-700 border-slate-300',
    submitted: 'bg-sky-50 text-sky-700 border-sky-300',
    'dean-review': 'bg-blue-50 text-blue-800 border-blue-300',
    'super-admin-review': 'bg-purple-50 text-purple-800 border-purple-300',
    approved: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    rejected: 'bg-rose-50 text-rose-800 border-rose-300',
    'return-for-correction': 'bg-amber-50 text-amber-900 border-amber-300',
    'returned-for-correction': 'bg-amber-50 text-amber-900 border-amber-300',
    verified: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    registered: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    not_registered: 'bg-rose-50 text-rose-800 border-rose-300',
    'unable-to-verify': 'bg-amber-50 text-amber-900 border-amber-300',
    unable_to_verify: 'bg-amber-50 text-amber-900 border-amber-300',
    pending: 'bg-amber-50 text-amber-800 border-amber-300',
    active: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    inactive: 'bg-slate-100 text-slate-600 border-slate-300',
  }

  const normalized = (status || '').toLowerCase().replace(/\s+/g, '-')
  const s = statuses[status] || statuses[normalized] || { label: status || 'Unknown', color: 'gray' }
  const style = badgeStyles[status] || badgeStyles[normalized] || 'bg-slate-50 text-slate-700 border-slate-200'

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}
    >
      {s.label}
    </span>
  )
}

export { StatusBadge }
export default StatusBadge