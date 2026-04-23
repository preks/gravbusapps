import { formatDataTestId } from './formatDataTestId'

const DATA_TEST_ID_PREFIX = 'FormFieldErrorMessage'

interface Props {
  readonly message: string
  readonly prefixDataTestId?: string
  readonly extraClasses?: string
}

export function FormFieldErrorMessage({ prefixDataTestId, message, extraClasses }: Props) {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  return (
    <span className={`gba:text-xs gba:text-red-500 ${extraClasses ?? ''}`} data-testid={formatDataTestId(dataTestId, 'Message')}>
      {message}
    </span>
  )
}
