import React from 'react'
import Icon from '@/components/icons/Icon'

const StatusBadge = ({ status, showIcon = true }) => {
  const normalized = (status || '').toLowerCase().trim().replace(/[\s_]+/g, '-')

  const configs = {
    draft: {
      label: 'Draft',
      icon: 'file-text',
      style: 'bg-slate-100 text-slate-800 border-slate-300',
    },
    submitted: {
      label: 'Submitted (New)',
      icon: 'check-circle',
      style: 'bg-sky-50 text-sky-900 border-sky-300',
    },
    'dean-review': {
      label: 'Campus Dean Review',
      icon: 'clock',
      style: 'bg-blue-50 text-blue-900 border-blue-300',
    },
    'super-admin-review': {
      label: 'Super Admin Review',
      icon: 'shield',
      style: 'bg-purple-50 text-purple-900 border-purple-300',
    },
    approved: {
      label: 'Approved (Cost-Sharing)',
      icon: 'check',
      style: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    },
    rejected: {
      label: 'Rejected',
      icon: 'alert',
      style: 'bg-rose-50 text-rose-900 border-rose-300',
    },
    'return-for-correction': {
      label: 'Correction Required',
      icon: 'alert-circle',
      style: 'bg-amber-50 text-amber-950 border-amber-300 font-bold',
    },
    'returned-for-correction': {
      label: 'Correction Required',
      icon: 'alert-circle',
      style: 'bg-amber-50 text-amber-950 border-amber-300 font-bold',
    },
    verified: {
      label: 'Dean Verified',
      icon: 'check',
      style: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    },
    registered: {
      label: 'Verified & Registered',
      icon: 'check',
      style: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    },
    not_registered: {
      label: 'Not Registered / Ineligible',
      icon: 'alert',
      style: 'bg-rose-50 text-rose-900 border-rose-300',
    },
    'not-registered': {
      label: 'Not Registered / Ineligible',
      icon: 'alert',
      style: 'bg-rose-50 text-rose-900 border-rose-300',
    },
    'unable-to-verify': {
      label: 'Unable to Verify',
      icon: 'alert-circle',
      style: 'bg-amber-50 text-amber-950 border-amber-300',
    },
    active: {
      label: 'Active',
      icon: 'check',
      style: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    },
    inactive: {
      label: 'Inactive',
      icon: 'clock',
      style: 'bg-slate-100 text-slate-700 border-slate-300',
    },
    pending: {
      label: 'Pending Review',
      icon: 'clock',
      style: 'bg-amber-50 text-amber-900 border-amber-300',
    },
  }

  const current = configs[normalized] || {
    label: status ? String(status).toUpperCase() : 'UNKNOWN',
    icon: 'info',
    style: 'bg-slate-100 text-slate-800 border-slate-300',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs whitespace-nowrap ${current.style}`}
    >
      {showIcon && current.icon && (
        <Icon name={current.icon} className="w-3.5 h-3.5 flex-shrink-0" />
      )}
      <span>{current.label}</span>
    </span>
  )
}

export { StatusBadge }
export default StatusBadge
