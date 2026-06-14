import React from 'react'
import { DateInput, Input } from '@newwork/nw-design-system'
import type { Customer360ContractCatalogs, Customer360ContractMetadataInput } from './customerContractService'
import ContractCatalogSelectField from './ContractCatalogSelectField'
import ContractDialogField from './ContractDialogField'

const METADATA_FIELDS: Array<{
  key: keyof Customer360ContractMetadataInput
  label: string
  id: string
  type?: string
}> = [
  { key: 'contractNumber', label: 'Contract number', id: 'customer-360-contract-number' },
  { key: 'effectiveDate', label: 'Effective date', id: 'customer-360-contract-effective-date', type: 'date' },
  { key: 'signedDate', label: 'Signed date', id: 'customer-360-contract-signed-date', type: 'date' },
  { key: 'expiryDate', label: 'Expiry date', id: 'customer-360-contract-expiry-date', type: 'date' },
  { key: 'renewalDate', label: 'Renewal date', id: 'customer-360-contract-renewal-date', type: 'date' },
  { key: 'terminationDate', label: 'Termination date', id: 'customer-360-contract-termination-date', type: 'date' },
  {
    key: 'reminderDeadlineDate',
    label: 'Reminder deadline',
    id: 'customer-360-contract-reminder-deadline-date',
    type: 'date'
  },
  { key: 'noticePeriodDays', label: 'Notice period days', id: 'customer-360-contract-notice-period', type: 'number' }
]

interface ContractMetadataFieldsProps {
  metadata: Customer360ContractMetadataInput
  catalogs: Customer360ContractCatalogs
  onUpdate: (key: keyof Customer360ContractMetadataInput, value: string | boolean) => void
}

const ContractMetadataFields: React.FC<ContractMetadataFieldsProps> = ({ metadata, catalogs, onUpdate }) => (
  <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2">
    <ContractCatalogSelectField
      id="customer-360-contract-type"
      label="Contract type"
      value={metadata.contractType}
      options={catalogs.contractTypes}
      onValueChange={value => onUpdate('contractType', value)}
    />
    <ContractCatalogSelectField
      id="customer-360-contract-status"
      label="Status"
      value={metadata.status}
      options={catalogs.statuses}
      onValueChange={value => onUpdate('status', value)}
    />
    {METADATA_FIELDS.map(field => (
      <ContractDialogField key={field.key} label={field.label} id={field.id}>
        {field.type === 'date' ? (
          <DateInput
            type="date"
            mode="single"
            value={(metadata[field.key] as string | undefined) ?? ''}
            onChange={value => onUpdate(field.key, typeof value === 'string' ? value : '')}
          />
        ) : (
          <Input
            id={field.id}
            type={field.type}
            value={String(metadata[field.key] ?? '')}
            onChange={event => onUpdate(field.key, event.target.value)}
          />
        )}
      </ContractDialogField>
    ))}
  </div>
)

export default ContractMetadataFields
