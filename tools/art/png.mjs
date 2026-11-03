// Encodeur et décodeur PNG RGBA 8 bits, sans dépendance.
import { deflateSync, inflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed))
  return Buffer.concat([length, typed, crc])
}

/** Image RGBA : `data` contient 4 octets par pixel. */
export function createImage(width, height) {
  return { width, height, data: new Uint8Array(width * height * 4) }
}

export function setPixel(image, x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return
  const i = (y * image.width + x) * 4
  image.data.set([r, g, b, a], i)
}

export function getPixel(image, x, y) {
  const i = (y * image.width + x) * 4
  return [image.data[i], image.data[i + 1], image.data[i + 2], image.data[i + 3]]
}

export function encodePng({ width, height, data }) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const start = y * (width * 4 + 1)
    Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, start + 1)
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

/** Ne lit que le RGBA 8 bits non entrelacé, le seul format produit par ce pipeline. */
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('Signature PNG invalide')
  let offset = 8
  let width = 0
  let height = 0
  const idat = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('PNG non RGBA 8 bits')
    } else if (type === 'IDAT') {
      idat.push(data)
    }
    offset += 12 + length
  }
  const raw = inflateSync(Buffer.concat(idat))
  const image = createImage(width, height)
  const stride = width * 4
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x]
      const a = x >= 4 ? image.data[y * stride + x - 4] : 0
      const b = y > 0 ? image.data[(y - 1) * stride + x] : 0
      const c = x >= 4 && y > 0 ? image.data[(y - 1) * stride + x - 4] : 0
      const predictor = [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter]
      image.data[y * stride + x] = (value + predictor) & 0xff
    }
  }
  return image
}
