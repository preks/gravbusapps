import { z } from 'zod'

export const PASSWORD_MIN = 8

export const baseUserFormSchema = z.object({
  active: z.boolean(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  middleName: z.string().optional(),
  nickname: z.string().optional(),
  preferredUsername: z.string().min(1),
  email: z.string().optional(),
  locale: z.string().optional(),
  employeeId: z.string().optional()
})

export const createUserFormSchema = baseUserFormSchema.extend({
  password: z.string().min(PASSWORD_MIN),
  groupIds: z.array(z.string()).optional()
})

export type UserDialogMode = 'create' | 'edit'
export type CreateFormValues = z.infer<typeof createUserFormSchema>
export type EditFormValues = z.infer<typeof baseUserFormSchema>

export const TEXT_FIELDS: ReadonlyArray<{
  name: keyof CreateFormValues
  labelKey: string
  testId: string
  inputType?: 'text' | 'email'
}> = [
  {
    name: 'givenName',
    labelKey: 'user-management-field-given-name',
    testId: 'user-management-user-dialog-given-name'
  },
  {
    name: 'familyName',
    labelKey: 'user-management-field-family-name',
    testId: 'user-management-user-dialog-family-name'
  },
  {
    name: 'middleName',
    labelKey: 'user-management-field-middle-name',
    testId: 'user-management-user-dialog-middle-name'
  },
  {
    name: 'nickname',
    labelKey: 'user-management-field-nickname',
    testId: 'user-management-user-dialog-nickname'
  },
  {
    name: 'preferredUsername',
    labelKey: 'user-management-field-preferred-username',
    testId: 'user-management-user-dialog-preferred-username'
  },
  {
    name: 'email',
    labelKey: 'user-management-field-email',
    testId: 'user-management-user-dialog-email',
    inputType: 'email'
  },
  {
    name: 'locale',
    labelKey: 'user-management-field-locale',
    testId: 'user-management-user-dialog-locale'
  },
  {
    name: 'employeeId',
    labelKey: 'user-management-field-employee-id',
    testId: 'user-management-user-dialog-employee-id'
  }
]

export const defaultCreateValues: CreateFormValues = {
  active: true,
  givenName: '',
  familyName: '',
  middleName: '',
  nickname: '',
  preferredUsername: '',
  email: '',
  locale: '',
  employeeId: '',
  password: '',
  groupIds: []
}

export const defaultEditValues: EditFormValues = {
  active: true,
  givenName: '',
  familyName: '',
  middleName: '',
  nickname: '',
  preferredUsername: '',
  email: '',
  locale: '',
  employeeId: ''
}
