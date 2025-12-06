import { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'

// Interface for tile field definition from catalog
export interface TileField {
  key: string
  label: string
  displayOrder: number
  icon: string // Phosphor icon name
}

// Interface for tile fields definition in objectValue
export interface TileFieldsDefinition {
  tileFields?: TileField[]
}

// Interface for processed tile data
export interface ProcessedTile extends TileField {
  value: string // Content from investment.additionalProperties.tiles[key]
}

// Hook to get tile fields definition from investment group catalog
export const useInvestmentTileFields = (context: BusinessAppContextProps, investment: any) => {
  const [tileFields, setTileFields] = useState<TileField[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData(context)

  // Helper to extract code from various formats
  const extractCode = (ref: any): string | null => {
    if (!ref) return null
    if (typeof ref === 'string') {
      return ref.includes(':') ? ref.split(':').pop() || null : ref
    }
    return ref.code || null
  }

  // Extract investment group and type codes from investment data
  const getInvestmentCodes = useCallback(
    (investmentData: any): { groupCode: string | null; typeCode: string | null } => {
      const groupRef =
        investmentData?.group ||
        investmentData?.investmentGroup ||
        investmentData?.groupRef ||
        investmentData?.investmentGroupRef ||
        investmentData?.groupId

      const typeRef =
        investmentData?.investmentType ||
        investmentData?.type ||
        investmentData?.typeRef ||
        investmentData?.investmentTypeRef ||
        investmentData?.typeId

      return {
        groupCode: extractCode(groupRef),
        typeCode: extractCode(typeRef)
      }
    },
    []
  )

  // Helper to extract tile fields from catalog entry
  const getTileFieldsFromEntry = (entry: any): TileFieldsDefinition | null => {
    const objectValue = entry?.objectValue as TileFieldsDefinition
    return objectValue?.tileFields?.length ? objectValue : null
  }

  // Helper to find and extract tile fields from catalog
  const findTileFieldsInCatalog = (
    catalogData: any,
    typeCode: string | null,
    groupCode: string | null
  ): TileFieldsDefinition | null => {
    // Try investment type first
    if (typeCode) {
      const typeEntry = catalogData.investmentTypes.find((type: any) => type.code === typeCode)
      const tileFields = getTileFieldsFromEntry(typeEntry)
      if (tileFields) return tileFields
    }

    // Fallback to investment group
    if (groupCode) {
      const groupEntry = catalogData.investmentGroups.find((group: any) => group.code === groupCode)
      return getTileFieldsFromEntry(groupEntry)
    }

    return null
  }

  // Load tile fields definition from catalog
  const loadTileFields = useCallback(async () => {
    if (!investment) return

    setLoading(true)
    setError(null)

    try {
      const { groupCode, typeCode } = getInvestmentCodes(investment)
      const catalogData = await fetchInvestmentCatalogData()
      const tileFieldsDefinition = findTileFieldsInCatalog(catalogData, typeCode, groupCode)

      if (tileFieldsDefinition?.tileFields) {
        const sortedFields = [...tileFieldsDefinition.tileFields].sort((a, b) => a.displayOrder - b.displayOrder)
        setTileFields(sortedFields)
      } else {
        console.warn(`No tileFields found for investment. Group: ${groupCode}, Type: ${typeCode}`)
        setTileFields([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tile fields'
      console.error('Error loading tile fields:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [investment, getInvestmentCodes, fetchInvestmentCatalogData])

  // Load tile fields when investment changes
  useEffect(() => {
    loadTileFields()
  }, [loadTileFields])

  // Process tiles with actual content from investment
  const processedTiles = useMemo((): ProcessedTile[] => {
    if (!investment || !tileFields.length) return []

    let additionalProps = investment.additionalProperties || {}
    if (typeof additionalProps === 'string') {
      try {
        additionalProps = JSON.parse(additionalProps)
      } catch (parseError) {
        console.error('Failed to parse investment.additionalProperties', parseError)
        additionalProps = {}
      }
    }
    const tiles = (additionalProps as Record<string, any>).tiles || {}

    return tileFields.map(field => ({
      ...field,
      value: tiles[field.key] || '' // Get content from additionalProperties.tiles[key]
    }))
  }, [investment, tileFields])

  return {
    tileFields,
    processedTiles,
    loading,
    error,
    refetch: loadTileFields
  }
}
