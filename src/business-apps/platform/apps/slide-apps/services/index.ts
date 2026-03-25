export { SlidesApiService } from './SlidesApiService'
export { SlideGenerationService, SlideGenerationError, parseGenerationError } from './SlideGenerationService'
export type {
  ContentReference,
  ContentType,
  GenerationOptions,
  GenerationResult,
  GenerationProgressCallback,
  SlideGenerationErrorDetails
} from './SlideGenerationService'
export { SlideResearchService } from './SlideResearchService'
export type {
  ResearchResult,
  ResearchFact,
  ResearchStatistic,
  ResearchQuote,
  IndustryTrend,
  CompetitorInfo,
  HistoricalMilestone,
  ChartDataSuggestion
} from './SlideResearchService'
export { SlideLayoutService, LAYOUT_PURPOSE_MAP } from './SlideLayoutService'
export type { SlideLayoutType, SlideLayoutContent } from './SlideLayoutService'
export { SlideVisualBuilders } from './SlideVisualBuilders'
export { SlideImageService } from './SlideImageService'
export type { ImageSearchResult, ImageSearchOptions } from './SlideImageService'
export { SpeakerNotesService } from './SpeakerNotesService'
export type { SpeakerNote, SpeakerNotesOptions } from './SpeakerNotesService'
export {
  SlideMetadataService,
  PURPOSE_DEFINITIONS,
  PURPOSE_ICONS,
  getDefaultCapabilities,
  getDefaultPosition,
  getDefaultMaxUsage,
  createDefaultMeta,
  getAllPurposes,
  getAllPositions,
  inferPurposeFromSlide,
  analyzeSlideContent,
  findBestSlideForContent,
  matchContentToTemplateSlides,
  validateSlideMeta,
  migrateLegacyTemplate
} from './SlideMetadataService'
export type { PurposeDefinition, ValidationResult, ContentAnalysis } from './SlideMetadataService'
