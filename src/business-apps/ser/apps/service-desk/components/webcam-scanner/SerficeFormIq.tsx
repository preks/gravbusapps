import React, { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import PDFKitModule from 'pdfkit/js/pdfkit.standalone.js'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  PageLayout
} from '@newwork/nw-design-system'

const generateDocumentNumber = () => {
  // Format: 351000088 (fixed 351 prefix + 6 digits)
  const prefix = '351'

  // Prefer cryptographically strong randomness when available
  let n: number
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(1)
    globalThis.crypto.getRandomValues(arr)
    n = Number(arr[0] % 1_000_000)
  } else {
    n = Math.floor(Math.random() * 1_000_000)
  }

  const suffix = String(n).padStart(6, '0')
  return `${prefix}${suffix}`
}

const serviceIqFormSchema = z.object({
  documentNumber: z.string().regex(/^351\d{6}$/, 'Document Number must be in format 351000088'),
  date: z.string().min(1, 'Date is required'),
  client: z.string().min(1, 'Client is required'),
  address: z.string().min(1, 'Address is required'),
  difContact: z.string().optional(),
  difContactPhoneNumber: z
    .string()
    .optional()
    .refine(v => !v || /^[+()\-\s\d]+$/.test(v), 'Phone Number contains invalid characters'),
  buyer: z.string().min(1, 'Buyer is required'),
  phoneNumber: z
    .string()
    .min(1, 'Phone Number is required')
    .regex(/^[+()\-\s\d]+$/, 'Phone Number contains invalid characters'),
  // Item / repair details
  article: z.string().min(1, 'Article is required'),
  articleName: z.string().min(1, 'Article Name is required'),
  numarFactura: z
    .string()
    .min(1, 'Invoice Number is required')
    .regex(/^\d{15}$/, 'Invoice Number must contain exactly 15 numbers'),
  repairCost: z
    .string()
    .optional()
    .refine(v => !v || /^\d+(\.\d{1,2})?$/.test(v), 'Repair Cost must be a valid number'),
  typeModel: z.string().optional(),
  serialNumber: z.string().optional(),
  accesories: z.string().optional(),
  otherObservations: z.string().optional(),
  reportedIssues: z.string().min(1, 'Reported Issues is required'),
  signature: z.string().optional()
})

type ServiceIqFormData = z.infer<typeof serviceIqFormSchema>

export interface ServiceIqFormProps extends BusinessAppContextProps {
  onSuccess?: (data: ServiceIqFormData) => void
  onCancel?: () => void
  initialData?: Partial<ServiceIqFormData>
  'data-testid'?: string
}

const getTodayAsDateInputValue = () => new Date().toISOString().slice(0, 10)

