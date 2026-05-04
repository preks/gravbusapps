import * as z from 'zod'
import { useMemo } from 'react'
import { useSetupTranslation } from '../useSetupTranslation'

export type ValidationSchemaType = z.infer<typeof baseValidationSchema>

export const baseValidationSchema = z.object({
  companyCode: z.string(),
  companyName: z.string(),
  companyDescription: z.string().nullable().optional(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  jobPosition: z.string(),
  userPlacementMode: z.enum(['ceo', 'existing_department', 'not_in_org']).nullable(),
  selectedDepartmentId: z.string().nullable(),
  selectedDepartmentName: z.string().nullable().optional(),
  customDepartmentName: z.string().nullable().optional(),
  departments: z.array(
    z.object({
      id: z.string(),
      name: z.string()
    })
  ),
  selectedDepartments: z.array(z.string()).optional(),
  capabilities: z
    .array(
      z.object({
        id: z.string(),
        name: z.string()
      })
    )
    .optional(),
  selectedCapabilities: z.array(z.string()).optional(),
  additionalEmployees: z
    .array(
      z.object({
        id: z.string(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        jobPosition: z.string().min(1),
        departmentId: z.string().min(1),
        capabilityIds: z.array(z.string()),
        isManager: z.boolean().optional(),
        initialPassword: z.union([z.string(), z.null()]).optional()
      })
    )
    .optional(),
  departmentCapabilities: z.record(z.string(), z.array(z.string())).optional()
})

export const useValidationSchema = () => {
  const { t } = useSetupTranslation()

  const validationSchemaWithTranslations = useMemo(() => {
    return baseValidationSchema
      .refine(
        data => {
          return data.companyCode !== '' && data.companyCode.trim() !== ''
        },
        {
          message: t('validation-company-code-required'),
          path: ['companyCode']
        }
      )
      .refine(
        data => {
          return data.companyName !== '' && data.companyName.trim() !== ''
        },
        {
          message: t('validation-company-name-required'),
          path: ['companyName']
        }
      )
      .superRefine((data, ctx) => {
        if (!data.userPlacementMode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('validation-placement-required'),
            path: ['userPlacementMode']
          })
        }

        if (
          data.userPlacementMode === 'existing_department' &&
          (!data.selectedDepartmentId || data.selectedDepartmentId === '')
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('validation-department-selection-required'),
            path: ['selectedDepartmentId']
          })
        }

        if (data.userPlacementMode === 'ceo') {
          if (!data.firstName?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('validation-first-name-required'),
              path: ['firstName']
            })
          }

          if (!data.lastName?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('validation-last-name-required'),
              path: ['lastName']
            })
          }
        }

        if (data.userPlacementMode === 'existing_department') {
          if (!data.firstName?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('validation-first-name-required'),
              path: ['firstName']
            })
          }

          if (!data.lastName?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('validation-last-name-required'),
              path: ['lastName']
            })
          }

          if (!data.jobPosition?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('validation-job-position-required'),
              path: ['jobPosition']
            })
          }
        }

        const employees = data.additionalEmployees ?? []
        const managerCountByDept = new Map<string, number>()
        for (const employee of employees) {
          if (employee.isManager && employee.departmentId) {
            managerCountByDept.set(employee.departmentId, (managerCountByDept.get(employee.departmentId) ?? 0) + 1)
          }
        }
        if ([...managerCountByDept.values()].some(count => count > 1)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('validation-additional-managers-duplicate'),
            path: ['additionalEmployees']
          })
        }
      })
  }, [t])

  return validationSchemaWithTranslations
}
