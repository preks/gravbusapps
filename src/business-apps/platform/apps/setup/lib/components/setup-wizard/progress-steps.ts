export const setupProgressStepIndex = {
  companySetup: 0,
  departments: 1,
  placement: 2,
  capabilities: 3,
  employees: 4,
  summary: 5
} as const

export type SetupTranslate = (key: string) => string

export const getSetupProgressItems = (t: SetupTranslate) => [
  { title: t('steps-company-setup') },
  { title: t('steps-departments') },
  { title: t('steps-your-department') },
  { title: t('steps-capabilities') },
  { title: t('steps-employees') },
  { title: t('steps-summary') }
]
