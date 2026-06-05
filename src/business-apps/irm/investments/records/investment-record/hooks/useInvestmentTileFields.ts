import { useState, useEffect, useCallback, useRef } from 'react'
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
  const hasLoadedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData(context)

  // Extract investment group and type codes from investment data
  const getInvestmentCodes = useCallback(
    (investmentData: any): { groupCode: string | null; typeCode: string | null } => {
      // Extract group code
      const groupRef =
        investmentData?.group ||
        investmentData?.investmentGroup ||
        investmentData?.groupRef ||
        investmentData?.investmentGroupRef ||
        investmentData?.groupId

      // Extract type code
      const typeRef =
        investmentData?.investmentType ||
        investmentData?.type ||
        investmentData?.typeRef ||
        investmentData?.investmentTypeRef ||
        investmentData?.typeId

      let groupCode = null
      let typeCode = null

      // Extract group code from format like "InvestmentGroup:v1:REAL_ESTATE"
      if (groupRef) {
        if (typeof groupRef === 'string' && groupRef.includes(':')) {
          groupCode = groupRef.split(':').pop() || null
        } else if (typeof groupRef === 'object' && groupRef.code) {
          groupCode = groupRef.code
        } else {
          groupCode = groupRef
        }
      }

      // Extract type code from format like "InvestmentType:v1:EQUITY_FUND"
      if (typeRef) {
        if (typeof typeRef === 'string' && typeRef.includes(':')) {
          typeCode = typeRef.split(':').pop() || null
        } else if (typeof typeRef === 'object' && typeRef.code) {
          typeCode = typeRef.code
        } else {
          typeCode = typeRef
        }
      }

      return { groupCode, typeCode }
    },
    []
  )

  // Load tile fields definition from catalog
  const loadTileFields = useCallback(async () => {
    if (!investment) return

    if (!hasLoadedRef.current) {
      setLoading(true)
    }
    setError(null)

    try {
      // Extract both group and type codes from investment
      const { groupCode, typeCode } = getInvestmentCodes(investment)

      // Fetch catalog data
      const catalogData = await fetchInvestmentCatalogData()

      let tileFieldsDefinition: TileFieldsDefinition | null = null

      // First, try to get tileFields from investment type
      if (typeCode) {
        const typeEntry = catalogData.investmentTypes.find((type: any) => type.code === typeCode)

        if (typeEntry && typeEntry.objectValue && typeEntry.objectValue?.tileFields?.length > 0) {
          tileFieldsDefinition = typeEntry.objectValue as TileFieldsDefinition
        }
      }

      // Fallback to investment group if type doesn't have tileFields
      if (!tileFieldsDefinition && groupCode) {
        const groupEntry = catalogData.investmentGroups.find((group: any) => group.code === groupCode)

        if (groupEntry && groupEntry.objectValue && groupEntry.objectValue?.tileFields?.length > 0) {
          tileFieldsDefinition = groupEntry.objectValue as TileFieldsDefinition
        }
      }

      // Process the tile fields
      if (tileFieldsDefinition) {
        const fields = tileFieldsDefinition.tileFields || []
        // Sort by displayOrder
        const sortedFields = [...fields].sort((a, b) => a.displayOrder - b.displayOrder)

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
      hasLoadedRef.current = true
      setLoading(false)
    }
  }, [investment, getInvestmentCodes, fetchInvestmentCatalogData])

  useEffect(() => {
    hasLoadedRef.current = false
  }, [investment?.id])

  // Load tile fields when investment changes
  useEffect(() => {
    loadTileFields()
  }, [loadTileFields])

  // Process tiles with actual content from investment
  const processedTiles = useCallback((): ProcessedTile[] => {
    if (!investment || !tileFields.length) return []

    const additionalProps = investment.additionalProperties || {}
    const tiles = additionalProps.tiles || {}

    return tileFields.map(field => ({
      ...field,
      value: tiles[field.key] || '' // Get content from additionalProperties.tiles[key]
    }))
  }, [investment, tileFields])

  return {
    tileFields,
    processedTiles: processedTiles(),
    loading,
    error,
    refetch: loadTileFields
  }
}
