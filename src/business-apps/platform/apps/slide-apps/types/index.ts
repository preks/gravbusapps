export type { Slide, SlideSummary, SlidePermission, SlideStatus } from './slide'
export type { SlideMaster, SlideLayout, PresentationContentJson } from './slideMaster'
export type {
  TemplateCategory,
  BrandIdentity,
  SlideTemplateSummary,
  SlideTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateFilters,
  SlidePurpose,
  SlidePosition,
  SlideCapabilities,
  SlideTemplateMeta,
  TemplateMeta,
  TemplateHints
} from './template'
export type {
  PresentationAvailability,
  PresentationConnection,
  PresentationConnectionAvailableEvent,
  PresentationConnectionList,
  PresentationReceiver,
  PresentationRequestInstance,
  PresentationRequestConstructor
} from './presentationApi'
export type {
  SlideAnnotation,
  SlideSpellCheckState,
  SlideSpellCheckResult,
  SlideSpellCheckConfig,
  IgnoredWord,
  UseSlideSpellCheckOptions,
  UseSlideSpellCheckReturn
} from './slideSpellCheck'
export {
  DEFAULT_SPELL_CHECK_CONFIG,
  getAnnotationColorClass,
  groupAnnotationsBySlide,
  groupAnnotationsByElement
} from './slideSpellCheck'
export type {
  SlideAnnotation,
  SlideSpellCheckState,
  UseSlideSpellCheckOptions,
  UseSlideSpellCheckReturn,
  IgnoredWordsStore
} from './slideSpellCheck'
export { getAnnotationClass, getSeverityClass } from './slideSpellCheck'
