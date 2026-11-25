export async function writeAudit(client, {
  action,
  performedBy,
  actorRole = null,
  targetId = null,
  targetType = null,
  entityLabel = null,
  campus = null,
  details = null,
} = {}) {
  const detailText = details == null
    ? null
    : typeof details === 'string'
      ? details
      : JSON.stringify(details)

  await client.query(
    `INSERT INTO audit_log (action, performed_by, target_id, target_type, details, actor_role, campus, entity_label)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      action,
      performedBy || 'system',
      targetId != null ? String(targetId) : null,
      targetType,
      detailText,
      actorRole,
      campus,
      entityLabel,
    ]
  )
}

export function describeAuditAction(action) {
  const map = {
    bulk_student_import: 'Imported students',
    create_student: 'Created a student',
    update_student: 'Edited student information',
    archive_student: 'Archived a student',
    bulk_archive_students: 'Deleted/archived selected students',
    delete_all_students: 'Deleted all student records',
    create_custom_field: 'Created a custom field',
    update_custom_field: 'Edited a custom field',
    delete_custom_field: 'Deleted a custom field',
    create_campus: 'Created a campus',
    update_campus: 'Updated campus information',
    create_dean: 'Created a Campus Cafe Dean account',
    create_vice_dean: 'Created a Vice Dean account',
    create_user: 'Created a user account',
    update_user: 'Updated a user account',
    suspend_user: 'Suspended a user account',
    activate_user: 'Activated a user account',
    create_academic_year: 'Created an academic year',
    update_academic_year: 'Updated an academic year',
    update_schedule: 'Changed registration settings',
    enable_late_registration: 'Enabled late registration',
    disable_late_registration: 'Disabled late registration',
    toggle_late_registration: 'Changed late registration',
    category_change: 'Changed student category',
  }
  return map[action] || String(action || '').replace(/_/g, ' ')
}
