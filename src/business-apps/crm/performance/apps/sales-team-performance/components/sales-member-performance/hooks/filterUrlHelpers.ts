/**
 * Helper functions to process URL parameters for opportunity filters
 */

interface FilterOptions {
  pipelineStageOptions: Array<{ id: string; name: string }>
  pipelineOptions: Array<{ id: string; name: string }>
}

export const processStageUrlParams = (urlParams: URLSearchParams, options: FilterOptions): string[] => {
  const filters: string[] = []
  const salesPipelineStageParams = urlParams.getAll('salesPipelineStage')

  for (const stageValue of salesPipelineStageParams) {
    const matchingStage = options.pipelineStageOptions.find(option => option.id === stageValue)
    if (matchingStage) {
      filters.push(`stage-${matchingStage.id}`)
    }
  }

  return filters
}

export const processPipelineUrlParams = (urlParams: URLSearchParams, options: FilterOptions): string[] => {
  const filters: string[] = []
  const salesPipelineParams = urlParams.getAll('salesPipeline')

  for (const pipelineValue of salesPipelineParams) {
    const matchingPipeline = options.pipelineOptions.find(option => option.id === pipelineValue)
    if (matchingPipeline) {
      filters.push(`pipeline-${matchingPipeline.id}`)
    }
  }

  return filters
}

export const processWinningChanceUrlParams = (urlParams: URLSearchParams): string[] => {
  const filters: string[] = []
  const validChances = new Set(['chance-high', 'chance-medium', 'chance-low', 'chance-very-low'])
  const winningChanceParams = urlParams.getAll('winningChance')

  for (const chanceValue of winningChanceParams) {
    if (validChances.has(chanceValue)) {
      filters.push(chanceValue)
    }
  }

  return filters
}

export const processAmountUrlParams = (urlParams: URLSearchParams): string[] => {
  const filters: string[] = []
  const validAmounts = new Set(['amount-large', 'amount-medium', 'amount-small', 'amount-micro'])
  const estimatedAmountParams = urlParams.getAll('estimatedAmount')

  for (const amountValue of estimatedAmountParams) {
    if (validAmounts.has(amountValue)) {
      filters.push(amountValue)
    }
  }

  return filters
}

export const getAllPreselectedFilters = (urlParams: URLSearchParams, options: FilterOptions): string[] => {
  return [
    ...processStageUrlParams(urlParams, options),
    ...processPipelineUrlParams(urlParams, options),
    ...processWinningChanceUrlParams(urlParams),
    ...processAmountUrlParams(urlParams)
  ]
}

/**
 * Helper to process a single filter and add it to the filters object
 */
export const processFilterByGroup = (groupId: string, filterId: string, filterValue: any, filters: any): void => {
  const groupHandlers: Record<string, (filters: any, filterId: string, filterValue: any) => void> = {
    owners: (f, id) => {
      if (!f.owners) f.owners = []
      f.owners.push(id)
    },
    stage: (f, _, val) => {
      if (!f.stages) f.stages = []
      f.stages.push(val)
    },
    pipeline: (f, _, val) => {
      if (!f.pipelines) f.pipelines = []
      f.pipelines.push(val)
    },
    winningChance: (f, _, val) => {
      if (!f.winningChanceRanges) f.winningChanceRanges = []
      f.winningChanceRanges.push(val)
    },
    estimatedAmount: (f, _, val) => {
      if (!f.amountRanges) f.amountRanges = []
      f.amountRanges.push(val)
    },
    accounts: (f, id) => {
      if (!f.accounts) f.accounts = []
      f.accounts.push(id)
    },
    statuses: (f, _, val) => {
      if (!f.statuses) f.statuses = []
      f.statuses.push(val)
    }
  }

  const handler = groupHandlers[groupId]
  if (handler) {
    handler(filters, filterId, filterValue)
  }
}
