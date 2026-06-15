export interface PipelineStageRecord {
  id: string
  name: string
  displayOrder: number
}

interface CatalogStageEntry {
  id: string
  value?: string | null
  displayOrder?: number | null
}

const toProperCase = (value: string): string =>
  value
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

export const buildPipelineStagesQuery = (pipelineId: string): string => `
  query GetPipelineStages {
    stages: CatalogEntry(
      where: { parentEntryId: { _eq: "${pipelineId}" }, isDeleted: { _eq: false } }
      orderBy: { displayOrder: ASC }
    ) {
      id
      value
      displayOrder
    }
  }
`

export const mapPipelineStagesResponse = (response: Record<string, unknown>): PipelineStageRecord[] => {
  const stages = (response.stages as CatalogStageEntry[] | undefined) || []

  return stages.map(stage => ({
    id: stage.id,
    name: toProperCase(stage.value?.trim() || 'Unknown'),
    displayOrder: stage.displayOrder ?? 0
  }))
}
