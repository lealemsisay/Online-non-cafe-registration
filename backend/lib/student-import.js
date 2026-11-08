import * as XLSX from 'xlsx'

// Canonical import columns. Only `student_name` and `student_id` are mandatory.
// `admission_number` is accepted as an alias for `student_id` per the Phase 1 spec.
export const IMPORT_HEADERS = [
  'student_name',
  'student_id',
  'registrar_id',
  'gender',
  'campus',
  'department',
  'program',
  'year_of_study',
  'academic_year',
  'phone',
  'email',
  'is_non_cafeteria',
]

export const REQUIRED_COLUMNS = ['student_name', 'student_id']

const FIELD_ALIASES = {
  student_id: [
    'student_id', 'studentid', 'student_no', 'student_number', 'student_code',
    'admission_number', 'admission_no', 'admissionnumber', 'admission_id',
    'id', 'registration_number', 'reg_no', 'reg_number',
    'idno', 'id_no', 'id_number', 'idnumber',
  ],
  registrar_id: ['registrar_id', 'registrarid', 'registrar_no', 'registrar_number', 'registrar'],
  student_name: ['student_name', 'studentname', 'full_name', 'fullname', 'name', 'student_full_name'],
  gender: ['gender', 'sex'],
  campus: ['campus', 'college'],
  department: ['department', 'dept'],
  program: ['program', 'programme'],
  year_of_study: ['year_of_study', 'yearofstudy', 'study_year', 'year'],
  academic_year: ['academic_year', 'academicyear', 'academic_yr', 'ay'],
  phone: ['phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_number', 'telephone', 'contact_phone', 'contact'],
  email: ['email', 'email_address', 'e_mail', 'mail'],
  is_non_cafeteria: [
    'is_non_cafeteria', 'non_cafeteria', 'noncafeteria', 'is_non_cafe',
    'non_cafe', 'cafeteria_status', 'non_cafeteria_beneficiary', 'cost_sharing_type',
  ],
}

const ALIAS_TO_CANONICAL = (() => {
  const map = new Map()
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) map.set(alias, canonical)
  }
  return map
})()

export function normalizeHeader(value) {
  return String(value == null ? '' : value)
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function canonicalForHeader(value) {
  const key = normalizeHeader(value)
  return ALIAS_TO_CANONICAL.get(key) || key
}

function cellToString(value) {
  if (value == null) return ''
  return String(value).trim()
}

function normalizeGender(value) {
  const v = String(value == null ? '' : value).trim().toLowerCase()
  if (v === 'm' || v === 'male') return 'Male'
  if (v === 'f' || v === 'female') return 'Female'
  return String(value == null ? '' : value).trim()
}

function truthyFlag(value) {
  const v = normalizeHeader(value)
  return v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === 'non_cafeteria' || v === 'non_cafe'
}

function stripBase64Prefix(value) {
  if (typeof value !== 'string') return ''
  const comma = value.indexOf(',')
  if (value.startsWith('data:') && comma !== -1) return value.slice(comma + 1)
  return value
}

export function decodeBase64File(fileBase64) {
  return Buffer.from(stripBase64Prefix(fileBase64), 'base64')
}

export function fileExtension(fileName) {
  const name = String(fileName || '').trim()
  const dot = name.lastIndexOf('.')
  if (dot === -1) return ''
  return name.slice(dot).toLowerCase()
}

export function isSupportedUpload(fileName) {
  return ['.xlsx', '.xls', '.csv'].includes(fileExtension(fileName))
}

/**
 * Parse an uploaded .xlsx/.xls/.csv buffer into normalized records.
 * Returns { headers, records, missingColumns }.
 * Each record has `_row` (1-based spreadsheet row number) plus canonical fields.
 */
export function parseWorkbook(buffer, fileName) {
  const ext = fileExtension(fileName)
  let workbook
  if (ext === '.csv') {
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '')
    workbook = XLSX.read(text, { type: 'string', raw: false })
  } else {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { headers: [], records: [], missingColumns: [...REQUIRED_COLUMNS] }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  })

  if (!rows.length) return { headers: [], records: [], missingColumns: [...REQUIRED_COLUMNS] }

  const rawHeaders = rows[0] || []
  const headers = rawHeaders.map((h) => canonicalForHeader(h))
  const present = new Set(headers.filter(Boolean))
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !present.has(c))

  const records = []
  for (let r = 1; r < rows.length; r += 1) {
    const raw = rows[r] || []
    const hasContent = raw.some((cell) => cellToString(cell) !== '')
    if (!hasContent) continue

    const record = { _row: r + 1 }
    headers.forEach((key, index) => {
      if (!key) return
      let value = cellToString(raw[index])
      if (key === 'gender') value = normalizeGender(value)
      if (record[key] === undefined || record[key] === '') record[key] = value
    })
    records.push(record)
  }

  return { headers, records, missingColumns }
}

function toCsv(rows) {
  const escape = (value) => {
    const str = value == null ? '' : String(value)
    if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
    return str
  }
  return '\uFEFF' + rows.map((row) => row.map(escape).join(',')).join('\r\n') + '\r\n'
}

export function buildTemplate(format = 'csv') {
  const cleanFormat = String(format || 'csv').toLowerCase() === 'xlsx' ? 'xlsx' : 'csv'
  const headers = [...IMPORT_HEADERS]

  if (cleanFormat === 'xlsx') {
    const sheet = XLSX.utils.aoa_to_sheet([headers])
    sheet['!cols'] = [
      { wch: 26 }, // student_name
      { wch: 18 }, // student_id
      { wch: 18 }, // registrar_id
      { wch: 10 }, // gender
      { wch: 18 }, // campus
      { wch: 26 }, // department
      { wch: 20 }, // program
      { wch: 14 }, // year_of_study
      { wch: 16 }, // academic_year
      { wch: 16 }, // phone
      { wch: 28 }, // email
      { wch: 18 }, // is_non_cafeteria
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Students')
    return {
      buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: 'dilla_student_import_template.xlsx',
    }
  }

  return {
    buffer: Buffer.from(toCsv([headers]), 'utf8'),
    contentType: 'text/csv; charset=utf-8',
    fileName: 'dilla_student_import_template.csv',
  }
}

export function toBoolean(value) {
  return truthyFlag(value)
}

export function isProfileComplete(record) {
  return ['gender', 'campus', 'department', 'program', 'year_of_study'].every(
    (field) => cellToString(record[field]) !== ''
  )
}

export function asString(value) {
  return cellToString(value)
}