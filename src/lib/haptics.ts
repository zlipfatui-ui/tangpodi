/** สั่นเบา ๆ เป็นสัมผัสตอบรับ (Android/เบราว์เซอร์ที่รองรับ) ไม่ทำอะไรถ้าไม่รองรับหรือผู้ใช้ลดการเคลื่อนไหว */
export function tap(duration = 9): void {
  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    navigator.vibrate?.(duration)
  } catch { /* ไม่รองรับก็ข้ามไป */ }
}
