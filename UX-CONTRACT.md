# UX Contract

## Product context

- **Audience:** One person organizing personal finances in Thai.
- **Primary jobs:** Plan a daily/weekly/monthly allowance, record income and expenses, prepare for bills and debt, and track savings goals.
- **Target market:** Thailand; baht and Thai-language money habits are explicit in the brief.
- **Active locale:** `th-TH`.
- **Language/content register:** Friendly, plain Thai. Buttons name the action and confirmation uses past tense of the same action.
- **Icon policy:** Never use emoji or Unicode pictographs as interface icons; use accessible Lucide SVGs with theme-aware strokes.
- **Timezone/calendar policy:** Local device timezone for “today”; store date-only fields as `YYYY-MM-DD` without UTC conversion. Display Thai Buddhist-calendar dates.
- **Accessibility target:** WCAG 2.2 AA baseline.
- **Text selection:** Prevent accidental drag-selection on app copy and UI controls. Keep editable input and textarea values selectable for correction; number fields hide browser spinner arrows while remaining keyboard-editable.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Requested product behavior | Current user brief | Product brief | 2026-09-23 |
| Thai weekday colors | Mahidol Museum, “Color Palettes”; Parliament Library article “ความหมายของสีตามประเพณีไทย” | Cultural reference, informational only | 2026-09-23 |
| Money formulas | `src/lib/finance.ts` and unit tests | Product-owned calculation contract | 2026-09-23 |
| Local data lifecycle | `src/lib/database.ts` and `src/lib/backup.ts` | Product-owned storage contract | 2026-09-23 |

This app records estimates and user-entered data. It does not connect to a bank, issue financial advice, or execute payments.

## Visual contract

- **Project `DESIGN.md`:** Root `DESIGN.md`.
- **Token ownership:** `src/index.css` is canonical; `DESIGN.md` records the accepted values and role mapping.
- **Runtime tokens:** Semantic CSS custom properties in `src/index.css`.
- **Supported themes:** Light and dark. The user can switch from the global header or Settings; selection is saved with local settings and exported backups. A local theme cache colors the first paint before IndexedDB loads. Lucide SVG icons use `currentColor` and follow the active theme.
- **Motion:** Every control has brief hover, focus, and press feedback. On initial app entry, two diagonal panels reveal the app once local data is ready; the shell remains inert and the panels carry no logo or text, and the reveal is skipped for reduced-motion preference. A first-time or freshly reset dataset opens the pig guide after the reveal; dismissing it is remembered locally until a new dataset starts. Route changes keep the outgoing page present while it slides away and the incoming page slides in over the shell gradient; mobile tabs share one sliding selection rectangle. Period changes, overlays, and progress indicators animate smoothly. Reduced-motion preference removes route movement and shortens other effects to effectively instant changes.
- **Daily reminder:** The overview pairs the pig mascot with one gentle, actionable prompt. Unpaid items due today or overdue take priority, followed by today’s calendar events and near-term due items; otherwise, acknowledge entries already logged today or vary the prompt by weekday. Reminder actions open the relevant page or start a new expense entry. Prompts are in-app only and do not claim to know whether an off-app task was completed.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native `<select>` with visible label | This contract | Native | Keyboard and selected value |
| Date | Native date input storing ISO date-only strings | This contract | Native | Keyboard and timezone case |
| Form | Shared `FormField` and `AppDialog` patterns | This contract | Create / edit | Validation and focus |
| Scrollbar | Global app stylesheet | `DESIGN.md` | Default page scroll | Contrast and keyboard scroll |
| Toast | Shared live-region toast provider | This contract | Success / info / error | Screen-reader announcement |
| CRUD | Shared dialog submit and list update flow | This contract | Create / edit / delete | Full flow and failure state |
| Theme | Root `data-theme` attribute and semantic CSS tokens | This contract | Light / dark | Toggle, reload, backup round-trip, reduced motion |

## Component behavior

