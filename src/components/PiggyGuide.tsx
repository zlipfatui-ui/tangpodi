import { useState } from 'react'
import { ChevronLeft, ChevronRight, PiggyBank } from 'lucide-react'
import { AppDialog } from './UI'
import piggyBankMascot from '../assets/piggy-bank.webp'

const guideSteps = [
  {
    title: 'จดเงินเข้าออกให้ครบ',
    description: 'เริ่มจากปุ่ม “เพิ่มรายจ่าย” หรือ “รับเงิน” ที่หน้าภาพรวม ยอดสรุปจะคำนวณให้เองทุกครั้งที่บันทึก',
    location: 'ภาพรวม · รายการ',
  },
  {
    title: 'ตั้งรายรับและงบต่อเดือน',
    description: 'ใส่รายรับที่คาดไว้กับวงเงินตั้งต้นในหน้าตั้งค่า หมูจะช่วยคำนวณว่ายังใช้ได้อีกเท่าไร',
    location: 'ตั้งค่า',
  },
  {
    title: 'สร้างกระปุกเป้าหมาย',
    description: 'กำหนดว่าอยากเก็บเท่าไร แล้วเติมหรือถอนเงินจากกระปุกได้เมื่อมีความคืบหน้า',
    location: 'กระปุก',
  },
  {
    title: 'จดบิลและวันครบกำหนด',
    description: 'เพิ่มบิลในปฏิทิน แล้วเปิดเครื่องมือคำนวณค่าน้ำหรือค่าไฟได้เวลาต้องการ',
    location: 'ปฏิทิน · เครื่องมือ',
  },
]

interface PiggyGuideProps {
  onClose: () => void
  onStartExpense: () => void
}

export function PiggyGuide({ onClose, onStartExpense }: PiggyGuideProps) {
  const [step, setStep] = useState(0)
  const current = guideSteps[step]
  const lastStep = step === guideSteps.length - 1

  return <AppDialog open title="เริ่มต้นใช้งาน" description="หมูออมเงินพาเริ่มทีละขั้น" wide className="app-dialog--piggy-guide" onClose={onClose}>
    <div className="pig-guide-content">
      <div className="pig-guide-main">
        <div className="pig-guide-mascot"><img src={piggyBankMascot} width="512" height="468" alt="หมูออมเงิน" decoding="async" /></div>
        <div className="pig-guide-copy" aria-live="polite">
          <span className="pig-guide-step">ขั้นที่ {step + 1} จาก {guideSteps.length}</span>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
          <span className="pig-guide-location"><PiggyBank size={14} /> หน้าที่เกี่ยวข้อง: {current.location}</span>
        </div>
      </div>
      <div className="pig-guide-progress" role="progressbar" aria-label="ความคืบหน้าคู่มือ" aria-valuemin={1} aria-valuemax={guideSteps.length} aria-valuenow={step + 1}>
        {guideSteps.map((guideStep, index) => <span key={guideStep.title} className={index <= step ? 'pig-guide-progress__dot pig-guide-progress__dot--active' : 'pig-guide-progress__dot'} />)}
      </div>
      <div className="pig-guide-actions">
        <button className="text-button" type="button" onClick={onClose}>ข้ามคู่มือ</button>
        <div>
          {step > 0 && <button className="button button--quiet" type="button" onClick={() => setStep((currentStep) => currentStep - 1)}><ChevronLeft size={16} /> ย้อนกลับ</button>}
          {!lastStep
            ? <button className="button button--primary" type="button" onClick={() => setStep((currentStep) => currentStep + 1)}>ถัดไป <ChevronRight size={16} /></button>
            : <button className="button button--primary" type="button" onClick={onStartExpense}>เพิ่มรายการแรก</button>}
        </div>
      </div>
    </div>
  </AppDialog>
}
