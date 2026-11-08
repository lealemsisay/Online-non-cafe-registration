const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const isJpeg = (buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8

const isPng = (buffer) =>
  buffer.length > 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)

const isWebp = (buffer) =>
  buffer.length > 12 &&
  buffer.toString('ascii', 0, 4) === 'RIFF' &&
  buffer.toString('ascii', 8, 12) === 'WEBP'

export function detectImageFormat(buffer) {
  if (!Buffer.isBuffer(buffer)) return null
  if (isJpeg(buffer)) return 'jpg'
  if (isPng(buffer)) return 'png'
  if (isWebp(buffer)) return 'webp'
  return null
}

function jpegDimensions(buffer) {
  let offset = 2
  const length = buffer.length

  while (offset + 3 < length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = buffer[offset + 1]

    // Standalone markers without a length field
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }

    if (marker === 0x00 || marker === 0xff) {
      offset += 1
      continue
    }

    const segmentLength = buffer.readUInt16BE(offset + 2)
    if (segmentLength < 2) break

    // SOF0..SOF15, excluding DHT (C4), JPG (C8) and DAC (CC)
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      if (offset + 8 >= length) break
      const height = buffer.readUInt16BE(offset + 5)
      const width = buffer.readUInt16BE(offset + 7)
      if (width > 0 && height > 0) return { width, height }
      break
    }

    offset += 2 + segmentLength
  }

  return null
}

function pngDimensions(buffer) {
  if (buffer.length < 24) return null
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  if (!width || !height) return null
  return { width, height }
}

function webpDimensions(buffer) {
  if (buffer.length < 30) return null
  const chunkType = buffer.toString('ascii', 12, 16)
  const dataStart = 20

  if (chunkType === 'VP8X') {
    if (buffer.length < dataStart + 10) return null
    const width = 1 + buffer.readUIntLE(dataStart + 4, 3)
    const height = 1 + buffer.readUIntLE(dataStart + 7, 3)
    return width > 0 && height > 0 ? { width, height } : null
  }

  if (chunkType === 'VP8 ') {
    if (buffer.length < dataStart + 10) return null
    if (
      buffer[dataStart + 3] !== 0x9d ||
      buffer[dataStart + 4] !== 0x01 ||
      buffer[dataStart + 5] !== 0x2a
    ) {
      return null
    }
    const width = buffer.readUInt16LE(dataStart + 6) & 0x3fff
    const height = buffer.readUInt16LE(dataStart + 8) & 0x3fff
    return width > 0 && height > 0 ? { width, height } : null
  }

  if (chunkType === 'VP8L') {
    if (buffer.length < dataStart + 5) return null
    if (buffer[dataStart] !== 0x2f) return null
    const bits = buffer.readUInt32LE(dataStart + 1)
    const width = (bits & 0x3fff) + 1
    const height = ((bits >> 14) & 0x3fff) + 1
    return width > 0 && height > 0 ? { width, height } : null
  }

  return null
}

/**
 * Inspects an image buffer and returns its real format and pixel dimensions.
 * @param {Buffer} buffer
 * @returns {{ format: 'jpg'|'png'|'webp', width: number, height: number } | null}
 */
export function getImageMetadata(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null

  const format = detectImageFormat(buffer)
  if (!format) return null

  let dimensions = null
  if (format === 'jpg') dimensions = jpegDimensions(buffer)
  else if (format === 'png') dimensions = pngDimensions(buffer)
  else if (format === 'webp') dimensions = webpDimensions(buffer)

  if (!dimensions) return null
  return { format, width: dimensions.width, height: dimensions.height }
}

export default { detectImageFormat, getImageMetadata }
