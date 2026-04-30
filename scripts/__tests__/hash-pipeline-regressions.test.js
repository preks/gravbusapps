import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getSkippedScreensSummary,
  isScreenChanged,
  mergeTouchedHashes,
  pickHashBaseline,
  shouldFailOnMissingBuildOutput
} from '../utils/hashPipelineUtils.js'

const FLOW_STUDIO_SCREEN_KEY = 'core/create/apps/flow-creator'

test('pickHashBaseline prefers local baseline over remote baseline', () => {
  const result = pickHashBaseline({
    localHashes: { [FLOW_STUDIO_SCREEN_KEY]: 'local-hash' },
    remoteHashes: { [FLOW_STUDIO_SCREEN_KEY]: 'remote-hash' }
  })

  assert.equal(result.source, 'local')
  assert.deepEqual(result.hashes, { [FLOW_STUDIO_SCREEN_KEY]: 'local-hash' })
})

test('pickHashBaseline falls back to remote when local is unavailable', () => {
  const result = pickHashBaseline({
    localHashes: null,
    remoteHashes: { [FLOW_STUDIO_SCREEN_KEY]: 'remote-hash' }
  })

  assert.equal(result.source, 'remote')
  assert.deepEqual(result.hashes, { [FLOW_STUDIO_SCREEN_KEY]: 'remote-hash' })
})

test('isScreenChanged detects hash mismatch for shared util impact', () => {
  assert.equal(isScreenChanged('abc', 'xyz'), true)
  assert.equal(isScreenChanged('abc', 'abc'), false)
  assert.equal(isScreenChanged(undefined, 'xyz'), true)
})

test('mergeTouchedHashes preserves unrelated remote hashes', () => {
  const remoteHashes = {
    [FLOW_STUDIO_SCREEN_KEY]: 'remote-new',
    'platform/apps/chat': 'chat-unchanged'
  }
  const touchedHashes = {
    'hr/core/apps/human-resources': 'hr-new'
  }

  const merged = mergeTouchedHashes(remoteHashes, touchedHashes)

  assert.equal(merged[FLOW_STUDIO_SCREEN_KEY], 'remote-new')
  assert.equal(merged['platform/apps/chat'], 'chat-unchanged')
  assert.equal(merged['hr/core/apps/human-resources'], 'hr-new')
})

test('shouldFailOnMissingBuildOutput enables strict mode for develop pipelines', () => {
  assert.equal(shouldFailOnMissingBuildOutput({ BITBUCKET_BRANCH: 'develop' }), true)
  assert.equal(shouldFailOnMissingBuildOutput({ HASH_DETECT_STRICT_MISSING_OUTPUT: 'true' }), true)
  assert.equal(shouldFailOnMissingBuildOutput({ BITBUCKET_BRANCH: 'feature/foo' }), false)
})

test('getSkippedScreensSummary returns sample and remainder counts', () => {
  const skippedScreens = Array.from({ length: 23 }, (_, index) => `screen-${index + 1}`)
  const summary = getSkippedScreensSummary(skippedScreens, 20)

  assert.equal(summary.total, 23)
  assert.equal(summary.sample.length, 20)
  assert.equal(summary.remaining, 3)
})
