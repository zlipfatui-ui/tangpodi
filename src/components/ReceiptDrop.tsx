import { useEffect, useState } from 'react'
import { formatMoney } from '../lib/presentation'
import type { MoneyTransaction } from '../lib/finance'

export interface ReceiptData { id: string; items: MoneyTransaction[]; newId: string }

const showMs = 4200
const leaveMs = 380

/** ใบเสร็จยอดจ่ายวันนี้ สไลด์ลงจากด้านบนหลังจดรายจ่าย แตะเพื่อปิด */
export function ReceiptDrop({ receipt, onDone }: { receipt: ReceiptData; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), showMs)
    return () => window.clearTimeout(leave)
  }, [])
  useEffect(() => {
    if (!leaving) return
    const done = window.setTimeout(onDone, leaveMs)
    return () => window.clearTimeout(done)
  }, [leaving, onDone])
  const total = receipt.items.reduce((sum, item) => sum + item.amount, 0)
  const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  return <div className="receipt-region" aria-live="polite">
    <button type="button" className={`receipt${leaving ? ' receipt--leave' : ''}`} aria-label={`ยอดจ่ายวันนี้รวม ${formatMoney(total)} แตะเพื่อปิด`} onClick={() => setLeaving(true)}>
      <span className="receipt-head"><b>ใบเสร็จวันนี้</b><small>{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} · {time}</small></span>
      <span className="receipt-items">{receipt.items.map((item) => <span key={item.id} className={item.id === receipt.newId ? 'receipt-item receipt-item--new' : 'receipt-item'}><span>{item.note || item.category}</span><span>{formatMoney(item.amount)}</span></span>)}</span>
      <span className="receipt-total"><span>ยอดรวม</span><b>{formatMoney(total)}</b></span>
      <span className="receipt-foot">ขอบคุณที่จดนะ ✿</span>
    </button>
  </div>
}
