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
  const validChances = ['chance-high', 'chance-medium', 'chance-low', 'chance-very-low']
  const winningChanceParams = urlParams.getAll('winningChance')

  for (const chanceValue of winningChanceParams) {
    if (validChances.includes(chanceValue)) {
      filters.push(chanceValue)
    }
  }

  return filters
}

export const processAmountUrlParams = (urlParams: URLSearchParams): string[] => {
  const filters: string[] = []
  const validAmounts = ['amount-large', 'amount-medium', 'amount-small', 'amount-micro']
  const estimatedAmountParams = urlParams.getAll('estimatedAmount')

  for (const amountValue of estimatedAmountParams) {
    if (validAmounts.includes(amountValue)) {
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
  if (groupId === 'owners') {
    if (!filters.owners) filters.owners = []
    filters.owners.push(filterId)
  } else if (groupId === 'stage') {
    if (!filters.stages) filters.stages = []
    filters.stages.push(filterValue)
  } else if (groupId === 'pipeline') {
    if (!filters.pipelines) filters.pipelines = []
    filters.pipelines.push(filterValue)
  } else if (groupId === 'winningChance') {
    if (!filters.winningChanceRanges) filters.winningChanceRanges = []
    filters.winningChanceRanges.push(filterValue)
  } else if (groupId === 'estimatedAmount') {
    if (!filters.amountRanges) filters.amountRanges = []
    filters.amountRanges.push(filterValue)
  } else if (groupId === 'accounts') {
    if (!filters.accounts) filters.accounts = []
    filters.accounts.push(filterId)
  } else if (groupId === 'statuses') {
    if (!filters.statuses) filters.statuses = []
    filters.statuses.push(filterValue)
  }
}
