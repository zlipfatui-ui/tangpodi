/** ประมาณการภาษีเงินได้บุคคลธรรมดาไทย (เงินได้ประเภทเงินเดือน/ค่าจ้าง ม.40(1)) เป็นค่าประมาณเท่านั้น */

export const TAX_BRACKETS: Array<{ upTo: number; rate: number }> = [
  { upTo: 150_000, rate: 0 },
  { upTo: 300_000, rate: 0.05 },
  { upTo: 500_000, rate: 0.1 },
  { upTo: 750_000, rate: 0.15 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: 2_000_000, rate: 0.25 },
  { upTo: 5_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
]

export interface TaxInput {
  income: number
  spouse: boolean
  children: number
  parents: number
  socialSecurity: number
  lifeInsurance: number
  funds: number
  withheld: number
}

export interface TaxResult {
  expenseDeduction: number
  allowances: number
  netIncome: number
  tax: number
  marginalRate: number
  /** บวก = ต้องจ่ายเพิ่ม ลบ = ได้คืน */
  balance: number
}

export function calculateTax(input: TaxInput): TaxResult {
  const income = Math.max(0, input.income)
  const expenseDeduction = Math.min(income * 0.5, 100_000)
  const allowances = 60_000
    + (input.spouse ? 60_000 : 0)
    + Math.max(0, Math.floor(input.children)) * 30_000
    + Math.min(4, Math.max(0, Math.floor(input.parents))) * 30_000
    + Math.min(Math.max(0, input.socialSecurity), 9_000)
    + Math.min(Math.max(0, input.lifeInsurance), 100_000)
    + Math.min(Math.max(0, input.funds), income * 0.15, 500_000)
  const netIncome = Math.max(0, income - expenseDeduction - allowances)
  let tax = 0
  let lower = 0
  let marginalRate = 0
  for (const bracket of TAX_BRACKETS) {
    if (netIncome <= lower) break
    tax += (Math.min(netIncome, bracket.upTo) - lower) * bracket.rate
    marginalRate = bracket.rate
    lower = bracket.upTo
  }
  tax = Math.round(tax)
  return { expenseDeduction, allowances, netIncome, tax, marginalRate, balance: tax - Math.max(0, input.withheld) }
}
