import { Switch } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type BooleanFieldProps = {
  fieldName: string
  testIdPrefix: string
  value?: boolean
  onChange?: (checked: boolean) => void
  onBlur?: () => void
  disabled?: boolean
}

export function BooleanField({ fieldName, testIdPrefix, value, onChange, onBlur, disabled }: BooleanFieldProps) {
  return (
    <Switch
      checked={value ?? false}
      onCheckedChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      data-testid={formatDataTestId(testIdPrefix, `${fieldName}Switch`)}
    />
  )
}
