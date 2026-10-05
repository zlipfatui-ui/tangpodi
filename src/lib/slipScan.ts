import { parseSlipText, type SlipFields } from './slipParser'

export interface SlipScanResult extends SlipFields {
  /** คีย์กันจดซ้ำ: ใช้ข้อมูลใน QR ของสลิปก่อน (คงที่ทุกครั้งที่สแกน) ถ้าไม่มีใช้เลขอ้างอิงจาก OCR */
  slipRef?: string
  text: string
}

export type SlipProgress = { stage: 'prepare' | 'qr' | 'download' | 'read'; percent: number }

const maxSide = 1800

async function loadCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
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

export async function scanSlip(file: Blob, onProgress: (progress: SlipProgress) => void = () => undefined): Promise<SlipScanResult> {
  onProgress({ stage: 'prepare', percent: 0 })
  const canvas = await loadCanvas(file)
  onProgress({ stage: 'qr', percent: 0 })
  const qr = await readQr(canvas).catch(() => undefined)

  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['tha', 'eng'], 1, {
    logger: (message: { status: string; progress: number }) => {
      const percent = Math.round(message.progress * 100)
      if (/loading|initializ/.test(message.status)) onProgress({ stage: 'download', percent })
      else if (message.status === 'recognizing text') onProgress({ stage: 'read', percent })
    },
  })
  try {
    const { data } = await worker.recognize(canvas)
    const fields = parseSlipText(data.text)
    return { ...fields, text: data.text, slipRef: qr ? `qr:${qr}` : fields.ref ? `ref:${fields.ref}` : undefined }
  } finally {
    await worker.terminate()
  }
}
