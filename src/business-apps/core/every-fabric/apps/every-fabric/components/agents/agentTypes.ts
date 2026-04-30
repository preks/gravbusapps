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
  source: string
  categories?: string[]
  created_at: string | null
}

export interface BuiltinSubagent {
  id: string
  name: string
  description: string
  categories: string[]
  source: string
}
