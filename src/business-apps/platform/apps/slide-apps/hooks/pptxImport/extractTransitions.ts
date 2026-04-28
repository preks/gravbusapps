// Extract slide transition from <p:transition> element.

import type { SlideTransition, SlideTransitionType, TransitionTrigger } from '../../components/slideElements'
import type { ParserMessage } from '../usePowerPointParser'

const TRANSITION_TAG_MAP: Record<string, SlideTransitionType> = {
  'p:fade': 'fade',
  'p:push': 'push-left',
  'p:wipe': 'slide-left',
  'p:split': 'dissolve',
  'p:cut': 'none',
  'p:zoom': 'zoom-in',
  'p:wheel': 'dissolve',
  'p:fly': 'slide-left',
  'p:cover': 'slide-left',
  'p:pull': 'slide-right',
  'p:strips': 'dissolve',
  'p:blinds': 'dissolve',
  'p:checker': 'dissolve',
  'p:circle': 'zoom-in',
  'p:dissolve': 'dissolve',
  'p:comb': 'dissolve',
  'p:newsflash': 'zoom-in',
  'p:plus': 'zoom-in',
  'p:random': 'fade',
  'p:wedge': 'fade',
  'p:diamond': 'zoom-in'
}

const SPEED_MAP: Record<string, number> = {
  slow: 1000,
  med: 500,
  fast: 250
}

export function extractTransition(
  slideXml: Document,
  messages: ParserMessage[],
  slideIndex: number
): SlideTransition | undefined {
  const transition = slideXml.getElementsByTagName('p:transition')[0]
  if (!transition) return undefined

  let type: SlideTransitionType = 'fade'
  let matched = false

  for (const child of Array.from(transition.children)) {
    const tag = child.tagName
    if (TRANSITION_TAG_MAP[tag]) {
      type = TRANSITION_TAG_MAP[tag]
      matched = true
      break
    }
  }

  if (!matched && transition.children.length > 0) {
    const firstChildTag = transition.children[0]?.tagName
    if (firstChildTag) {
      messages.push({
        type: 'info',
        message: 'parser-transition-unsupported',
        params: { type: firstChildTag.replace('p:', ''), slide: String(slideIndex + 1) }
      })
    }
  }

  const spd = transition.getAttribute('spd') || 'med'
  const duration = SPEED_MAP[spd] || 500

  let trigger: TransitionTrigger = 'on-click'
  let delay = 0

  const advTm = transition.getAttribute('advTm')
  if (advTm) {
    trigger = 'auto'
    delay = Number.parseInt(advTm)
  }

  const advClick = transition.getAttribute('advClick')
  if (advClick === '0') {
    trigger = 'auto'
  }

  return { type, duration, trigger, delay }
}
