import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_ADDITIONAL_PROPS } from './AdditionalPropertiesQueries'

export interface EmployeeHeaderInfo {
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
  jobTitle?: string
}

interface AdditionalPropertiesContextValue {
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  employeeId?: string
  existingProps: string[]
  existingPropsMap: Record<string, string>
  employeeVersion?: number
  employeeHeaderInfo?: EmployeeHeaderInfo
}

const AdditionalPropertiesContext = createContext<AdditionalPropertiesContextValue | undefined>(undefined)

interface ProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const AdditionalPropertiesProvider: React.FC<ProviderProps> = ({
  children,
  accessToken,
  additionalData,
  userInfo
}) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [existingProps, setExistingProps] = useState<string[]>([])
  const [existingPropsMap, setExistingPropsMap] = useState<Record<string, string>>({})
  const [employeeVersion, setEmployeeVersion] = useState<number | undefined>(undefined)
  const [employeeHeaderInfo, setEmployeeHeaderInfo] = useState<EmployeeHeaderInfo | undefined>(undefined)

  const employeeId: string | undefined = useMemo(() => {
    return (
      additionalData?.employeeId ||
      additionalData?.psi_taskPayload?.employeeId ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      userInfo?.employeeDetails?.employeeId
    )
  }, [additionalData, userInfo])

  const fetchData = useCallback(async () => {
    if (!accessToken || !employeeId) {
      setIsLoading(false)
      setError(!employeeId ? 'Missing employeeId' : 'Missing accessToken')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      // Fetch additional properties as well
      const propsRes = await graphqlClient.request<any>(GET_EMPLOYEE_ADDITIONAL_PROPS, { id: employeeId })
      const node = propsRes?.Employee?.[0]
      // The properties can exist under two shapes; prefer the nested employee.additionalProperties
      const rawProps = node?.employeePosition?.employee?.additionalProperties ?? node?.additionalProperties ?? null
      const nodeVersion: number | undefined = typeof node?.version === 'number' ? (node.version as number) : undefined
      setEmployeeVersion(nodeVersion)

      // Extract employee header info for FormHeader
      setEmployeeHeaderInfo({
        firstName: node?.firstName,
        lastName: node?.lastName,
        pictureThumbnail: node?.pictureThumbnail,
        jobTitle: node?.employeePosition?.jobPosition?.name
      })

      const normalizeProps = (raw: any): string[] => {
        if (!raw) return []
        // If already an array of strings
        if (Array.isArray(raw)) {
          return raw
            .map((v: any) => {
              if (typeof v === 'string') return v
              if (v && typeof v === 'object') {
                if (typeof v.name === 'string') return v.name
                if (typeof v.label === 'string') return v.label
                // fallback to key:value compact form
                const keys = Object.keys(v)
                const first = keys[0]
                return first ? `${first}:${String(v[first])}` : JSON.stringify(v)
              }
              return String(v)
            })
            .filter((s: string) => s && s.trim().length > 0)
        }
        // If it's an object map, return "key:value" chips
        if (typeof raw === 'object') {
          return Object.entries(raw)
            .map(([k, v]) => {
              if (v === null || v === undefined || v === '') return ''
              if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return `${k}:${v}`
              if (Array.isArray(v))
                return `${k}:[${v.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(', ')}]`
              if (typeof v === 'object') {
                if ('name' in (v as any) && typeof (v as any).name === 'string') return `${k}:${(v as any).name}`
                return `${k}:{...}`
              }
              return `${k}:${String(v)}`
            })
            .filter(Boolean) as string[]
        }
        // Primitive
        return [String(raw)]
      }

      const toPropsMap = (raw: any): Record<string, string> => {
        const map: Record<string, string> = {}
        if (!raw) return map
        if (Array.isArray(raw)) {
          // If an array, try to infer objects with name/value; otherwise skip
          raw.forEach((item: any) => {
            if (item && typeof item === 'object') {
              const name = (item.name ?? Object.keys(item)[0]) as string | undefined
              const value =
                typeof item.value === 'string'
                  ? item.value
                  : name && item[name] !== undefined
                    ? String(item[name])
                    : undefined
              if (name && value !== undefined) {
                map[name] = value
              }
            }
          })
          return map
        }
        if (typeof raw === 'object') {
          Object.entries(raw).forEach(([k, v]) => {
            if (v === null || v === undefined) return
            if (typeof v === 'string') map[k] = v
            else if (typeof v === 'number' || typeof v === 'boolean') map[k] = String(v)
            else map[k] = '[object]'
          })
          return map
        }
        return map
      }

      setExistingProps(normalizeProps(rawProps))
      setExistingPropsMap(toPropsMap(rawProps))
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, employeeId, graphqlClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const value: AdditionalPropertiesContextValue = {
    isLoading,
    error,
    refetch: fetchData,
    employeeId,
    existingProps,
    existingPropsMap,
    employeeVersion,
    employeeHeaderInfo
  }

  return <AdditionalPropertiesContext.Provider value={value}>{children}</AdditionalPropertiesContext.Provider>
}

export const useAdditionalProperties = () => {
  const ctx = useContext(AdditionalPropertiesContext)
  if (!ctx) throw new Error('useAdditionalProperties must be used within AdditionalPropertiesProvider')
  return ctx
}

export default AdditionalPropertiesContext
