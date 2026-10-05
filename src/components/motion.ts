import { createContext } from 'react'

/** ให้ป๊อปอัปที่ถูกถอดออกจากหน้าจอ (เช่น FinanceDialog) เล่นแอนิเมชันปิดก่อนหายไป */
export const DialogClosingContext = createContext(false)
export const dialogExitMs = 190
export const toastMs = (toast: { action?: unknown }) => toast.action ? 6500 : 3400
