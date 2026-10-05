import { useState } from 'react'
import { AlertTriangle, ImagePlus, ScanLine } from 'lucide-react'
import { AppDialog } from './UI'
import { scanSlip, type SlipProgress, type SlipScanResult } from '../lib/slipScan'

const stageLabel: Record<SlipProgress['stage'], string> = {
  prepare: 'กำลังเตรียมรูป…',
  qr: 'กำลังอ่าน QR บนสลิป…',
  download: 'กำลังโหลดตัวอ่านภาษาไทย (ครั้งแรกใช้เน็ต ครั้งต่อไปเร็วขึ้น)…',
  read: 'กำลังอ่านตัวหนังสือบนสลิป…',
}

interface SlipScanDialogProps {
  open: boolean
  knownRefs: string[]
  onClose: () => void
  onDone: (result: SlipScanResult) => void
}

export default function SlipScanDialog({ open, knownRefs, onClose, onDone }: SlipScanDialogProps) {
  const [progress, setProgress] = useState<SlipProgress | null>(null)
  const [error, setError] = useState('')
  const [duplicate, setDuplicate] = useState<SlipScanResult | null>(null)
  const busy = progress !== null

  const close = () => { if (!busy) { setError(''); setDuplicate(null); onClose() } }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(''); setDuplicate(null); setProgress({ stage: 'prepare', percent: 0 })
    try {
      const result = await scanSlip(file, setProgress)
      if (result.slipRef && knownRefs.includes(result.slipRef)) setDuplicate(result)
      else onDone(result)
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? `อ่านสลิปไม่สำเร็จ: ${caught.message}` : 'อ่านสลิปไม่สำเร็จ ลองรูปที่ชัดขึ้น หรือจดเองได้เลย')
    } finally {
      setProgress(null)
    }
  }

  return <AppDialog open={open} title="สแกนสลิป" description="อ่านยอด วันที่ และผู้รับจากสลิป แล้วให้คุณตรวจก่อนบันทึก" onClose={close}>
    <div className="slip-scan">
      {duplicate ? <div className="slip-warning" role="alert">
        <AlertTriangle size={20} />
        <div>
          <b>สลิปนี้เคยจดไปแล้ว</b>
          <p>ระบบเจอ QR/เลขอ้างอิงเดียวกันในรายการที่บันทึกไว้ ต้องการจดซ้ำจริงไหม</p>
          <div className="slip-actions"><button className="button button--quiet" type="button" onClick={close}>ไม่จดซ้ำ</button><button className="button button--primary" type="button" onClick={() => { const result = duplicate; setDuplicate(null); onDone(result) }}>จดซ้ำอยู่ดี</button></div>
        </div>
      </div> : busy ? <div className="slip-progress" role="status" aria-live="polite">
        <ScanLine size={26} />
        <b>{stageLabel[progress.stage]}</b>
        <div className="goal-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><span style={{ width: `${progress.percent}%` }} /></div>
        <small>รูปถูกอ่านในเครื่องของคุณ ไม่ถูกส่งไปที่ไหน</small>
      </div> : <>
        <label className="slip-picker">
          <ImagePlus size={28} />
          <b>ถ่ายหรือเลือกรูปสลิป</b>
          <small>สลิปโอนเงินจากแอปธนาคาร ภาพชัดและเห็นทั้งใบจะอ่านได้แม่นที่สุด</small>
          <input type="file" accept="image/*" onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = '' }} />
        </label>
        <p className="slip-note">ระบบอ่านข้อมูลมาให้เท่านั้น ไม่ได้ตรวจว่าสลิปจริงหรือปลอม และอาจอ่านผิดได้ จึงต้องตรวจก่อนบันทึกทุกครั้ง</p>
      </>}
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  </AppDialog>
}