const downloadServiceIqPdf = (data: ServiceIqFormData) => {
  // Ensure a global object exists for some CJS libs (safety for pdfkit browser build)
  const globalShim: any = globalThis as any
  if (typeof globalShim.global === 'undefined') {
    globalShim.global = globalShim
  }

  const PDFDocument = (PDFKitModule as any).default || (PDFKitModule as any)
  const doc = new PDFDocument({ size: 'A4', margin: 40 })

  const chunks: Uint8Array[] = []
  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
  doc.on('end', () => {
    const blob = new Blob(chunks as unknown as BlobPart[], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `serviceiq-${data.documentNumber}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 250)
  })

  doc.font('Helvetica')

  const margin = 40
  const pageWidth = doc.page.width as number
  const pageHeight = doc.page.height as number
  const contentWidth = pageWidth - margin * 2
  const gap = 12
  const padding = 8

  const labelColor = '#4b5563' // slate-ish
  const textColor = '#111827' // near-black
  const borderColor = '#d1d5db' // light gray

  const safeText = (v?: string) => String(v ?? '').trim()
  const truncate = (v: string, max = 120) => (v.length > max ? `${v.slice(0, max - 1)}…` : v)
  const formatDateDdMmYyyy = (iso?: string) => {
    const v = safeText(iso)
    // Input type="date" provides YYYY-MM-DD; we want DD/MM/YYYY in the PDF
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return v
    const [, yyyy, mm, dd] = m
    return `${dd}/${mm}/${yyyy}`
  }

  let cursorY = margin

  const ensureSpace = (needed: number) => {
    if (cursorY + needed <= pageHeight - margin) return
    doc.addPage()
    cursorY = margin
  }

  const drawField = (opts: { label: string; value?: string; x: number; w: number; multiline?: boolean }) => {
    const { label, value, x, w, multiline } = opts
    const labelH = 12
    const boxH = multiline ? 86 : 28
    const blockH = labelH + boxH + 10
    ensureSpace(blockH)

    doc.fontSize(8).fillColor(labelColor).text(label, x, cursorY)
    const boxY = cursorY + labelH

    doc.roundedRect(x, boxY, w, boxH, 6).lineWidth(1).strokeColor(borderColor).stroke()

    const v = safeText(value)
    if (multiline) {
      if (v) {
        doc
          .fontSize(10)
          .fillColor(textColor)
          .text(v, x + padding, boxY + 8, {
            width: w - padding * 2,
            height: boxH - 16
          })
      }
    } else {
      if (v) {
        doc
          .fontSize(10)
          .fillColor(textColor)
          .text(truncate(v, 80), x + padding, boxY + 8, {
            width: w - padding * 2,
            ellipsis: true,
            lineBreak: false
          })
      }
    }

    cursorY += blockH
  }

  const drawDottedRect = (x: number, y: number, w: number, h: number, r = 6) => {
    doc.save()
    doc.dash(1, { space: 2 })
    doc.roundedRect(x, y, w, h, r).lineWidth(1).strokeColor(borderColor).stroke()
    doc.restore()
  }

  const colW = (contentWidth - gap) / 2

  // Document Number + Date (separate lines)
  drawField({ label: 'Document Number *', value: data.documentNumber, x: margin, w: contentWidth })
  drawField({ label: 'Date *', value: formatDateDdMmYyyy(data.date), x: margin, w: contentWidth })

  // Customer details (matches the form grouping)
  drawField({ label: 'Client *', value: data.client, x: margin, w: colW })
  const rowYAfterClient = cursorY
  cursorY -= 50
  drawField({ label: 'Phone Number *', value: data.phoneNumber, x: margin + colW + gap, w: colW })
  cursorY = Math.max(cursorY, rowYAfterClient)

  drawField({ label: 'Address *', value: data.address, x: margin, w: contentWidth })

  drawField({ label: 'Dif. Contact', value: data.difContact, x: margin, w: colW })
  const rowYAfterDifContact = cursorY
  cursorY -= 50
  drawField({ label: 'Phone Number', value: data.difContactPhoneNumber, x: margin + colW + gap, w: colW })
  cursorY = Math.max(cursorY, rowYAfterDifContact)

  drawField({ label: 'Buyer *', value: data.buyer, x: margin, w: contentWidth })

  drawField({ label: 'Article *', value: data.article, x: margin, w: contentWidth })
  drawField({ label: 'Article Name *', value: data.articleName, x: margin, w: contentWidth })
  drawField({ label: 'Invoice Number *', value: data.numarFactura, x: margin, w: contentWidth })
  drawField({ label: 'Repair Cost', value: data.repairCost, x: margin, w: contentWidth })
  drawField({ label: 'Type/Model *', value: data.typeModel, x: margin, w: contentWidth })
  drawField({ label: 'Serial/Number *', value: data.serialNumber, x: margin, w: contentWidth })
  drawField({ label: 'Accesories', value: data.accesories, x: margin, w: contentWidth })

  drawField({ label: 'Reported Issues *', value: data.reportedIssues, x: margin, w: contentWidth, multiline: true })
  drawField({ label: 'Other Observations', value: data.otherObservations, x: margin, w: contentWidth, multiline: true })

  // Extra fields for printed handover (PDF only)
  cursorY += 8
  ensureSpace(24)
  doc.fontSize(13).fillColor(textColor).text('DOCUMENT PREDAT', margin, cursorY)
  cursorY += 20

  // 3-column structure (5 rows)
  const availableW = contentWidth - gap * 2
  // Make col 1 & 2 equal width, col 3 slightly smaller
  const col3W = Math.round(availableW * 0.26)
  const col1W = Math.round((availableW - col3W) / 2)
  const col2W = availableW - col3W - col1W

  const col1X = margin
  const col2X = margin + col1W + gap
  const col3X = margin + col1W + gap + col2W + gap

  const boxH = 34
  const rowH = boxH + 18 // box + label under + spacing

  const leftRowLabels = ['', 'Parcel Number:', 'Delivery Number:', 'Car Number:', '']

  const drawCol1Row = (y: number, labelText: string) => {
    // When label is empty, leave the whole cell blank (no box, no label)
    if (!labelText) return
    drawDottedRect(col1X, y, col1W, boxH, 2)
    doc
      .fontSize(10)
      .fillColor(textColor)
      .text(labelText, col1X, y + boxH + 6)
  }

  for (let i = 0; i < 5; i++) {
    ensureSpace(rowH + 4)
    const y = cursorY

    // Column 1: Parcel/Delivery/Car number (empty)
    drawCol1Row(y, leftRowLabels[i] || '')

    // Column 2: Signature (empty)
    drawDottedRect(col2X, y, col2W, boxH, 2)
    doc
      .fontSize(10)
      .fillColor(textColor)
      .text('Signature', col2X, y + boxH + 6)

    // Column 3: Date (empty)
    drawDottedRect(col3X, y, col3W, boxH, 2)
    doc
      .fontSize(10)
      .fillColor(textColor)
      .text('Date:', col3X, y + boxH + 6)

    cursorY += rowH
  }

  doc.end()
}

const ServiceIqForm: React.FC<ServiceIqFormProps> = ({
  userInfo,
  onSuccess,
  onCancel,
  initialData,
  'data-testid': dataTestId = 'service-iq-form'
}) => {
  const isDisabled = useCallback(
    (key: keyof ServiceIqFormData) => Boolean(initialData && (initialData as Partial<ServiceIqFormData>)[key]),
    [initialData]
  )
  const today = useMemo(() => getTodayAsDateInputValue(), [])
  const documentNumber = useMemo(
    () => initialData?.documentNumber || generateDocumentNumber(),
    [initialData?.documentNumber]
  )

  const [formData] = useState<ServiceIqFormData>({
    documentNumber,
    date: today,
    client: '',
    address: '',
    difContact: '',
    difContactPhoneNumber: '',
    buyer: '',
    phoneNumber: '',
    article: '',
    articleName: '',
    numarFactura: '',
    repairCost: '',
    typeModel: '',
    serialNumber: '',
    accesories: '',
    otherObservations: '',
    reportedIssues: '',
    signature: '',
    ...initialData
  })

  const form = useForm<ServiceIqFormData>({
    resolver: zodResolver(serviceIqFormSchema),
    defaultValues: formData,
    mode: 'onChange'
  })

  const getEmptyFormValues = useCallback(
    (): ServiceIqFormData => ({
      documentNumber: generateDocumentNumber(),
      date: getTodayAsDateInputValue(),
      client: '',
      address: '',
      difContact: '',
      difContactPhoneNumber: '',
      buyer: '',
      phoneNumber: '',
      article: '',
      articleName: '',
      numarFactura: '',
      repairCost: '',
      typeModel: '',
      serialNumber: '',
      accesories: '',
      otherObservations: '',
      reportedIssues: '',
      signature: ''
    }),
    []
  )

  const handleSubmit = useCallback(
    async (data: ServiceIqFormData) => {
      return {
        type: 'ServiceIqForm',
        ...data,
        submittedAt: new Date().toISOString(),
        submittedBy: userInfo?.id || 'unknown'
      }
    },
    [userInfo]
  )

  const handleSuccess = useCallback(
    (result: any) => {
      // Generate a PDF after successful submit
      if (typeof window !== 'undefined') {
        // Use the submitted form values to ensure the PDF matches the UI fields
        downloadServiceIqPdf(form.getValues())
      }
      onSuccess?.(result)
      // Clear inputs after successful submit (new document number + today's date)
      form.reset(getEmptyFormValues())
    },
    [form, getEmptyFormValues, onSuccess]
  )

  return (
    <div data-testid={`${dataTestId}-container`} className="gba:h-full">
      <PageLayout
        headerTitle="Service IQ Form"
        headerDescription="Fill in the details below."
        variant="ext2"
        className="gba:h-full"
      >
        <AppActionForm
          processType="create"
          onSubmit={handleSubmit}
          onSuccess={handleSuccess}
          onCancel={onCancel}
          formData={formData}
          form={form}
          submitButtonText="Submit"
          cancelButtonText="Cancel"
          data-testid={dataTestId}
        >
          <div className="gba:space-y-4" data-testid={`${dataTestId}-form-content`}>
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Number *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        readOnly
                        placeholder="Auto-generated"
                        data-testid={`${dataTestId}-document-number-input`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" data-testid={`${dataTestId}-date-input`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter client"
                        data-testid={`${dataTestId}-client-input`}
                        disabled={isDisabled('client')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Enter phone number"
                        data-testid={`${dataTestId}-phone-number-input`}
                        disabled={isDisabled('phoneNumber')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter address"
                      data-testid={`${dataTestId}-address-input`}
                      disabled={isDisabled('address')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <FormField
                control={form.control}
                name="difContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dif. Contact</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter dif. contact"
                        data-testid={`${dataTestId}-dif-contact-input`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difContactPhoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Enter phone number"
                        data-testid={`${dataTestId}-dif-phone-number-input`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="buyer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer *</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter buyer"
                      data-testid={`${dataTestId}-buyer-input`}
                      disabled={isDisabled('buyer')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="gba:pt-2 gba:space-y-4" data-testid={`${dataTestId}-item-details`}>
              <FormField
                control={form.control}
                name="article"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter article"
                        data-testid={`${dataTestId}-article-input`}
                        disabled={isDisabled('article')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="articleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article Name *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter article name"
                        data-testid={`${dataTestId}-article-name-input`}
                        disabled={isDisabled('articleName')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numarFactura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter invoice number (15 digits)"
                        data-testid={`${dataTestId}-numar-factura-input`}
                        disabled={isDisabled('numarFactura')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="repairCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repair Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Enter repair cost"
                        data-testid={`${dataTestId}-repair-cost-input`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accesories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accesories</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter accesories"
                        data-testid={`${dataTestId}-accesories-input`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reportedIssues"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reported Issues *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter reported issues"
                        data-testid={`${dataTestId}-reported-issues-input`}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="otherObservations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Observations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter other observations"
                        data-testid={`${dataTestId}-other-observations-input`}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </AppActionForm>
      </PageLayout>
    </div>
  )
}

export default ServiceIqForm
