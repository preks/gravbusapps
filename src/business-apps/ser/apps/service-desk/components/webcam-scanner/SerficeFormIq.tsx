import React, { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Card,
  Button,
  Input,
  Textarea,
  PageLayout
} from '@newwork/nw-design-system'
import { InputRenderer } from '@/common/components/flow/flow-execution/InputRenderer'
import { InputType } from '@/common/network/flows/FlowTemplateClient'

const generateDocumentNumber = () => {
  // Format: 351000088 (fixed 351 prefix + 6 digits)
  const prefix = '351'

  // Use a cryptographically secure RNG ONLY. Fail fast if unavailable.
  const webcrypto: Crypto | undefined = (globalThis as any).crypto ?? (globalThis as any).msCrypto
  if (!webcrypto || typeof webcrypto.getRandomValues !== 'function') {
    throw new Error('Secure RNG unavailable; cannot generate document number')
  }

  const arr = new Uint32Array(1)
  webcrypto.getRandomValues(arr)
  const n = Number(arr[0] % 1_000_000)

  const suffix = String(n).padStart(6, '0')
  return `${prefix}${suffix}`
}

const serviceIqFormSchema = z.object({
  documentNumber: z.string().regex(/^351\d{6}$/, 'Document Number must be in format 351000088'),
  date: z.string().min(1, 'Date is required'),
  // Store fields: UI shows store name, payload includes storeid
  store: z.string().min(1, 'Store is required'),
  storeid: z.string().min(1, 'Store ID is required'),
  // The user ID captured on the scanner step (not editable here)
  userId: z.string().optional(),
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
  onSubmitOverride?: (data: ServiceIqFormData) => Promise<void> | void
  'data-testid'?: string
}

const getTodayAsDateInputValue = () => new Date().toISOString().slice(0, 10)

const ServiceIqForm: React.FC<ServiceIqFormProps> = ({
  userInfo,
  onSuccess,
  onCancel,
  initialData,
  onSubmitOverride,
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
    store: 'Selgros Baneasa',
    storeid: 'SL-001',
    userId: '',
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
      store: 'Selgros Baneasa',
      storeid: 'SL-001',
      userId: '',
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
      const payload = {
        ...data
      }
      if (typeof (onSubmitOverride as any) === 'function') {
        await (onSubmitOverride as (d: any) => Promise<void> | void)(payload)
        return { ok: true }
      }
      return {
        type: 'ServiceIqForm',
        ...payload,
        submittedAt: new Date().toISOString(),
        submittedBy: userInfo?.id || 'unknown'
      }
    },
    [onSubmitOverride, userInfo]
  )

  const handleSuccess = useCallback(
    (result: any) => {
      onSuccess?.(result)
      // Clear inputs after successful submit (new document number + today's date)
      form.reset(getEmptyFormValues())
    },
    [form, getEmptyFormValues, onSuccess, onSubmitOverride]
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
          data-testid={dataTestId}
          customFormLayout={true}
          customActions={
            <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4" data-testid={`${dataTestId}-actions`}>
              <Button type="button" variant="outline" onClick={onCancel} data-testid={`${dataTestId}-cancel`}>
                Cancel
              </Button>
              <Button type="submit" data-testid={`${dataTestId}-submit`}>
                Submit
              </Button>
            </div>
          }
        >
          <Card className="gba:p-6 gba:bg-white" data-testid={`${dataTestId}-form-card`}>
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

              <FormField
                control={form.control}
                name="store"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        readOnly
                        placeholder="Auto-filled store"
                        data-testid={`${dataTestId}-store-input`}
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

                <FormField
                  control={form.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <InputRenderer
                        input={{
                          type: InputType.SIGNATURE,
                          label: 'Signature',
                          placeholder: ''
                        }}
                        index={0}
                        testId={dataTestId}
                        value={field.value}
                        onChange={val => field.onChange(val || '')}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>
        </AppActionForm>
      </PageLayout>
    </div>
  )
}

export default ServiceIqForm
