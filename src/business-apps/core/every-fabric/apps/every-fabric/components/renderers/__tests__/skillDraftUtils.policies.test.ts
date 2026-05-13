import {
  addPolicyToSkillDraft,
  addToolToSkillDraft,
  getPoliciesFromSkillDraft,
  getToolsFromSkillDraft,
  removeAllPoliciesFromSkillDraft,
  removePolicyFromSkillDraft
} from '../skillDraftUtils'
import { buildPolicyDetailUrl } from '../../skills/AddPoliciesModal'

const POLICY_A = '11111111-1111-1111-1111-111111111111'
const POLICY_B = '22222222-2222-2222-2222-222222222222'

const baseDraft = `---
name: hr-offboarding-execution
description: Use when an employee leaves the company.
---

# HR offboarding
`

describe('skillDraftUtils policy helpers', () => {
  it('returns [] when draft has no frontmatter', () => {
    expect(getPoliciesFromSkillDraft('no frontmatter here')).toEqual([])
  })

  it('returns [] when frontmatter has no policy_refs', () => {
    expect(getPoliciesFromSkillDraft(baseDraft)).toEqual([])
  })

  it('adds a policy to a skill that has no policy_refs key yet', () => {
    const next = addPolicyToSkillDraft(baseDraft, POLICY_A)
    expect(getPoliciesFromSkillDraft(next)).toEqual([POLICY_A])
    expect(next).toContain('policy_refs:')
    expect(next).toContain(`  - ${POLICY_A}`)
  })

  it('is idempotent when adding the same policy twice', () => {
    const once = addPolicyToSkillDraft(baseDraft, POLICY_A)
    const twice = addPolicyToSkillDraft(once, POLICY_A)
    expect(once).toEqual(twice)
    expect(getPoliciesFromSkillDraft(twice)).toEqual([POLICY_A])
  })

  it('appends a second policy without dropping the first', () => {
    const step1 = addPolicyToSkillDraft(baseDraft, POLICY_A)
    const step2 = addPolicyToSkillDraft(step1, POLICY_B)
    expect(getPoliciesFromSkillDraft(step2)).toEqual([POLICY_A, POLICY_B])
  })

  it('removes a policy and drops the key once empty', () => {
    const withOne = addPolicyToSkillDraft(baseDraft, POLICY_A)
    const removed = removePolicyFromSkillDraft(withOne, POLICY_A)
    expect(getPoliciesFromSkillDraft(removed)).toEqual([])
    expect(removed).not.toContain('policy_refs:')
  })

  it('removes only the matching policy when several are attached', () => {
    const withTwo = addPolicyToSkillDraft(addPolicyToSkillDraft(baseDraft, POLICY_A), POLICY_B)
    const afterRemove = removePolicyFromSkillDraft(withTwo, POLICY_A)
    expect(getPoliciesFromSkillDraft(afterRemove)).toEqual([POLICY_B])
  })

  it('removeAllPoliciesFromSkillDraft drops the entire key', () => {
    const withOne = addPolicyToSkillDraft(baseDraft, POLICY_A)
    const cleared = removeAllPoliciesFromSkillDraft(withOne)
    expect(getPoliciesFromSkillDraft(cleared)).toEqual([])
    expect(cleared).not.toContain('policy_refs:')
  })

  it('reads the legacy short-form policies: alias', () => {
    const legacyDraft = `---
name: legacy
description: legacy policy block
policies:
  - ${POLICY_A}
  - ${POLICY_B}
---

body
`
    expect(getPoliciesFromSkillDraft(legacyDraft)).toEqual([POLICY_A, POLICY_B])
  })

  it('does not disturb tool_refs when manipulating policy_refs', () => {
    const withTool = addToolToSkillDraft(baseDraft, 'newwork.run_graphql_query')
    const withBoth = addPolicyToSkillDraft(withTool, POLICY_A)
    expect(getToolsFromSkillDraft(withBoth)).toEqual(['newwork.run_graphql_query'])
    expect(getPoliciesFromSkillDraft(withBoth)).toEqual([POLICY_A])

    const onlyTool = removePolicyFromSkillDraft(withBoth, POLICY_A)
    expect(getToolsFromSkillDraft(onlyTool)).toEqual(['newwork.run_graphql_query'])
    expect(getPoliciesFromSkillDraft(onlyTool)).toEqual([])
  })

  it('preserves the body untouched when modifying frontmatter', () => {
    const withOne = addPolicyToSkillDraft(baseDraft, POLICY_A)
    expect(withOne).toContain('# HR offboarding')
  })
})

describe('buildPolicyDetailUrl', () => {
  it('builds the intranet content-record url for a plain uuid', () => {
    expect(buildPolicyDetailUrl(POLICY_A)).toBe(`/platform/content/intranet/content-record?contentId=${POLICY_A}`)
  })

  it('encodes ids that contain url-unsafe characters', () => {
    expect(buildPolicyDetailUrl('a/b c')).toBe('/platform/content/intranet/content-record?contentId=a%2Fb%20c')
  })
})
