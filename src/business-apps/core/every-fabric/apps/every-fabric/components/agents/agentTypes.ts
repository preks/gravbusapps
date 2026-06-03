// Local agent type for the Fabric agents screen.

export interface FabricAgent {
  id: string
  name: string
  description: string
  agent_type: string | null
  specialty: string | null
  domain?: string | null
  avatar: string | null
  color: string | null
  is_public: boolean | null
  tags: string[]
  tools_count: number
  knowledge_sources_count: number
  skill_ids?: string[]
  skills_count?: number
  /** Tool refs attached to each of the agent's skills, keyed by skill_id. */
  skill_tools_by_id?: Record<string, string[]>
  source: string
  /** True when the agent is also on the Workforce surface (surfaces
   *  contains "workforce"). Drives the Workforce badge and the
   *  workforce-only config cards in the per-agent editor. */
  isWorkforce?: boolean
  categories?: string[]
  status?: string
  created_at: string | null
}

export interface BuiltinSubagent {
  id: string
  name: string
  description: string
  categories: string[]
  source: string
}
