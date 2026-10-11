import { amountCandidates, cleanAmountToken, parseSlipText, type SlipFields } from './slipParser'

export interface SlipScanResult extends SlipFields {
  /** คีย์กันจดซ้ำ: ใช้ข้อมูลใน QR ของสลิปก่อน (คงที่ทุกครั้งที่สแกน) ถ้าไม่มีใช้เลขอ้างอิงจาก OCR */
  slipRef?: string
  /** อ่านยอดสองรอบแล้วไม่ตรงกัน ควรให้ผู้ใช้ตรวจ */
  amountUncertain?: boolean
  text: string
}

export type SlipProgress = { stage: 'prepare' | 'qr' | 'download' | 'read'; percent: number }

const maxSide = 2200
const minWidth = 1100

async function loadCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  // ขยายรูปเล็ก (เช่นสกรีนช็อตย่อ) ให้ตัวเลขใหญ่พอที่ OCR จะอ่านแม่น
  const scale = Math.min(maxSide / Math.max(bitmap.width, bitmap.height), Math.max(1, minWidth / bitmap.width))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('เปิดรูปไม่ได้ ลองรูปอื่น')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}

async function readQr(canvas: HTMLCanvasElement): Promise<string | undefined> {
  const { default: jsQR } = await import('jsqr')
  const context = canvas.getContext('2d')!
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  return jsQR(image.data, image.width, image.height)?.data || undefined
}

/** ทำเป็นขาวดำและยืดคอนทราสต์ ช่วยให้ตัวเลขบนพื้นสีของสลิปคมขึ้น */
function enhance(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const context = canvas.getContext('2d')!
  context.drawImage(source, 0, 0)
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = image.data
  let min = 255, max = 0
  const gray = new Uint8ClampedArray(pixels.length / 4)
  for (let i = 0; i < gray.length; i++) {
    const value = 0.299 * pixels[i * 4]! + 0.587 * pixels[i * 4 + 1]! + 0.114 * pixels[i * 4 + 2]!
    gray[i] = value
    if (value < min) min = value
    if (value > max) max = value
  }
  const range = Math.max(1, max - min)
  for (let i = 0; i < gray.length; i++) {
    const stretched = ((gray[i]! - min) / range) * 255
    pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = stretched
  }
  context.putImageData(image, 0, 0)
  return canvas
}

interface OcrLine { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }

function linesOf(data: { blocks?: Array<{ paragraphs: Array<{ lines: OcrLine[] }> }> | null }): OcrLine[] {
  return (data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines))
}

const digitsOf = (value: string) => value.replace(/[^0-9]/g, '')

export async function scanSlip(file: Blob, onProgress: (progress: SlipProgress) => void = () => undefined): Promise<SlipScanResult> {
  onProgress({ stage: 'prepare', percent: 0 })
  const canvas = await loadCanvas(file)
  onProgress({ stage: 'qr', percent: 0 })
  const qr = await readQr(canvas).catch(() => undefined)
  const clean = enhance(canvas)

  const { createWorker, PSM } = await import('tesseract.js')
  const worker = await createWorker(['tha', 'eng'], 1, {
    logger: (message: { status: string; progress: number }) => {
      const percent = Math.round(message.progress * 100)
      if (/loading|initializ/.test(message.status)) onProgress({ stage: 'download', percent })
      else if (message.status === 'recognizing text') onProgress({ stage: 'read', percent: Math.min(95, percent) })
    },
  })
  try {
    const { data } = await worker.recognize(clean, {}, { text: true, blocks: true })
    const fields = parseSlipText(data.text)
    const verified = await verifyAmount(worker, PSM.SINGLE_LINE, clean, data.text, linesOf(data as never))
    const amount = verified?.amount ?? fields.amount
    return {
      ...fields,
      amount,
      amountUncertain: verified ? verified.uncertain : fields.amount !== undefined,
      text: data.text,
      slipRef: qr ? `qr:${qr}` : fields.ref ? `ref:${fields.ref}` : undefined,
    }
  } finally {
    await worker.terminate()
  }
}

/**
 * อ่านยอดเงินซ้ำแบบตัวเลขล้วน: ครอปเฉพาะบรรทัดที่มียอด แล้วให้ OCR อ่านได้แค่ 0-9 , .
 * ถ้าสองรอบตรงกันถือว่ามั่นใจ ถ้าไม่ตรงให้เชื่อรอบตัวเลขล้วนแต่เตือนผู้ใช้
 */
async function verifyAmount(
  worker: { setParameters: (params: Record<string, string>) => Promise<unknown>; recognize: (image: HTMLCanvasElement, options?: object) => Promise<{ data: { text: string } }> },
  singleLine: string,
  canvas: HTMLCanvasElement,
  text: string,
  lines: OcrLine[],
): Promise<{ amount: number; uncertain: boolean } | undefined> {
  const best = amountCandidates(text.replace(/ํา/g, 'ำ'))[0]
  if (!best || best.score < 3) return undefined
  const target = digitsOf(String(best.raw).replace(/[OolIS|B]/g, '0'))
  const line = lines.find((item) => digitsOf(item.text).includes(target.slice(0, Math.max(2, target.length - 2))))
  if (!line) return { amount: best.value, uncertain: true }
  const pad = Math.round((line.bbox.y1 - line.bbox.y0) * 0.4)
  const rectangle = {
    left: Math.max(0, line.bbox.x0 - pad), top: Math.max(0, line.bbox.y0 - pad),
    width: Math.min(canvas.width, line.bbox.x1 + pad) - Math.max(0, line.bbox.x0 - pad),
    height: Math.min(canvas.height, line.bbox.y1 + pad) - Math.max(0, line.bbox.y0 - pad),
  }
  await worker.setParameters({ tessedit_char_whitelist: '0123456789.,', tessedit_pageseg_mode: singleLine })
  const { data } = await worker.recognize(canvas, { rectangle })
  const reread = (data.text.match(/\d[\d,]*(?:\.\d{1,2})?/g) ?? [])
    .map((token) => cleanAmountToken(token))
    .filter((value): value is number => value !== undefined)
  if (reread.includes(best.value)) return { amount: best.value, uncertain: false }
  const decimal = reread.find((value) => Math.abs(value - Math.round(value * 100) / 100) < 1e-9 && /\.\d{2}/.test(data.text))
  return { amount: decimal ?? best.value, uncertain: true }
}
