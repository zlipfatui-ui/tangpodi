// ค่าสาธารณะ (publishable key) ใส่ในเว็บได้ ความปลอดภัยอยู่ที่ Row Level Security ใน supabase/schema.sql
export const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? 'https://blkgiykznjnrsgxifqpf.supabase.co'
export const supabaseKey: string = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_sBLLtxVGK_mHwEuuE4fV-g_YI7Pwqvo'

/** คีย์ใน localStorage ที่ supabase-js เก็บเซสชัน ใช้เช็กว่าเคยล็อกอินไว้โดยไม่ต้องโหลดไลบรารี */
export const authStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
