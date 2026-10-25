import React, { useState, useEffect } from 'react'
import Icon from '@/components/icons/Icon'
import { Input, Button } from '@/components/forms'
import ActionMenu from '@/components/common/ActionMenu'
import ConfirmModal from '@/components/common/ConfirmModal'

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Short Text', desc: 'Single-line text input', icon: 'file-text' },
  { value: 'textarea', label: 'Long Text', desc: 'Multi-line text area', icon: 'file-text' },
  { value: 'number', label: 'Number', desc: 'Integer or decimal values', icon: 'file-text' },
  { value: 'email', label: 'Email Address', desc: 'Validated email format', icon: 'mail' },
  { value: 'phone', label: 'Phone Number', desc: 'Validated contact number', icon: 'phone' },
  { value: 'date', label: 'Date Picker', desc: 'Calendar date selection', icon: 'calendar' },
  { value: 'select', label: 'Dropdown (Select)', desc: 'Single choice from list', icon: 'list' },
  { value: 'radio', label: 'Radio Buttons', desc: 'Single selection choices', icon: 'circle' },
  { value: 'checkbox', label: 'Checkbox (Yes/No)', desc: 'Boolean toggle affirmation', icon: 'check-square' },
  { value: 'file', label: 'File Upload', desc: 'Document or certificate attachment', icon: 'upload' },
  { value: 'department', label: 'Department Selector', desc: 'Institutional department list', icon: 'building' },
  { value: 'batch', label: 'Batch Selector', desc: 'Enrolled batch years list', icon: 'calendar' },
  { value: 'academic_year', label: 'Academic Year Selector', desc: 'Active calendar years list', icon: 'clock' },
]

const STANDARD_FIELDS = [
  { key: 'photoUrl', label: 'Student Passport Photo', type: 'image', required: true, desc: '3:4 aspect ratio passport-size photo' },
  { key: 'studentId', label: 'Student Identification Number', type: 'text', required: true, desc: 'Unique admission number (e.g. DUC2023-001)' },
  { key: 'fullName', label: 'Full Student Name', type: 'text', required: true, desc: 'First, middle, and last name' },
  { key: 'gender', label: 'Gender', type: 'select', required: true, desc: 'Institutional gender classification' },
  { key: 'campus', label: 'Enrolled Campus', type: 'select', required: true, desc: 'Assigned University campus' },
  { key: 'department', label: 'Department / Discipline', type: 'department', required: true, desc: 'Academic department' },
  { key: 'program', label: 'Program Type', type: 'select', required: true, desc: 'Regular Degree, Continuing, or Postgraduate' },
  { key: 'yearOfStudy', label: 'Year of Study', type: 'select', required: true, desc: 'Academic level (Year 1 to Year 5)' },
  { key: 'academicYear', label: 'Academic Year', type: 'academic_year', required: true, desc: 'Current academic calendar' },
  { key: 'phone', label: 'Phone Number', type: 'phone', required: false, desc: 'Student mobile contact' },
  { key: 'email', label: 'Email Address', type: 'email', required: false, desc: 'Institutional student email' },
  { key: 'pdfFileName', label: 'PDF Registration Slip', type: 'file', required: true, desc: 'Official registrar verification document' },
  { key: 'isNonCafeteria', label: 'Non-Cafeteria Subsidy Declaration', type: 'checkbox', required: true, desc: 'Cost-sharing legal declaration' },
]

