import { useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ABSENCE_TYPES } from '../queries/graphql'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface AbsenceTypePresentation {
  code: string
  label: string
  color?: string
  objectValue?: any
  parentEntryId?: string
}

export function useAbsenceTypeCatalog(accessToken?: string) {
  const client = useGraphQLClient(accessToken)
  const activeUserLocale = getCurrentActiveUserLocale()
  const [types, setTypes] = useState<Record<string, AbsenceTypePresentation>>({})
  const [typesById, setTypesById] = useState<Record<string, AbsenceTypePresentation>>({})
  const [typesByParentId, setTypesByParentId] = useState<Record<string, AbsenceTypePresentation>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client) return
    setLoading(true)
    setError(null)

    client
      .request<any>(GET_ABSENCE_TYPES, { activeUserLocale: getCurrentActiveUserLocale() })
      .then(res => {
        const rows: any[] = res?.CatalogEntry || []
        const map: Record<string, AbsenceTypePresentation> = {}
        const mapById: Record<string, AbsenceTypePresentation> = {}
        const mapByParent: Record<string, AbsenceTypePresentation> = {}
        rows.forEach(row => {
          const code = row.value as string
          const translation =
            Array.isArray(row.translations) && row.translations.length > 0 ? row.translations[0].value : code
          const rawColor = row.objectValue?.color as string | undefined
          let color: string | undefined
          if (rawColor) {
            color = rawColor.startsWith('#') ? rawColor : `#${rawColor}`
          } else {
            color = undefined
          }
          const pres: AbsenceTypePresentation = {
            code,
            label: translation || code,
            color,
            objectValue: row.objectValue,
            parentEntryId: row.parentEntryId
          }
          map[code] = pres
          // Index by multiple identifiers that may appear in datasets
          const entryId = (row?.objectValue?.entryId as string | undefined) || (row?.id as string | undefined)
          if (entryId) {
            mapById[entryId] = pres
          }
          const parentId = row?.parentEntryId as string | undefined
          if (parentId) {
            mapByParent[parentId] = pres
          }
          const altCode = row?.code as string | undefined
          if (altCode && !map[altCode]) {
            map[altCode] = pres
          }
        })
        setTypes(map)
        setTypesById(mapById)
        setTypesByParentId(mapByParent)
      })
      .catch(err => setError(err as Error))
      .finally(() => setLoading(false))
  }, [activeUserLocale, client])

  const mapType = useMemo(
    () =>
      (
        codeOrId: string
      ): {
        label?: string
        color?: string
        display?: boolean
        objectValue?: any
        parentEntryId?: string
      } => {
        if (!codeOrId) return { label: codeOrId }
        const byCode = types[codeOrId]
        if (byCode)
          return {
            label: byCode.label,
            color: byCode.color,
            display: byCode.objectValue?.display,
            objectValue: byCode.objectValue,
            parentEntryId: byCode.parentEntryId
          }
        const byId = typesById[codeOrId]
        if (byId)
          return {
            label: byId.label,
            color: byId.color,
            display: byId.objectValue?.display,
            objectValue: byId.objectValue,
            parentEntryId: byId.parentEntryId
          }
        const byParent = typesByParentId[codeOrId]
        if (byParent)
          return {
            label: byParent.label,
            color: byParent.color,
            display: byParent.objectValue?.display,
            objectValue: byParent.objectValue,
            parentEntryId: byParent.parentEntryId
          }
        return { label: codeOrId }
      },
    [types, typesById, typesByParentId]
  )

  return { types, mapType, loading, error }
}