- Forms use `noValidate`, inline field messages, focus the first invalid field, prevent duplicate submit, and preserve input on storage failure.
- Delete actions name the record and require an app-owned confirmation dialog. Routine successful create/edit returns to the owning list and shows a localized toast.
- Toasts use a single `aria-live="polite"` region; field errors remain inline.
- Empty lists explain the next useful action. Database failure shows a persistent recoverable message and does not claim a save succeeded.

## Navigation and responsive behavior

- Main destinations: ภาพรวม, รายการ, ปฏิทิน, กระปุก, เครื่องมือ, ตั้งค่า.
- Desktop uses a labeled side navigation; mobile uses labeled bottom navigation and the device safe-area inset.
- The bottom navigation selection rectangle aligns with the active tab and slides between the five main destinations; Settings hides the rectangle. Route motion must not create a horizontal scrollbar or change the fixed navigation's vertical position.
- Navigation state is encoded in the hash so browser back and direct links work.
- Dates remain ISO date-only strings in the database; local timezone is used only to choose the current date.

## Dataset and forms

- Transaction lists are bounded by the selected month and have a date/category filter plus a clear button.
- Ledger uses semantic list items on mobile and does not require a table selection model.
- Native date fields and selects are deliberate platform-owned controls.
- The default palette is blush, white, mint, and turquoise. Dark mode switches page surfaces and text to charcoal and white while keeping mint as the available-money accent.
- Money input accepts nonnegative baht values; amounts are stored as positive numbers and transaction kind determines direction.
- Deleting a linked bill, debt, or goal uses a confirmation and removes its linked activity consistently.

## Async and resilience

- IndexedDB is the sole durable store for finance data in v1; localStorage caches only the selected theme for the first paint. Saving is pessimistic and the UI changes only after the transaction commits.
- Every state mutation writes the full validated local snapshot atomically to one IndexedDB key.
- App files are cached by a service worker; data remains local and is not synchronized between devices.
- JSON import is validated before an explicit confirmation. Import replaces the current dataset in one write; malformed or unsupported files leave current data untouched.
- A one-time “ข้อมูลตัวอย่าง” mode is clearly labeled and can be cleared to start a blank local account.
- Offer JSON export and import in Settings. Request persistent browser storage when supported, while reminding the user that backup protects data across browser cleanup.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery |
|---|---|---|---|---|---|
| Create/edit transaction | Save dialog | Disable save and show busy label | รายการ | “บันทึกรายการแล้ว” | Keep form open and preserve values |
| Delete record | Confirm dialog | Keep dialog open until write resolves | Owning list | “ลบรายการแล้ว” | Keep dialog open and show error |
| Pay bill/debt | Record payment | Disable payment action | ปฏิทิน or debt list | “บันทึกการชำระแล้ว” | Preserve amount and due state |
| Save goal movement | Save dialog | Disable save and show busy label | กระปุก | “อัปเดตกระปุกแล้ว” | Keep form open and preserve values |
| Import backup | Choose file, preview, confirm | Show validation and write state | ภาพรวม | “กู้คืนข้อมูลแล้ว” | Keep existing data and explain error |
| Export backup | Export action | Brief preparation state | Settings | “ดาวน์โหลดไฟล์สำรองแล้ว” | Explain browser download issue |

## Calculation behavior

- Budget periods use calendar dates. Weeks use the selected start day and clip allowance/spending to the anchor date's month.
- Historical baseline is last month's unlinked expense total. If there is no expense history, use the user-set fallback and label the estimate incomplete.
- Required monthly income is baseline + scheduled bill/debt commitments + planned goal contributions. Linked payments count once; savings transfers are not expenses.
- Spend allowance is the lesser of historical/fallback variable spending and expected income remaining after current commitments and savings. Allocate allowance by active days in the selected period divided by calendar days in the month; negative remaining allowance remains visible.
- Utility totals are estimates from user-provided rates. They do not claim to reproduce taxes, tiering, meter fees, or a utility-provider invoice.
- Weekday-color content is cultural information. Show today's weekday color and the user's birth-weekday color from the same referenced table and label both as beliefs, not predictions.