const RegistrationFormBuilder = ({
  userRole = 'admin',
  userCampus = null,
  campuses = [],
  departments = [],
  batches = [],
  academicYears = [],
  onFieldChanged,
}) => {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Sub-tabs: 'fields', 'standard', 'preview'
  const [activeSubTab, setActiveSubTab] = useState('fields')

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFieldId, setEditingFieldId] = useState(null)
  const [formData, setFormData] = useState({
    fieldKey: '',
    label: '',
    fieldType: 'text',
    placeholder: '',
    helpText: '',
    optionsStr: '',
    isRequired: false,
    isActive: true,
    isStudentEditable: true,
    visibleStudent: true,
    visibleDean: true,
    visibleAdmin: true,
    displayOrder: 0,
    campus: 'all',
  })

  // Delete & Confirmation state
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    field: null,
    hasExistingData: false,
    responseCount: 0,
    isLoading: false,
  })

  const loadCustomFields = async () => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    try {
      const res = await fetch('/api/custom-fields?all=true', { headers })
      if (res.ok) {
        const data = await res.json()
        setFields(data.customFields || [])
        if (onFieldChanged) onFieldChanged(data.customFields || [])
      } else {
        const d = await res.json()
        setError(d.message || 'Failed to load custom registration fields')
      }
    } catch (e) {
      console.error(e)
      setError('Network error fetching custom fields')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomFields()
  }, [])

  const handleOpenAddModal = () => {
    setEditingFieldId(null)
    setFormData({
      fieldKey: '',
      label: '',
      fieldType: 'text',
      placeholder: '',
      helpText: '',
      optionsStr: '',
      isRequired: false,
      isActive: true,
      isStudentEditable: true,
      visibleStudent: true,
      visibleDean: true,
      visibleAdmin: true,
      displayOrder: fields.length + 1,
      campus: userRole === 'dean' ? (userCampus || 'Main Campus') : 'all',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (field) => {
    setEditingFieldId(field.id)
    let opts = ''
    if (Array.isArray(field.options)) {
      opts = field.options.join(', ')
    }

    setFormData({
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      placeholder: field.placeholder || '',
      helpText: field.helpText || '',
      optionsStr: opts,
      isRequired: Boolean(field.isRequired),
      isActive: Boolean(field.isActive),
      isStudentEditable: field.isStudentEditable !== false,
      visibleStudent: field.visibleStudent !== false,
      visibleDean: field.visibleDean !== false,
      visibleAdmin: field.visibleAdmin !== false,
      displayOrder: field.displayOrder !== undefined ? field.displayOrder : 0,
      campus: field.campus || 'all',
    })
    setIsModalOpen(true)
  }

  const handleLabelChange = (val) => {
    setFormData((prev) => {
      const updates = { ...prev, label: val }
      // Auto-generate field key only on new fields if key wasn't manually edited
      if (!editingFieldId && (!prev.fieldKey || prev.fieldKey === prev.label.toLowerCase().replace(/[^a-z0-9_]/g, '_'))) {
        updates.fieldKey = val.toLowerCase().replace(/[^a-z0-9_]/g, '_')
      }
      return updates
    })
  }

  const handleSaveField = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!formData.label.trim()) {
      setError('Field display label is required')
      return
    }
    if (!formData.fieldKey.trim()) {
      setError('Field unique key is required')
      return
    }

    let parsedOptions = []
    if (['select', 'radio', 'checkbox', 'department', 'batch'].includes(formData.fieldType)) {
      parsedOptions = formData.optionsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (['select', 'radio'].includes(formData.fieldType) && parsedOptions.length === 0) {
        setError('At least one option is required for Dropdown and Radio fields')
        return
      }
    }

    const token = localStorage.getItem('token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const payload = {
      label: formData.label.trim(),
      fieldKey: formData.fieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      fieldType: formData.fieldType,
      placeholder: formData.placeholder.trim(),
      helpText: formData.helpText.trim(),
      options: parsedOptions,
      isRequired: formData.isRequired,
      isActive: formData.isActive,
      isStudentEditable: formData.isStudentEditable,
      visibleStudent: formData.visibleStudent,
      visibleDean: formData.visibleDean,
      visibleAdmin: formData.visibleAdmin,
      displayOrder: parseInt(formData.displayOrder) || 0,
      campus: formData.campus === 'all' ? null : formData.campus,
    }

    try {
      let res
      if (editingFieldId) {
        res = await fetch('/api/custom-fields', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ ...payload, id: editingFieldId }),
        })
      } else {
        res = await fetch('/api/custom-fields', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (res.ok) {
        setSuccessMessage(
          editingFieldId
            ? `Field "${formData.label}" updated successfully.`
            : `New field "${formData.label}" added to the registration form!`
        )
        setIsModalOpen(false)
        loadCustomFields()
      } else {
        setError(data.message || 'Failed to save registration field.')
      }
    } catch (err) {
      console.error(err)
      setError('Network error saving registration field.')
    }
  }

  const handleToggleActive = async (field) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: field.id,
          isActive: !field.isActive,
        }),
      })
      if (res.ok) {
        setFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...f, isActive: !f.isActive } : f))
        )
        setSuccessMessage(`Field "${field.label}" ${!field.isActive ? 'activated' : 'deactivated'}.`)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleRequestDelete = (field) => {
    setDeleteModalState({
      isOpen: true,
      field,
      hasExistingData: (field.responseCount || 0) > 0,
      responseCount: field.responseCount || 0,
      isLoading: false,
    })
  }

  const handleConfirmDelete = async () => {
    const { field, responseCount } = deleteModalState
    if (!field) return

    setDeleteModalState((p) => ({ ...p, isLoading: true }))
    const token = localStorage.getItem('token')
    try {
      const url = responseCount > 0 ? `/api/custom-fields?id=${field.id}&force=true` : `/api/custom-fields?id=${field.id}`
      const res = await fetch(url, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const d = await res.json()
      if (res.ok) {
        setSuccessMessage(`Field "${field.label}" was permanently removed.`)
        setFields((prev) => prev.filter((f) => f.id !== field.id))
        setDeleteModalState({ isOpen: false, field: null, hasExistingData: false, responseCount: 0, isLoading: false })
      } else {
        setError(d.message || 'Failed to delete field.')
        setDeleteModalState((p) => ({ ...p, isLoading: false }))
      }
    } catch (e) {
      setError('Network error deleting field.')
      setDeleteModalState((p) => ({ ...p, isLoading: false }))
    }
  }

  const handleDeactivateInstead = async () => {
    const { field } = deleteModalState
    if (!field) return
    setDeleteModalState({ isOpen: false, field: null, hasExistingData: false, responseCount: 0, isLoading: false })
    await handleToggleActive(field)
  }

  const handleMoveOrder = async (field, direction) => {
    const currentOrder = field.displayOrder !== undefined ? field.displayOrder : 0
    const newOrder = direction === 'up' ? Math.max(0, currentOrder - 1) : currentOrder + 1
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/custom-fields', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: field.id,
          displayOrder: newOrder,
        }),
      })
      if (res.ok) {
        loadCustomFields()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="sliders-horizontal" className="w-5 h-5 text-dillaGreen" />
            <h2 className="text-lg font-bold text-dillaDarkGreen">
              Registration Form Builder & Dynamic Fields
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, configure, reorder, and govern registration fields without writing code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setActiveSubTab('fields')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'fields'
                  ? 'bg-white text-dillaDarkGreen shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Fields ({fields.length})
            </button>
            <button
              onClick={() => setActiveSubTab('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'standard'
                  ? 'bg-white text-dillaDarkGreen shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standard Fields ({STANDARD_FIELDS.length})
            </button>
            <button
              onClick={() => setActiveSubTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'preview'
                  ? 'bg-white text-dillaDarkGreen shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Student Preview
            </button>
          </div>

          <Button
            onClick={handleOpenAddModal}
            variant="primary"
            className="text-xs px-3.5 py-1.5 font-bold shadow-sm flex items-center gap-1.5"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>Add Field</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Icon name="check-circle" className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-xs font-bold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-3 text-sm">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Icon name="alert-circle" className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="text-xs font-bold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold ml-3 text-sm">
            ×
          </button>
        </div>
      )}

      {/* SUB-TAB 1: DYNAMIC CUSTOM FIELDS TABLE */}
      {activeSubTab === 'fields' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-[#f1f5f3] text-dillaDarkGreen font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-16 text-center">Order</th>
                  <th className="py-3 px-4">Field Label & Key</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Scope</th>
                  <th className="py-3 px-3">Governance</th>
                  <th className="py-3 px-3">Visibility</th>
                  <th className="py-3 px-3">Responses</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      <Icon name="refresh" className="w-5 h-5 animate-spin mx-auto mb-1 text-dillaGreen" />
                      Loading configured registration fields...
                    </td>
                  </tr>
                ) : fields.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-10 text-center text-slate-400">
                      <Icon name="sliders-horizontal" className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-sm">No custom registration fields defined yet</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Click "Add Field" above to add new fields such as "Section", "Advisor Name", or campus-specific requirements.
                      </p>
                    </td>
                  </tr>
                ) : (
                  fields.map((field) => (
                    <tr key={field.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Reordering Controls */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleMoveOrder(field, 'up')}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                            title="Move Up"
                          >
                            <Icon name="arrow-up" className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-xs font-bold text-slate-700 w-4 text-center">
                            {field.displayOrder !== undefined ? field.displayOrder : 0}
                          </span>
                          <button
                            onClick={() => handleMoveOrder(field, 'down')}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                            title="Move Down"
                          >
                            <Icon name="arrow-down" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Label & Key */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{field.label}</p>
                        <p className="font-mono text-[11px] text-slate-500">{field.fieldKey}</p>
                        {field.helpText && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5 max-w-xs truncate">
                            {field.helpText}
                          </p>
                        )}
                      </td>

                      {/* Input Type */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-[11px] inline-flex items-center gap-1">
                          {field.fieldType}
                        </span>
                        {['select', 'radio'].includes(field.fieldType) && Array.isArray(field.options) && (
                          <p className="text-[10px] text-slate-500 mt-1 max-w-[140px] truncate" title={field.options.join(', ')}>
                            {field.options.length} options: {field.options.join(', ')}
                          </p>
                        )}
                      </td>

                      {/* Campus Scope */}
                      <td className="py-3 px-3">
                        {field.campus ? (
                          <span className="font-bold text-dillaGreen bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            {field.campus}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                            Global (All)
                          </span>
                        )}
                      </td>

                      {/* Governance Badges */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          {field.isRequired ? (
                            <span className="text-rose-800 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[9px] uppercase">
                              Required
                            </span>
                          ) : (
                            <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">
                              Optional
                            </span>
                          )}

                          {field.isStudentEditable === false ? (
                            <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[9px]">
                              Read-Only
                            </span>
                          ) : (
                            <span className="text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[9px]">
                              Student-Editable
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Visibility */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-slate-500" title="Visible to: Student, Dean, Admin">
                          <span className={`text-[10px] px-1 py-0.5 rounded font-mono font-bold ${field.visibleStudent !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            STU
                          </span>
                          <span className={`text-[10px] px-1 py-0.5 rounded font-mono font-bold ${field.visibleDean !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            DEA
                          </span>
                          <span className={`text-[10px] px-1 py-0.5 rounded font-mono font-bold ${field.visibleAdmin !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            ADM
                          </span>
                        </div>
                      </td>

                      {/* Student Responses Count */}
                      <td className="py-3 px-3">
                        {field.responseCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full font-bold text-[10px]">
                            {field.responseCount} saved
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">0 responses</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleActive(field)}
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border cursor-pointer transition-colors ${
                            field.isActive
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {field.isActive ? 'Active' : 'Deactivated'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <ActionMenu
                          items={[
                            {
                              label: 'Edit Configuration',
                              icon: 'edit',
                              onClick: () => handleOpenEditModal(field),
                            },
                            {
                              label: field.isActive ? 'Deactivate Field' : 'Activate Field',
                              icon: field.isActive ? 'x-circle' : 'check-circle',
                              onClick: () => handleToggleActive(field),
                            },
                            {
                              label: 'Delete Field',
                              icon: 'trash',
                              variant: 'danger',
                              separator: true,
                              onClick: () => handleRequestDelete(field),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: STANDARD PREDEFINED FIELDS OVERVIEW */}
      {activeSubTab === 'standard' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-dillaDarkGreen uppercase tracking-wider">
              Core Registration System Fields
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These fundamental academic fields form the core university registration contract and are dynamically supplemented by your custom fields above.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {STANDARD_FIELDS.map((sf) => (
              <div key={sf.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs">{sf.label}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                      {sf.type}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-400 mt-0.5">{sf.key}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{sf.desc}</p>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Icon name="check" className="w-3 h-3 text-emerald-600" />
                    Built-in
                  </span>
                  <span className="text-slate-500 font-semibold">
                    {sf.required ? 'Mandatory' : 'Optional'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LIVE STUDENT REGISTRATION FORM PREVIEW */}
      {activeSubTab === 'preview' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-dillaGold">Interactive Form Preview</span>
              <h3 className="text-base font-bold text-dillaDarkGreen">
                Student Registration View (Dynamic Synthesis)
              </h3>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold px-3 py-1 rounded-full">
              Live Preview
            </span>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border border-slate-300 space-y-6 max-w-3xl mx-auto">
            {/* Standard Identification Preview */}
            <div>
              <p className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
                Section 2: Student Identification (Standard)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Student ID *</label>
                  <input disabled value="DUC2023-001" className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-500" />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Full Student Name *</label>
                  <input disabled value="Student Demo Name" className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-500" />
                </div>
              </div>
            </div>

            {/* Dynamic Custom Fields Section Preview */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">
                  Section 4: Additional Registered Fields (Admin Defined)
                </p>
                <span className="text-[11px] font-bold text-dillaGreen">
                  {fields.filter((f) => f.isActive && f.visibleStudent !== false).length} active dynamic field(s)
                </span>
              </div>

              {fields.filter((f) => f.isActive && f.visibleStudent !== false).length === 0 ? (
                <p className="text-xs text-slate-400 italic p-4 bg-white rounded-lg border border-slate-200 text-center">
                  No custom fields are currently active. Add fields above to display them here.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields
                    .filter((f) => f.isActive && f.visibleStudent !== false)
                    .map((field) => (
                      <div key={field.id} className={field.fieldType === 'textarea' ? 'sm:col-span-2' : ''}>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          {field.label} {field.isRequired && <span className="text-rose-600">*</span>}
                        </label>
                        {field.placeholder && (
                          <p className="text-[10px] text-slate-400 mb-1">{field.placeholder}</p>
                        )}

                        {field.fieldType === 'textarea' ? (
                          <textarea
                            disabled
                            rows={3}
                            placeholder={`Enter ${field.label}...`}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-400"
                          />
                        ) : field.fieldType === 'select' ? (
                          <select disabled className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white text-xs text-slate-500">
                            <option>-- Select {field.label} --</option>
                            {(field.options || []).map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        ) : field.fieldType === 'radio' ? (
                          <div className="flex flex-wrap gap-3 pt-1">
                            {(field.options || []).map((o) => (
                              <label key={o} className="flex items-center gap-1.5 text-xs text-slate-700">
                                <input type="radio" disabled name={field.fieldKey} />
                                <span>{o}</span>
                              </label>
                            ))}
                          </div>
                        ) : field.fieldType === 'checkbox' ? (
                          <label className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-700">
                            <input type="checkbox" disabled className="rounded text-dillaGreen w-4 h-4" />
                            <span>Confirm {field.label}</span>
                          </label>
                        ) : (
                          <input
                            disabled
                            type={field.fieldType}
                            placeholder={`Enter ${field.label}...`}
                            className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white text-xs text-slate-400"
                          />
                        )}

                        {field.helpText && (
                          <p className="text-[10px] text-slate-500 mt-1 italic">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT FIELD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col relative overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-gradient-to-r from-dillaDarkGreen to-dillaGreen text-white p-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Icon name="sliders-horizontal" className="w-5 h-5 text-dillaGold" />
                <h3 className="font-bold text-base">
                  {editingFieldId ? 'Edit Registration Field' : 'Create Custom Registration Field'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveField} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Display Label *
                  </label>
                  <Input
                    placeholder="e.g. Section or Advisor Name"
                    value={formData.label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    required
                    className="text-slate-900 text-xs h-9"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Title visible on registration form</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unique Field Key *
                  </label>
                  <Input
                    placeholder="e.g. section"
                    value={formData.fieldKey}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        fieldKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                      }))
                    }
                    disabled={Boolean(editingFieldId)}
                    required
                    className="text-slate-900 text-xs font-mono h-9"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Database key (alphanumeric/underscore)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Input Type *
                  </label>
                  <select
                    value={formData.fieldType}
                    onChange={(e) => setFormData((p) => ({ ...p, fieldType: e.target.value }))}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
                  >
                    {FIELD_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Campus Scope *
                  </label>
                  <select
                    value={formData.campus}
                    onChange={(e) => setFormData((p) => ({ ...p, campus: e.target.value }))}
                    disabled={userRole === 'dean'}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 focus:border-dillaGreen"
                  >
                    <option value="all">Global (All University Campuses)</option>
                    {campuses.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Options for dropdown, radio, or selectors */}
              {['select', 'radio', 'checkbox', 'department', 'batch'].includes(formData.fieldType) && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Choice Options (Comma-separated) *
                    </label>
                    {formData.fieldType === 'department' && (
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, optionsStr: departments.join(', ') }))}
                        className="text-[10px] text-dillaGreen font-bold hover:underline"
                      >
                        Insert University Departments
                      </button>
                    )}
                    {formData.fieldType === 'batch' && (
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, optionsStr: batches.join(', ') }))}
                        className="text-[10px] text-dillaGreen font-bold hover:underline"
                      >
                        Insert Default Batches
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder="e.g. Option A, Option B, Option C"
                    value={formData.optionsStr}
                    onChange={(e) => setFormData((p) => ({ ...p, optionsStr: e.target.value }))}
                    className="text-slate-900 text-xs h-9"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Placeholder Text
                  </label>
                  <Input
                    placeholder="e.g. Enter your section number"
                    value={formData.placeholder}
                    onChange={(e) => setFormData((p) => ({ ...p, placeholder: e.target.value }))}
                    className="text-slate-900 text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Display Order Index
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData((p) => ({ ...p, displayOrder: e.target.value }))}
                    className="text-slate-900 text-xs h-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Help Text / Field Guidance
                </label>
                <Input
                  placeholder="e.g. Found on your official registrar slip"
                  value={formData.helpText}
                  onChange={(e) => setFormData((p) => ({ ...p, helpText: e.target.value }))}
                  className="text-slate-900 text-xs h-9"
                />
              </div>

              {/* Toggles & Permissions Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Governance & Access Rules
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData((p) => ({ ...p, isRequired: e.target.checked }))}
                      className="rounded text-dillaGreen w-4 h-4"
                    />
                    <span>Mandatory (Required Field)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                      className="rounded text-dillaGreen w-4 h-4"
                    />
                    <span>Active on Registration Form</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.isStudentEditable}
                      onChange={(e) => setFormData((p) => ({ ...p, isStudentEditable: e.target.checked }))}
                      className="rounded text-dillaGreen w-4 h-4"
                    />
                    <span>Student-Editable After Submission</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.visibleStudent}
                      onChange={(e) => setFormData((p) => ({ ...p, visibleStudent: e.target.checked }))}
                      className="rounded text-dillaGreen w-4 h-4"
                    />
                    <span>Visible to Students</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.visibleDean}
                      onChange={(e) => setFormData((p) => ({ ...p, visibleDean: e.target.checked }))}
                      className="rounded text-dillaGreen w-4 h-4"
                    />
                    <span>Visible to Campus Dean</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.visibleAdmin}
                      onChange={(e) => setFormData((p) => ({ ...p, visibleAdmin: e.target.checked }))}
                      className="rounded text-dillaGreen w-4 h-4"
                    />
                    <span>Visible to Super Admin</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs px-5 py-2 font-bold shadow-md"
                >
                  {editingFieldId ? 'Save Changes' : 'Create Registration Field'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL WITH HISTORICAL DATA SAFEGUARDS */}
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        title="Delete Registration Field"
        message={
          deleteModalState.hasExistingData
            ? `Warning: This field contains saved data from ${deleteModalState.responseCount} student(s). Deactivating the field is strongly recommended instead to preserve student audit history.`
            : `Are you sure you want to delete custom field "${deleteModalState.field?.label}"?`
        }
        itemName={deleteModalState.field ? `${deleteModalState.field.label} (${deleteModalState.field.fieldKey})` : ''}
        itemDetails={
          deleteModalState.hasExistingData
            ? `${deleteModalState.responseCount} student submission(s) currently link to this field.`
            : 'No student data currently links to this field.'
        }
        confirmLabel={deleteModalState.hasExistingData ? 'Force Permanent Delete' : 'Delete Field'}
        cancelLabel={deleteModalState.hasExistingData ? 'Deactivate Instead (Recommended)' : 'Cancel'}
        onConfirm={handleConfirmDelete}
        onClose={deleteModalState.hasExistingData ? handleDeactivateInstead : () => setDeleteModalState({ isOpen: false, field: null, hasExistingData: false, responseCount: 0, isLoading: false })}
        isLoading={deleteModalState.isLoading}
        danger
      />
    </div>
  )
}

export default RegistrationFormBuilder
