/**
 * Guard: every protocol the references rail may render (i.e. every entry in
 * SUPPORTED_PROTOCOLS) must be resolvable by EntityLink — through ENTITY_CONFIG,
 * a PROTOCOL_REDIRECTS mapping, or a special-cased chip handler. Protocols that
 * are deliberately listed (so bare URLs survive sanitizing) but cannot yet be
 * turned into a chip URL must be enumerated in KNOWN_UNRESOLVABLE, so that a
 * newly-added unresolved protocol fails this test instead of silently rendering
 * a dead chip.
 */

import { SUPPORTED_PROTOCOLS, ENTITY_CONFIG, PROTOCOL_REDIRECTS } from './constants'

// Protocols EntityLink renders via dedicated components rather than ENTITY_CONFIG.
const SPECIAL_HANDLER_PROTOCOLS = new Set(['employee', 'sandbox', 'investment_document'])

const isResolvable = (protocol: string): boolean => {
  if (SPECIAL_HANDLER_PROTOCOLS.has(protocol)) return true
  if (protocol in PROTOCOL_REDIRECTS) {
    return PROTOCOL_REDIRECTS[protocol] in ENTITY_CONFIG
  }
  return protocol in ENTITY_CONFIG
}

// Protocols intentionally listed in SUPPORTED_PROTOCOLS (so bare URLs survive
// markdown sanitizing) that EntityLink cannot yet resolve to a chip URL. The
// references rail still filters by SUPPORTED_PROTOCOLS, so any of these that
// reach the rail render as plain text rather than a broken link. Adding chip
// support for one of these should also remove it from this list.
const KNOWN_UNRESOLVABLE = new Set<string>([
  'allowance_region_rule_detail',
  'mileage_rule_detail',
  'rounding_rule_version',
  'rounding_rule_version_detail',
  'increment_type_version',
  'increment_type_version_detail',
  'day_type_version',
  'day_type_version_detail',
  'break_type_version',
  'break_type_version_detail',
  'travel_budget',
  'time_group',
  'shift_type',
  'investment_shareholder',
  'job_offer'
])

describe('EntityLink protocol coverage', () => {
  it('every supported protocol is resolvable or explicitly flagged as unresolvable', () => {
    const unresolved = SUPPORTED_PROTOCOLS.filter(p => !isResolvable(p) && !KNOWN_UNRESOLVABLE.has(p))
    expect(unresolved).toEqual([])
  })

  it('KNOWN_UNRESOLVABLE only lists protocols that really cannot resolve', () => {
    const stale = [...KNOWN_UNRESOLVABLE].filter(p => isResolvable(p) || !SUPPORTED_PROTOCOLS.includes(p as never))
    expect(stale).toEqual([])
  })
})
