import { buildContentEntryChip, buildPolicyFlowEveryAIPrompt } from './flowAIMappers'

describe('flowAIMappers', () => {
  it('builds a content_entry chip with the policy UUID', () => {
    expect(buildContentEntryChip('Remote Work Policy', 'ad33ca6d-b2ea-40f2-b726-82285ea67c4a')).toBe(
      '[Remote Work Policy](content_entry://ad33ca6d-b2ea-40f2-b726-82285ea67c4a)'
    )
  })

  it('includes the policy chip in the Every AI workflow prompt', () => {
    const prompt = buildPolicyFlowEveryAIPrompt({
      policyTitle: 'Remote Work Policy',
      policyRootId: 'root-id',
      policyVersionId: 'ad33ca6d-b2ea-40f2-b726-82285ea67c4a'
    })

    expect(prompt).toContain('[Remote Work Policy](content_entry://ad33ca6d-b2ea-40f2-b726-82285ea67c4a)')
    expect(prompt).toContain('Create a new workflow template for')
    expect(prompt).toContain('Read this policy')
  })
})
