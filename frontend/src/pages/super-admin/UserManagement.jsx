import React, { useState, useEffect } from 'react'
import { Input, Button, Select } from '@/components/forms'
import { StatusBadge } from '@/components/status/StatusBadge'
import Icon from '@/components/icons/Icon'
import ActionMenu from '@/components/common/ActionMenu'
import ConfirmModal from '@/components/common/ConfirmModal'
import StudentDetailModal from '@/components/students/StudentDetailModal'
import StudentEditModal from '@/components/students/StudentEditModal'
import ImportStudents from '@/pages/super-admin/components/import-students/ImportStudents'

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('dean') // 'dean' | 'viceDean' | 'student'
  const [deans, setDeans] = useState([])
  const [viceDeans, setViceDeans] = useState([])
  const [students, setStudents] = useState([])
  const [campuses, setCampuses] = useState([
    { value: 'Main Campus', label: 'Main Campus' },
    { value: 'Odaya Campus', label: 'Odaya Campus' },
    { value: 'Haru Campus', label: 'Haru Campus' },
  ])

  // Pagination state
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Campus Cafe Dean tab create state
  const [newDeanName, setNewDeanName] = useState('')
  const [newDeanEmail, setNewDeanEmail] = useState('')
  const [newDeanCampus, setNewDeanCampus] = useState('Main Campus')
  const [newDeanPassword, setNewDeanPassword] = useState('Dean@Dilla2026!')

  // Vice Dean tab create state
  const [newViceDeanName, setNewViceDeanName] = useState('')
  const [newViceDeanEmail, setNewViceDeanEmail] = useState('')
  const [newViceDeanCampus, setNewViceDeanCampus] = useState('Main Campus')
  const [newViceDeanPassword, setNewViceDeanPassword] = useState('ViceDean@Dilla2026!')

  // Student tab create state
  const [newStudentId, setNewStudentId] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentCampus, setNewStudentCampus] = useState('Main Campus')
  const [newStudentDept, setNewStudentDept] = useState('Computer Science')
  const [newStudentEmail, setNewStudentEmail] = useState('')
  const [newStudentPassword, setNewStudentPassword] = useState('Student@Dilla2026!')

  // Custom Fields management state
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState('text')
  const [newFieldApplicability, setNewFieldApplicability] = useState('both')
  const [newFieldRequired, setNewFieldRequired] = useState('false')
  const [newFieldDisplayOrder, setNewFieldDisplayOrder] = useState(0)
  const [newFieldVisibleStudent, setNewFieldVisibleStudent] = useState(true)
  const [newFieldVisibleAdmin, setNewFieldVisibleAdmin] = useState(true)
  const [editingField, setEditingField] = useState(null)
  const [customFields, setCustomFields] = useState([])

  // Modal unified provisioning state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    campus: 'Main Campus',
    role: null,
    studentId: '',
    department: 'Computer Science',
    program: 'Regular',
    yearOfStudy: '1',
    gender: 'Male',
    phone: '',
    password: '',
  })

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('')
  const [campusFilter, setCampusFilter] = useState('all')

  // Password reset modal state
  const [resetTargetUser, setResetTargetUser] = useState(null)
  const [customPassword, setCustomPassword] = useState('')

  // View user details modal state (for Dean / Vice Dean)
  const [viewingUser, setViewingUser] = useState(null)

  // Edit user modal state (for Dean / Vice Dean / Admin)
  const [editingUser, setEditingUser] = useState(null)

  // Student detail/edit modals
  const [detailStudentId, setDetailStudentId] = useState(null)
  const [detailInitialData, setDetailInitialData] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editStudentTarget, setEditStudentTarget] = useState(null)
  const [showEditStudentModal, setShowEditStudentModal] = useState(false)

  // Confirm delete modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [activeStudentCount, setActiveStudentCount] = useState(null)
  const [authenticatedRole, setAuthenticatedRole] = useState(null)
  const [userCampus, setUserCampus] = useState('Main Campus')

  const loadData = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    try {
      const [deanRes, viceDeanRes, studentRes, campusRes, settingsRes] = await Promise.all([
        fetch('/api/users?type=dean', { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/users?type=viceDean', { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/users?type=student', { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/campuses', { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/settings', { headers }).then((r) => (r.ok ? r.json() : null)),
      ])

      if (deanRes?.deans) setDeans(deanRes.deans)
      if (viceDeanRes?.viceDeans) setViceDeans(viceDeanRes.viceDeans)
      if (studentRes?.users) setStudents(studentRes.users)
      if (campusRes?.campuses && campusRes.campuses.length > 0) {
        setCampuses(campusRes.campuses.map((c) => ({ value: c.name, label: c.name })))
      }
      if (settingsRes?.systemSettings?.customFields) {
        setCustomFields(settingsRes.systemSettings.customFields)
      }
    } catch (err) {
      console.error('Error loading user management data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setAuthenticatedRole(payload.role || null)
        setUserCampus(payload.campus || 'Main Campus')
      } catch (e) {
        setAuthenticatedRole(null)
        setUserCampus('Main Campus')
      }
    }
  }, [])

  // Reset page when switching tabs or changing search/filter
  useEffect(() => {
    setPage(1)
  }, [activeTab, searchTerm, campusFilter])

  // Handle role selection in the unified modal form
  const handleRoleChange = (role) => {
    setSelectedRole(role)
    const roleLower = role.toLowerCase()
    let initialData = {
      name: '',
      email: '',
      campus: formData.campus || 'Main Campus',
      role: roleLower,
      studentId: '',
      department: 'Computer Science',
      program: 'Regular',
      yearOfStudy: '1',
      gender: 'Male',
      phone: '',
      password: '',
    }
    setFormData(initialData)
  }

  // Handle form input change in unified modal
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle campus change in unified modal
  const handleCampusChange = (e) => {
    setFormData((prev) => ({ ...prev, campus: e.target.value }))
  }

  // Unified modal account creation
  const handleAddAccount = async () => {
    setError(null)
    setMessage(null)
    if (!formData.name) {
      setError('Please provide the required name or identifier.')
      return
    }
    if (!formData.role) {
      setError('Please select a role.')
      return
    }
    if (!formData.campus) {
      setError('Please select a campus.')
      return
    }

    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: formData.role,
          name: formData.name,
          fullName: formData.name,
          studentId: formData.studentId || formData.name,
          email: formData.email,
          campus: formData.campus,
          department: formData.department,
          program: formData.program,
          yearOfStudy: formData.yearOfStudy,
          gender: formData.gender,
          phone: formData.phone,
          password:
            formData.password ||
            (formData.role === 'dean'
              ? 'Dean@Dilla2026!'
              : formData.role === 'vicedean'
              ? 'ViceDean@Dilla2026!'
              : 'Student@Dilla2026!'),
        }),
      })

      const data = await res.json()
      if (res.ok && (data.user || data.dean || data.viceDean)) {
        setMessage(`Account '${formData.name}' created successfully!`)
        setShowCreateForm(false)
        setSelectedRole(null)
        setFormData({
          name: '',
          email: '',
          campus: 'Main Campus',
          role: null,
          studentId: '',
          department: 'Computer Science',
          program: 'Regular',
          yearOfStudy: '1',
          gender: 'Male',
          phone: '',
          password: '',
        })
        loadData()
      } else {
        setError(data.message || 'Failed to create account')
      }
    } catch (e) {
      setError('Network error creating account.')
    }
  }

  // Tab-level Campus Cafe Dean creation
  const handleAddDean = async () => {
    setError(null)
    setMessage(null)
    if (!newDeanName || !newDeanEmail) {
      setError('Please provide full name and official email for the Dean.')
      return
    }
    if (!newDeanCampus) {
      setError('Please assign a campus for the new Campus Dean.')
      return
    }

    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: 'dean',
          name: newDeanName.trim(),
          email: newDeanEmail.trim(),
          campus: newDeanCampus.trim(),
          password: newDeanPassword || 'Dean@Dilla2026!',
        }),
      })

      const data = await res.json()
      if (res.ok && data.dean) {
        setDeans((prev) => [data.dean, ...prev])
        setMessage(`Campus Cafe Dean account for '${newDeanName}' (${newDeanCampus}) created successfully!`)
        setNewDeanName('')
        setNewDeanEmail('')
        setNewDeanPassword('Dean@Dilla2026!')
        loadData()
      } else {
        setError(data.message || 'Failed to create Dean account')
      }
    } catch (e) {
      setError('Network error creating Dean account.')
    }
  }

  // Tab-level Vice Dean creation
  const handleAddViceDean = async () => {
    setError(null)
    setMessage(null)
    if (!newViceDeanName) {
      setError("Please provide the Vice Dean's name.")
      return
    }
    if (!newViceDeanCampus) {
      setError('Please assign a campus for the new Vice Dean.')
      return
    }

    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: 'viceDean',
          name: newViceDeanName.trim(),
          email: newViceDeanEmail.trim(),
          campus: newViceDeanCampus.trim(),
          password: newViceDeanPassword || 'ViceDean@Dilla2026!',
        }),
      })

      const data = await res.json()
      if (res.ok && data.viceDean) {
        setViceDeans((prev) => [data.viceDean, ...prev])
        setMessage(`Vice Dean account for '${newViceDeanName}' created successfully! Super Admin notified.`)
        setNewViceDeanName('')
        setNewViceDeanEmail('')
        setNewViceDeanCampus('Main Campus')
        setNewViceDeanPassword('ViceDean@Dilla2026!')
        loadData()
      } else {
        setError(data.message || 'Failed to create Vice Dean account')
      }
    } catch (e) {
      setError('Network error creating Vice Dean account.')
    }
  }

  // Tab-level Student creation
  const handleAddStudent = async () => {
    setError(null)
    setMessage(null)
    if (!newStudentId || !newStudentName) {
      setError('Please provide Student ID and Full Name.')
      return
    }

    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: 'student',
          studentId: newStudentId.trim(),
          fullName: newStudentName.trim(),
          campus: newStudentCampus || 'Main Campus',
          department: newStudentDept,
          email: newStudentEmail.trim(),
          password: newStudentPassword || 'Student@Dilla2026!',
        }),
      })

      const data = await res.json()
      if (res.ok && data.user) {
        setStudents((prev) => [data.user, ...prev])
        setMessage(`Student account '${newStudentId}' created successfully for campus '${newStudentCampus || 'Main Campus'}'!`)
        setNewStudentId('')
        setNewStudentName('')
        setNewStudentEmail('')
        setNewStudentPassword('Student@Dilla2026!')
        loadData()
      } else {
        setError(data.message || 'Failed to create student account')
      }
    } catch (e) {
      setError('Network error creating student account.')
    }
  }

  // Custom Fields handlers
  const handleCreateCustomField = async () => {
    setError(null)
    setMessage(null)
    if (!newFieldKey || !newFieldLabel) {
      setError('Please provide field key and label.')
      return
    }

    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customFields: [{
            field_key: newFieldKey.trim(),
            label: newFieldLabel.trim(),
            field_type: newFieldType,
            applicability: newFieldApplicability,
            is_required: newFieldRequired === 'true',
            is_active: true,
            visible_student: newFieldVisibleStudent,
            visible_admin: newFieldVisibleAdmin,
            visible_dean: true,
            display_order: newFieldDisplayOrder,
            validation_rules: {},
          }]
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(`Custom field '${newFieldKey}' created successfully!`)
        setNewFieldKey('')
        setNewFieldLabel('')
        setNewFieldType('text')
        setNewFieldApplicability('both')
        setNewFieldRequired('false')
        setNewFieldDisplayOrder(0)
        setNewFieldVisibleStudent(true)
        setNewFieldVisibleAdmin(true)
        loadData()
      } else {
        setError(data.message || 'Failed to create custom field')
      }
    } catch (e) {
      setError('Network error creating custom field.')
    }
  }

  const handleToggleFieldStatus = async (field) => {
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/settings/field/${field.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: !field.is_active }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(`Custom field '${field.label || field.field_key}' ${field.is_active ? 'deactivated' : 'activated'}.`)
        loadData()
      } else {
        setError(data.message || 'Failed to update custom field status')
      }
    } catch (e) {
      setError('Network error updating custom field status.')
    }
  }

  const handleDeleteCustomField = async (fieldId) => {
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/settings/field/${fieldId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      const data = await res.json()
      if (res.ok) {
        setMessage('Custom field deleted successfully!')
        loadData()
      } else {
        setError(data.message || 'Failed to delete custom field')
      }
    } catch (e) {
      setError('Network error deleting custom field.')
    }
  }

  const openEditModal = (field) => {
    setEditingField({
      id: field.id,
      field_key: field.field_key,
      label: field.label || '',
      field_type: field.field_type || 'text',
      applies_to: field.applies_to || field.applicability || 'all',
      is_required: Boolean(field.is_required),
      is_active: field.is_active !== false,
      visible_student: field.visible_student !== false,
      visible_admin: field.visible_admin !== false,
      display_order: field.display_order || 0,
    })
  }

  const handleUpdateCustomField = async () => {
    if (!editingField) return
    if (!editingField.label.trim()) {
      setError('Please provide a field label.')
      return
    }
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/settings/field/${editingField.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          label: editingField.label.trim(),
          field_type: editingField.field_type,
          applies_to: editingField.applies_to,
          is_required: Boolean(editingField.is_required),
          is_active: Boolean(editingField.is_active),
          visible_student: Boolean(editingField.visible_student),
          visible_admin: Boolean(editingField.visible_admin),
          display_order: Number(editingField.display_order) || 0,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(`Custom field '${editingField.label}' updated successfully!`)
        setEditingField(null)
        loadData()
      } else {
        setError(data.message || 'Failed to update custom field')
      }
    } catch (e) {
      setError('Network error updating custom field.')
    }
  }

  const deleteCustomField = async (fieldId) => {
    if (!window.confirm('Delete this custom field permanently? This cannot be undone.')) return
    await handleDeleteCustomField(fieldId)
  }

  const canManageAllStudents = authenticatedRole === 'admin' || authenticatedRole === 'super_admin'

  const handleExportStudents = async (format) => {
    setError(null)
    setMessage(null)
    setIsExporting(true)
    const token = localStorage.getItem('token')
    try {
      const params = new URLSearchParams({ format, reportType: 'student_directory' })
      if (campusFilter && campusFilter !== 'all') params.set('campus', campusFilter)
      const res = await fetch(`/api/reports/export?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || 'Failed to export students.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `dilla_students_${new Date().toISOString().slice(0, 10)}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage(`Student directory exported as ${format.toUpperCase()}.`)
    } catch (e) {
      setError('Network error while exporting students.')
    } finally {
      setIsExporting(false)
    }
  }

  const openDeleteAllStudents = async () => {
    setDeleteAllOpen(true)
    setActiveStudentCount(null)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/students/delete-all', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setActiveStudentCount(data.activeStudentCount)
      }
    } catch {
      // count is optional
    }
  }

  const handleDeleteAllStudents = async () => {
    setIsDeletingAll(true)
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/students/delete-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirm: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage(data.message || 'All students were archived.')
        setDeleteAllOpen(false)
        setActiveStudentCount(null)
        loadData()
      } else {
        setError(data.message || 'Failed to delete all students.')
      }
    } catch (e) {
      setError('Network error while deleting all students.')
    } finally {
      setIsDeletingAll(false)
    }
  }

  // Toggle account status (active <-> inactive)
  const handleToggleStatus = async (user) => {
    setError(null)
    setMessage(null)
    const currentStatus = user.status || user.userStatus || 'active'
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: user.id || user.studentId,
          status: newStatus,
        }),
      })

      const d = await res.json()
      if (res.ok) {
        setMessage(`Account '${user.name || user.fullName}' status changed to '${newStatus}'.`)
        loadData()
      } else {
        setError(d.message || 'Failed to update status')
      }
    } catch (e) {
      setError('Network error updating status.')
    }
  }

  // Execute account deletion with confirmation
  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id || deleteTarget.studentId
    const name = deleteTarget.name || deleteTarget.fullName || deleteTarget.username

    setIsDeleting(true)
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(`Account '${name}' deleted successfully.`)
        setDeleteTarget(null)
        loadData()
      } else {
        setError(data.message || 'Failed to delete account')
        setDeleteTarget(null)
      }
    } catch (e) {
      setError('Network error deleting account.')
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  // Execute password reset
  const handleExecutePasswordReset = async () => {
    if (!resetTargetUser) return
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: resetTargetUser.id || resetTargetUser.studentId,
          targetUsername: resetTargetUser.username || resetTargetUser.studentId,
          newPassword: customPassword.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(
          `Password for '${resetTargetUser.name || resetTargetUser.fullName}' reset successfully! New Password: ${data.resetPassword}`
        )
        setResetTargetUser(null)
        setCustomPassword('')
        loadData()
      } else {
        setError(data.message || 'Failed to reset password')
      }
    } catch (e) {
      setError('Network error during password reset.')
    }
  }

  // Save changes from Edit Account Modal
  const handleSaveEdit = async () => {
    if (!editingUser) return
    setError(null)
    setMessage(null)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: editingUser.id || editingUser.studentId,
          name: editingUser.name || editingUser.fullName,
          email: editingUser.email,
          campus: editingUser.campus,
          status: editingUser.status,
          role: editingUser.role,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(`Account '${editingUser.name || editingUser.fullName}' updated successfully!`)
        setEditingUser(null)
        loadData()
      } else {
        setError(data.message || 'Failed to update user account')
      }
    } catch (e) {
      setError('Network error updating user account.')
    }
  }

  // Determine permitted ActionMenu items based on role hierarchy
  const getPermittedActionMenuItems = (userRole, target) => {
    const targetRole = target.role || 'student'
    const targetStatus = target.status || target.userStatus || 'active'
    const targetCampus = target.campus || 'Main Campus'
    const myCampus = userCampus || 'Main Campus'
    
    // If we don't have user role, return all items (original behavior)
    if (!userRole) {
      return [
        {
          label: 'View Details',
          icon: 'eye',
          onClick: () => setViewingUser(target),
        },
        {
          label: 'Edit Account',
          icon: 'edit',
          onClick: () => setEditingUser(target),
        },
        {
          label: 'Reset Password',
          icon: 'key',
          onClick: () => {
            setResetTargetUser(target)
            setCustomPassword('')
          },
        },
        {
          label: targetStatus === 'active' ? 'Deactivate Account' : 'Reactivate Account',
          icon: targetStatus === 'active' ? 'x-circle' : 'check-circle',
          className: targetStatus === 'active' ? 'text-amber-700' : 'text-emerald-700',
          onClick: () => handleToggleStatus(target),
        },
        {
          label: 'Delete',
          icon: 'trash',
          className: 'text-rose-700 font-bold',
          separator: true,
          onClick: () => setDeleteTarget(target),
        },
      ]
    }

    // Role-based permission filtering
    const permitted = []

    // View: Always permitted for authenticated users
    permitted.push({
      label: 'View Details',
      icon: 'eye',
      onClick: () => setViewingUser(target),
    })

    // Edit: Permitted for Super Admin, Admin, Vice Dean, and Campus Dean (with campus scoping)
    const canEdit =
      userRole === 'admin' ||
      (userRole === 'viceDean' && targetRole !== 'admin') ||
      (userRole === 'dean' && targetRole !== 'admin' && targetCampus === myCampus)
    if (canEdit) {
      permitted.push({
        label: 'Edit Account',
        icon: 'edit',
        onClick: () => setEditingUser(target),
      })
    }

    // Reset Password permissions
    const canResetPassword =
      userRole === 'admin' ||
      (userRole === 'viceDean') ||
      (userRole === 'dean')
    if (canResetPassword) {
      permitted.push({
        label: 'Reset Password',
        icon: 'key',
        onClick: () => {
          setResetTargetUser(target)
          setCustomPassword('')
        },
      })
    }

    // Suspend/Reactivate permissions
    const canToggleStatus =
      userRole === 'admin' ||
      (userRole === 'viceDean' && targetRole !== 'admin') ||
      (userRole === 'dean' && targetRole !== 'admin' && targetCampus === myCampus &&
        targetRole !== 'admin')
    if (canToggleStatus) {
      permitted.push({
        label: targetStatus === 'active' ? 'Deactivate Account' : 'Reactivate Account',
        icon: targetStatus === 'active' ? 'x-circle' : 'check-circle',
        className: targetStatus === 'active' ? 'text-amber-700' : 'text-emerald-700',
        onClick: () => handleToggleStatus(target),
      })
    }

    // Delete permissions
    const canDelete =
      userRole === 'admin' ||
      (userRole === 'viceDean' && targetRole !== 'admin' && targetRole !== 'viceDean') ||
      (userRole === 'dean' && targetRole === 'student' && targetCampus === myCampus)
    // Never allow deletion of protected roles: Admin, Super Admin, Student, Campus Dean
    const isProtectedRole = ['admin', 'student', 'dean'].includes(targetRole)
    if (canDelete && !isProtectedRole) {
      permitted.push({
        label: 'Delete',
        icon: 'trash',
        className: 'text-rose-700 font-bold',
        separator: true,
        onClick: () => setDeleteTarget(target),
      })
    }

    return permitted
  }

  // Filtered lists
  const filteredDeans = deans.filter((d) => {
    const matchesSearch =
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.username && d.username.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCampus = campusFilter === 'all' || d.campus === campusFilter
    return matchesSearch && matchesCampus
  })

  const filteredViceDeans = viceDeans.filter((vd) => {
    const matchesSearch =
      vd.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vd.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vd.username && vd.username.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCampus = campusFilter === 'all' || vd.campus === campusFilter
    return matchesSearch && matchesCampus
  })

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      (s.fullName && s.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCampus = campusFilter === 'all' || s.campus === campusFilter
    return matchesSearch && matchesCampus
  })

  // Paginated slices
  const paginatedDeans = filteredDeans.slice((page - 1) * pageSize, page * pageSize)
  const paginatedViceDeans = filteredViceDeans.slice((page - 1) * pageSize, page * pageSize)
  const paginatedStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize)

  // Reusable pagination bar
  const renderPagination = (totalCount) => {
    const totalPages = Math.ceil(totalCount / pageSize) || 1
    if (totalCount === 0) return null

    return (
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium rounded-b-2xl">
        <div>
          Showing accounts <span className="font-bold text-slate-900">{(page - 1) * pageSize + 1}</span> to{' '}
          <span className="font-bold text-slate-900">{Math.min(page * pageSize, totalCount)}</span> of{' '}
          <span className="font-bold text-slate-900">{totalCount}</span> total
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            variant="outline"
            className="px-3 py-1.5 text-xs font-semibold cursor-pointer"
          >
            Previous
          </Button>
          <span className="px-2 font-bold text-slate-700">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            variant="outline"
            className="px-3 py-1.5 text-xs font-semibold cursor-pointer"
          >
            Next
          </Button>
        </div>
      </div>
    )
  }

  // Dynamic form fields for unified modal
  const roleFormFields = () => {
    if (!selectedRole) return null
    const roleLower = selectedRole.toLowerCase()

    if (roleLower === 'dean') {
      return (
        <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5 mb-4">
          <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
            Provision New Campus Cafe Dean Account
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
              <Input
                placeholder="Dean's Full Name (e.g. Dr. K. Omondi)"
                value={formData.name}
                onChange={handleFormChange}
                name="name"
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
              <Input
                type="email"
                placeholder="Official Email Address"
                value={formData.email}
                onChange={handleFormChange}
                name="email"
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Assigned Campus</label>
              <Select
                name="campus"
                value={formData.campus}
                onChange={handleCampusChange}
                options={campuses}
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Initial Password</label>
              <Input
                type="password"
                placeholder="Initial Password (Dean@Dilla2026!)"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                name="password"
                className="text-slate-900 h-10"
              />
            </div>
          </div>
          <Button onClick={handleAddAccount} variant="primary" className="w-full font-bold mt-2">
            + Provision Campus Cafe Dean
          </Button>
        </div>
      )
    }

    if (roleLower === 'vicedean') {
      return (
        <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5 mb-4">
          <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
            Provision New Vice Dean Account
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Vice Deans of Student Service assist with central student services. Super Admin is notified of creations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
              <Input
                placeholder="Vice Dean's Full Name"
                value={formData.name}
                onChange={handleFormChange}
                name="name"
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
              <Input
                type="email"
                placeholder="Official Email Address"
                value={formData.email}
                onChange={handleFormChange}
                name="email"
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Assigned Campus</label>
              <Select
                name="campus"
                value={formData.campus}
                onChange={handleCampusChange}
                options={campuses}
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Initial Password</label>
              <Input
                type="password"
                placeholder="Initial Password (ViceDean@Dilla2026!)"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                name="password"
                className="text-slate-900 h-10"
              />
            </div>
          </div>
          <Button onClick={handleAddAccount} variant="primary" className="w-full font-bold mt-2">
            + Provision Vice Dean
          </Button>
        </div>
      )
    }

    if (roleLower === 'student') {
      return (
        <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5 mb-4">
          <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
            Provision New Student Account
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Student ID</label>
              <Input
                placeholder="Student ID (e.g. DUC2024-001)"
                value={formData.studentId || ''}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value, name: formData.name || e.target.value })}
                name="studentId"
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
              <Input
                placeholder="Full Student Name"
                value={formData.name}
                onChange={handleFormChange}
                name="name"
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
              <Input
                type="email"
                placeholder="Student Email Address"
                value={formData.email}
                onChange={handleFormChange}
                name="email"
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Campus</label>
              <Select
                name="campus"
                value={formData.campus}
                onChange={handleCampusChange}
                options={campuses}
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Department</label>
              <Select
                name="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                options={['Computer Science', 'Business & Economics', 'Civil Engineering', 'Medicine & Health Sciences', 'Agriculture']}
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Initial Password</label>
              <Input
                type="password"
                placeholder="Password (default: Student@Dilla2026!)"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                name="password"
                className="text-slate-900 h-10"
              />
            </div>
          </div>
          <Button onClick={handleAddAccount} variant="primary" className="w-full font-bold mt-2">
            + Provision Student Account
          </Button>
        </div>
      )
    }

    if (roleLower === 'admin') {
      return (
        <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5 mb-4">
          <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
            Provision Central Admin Account
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
              <Input
                placeholder="Admin Full Name"
                value={formData.name}
                onChange={handleFormChange}
                name="name"
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
              <Input
                type="email"
                placeholder="Official Email Address"
                value={formData.email}
                onChange={handleFormChange}
                name="email"
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Campus</label>
              <Select
                name="campus"
                value={formData.campus}
                onChange={handleCampusChange}
                options={campuses}
                className="text-slate-900 h-10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Initial Password</label>
              <Input
                type="password"
                placeholder="Initial Password (Admin@Dilla2026!)"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                name="password"
                className="text-slate-900 h-10"
              />
            </div>
          </div>
          <Button onClick={handleAddAccount} variant="primary" className="w-full font-bold mt-2">
            + Provision Admin Account
          </Button>
        </div>
      )
    }

    return null
  }

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 border border-slate-200 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-dillaGreen/10 text-dillaGreen flex items-center justify-center p-2 flex-shrink-0">
            <Icon name="user-check" className="w-6 h-6 text-dillaGreen" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-dillaDarkGreen">
              User & Role Accounts Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Provision Campus Deans, Vice Deans, and Student accounts, manage credentials, and execute authorized password resets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => {
              setShowCreateForm(true)
              setSelectedRole(null)
            }}
            className="px-4 py-2 font-bold cursor-pointer"
          >
            + Create Account
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2 font-bold text-dillaGreen hover:text-dillaDarkGreen cursor-pointer"
          >
            + Import Students
          </Button>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 text-xs sm:text-sm p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4 cursor-pointer">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 text-xs sm:text-sm p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold ml-4 cursor-pointer">✕</button>
        </div>
      )}

      {/* Unified Create Account Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-lg font-bold text-dillaDarkGreen">
                {selectedRole ? `Provision ${selectedRole.toUpperCase()} Account` : 'Select Role for New Account'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setSelectedRole(null)
                }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedRole ? (
              <>
                {roleFormFields()}
                <div className="flex items-center justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRole(null)}
                    className="text-xs"
                  >
                    ← Back to Role Selection
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4 mb-6">
                <p className="text-xs text-slate-600 uppercase tracking-wider mb-2 font-bold">Select User Role</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    className="p-4 rounded-xl border border-slate-200 text-center hover:border-dillaGreen hover:bg-dillaGreen/5 transition-all cursor-pointer group"
                    onClick={() => handleRoleChange('dean')}
                  >
                    <Icon name="briefcase" className="w-6 h-6 mx-auto mb-2 text-dillaGreen group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-xs text-slate-800 block">Campus Cafe Dean</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Campus-level manager</span>
                  </button>
                  <button
                    type="button"
                    className="p-4 rounded-xl border border-slate-200 text-center hover:border-dillaGreen hover:bg-dillaGreen/5 transition-all cursor-pointer group"
                    onClick={() => handleRoleChange('vicedean')}
                  >
                    <Icon name="users" className="w-6 h-6 mx-auto mb-2 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-xs text-slate-800 block">Vice Dean</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Student service admin</span>
                  </button>
                  <button
                    type="button"
                    className="p-4 rounded-xl border border-slate-200 text-center hover:border-dillaGreen hover:bg-dillaGreen/5 transition-all cursor-pointer group"
                    onClick={() => handleRoleChange('student')}
                  >
                    <Icon name="user" className="w-6 h-6 mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-xs text-slate-800 block">Student</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Cafeteria beneficiary</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  setSelectedRole(null)
                }}
                className="flex-1 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('dean')}
          className={`pb-3 px-5 text-sm font-bold transition-all cursor-pointer border-b-2 ${
            activeTab === 'dean'
              ? 'border-dillaGreen text-dillaGreen'
              : 'border-transparent text-slate-500 hover:text-dillaDarkGreen'
          }`}
        >
          Campus Cafe Deans ({deans.length})
        </button>
        <button
          onClick={() => setActiveTab('viceDean')}
          className={`pb-3 px-5 text-sm font-bold transition-all cursor-pointer border-b-2 ${
            activeTab === 'viceDean'
              ? 'border-dillaGreen text-dillaGreen'
              : 'border-transparent text-slate-500 hover:text-dillaDarkGreen'
          }`}
        >
          Vice Deans of Student Service ({viceDeans.length})
        </button>
        <button
          onClick={() => setActiveTab('student')}
          className={`pb-3 px-5 text-sm font-bold transition-all cursor-pointer border-b-2 ${
            activeTab === 'student'
              ? 'border-dillaGreen text-dillaGreen'
              : 'border-transparent text-slate-500 hover:text-dillaDarkGreen'
          }`}
        >
          Student Accounts ({students.length})
        </button>
        {(authenticatedRole === 'admin' || authenticatedRole === 'super_admin') && (
          <button
            onClick={() => setActiveTab('customFields')}
            className={`pb-3 px-5 text-sm font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === 'customFields'
                ? 'border-dillaGreen text-dillaGreen'
                : 'border-transparent text-slate-500 hover:text-dillaDarkGreen'
            }`}
          >
            Custom Fields ({customFields.length})
          </button>
        )}
      </div>

      {/* Tab 1: Campus Cafe Deans */}
      {activeTab === 'dean' && (
        <div className="space-y-6">
          <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
              Campus Cafe Dean Account Provisioning
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
              <Input
                placeholder="Full Name (e.g. Dr. K. Omondi)"
                value={newDeanName}
                onChange={(e) => setNewDeanName(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Input
                type="email"
                placeholder="Official Email Address"
                value={newDeanEmail}
                onChange={(e) => setNewDeanEmail(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Select
                name="campus"
                options={campuses}
                value={newDeanCampus}
                onChange={(e) => setNewDeanCampus(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password (Dean@Dilla2026!)"
                value={newDeanPassword}
                onChange={(e) => setNewDeanPassword(e.target.value)}
                className="text-slate-900 h-10"
              />
            </div>
            <Button onClick={handleAddDean} variant="primary" className="font-bold cursor-pointer">
              + Create Campus Cafe Dean Account
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search deans by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Campus:</span>
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 cursor-pointer"
              >
                <option value="all">All Campuses</option>
                {campuses.map((c) => {
                  const val = typeof c === 'object' ? c.value : c
                  const lbl = typeof c === 'object' ? c.label : c
                  return <option key={val} value={val}>{lbl}</option>
                })}
              </select>
            </div>
          </div>

          {/* Deans Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
            <table className="min-w-full bg-white divide-y divide-slate-200">
              <thead className="bg-[#f1f5f3]">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Name / Username</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Campus</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {paginatedDeans.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500 font-medium">
                      No deans found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedDeans.map((dean) => (
                    <tr key={dean.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{dean.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{dean.username}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 font-medium">{dean.email}</td>
                      <td className="px-4 py-3.5 text-dillaGreen font-bold">{dean.campus}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={dean.status || 'active'} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end">
                          <ActionMenu items={getPermittedActionMenuItems(authenticatedRole, dean)} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {renderPagination(filteredDeans.length)}
          </div>
        </div>
      )}

      {/* Tab 2: Vice Deans */}
      {activeTab === 'viceDean' && (
        <div className="space-y-6">
          <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
              Provision New Vice Dean Account
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
              <Input
                placeholder="Vice Dean's Full Name"
                value={newViceDeanName}
                onChange={(e) => setNewViceDeanName(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Input
                type="email"
                placeholder="Official Email Address"
                value={newViceDeanEmail}
                onChange={(e) => setNewViceDeanEmail(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Select
                name="campus"
                options={campuses}
                value={newViceDeanCampus}
                onChange={(e) => setNewViceDeanCampus(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password (ViceDean@Dilla2026!)"
                value={newViceDeanPassword}
                onChange={(e) => setNewViceDeanPassword(e.target.value)}
                className="text-slate-900 h-10"
              />
            </div>
            <Button onClick={handleAddViceDean} variant="primary" className="font-bold cursor-pointer">
              + Create Vice Dean Account
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search vice deans by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Campus:</span>
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 cursor-pointer"
              >
                <option value="all">All Campuses</option>
                {campuses.map((c) => {
                  const val = typeof c === 'object' ? c.value : c
                  const lbl = typeof c === 'object' ? c.label : c
                  return <option key={val} value={val}>{lbl}</option>
                })}
              </select>
            </div>
          </div>

          {/* Vice Deans Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
            <table className="min-w-full bg-white divide-y divide-slate-200">
              <thead className="bg-[#f1f5f3]">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Name / Username</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Campus</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {paginatedViceDeans.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500 font-medium">
                      No vice deans found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedViceDeans.map((viceDean) => (
                    <tr key={viceDean.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{viceDean.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{viceDean.username}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 font-medium">{viceDean.email}</td>
                      <td className="px-4 py-3.5 text-dillaGreen font-bold">{viceDean.campus}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={viceDean.status || 'active'} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end">
                          <ActionMenu items={getPermittedActionMenuItems(authenticatedRole, viceDean)} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {renderPagination(filteredViceDeans.length)}
          </div>
        </div>
      )}

      {/* Tab 3: Students Accounts */}
      {activeTab === 'student' && (
        <div className="space-y-6">
          <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
              Student Account Provisioning
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <Input
                placeholder="Student ID (e.g. DUC2024-001)"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Input
                placeholder="Full Name (e.g. Samuel Bekele)"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="text-slate-900 h-10"
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                className="text-slate-900 h-10"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <Select
                name="campus"
                options={campuses}
                value={newStudentCampus}
                onChange={(e) => setNewStudentCampus(e.target.value)}
              />
              <Select
                name="dept"
                options={['Computer Science', 'Business & Economics', 'Civil Engineering', 'Medicine & Health Sciences', 'Agriculture']}
                value={newStudentDept}
                onChange={(e) => setNewStudentDept(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password (default: Student@Dilla2026!)"
                value={newStudentPassword}
                onChange={(e) => setNewStudentPassword(e.target.value)}
                className="text-slate-900 h-10"
              />
            </div>
            <Button onClick={handleAddStudent} variant="primary" className="font-bold cursor-pointer">
              + Create Student Account
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search students by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 text-slate-900"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Campus:</span>
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 cursor-pointer"
              >
                <option value="all">All Campuses</option>
                {campuses.map((c) => {
                  const val = typeof c === 'object' ? c.value : c
                  const lbl = typeof c === 'object' ? c.label : c
                  return <option key={val} value={val}>{lbl}</option>
                })}
              </select>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExportStudents('xlsx')}
                disabled={isExporting || students.length === 0}
                className="text-xs font-bold text-dillaGreen"
              >
                <Icon name="download" className="w-3.5 h-3.5 mr-1" />
                {isExporting ? 'Exporting…' : 'Export Excel'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportStudents('csv')}
                disabled={isExporting || students.length === 0}
                className="text-xs font-bold text-dillaGreen"
              >
                <Icon name="download" className="w-3.5 h-3.5 mr-1" />
                Export CSV
              </Button>
            </div>
            {canManageAllStudents && (
              <Button
                variant="outline"
                onClick={openDeleteAllStudents}
                className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Icon name="trash" className="w-3.5 h-3.5 mr-1" />
                Delete All Students
              </Button>
            )}
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
            <table className="min-w-full bg-white divide-y divide-slate-200">
              <thead className="bg-[#f1f5f3]">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Student ID</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Full Name</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Campus</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500 font-medium">
                      No students found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((st) => (
                    <tr key={st.id || st.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-dillaGreen text-xs">
                        {st.studentId}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          {st.photoUrl ? (
                            <img
                              src={st.photoUrl.startsWith('http') ? st.photoUrl : `/api/student/photo?file=${encodeURIComponent(st.photoUrl.replace(/^\/uploads\/photos\//, ''))}`}
                              alt={st.fullName}
                              className="w-6 h-8 object-cover rounded border border-slate-200 flex-shrink-0"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          ) : null}
                          {st.fullName || st.studentName}
                          {st.profileComplete === false && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                              Profile Incomplete
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 font-medium">{st.campus}</td>
                      <td className="px-4 py-3.5 text-slate-700">{st.department || '-'}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={st.userStatus || st.status || 'active'} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end">
                          <ActionMenu items={getPermittedActionMenuItems(authenticatedRole, st)} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {renderPagination(filteredStudents.length)}
          </div>
        </div>
)}
      {/* Custom Fields Tab */}
      {activeTab === 'customFields' && (
        <div className="space-y-6">
          <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
              Custom Field Management
            </h3>
            
            {/* Create Custom Field Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Field Key</label>
                <Input
                  placeholder="e.g. guardian_contact"
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  className="text-slate-900 h-10"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Label</label>
                <Input
                  placeholder="e.g. Guardian Contact"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  className="text-slate-900 h-10"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Field Type</label>
                <Select
                  name="fieldType"
                  options={['text', 'textarea', 'number', 'date', 'select', 'checkbox']}
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Applicability</label>
                <Select
                  name="applicability"
                  options={['cafe', 'non-cafe', 'both']}
                  value={newFieldApplicability}
                  onChange={(e) => setNewFieldApplicability(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Required</label>
                <Select
                  name="isRequired"
                  options={['false', 'true']}
                  value={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Display Order</label>
                <Input
                  type="number"
                  min="0"
                  value={newFieldDisplayOrder}
                  onChange={(e) => setNewFieldDisplayOrder(e.target.value)}
                  className="text-slate-900 h-10"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Visible to Students</label>
                <Select
                  name="visibleStudent"
                  options={['true', 'false']}
                  value={newFieldVisibleStudent}
                  onChange={(e) => setNewFieldVisibleStudent(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Visible to Admin</label>
                <Select
                  name="visibleAdmin"
                  options={['true', 'false']}
                  value={newFieldVisibleAdmin}
                  onChange={(e) => setNewFieldVisibleAdmin(e.target.value)}
                />
              </div>
            </div>
            
            <Button onClick={handleCreateCustomField} variant="primary" className="font-bold cursor-pointer w-full">
              + Create Custom Field
            </Button>
          </div>
          
          {/* Existing Custom Fields Table */}
          <div className="bg-[#f8faf9] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-dillaDarkGreen uppercase tracking-wider mb-3">
              Existing Custom Fields
            </h3>
            
            {customFields.length === 0 ? (
              <p className="text-slate-500 text-sm">No custom fields defined yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white divide-y divide-slate-200">
                  <thead className="bg-[#f1f5f3]">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Key</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Label</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Applicability</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3.5 text-right text-xs font-bold text-dillaDarkGreen uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-xs">
                    {customFields.map((cf) => (
                      <tr key={cf.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-slate-800">{cf.field_key}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">{cf.label}</td>
                        <td className="px-4 py-3.5 text-slate-700">{cf.field_type}</td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {cf.applies_to === 'cafe'
                            ? 'Cafe Only'
                            : cf.applies_to === 'non-cafe'
                            ? 'Non-Cafe Only'
                            : 'All Students'}
                        </td>
                        <td className="px-4 py-3.5">
                          {cf.is_active ? (
                            <span className="text-emerald-600 text-xs font-medium">Active</span>
                          ) : (
                            <span className="text-rose-600 text-xs font-medium">Inactive</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex justify-end">
                            <ActionMenu
                              items={[
                                { label: 'Edit Field', icon: 'edit', onClick: () => openEditModal(cf) },
                                {
                                  label: cf.is_active ? 'Deactivate Field' : 'Activate Field',
                                  icon: cf.is_active ? 'x-circle' : 'check-circle',
                                  variant: cf.is_active ? 'warning' : 'success',
                                  onClick: () => handleToggleFieldStatus(cf),
                                },
                                {
                                  label: 'Delete Field',
                                  icon: 'trash',
                                  variant: 'danger',
                                  separator: true,
                                  onClick: () => deleteCustomField(cf.id),
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Edit Custom Field Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-lg font-bold text-dillaDarkGreen">Edit Custom Field</h3>
              <button
                onClick={() => setEditingField(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Field Key</label>
                <Input value={editingField.field_key} disabled className="text-slate-500 h-10 bg-slate-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Label</label>
                <Input
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  className="text-slate-900 h-10"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Field Type</label>
                <Select
                  name="editFieldType"
                  options={['text', 'textarea', 'number', 'date', 'select', 'checkbox']}
                  value={editingField.field_type}
                  onChange={(e) => setEditingField({ ...editingField, field_type: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Required</label>
                  <Select
                    name="editRequired"
                    options={['false', 'true']}
                    value={String(Boolean(editingField.is_required))}
                    onChange={(e) => setEditingField({ ...editingField, is_required: e.target.value === 'true' })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                  <Select
                    name="editStatus"
                    options={['Active', 'Inactive']}
                    value={editingField.is_active ? 'Active' : 'Inactive'}
                    onChange={(e) => setEditingField({ ...editingField, is_active: e.target.value === 'Active' })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 pt-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => setEditingField(null)} className="flex-1 cursor-pointer">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdateCustomField} className="flex-1 font-bold cursor-pointer">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Authorized Password Reset Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-dillaDarkGreen mb-1">
              Authorized Password Reset
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reset login password for <strong>{resetTargetUser.name || resetTargetUser.fullName}</strong> ({resetTargetUser.username || resetTargetUser.studentId})
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Password
              </label>
              <Input
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Enter new password"
                className="text-slate-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Suggested default: <code>{resetTargetUser.role === 'dean' ? 'Dean@Dilla2026!' : resetTargetUser.role === 'viceDean' ? 'ViceDean@Dilla2026!' : 'Student@Dilla2026!'}</code>
              </p>
            </div>

            <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => setResetTargetUser(null)} className="flex-1 cursor-pointer">Cancel</Button>
              <Button variant="gold" onClick={handleExecutePasswordReset} className="flex-1 font-bold cursor-pointer">Confirm Reset</Button>
            </div>
          </div>
        </div>
      )}

      {/* View User Dossier Modal (Dean / Vice Dean) */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-dillaGreen/10 text-dillaGreen flex items-center justify-center">
                  <Icon name="user-check" className="w-4 h-4 text-dillaGreen" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dillaDarkGreen">Account Profile Dossier</h3>
                  <p className="text-[11px] text-slate-500">Official Dilla University Credentials</p>
                </div>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Full Name</span>
                <span className="font-bold text-slate-900 text-sm">{viewingUser.name || viewingUser.fullName}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Username</span>
                <span className="font-mono font-bold text-dillaGreen">{viewingUser.username || viewingUser.id}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Official Email</span>
                <span className="font-medium text-slate-800 break-all">{viewingUser.email || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Assigned Campus</span>
                <span className="font-bold text-dillaGreen">{viewingUser.campus || 'Main Campus'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">System Role</span>
                <span className="font-bold text-slate-800 capitalize">
                  {viewingUser.role === 'dean' ? 'Campus Cafe Dean' : viewingUser.role === 'viceDean' ? 'Vice Dean of Student Service' : viewingUser.role || 'User'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Account Status</span>
                <StatusBadge status={viewingUser.status || 'active'} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setViewingUser(null)}
                className="flex-1 text-xs cursor-pointer"
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const u = viewingUser
                  setViewingUser(null)
                  setEditingUser(u)
                }}
                className="flex-1 font-bold text-xs cursor-pointer"
              >
                Edit Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-dillaDarkGreen mb-4">Edit Account Information</h3>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                <Input
                  value={editingUser.name || editingUser.fullName || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value, fullName: e.target.value })}
                  className="text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                <Input
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Campus</label>
                <Select
                  name="campus"
                  options={campuses}
                  value={editingUser.campus || 'Main Campus'}
                  onChange={(e) => setEditingUser({ ...editingUser, campus: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Account Status</label>
                <select
                  value={editingUser.status || 'active'}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dillaGreen/30 cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1 cursor-pointer">Cancel</Button>
              <Button variant="primary" onClick={handleSaveEdit} className="flex-1 font-bold cursor-pointer">Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Dossier Modal */}
      <StudentDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        studentId={detailStudentId}
        initialData={detailInitialData}
      />

      {/* Student Edit Modal */}
      <StudentEditModal
        isOpen={showEditStudentModal}
        onClose={() => {
          setShowEditStudentModal(false)
          setEditStudentTarget(null)
        }}
        student={editStudentTarget}
        onStudentUpdated={() => {
          setShowEditStudentModal(false)
          setEditStudentTarget(null)
          loadData()
        }}
        userRole="admin"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        isLoading={isDeleting}
        title={`Delete ${
          deleteTarget?.role === 'dean'
            ? 'Campus Cafe Dean'
            : deleteTarget?.role === 'viceDean'
            ? 'Vice Dean'
            : 'Student'
        } Account`}
        description={
          deleteTarget
            ? `You are about to permanently delete the account for ${
                deleteTarget.name || deleteTarget.fullName
              } (${deleteTarget.username || deleteTarget.studentId}). This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Account"
        danger
      />

      {/* Delete All Students Confirmation */}
      <ConfirmModal
        isOpen={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={handleDeleteAllStudents}
        isLoading={isDeletingAll}
        title="Delete All Students"
        description={
          activeStudentCount === null
            ? 'This will archive every student record. Registrations, approvals and history are preserved and can be restored. This is restricted to the Super Admin.'
            : `This will archive all ${activeStudentCount} active student record(s) and deactivate their login accounts. Records are soft-deleted and remain recoverable; nothing is permanently destroyed.`
        }
        confirmLabel={isDeletingAll ? 'Archiving…' : 'Archive All Students'}
        danger
      />

      {/* Import Students Modal */}
      <ImportStudents
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={() => {
          setIsImportOpen(false)
          loadData()
        }}
      />
    </div>
  )
}

export default UserManagement
