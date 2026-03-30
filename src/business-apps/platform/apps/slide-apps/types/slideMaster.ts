// Slide Master & Layout type definitions for PowerPoint-parity layout system.

import type { AnySlideElement, SlideBackground } from '../components/slideElements'

export interface SlideLayout {
  id: string
  name: string
  description?: string
  masterId: string
  elements: AnySlideElement[]
  background?: SlideBackground
  isCustom?: boolean
}

export interface SlideMaster {
  id: string
  name: string
  sharedElements: AnySlideElement[]
  background: SlideBackground
  layouts: SlideLayout[]
  isDefault?: boolean
}

export interface PresentationContentJson {
  slides: import('../components/slideElements').SlideData[]
  themeId: string
  masters?: SlideMaster[]
  _templateMeta?: import('./template').TemplateMeta
}
