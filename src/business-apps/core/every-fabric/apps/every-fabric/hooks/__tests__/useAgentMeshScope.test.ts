import type { MeshScope } from '../../components/agent-mesh/meshScopes'
import { getScopeTitle, getScopeSubtitle } from '../../components/agent-mesh/meshScopes'

describe('meshScopes', () => {
  describe('getScopeTitle', () => {
    it('returns correct titles for each scope', () => {
      expect(getScopeTitle('company')).toBe('Company Agent Mesh')
      expect(getScopeTitle('user', 'Alice')).toBe('Agent Mesh for Alice')
      expect(getScopeTitle('user')).toBe('User Agent Mesh')
      expect(getScopeTitle('me')).toBe('My Agent Mesh')
      expect(getScopeTitle('session')).toBe('Session Agent Mesh')
    })
  })

  describe('getScopeSubtitle', () => {
    it('returns correct subtitles for each scope', () => {
      const scopes: MeshScope[] = ['company', 'user', 'me', 'session']
      for (const scope of scopes) {
        expect(getScopeSubtitle(scope)).toBeTruthy()
      }
    })
  })
})
