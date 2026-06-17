import { Input, Label, Textarea } from '@newwork/nw-design-system'

type TranslateFn = (key: string) => string
const FIELD_LABEL_CLASS = 'gba:text-sm gba:font-medium'

interface TransactionDetailsFieldsProps {
  description: string
  effectiveDate: string
  inflightCommitDate: string
  inflightExpiryDate: string
  reference: string
  scheduledFor: string
  setDescription: (value: string) => void
  setEffectiveDate: (value: string) => void
  setInflightCommitDate: (value: string) => void
  setInflightExpiryDate: (value: string) => void
  setReference: (value: string) => void
  setScheduledFor: (value: string) => void
  t: TranslateFn
}

export function TransactionDetailsFields(props: Readonly<TransactionDetailsFieldsProps>) {
  return (
    <>
      <DateGrid {...props} />
      <div className="gba:flex gba:flex-col gba:gap-2">
        <Label className={FIELD_LABEL_CLASS} htmlFor="txn-reference">
          {props.t('ledger-admin-field-reference')}
        </Label>
        <Input
          id="txn-reference"
          value={props.reference}
          onChange={event => props.setReference(event.target.value)}
          data-testid="ledger-field-reference"
        />
      </div>
      <div className="gba:flex gba:flex-col gba:gap-2">
        <Label className={FIELD_LABEL_CLASS} htmlFor="txn-description">
          {props.t('ledger-admin-field-description')}
        </Label>
        <Textarea
          id="txn-description"
          value={props.description}
          onChange={event => props.setDescription(event.target.value)}
          data-testid="ledger-field-description"
        />
      </div>
    </>
  )
}

function DateGrid(props: Readonly<TransactionDetailsFieldsProps>) {
  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2">
      <DateField
        id="txn-scheduled-for"
        label={props.t('ledger-admin-field-scheduled-for')}
        value={props.scheduledFor}
        onChange={props.setScheduledFor}
        testId="ledger-field-scheduled-for"
      />
      <DateField
        id="txn-effective-date"
        label={props.t('ledger-admin-field-effective-date')}
        value={props.effectiveDate}
        onChange={props.setEffectiveDate}
        testId="ledger-field-effective-date"
      />
      <DateField
        id="txn-inflight-expiry-date"
        label={props.t('ledger-admin-field-inflight-expiry-date')}
        value={props.inflightExpiryDate}
        onChange={props.setInflightExpiryDate}
        testId="ledger-field-inflight-expiry-date"
      />
      <DateField
        id="txn-inflight-commit-date"
        label={props.t('ledger-admin-field-inflight-commit-date')}
        value={props.inflightCommitDate}
        onChange={props.setInflightCommitDate}
        testId="ledger-field-inflight-commit-date"
      />
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  onChange: (value: string) => void
  testId: string
  value: string
}

function DateField({ id, label, onChange, testId, value }: Readonly<FieldProps>) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <Label className={FIELD_LABEL_CLASS} htmlFor={id}>
        {label}
      </Label>
      <Input
        id={id}
        type="datetime-local"
        value={value}
        onChange={event => onChange(event.target.value)}
        data-testid={testId}
      />
    </div>
  )
}
