# Skills Intelligence Graph with Learning Recommendations

## Feature Specification

**Differentiation Level:** HIGH  
**Strategic Value:** Transform skills from static tags to a living development platform  
**Branch:** `feature/NO-TICKET_manager-workboard-redesign` (can be renamed)

---

## 1. Executive Summary

### Vision

Create an intelligent, dynamic skills ecosystem that:

- Visualizes organizational skill networks in real-time
- Predicts future skill demands using AI
- Connects employees for peer learning
- Recommends personalized learning paths
- Drives data-informed talent development decisions

### Business Impact

- **Talent Development:** Automated, personalized career growth paths
- **Knowledge Retention:** Identify critical skill gaps before they become problems
- **Cost Optimization:** Internal mentorship reduces external training costs
- **Strategic Planning:** Forecast skill needs aligned with business goals
- **Employee Engagement:** Clear growth paths increase retention

---

## 2. Feature Breakdown

### 2.1 Skills Network Graph (Phase 1)

**What:** Interactive network visualization showing skills, people, and relationships

**Components:**

1. **Graph Visualization**
   - Nodes: Skills (size = # of people with skill)
   - Edges: Skill relationships (co-occurrence, prerequisites)
   - Colors: Proficiency levels (Beginner → Expert)
   - Filters: Department, seniority, proficiency, trending

2. **Interactive Features**
   - Click skill → See all employees with that skill
   - Click employee → See their skill profile
   - Hover → Quick stats (avg proficiency, learning trend)
   - Search: Find skills, people, gaps
   - Time slider: View skill evolution over time

3. **Key Views**
   - **Organization View:** All skills across company
   - **Department View:** Team-specific skills landscape
   - **Individual View:** Personal skill network + gaps
   - **Gap Analysis View:** Missing critical skills

**Data Points:**

```typescript
interface SkillNode {
  skillId: string
  skillName: string
  employeeCount: number
  avgProficiencyLevel: number
  trendDirection: 'rising' | 'stable' | 'declining'
  demandScore: number // AI-predicted demand
  relatedSkills: string[] // Connected skills
}

interface EmployeeSkillEdge {
  employeeId: string
  skillId: string
  proficiencyLevel: number // 1-5
  yearsOfExperience: number
  lastUsed: Date
  isLearning: boolean
  verifiedBy?: string // endorsement
}
```

---

### 2.2 AI-Powered Learning Path Recommendations (Phase 2)

**What:** Personalized skill development roadmaps based on career goals + market trends

**Intelligence Engine:**

1. **Input Factors**
   - Current skills + proficiency levels
   - Career goal / target role
   - Department/industry trends
   - Market demand data (external APIs later)
   - Internal promotion patterns
   - Peer career trajectories

2. **Recommendation Algorithm**

   ```
   For each employee:
   1. Analyze current skill profile
   2. Identify target role requirements
   3. Calculate skill gap (target - current)
   4. Rank skills by:
      - Impact on career progression
      - Market demand growth
      - Internal availability (mentors)
      - Learning difficulty
      - Time to competency
   5. Generate prioritized learning path
   ```

3. **Output: Learning Path**

   ```typescript
   interface LearningPath {
     employeeId: string
     targetRole: string
     currentMatchScore: number // % ready for role
     estimatedTimeToReady: string // e.g., "6-9 months"
     prioritizedSkills: SkillRecommendation[]
     milestones: Milestone[]
   }

   interface SkillRecommendation {
     skill: string
     currentLevel: number
     targetLevel: number
     priority: 'critical' | 'important' | 'nice-to-have'
     reasoning: string // AI explanation
     estimatedLearningTime: string
     recommendedResources: Resource[]
     availableMentors: Employee[]
   }
   ```

**AI Prompt Structure:**

```
System: You are a career development advisor analyzing skill gaps and market trends.

Context:
- Employee: {name}, {currentRole}, {yearsExperience}
- Current Skills: {skillList with proficiencies}
- Target Role: {targetRole}
- Department Trends: {departmentSkillTrends}
- Market Data: {industryGrowthAreas}

Task: Generate a prioritized learning path with:
1. Top 5 skills to develop (ordered by impact)
2. Explanation for each skill's importance
3. Estimated time to proficiency
4. Suggested learning approach (self-study, mentorship, project-based)

Output JSON format: {schema}
```

---

### 2.3 Peer Learning Matching (Phase 2)

**What:** Intelligent matching system connecting learners with mentors

**Matching Algorithm:**

1. **Identify Potential Mentors**
   - Has target skill at proficiency level 4-5
   - Currently working with the skill (last used < 6 months)
   - Has mentored before (bonus points)
   - Same department/timezone (proximity bonus)
   - High skill endorsements

2. **Smart Suggestions**
   - "Sarah has React at Expert level and is in your department"
   - "John transitioned from your role to Target Role 2 years ago"
   - "Emily is learning the same skill - want to buddy up?"
   - "Your manager has this skill - schedule a 1:1"

3. **Matching Score Formula**
   ```
   matchScore =
     (skillProficiency * 0.3) +
     (recency * 0.2) +
     (departmentProximity * 0.15) +
     (roleRelevance * 0.20) +
     (availability * 0.10) +
     (endorsements * 0.05)
   ```

**UI Components:**

- Mentor Discovery Card
- Learning Partner Suggestions
- Mentorship Request Flow
- Skill Endorsement System

---

### 2.4 Skills Demand Forecasting (Phase 3)

**What:** Predictive analytics showing future skill demands

**Data Sources:**

1. **Internal Data**
   - Hiring requisitions (skills in job postings)
   - Project assignments (skills needed for projects)
   - Promotion patterns (skills correlated with advancement)
   - Strategic initiatives (upcoming projects requiring new skills)

2. **External Data (Future)**
   - LinkedIn Skills Graph API
   - Job posting trends (Adzuna, Indeed APIs)
   - Industry reports
   - Tech trend analysis (GitHub, Stack Overflow)

**Forecasting Models:**

```typescript
interface SkillForecast {
  skill: string
  currentDemand: number // 0-100
  predictedDemandChange: number // % change
  timeframe: '6months' | '1year' | '2years'
  confidence: number // 0-1
  reasoning: string[]
  recommendations: string[]
}
```

**Forecast Display:**

- Trending Skills Dashboard
- Demand Growth Charts
- Risk Alerts: "Critical skill shortage in 6 months"
- Investment Recommendations: "Prioritize React Native training"

---

## 3. Technical Architecture

### 3.1 Frontend Components

```
src/business-apps/hr/core/apps/skills-intelligence/
├── SkillsIntelligenceDashboard.tsx          # Main page
├── components/
│   ├── SkillsNetworkGraph.tsx               # Graph visualization
│   ├── LearningPathRecommendations.tsx      # AI recommendations
│   ├── PeerMentorMatching.tsx               # Mentor discovery
│   ├── SkillsForecastWidget.tsx             # Demand predictions
│   ├── SkillGapAnalysis.tsx                 # Gap identification
│   ├── SkillEndorsements.tsx                # Endorsement system
│   └── LearningProgress.tsx                 # Track progress
├── hooks/
│   ├── useSkillsGraph.ts                    # Graph data
│   ├── useLearningPath.ts                   # AI recommendations
│   ├── useMentorMatching.ts                 # Mentor search
│   ├── useSkillForecasts.ts                 # Demand data
│   └── useSkillEndorsements.ts              # Endorsements
├── utils/
│   ├── graphAlgorithms.ts                   # Network analysis
│   ├── matchingAlgorithm.ts                 # Mentor matching
│   ├── learningPathGenerator.ts             # AI integration
│   └── forecastingEngine.ts                 # Predictions
└── types/
    └── skillsIntelligence.types.ts          # TypeScript interfaces
```

### 3.2 Graph Visualization Library

**Recommendation:** Use **React Flow** or **D3.js + React**

**React Flow Advantages:**

- Built for React
- Easy node customization
- Good performance (thousands of nodes)
- Interactive out of the box
- TypeScript support

**Alternative:** Cytoscape.js (more powerful for complex graphs)

**Installation:**

```bash
npm install reactflow
# or
npm install cytoscape cytoscape-react
```

### 3.3 Data Layer

**New GraphQL Queries Needed:**

```graphql
# Get skills graph data
query GetSkillsGraph($filters: SkillGraphFilters) {
  skillsGraph(filters: $filters) {
    nodes {
      skillId
      skillName
      employeeCount
      avgProficiencyLevel
      trendDirection
      demandScore
    }
    edges {
      sourceSkillId
      targetSkillId
      strength
      type
    }
    employees {
      employeeId
      firstName
      lastName
      skills {
        skillId
        proficiencyLevel
        yearsExperience
        lastUsed
      }
    }
  }
}

# Get learning path recommendations
query GetLearningPath($employeeId: ID!, $targetRole: String!) {
  learningPathRecommendations(employeeId: $employeeId, targetRole: $targetRole) {
    currentMatchScore
    estimatedTimeToReady
    prioritizedSkills {
      skill
      currentLevel
      targetLevel
      priority
      reasoning
      estimatedLearningTime
      availableMentors {
        employeeId
        name
        proficiencyLevel
        matchScore
      }
    }
  }
}

# Get mentor matches
query GetMentorMatches($skillId: ID!, $employeeId: ID!) {
  mentorMatches(skillId: $skillId, employeeId: $employeeId) {
    employeeId
    firstName
    lastName
    proficiencyLevel
    matchScore
    availability
    endorsements
    department
    recentProjects
  }
}

# Get skill forecasts
query GetSkillForecasts($timeframe: ForecastTimeframe!) {
  skillForecasts(timeframe: $timeframe) {
    skill
    currentDemand
    predictedDemandChange
    confidence
    reasoning
    recommendations
  }
}

# Skill endorsement mutation
mutation EndorseSkill($employeeId: ID!, $skillId: ID!, $endorsement: String!) {
  endorseSkill(employeeId: $employeeId, skillId: $skillId, endorsement: $endorsement) {
    success
    endorsement {
      id
      endorsedBy
      createdAt
      comment
    }
  }
}
```

### 3.4 Backend Requirements

**New Database Tables:**

```sql
-- Skill relationships (which skills go together)
CREATE TABLE skill_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_a_id UUID REFERENCES skill(id),
  skill_b_id UUID REFERENCES skill(id),
  relationship_type VARCHAR(50), -- 'prerequisite', 'related', 'alternative'
  strength NUMERIC(3,2), -- 0-1 correlation score
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill endorsements
CREATE TABLE skill_endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employee(id),
  skill_id UUID REFERENCES skill(id),
  endorsed_by UUID REFERENCES employee(id),
  endorsement_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, skill_id, endorsed_by)
);

-- Learning paths
CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employee(id),
  target_role VARCHAR(255),
  current_match_score NUMERIC(5,2),
  estimated_completion_months INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active' -- 'active', 'completed', 'paused'
);

-- Learning path skills (roadmap items)
CREATE TABLE learning_path_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learning_path_id UUID REFERENCES learning_paths(id),
  skill_id UUID REFERENCES skill(id),
  current_level INTEGER,
  target_level INTEGER,
  priority VARCHAR(50), -- 'critical', 'important', 'nice-to-have'
  reasoning TEXT,
  estimated_learning_time_weeks INTEGER,
  status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentorship connections
CREATE TABLE mentorship_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentee_id UUID REFERENCES employee(id),
  mentor_id UUID REFERENCES employee(id),
  skill_id UUID REFERENCES skill(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'completed', 'declined'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- Skill demand forecasts (cache AI predictions)
CREATE TABLE skill_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID REFERENCES skill(id),
  timeframe VARCHAR(50), -- '6months', '1year', '2years'
  current_demand NUMERIC(5,2),
  predicted_demand_change NUMERIC(5,2),
  confidence NUMERIC(3,2),
  reasoning JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ
);
```

**GraphQL Resolvers Needed:**

- `skillsGraph` - Complex query joining skills, employees, relationships
- `learningPathRecommendations` - AI integration
- `mentorMatches` - Matching algorithm
- `skillForecasts` - Forecasting engine
- `endorseSkill` - Mutation for endorsements

### 3.5 AI/ML Integration

**Option 1: FlowBot Integration (Quick Start)**

```typescript
const generateLearningPath = async (employeeData: EmployeeProfile, targetRole: string, skillsTrends: SkillTrend[]) => {
  const prompt = `You are a career development advisor...
  
  Employee Profile:
  - Name: ${employeeData.name}
  - Current Role: ${employeeData.role}
  - Current Skills: ${JSON.stringify(employeeData.skills)}
  
  Target: ${targetRole}
  
  Generate a learning path with 5 prioritized skills...`

  const response = await fetch('/flowbot/api/agent/v2/chat', {
    method: 'POST',
    body: formData
  })

  return parseLearningPath(response)
}
```

**Option 2: Dedicated ML Service (Phase 3)**

- Train custom model on historical promotion/hiring data
- Real-time skill demand prediction
- More accurate matching algorithms

---

## 4. User Experience (UI/UX)

### 4.1 Main Navigation Entry Points

**1. HR Launcher → "Skills Intelligence"**

```typescript
// Add to HR launcher
{
  id: 'skills-intelligence',
  label: 'Skills Intelligence',
  icon: <Network />,
  route: '/platform/skills-intelligence',
  description: 'Visualize skills, learning paths, and forecasts'
}
```

**2. Employee Profile → "My Learning Path" Tab**

- Personal skill graph
- Recommended learning path
- Available mentors
- Progress tracking

**3. Manager Dashboard → "Team Skills" Widget**

- Team skill gaps
- Learning in progress
- Mentorship requests

### 4.2 Core User Flows

**Flow 1: Employee Discovers Learning Path**

1. Navigate to Skills Intelligence
2. View personal skill graph
3. Select target role from dropdown
4. See AI-generated learning path
5. Choose skill to learn
6. See available mentors
7. Request mentorship or start self-learning
8. Track progress

**Flow 2: Manager Identifies Team Gaps**

1. Navigate to Skills Intelligence (Team View)
2. Filter by department
3. See skill distribution graph
4. Identify missing critical skills
5. See forecasted skill demands
6. Take action:
   - Assign training
   - Hire for gap
   - Reassign projects

**Flow 3: Employee Finds Mentor**

1. Select skill to learn
2. View mentor recommendations
3. Filter by department/availability
4. See mentor's profile + endorsements
5. Send mentorship request
6. Schedule sessions

### 4.3 Dashboard Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Skills Intelligence                    [View: Org ▼] [Export]│
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────┐  ┌──────────────────┐  │
│  │   SKILLS NETWORK GRAPH          │  │  TOP SKILLS      │  │
│  │                                 │  │  ──────────────   │  │
│  │   [Interactive D3/React Flow]   │  │  1. JavaScript   │  │
│  │                                 │  │  2. Python       │  │
│  │   Filters:                      │  │  3. Leadership   │  │
│  │   □ Department  □ Level         │  │                  │  │
│  │   □ Trending    □ Learning      │  │  TRENDING ↑      │  │
│  │                                 │  │  • React Native  │  │
│  └─────────────────────────────────┘  │  • Kubernetes    │  │
│                                        └──────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ MY LEARNING PATH                         [Customize]  │   │
│  │ Target Role: Senior Developer            Progress: 65%│   │
│  │ ─────────────────────────────────────────────────────│   │
│  │ ✓ React (Expert)          ⏳ System Design (Learning)│   │
│  │ ✓ TypeScript (Advanced)   □ Kubernetes (Not Started) │   │
│  │                                                       │   │
│  │ [Find Mentor] [Start Learning]                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │ AVAILABLE MENTORS   │  │  SKILL FORECASTS             │  │
│  │                     │  │                              │  │
│  │ Sarah Chen          │  │  📈 React Native +40%        │  │
│  │ ⭐⭐⭐⭐⭐ System Design  │  │  📈 AI/ML +65%               │  │
│  │ [Request]           │  │  📉 jQuery -20%              │  │
│  │                     │  │                              │  │
│  │ John Doe            │  │  [View Full Forecast]        │  │
│  │ ⭐⭐⭐⭐ Kubernetes      │  │                              │  │
│  └─────────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation (2-3 weeks)

**Goal:** Basic skills graph visualization

**Tasks:**

1. ✅ Set up new app structure: `skills-intelligence/`
2. ✅ Create GraphQL queries for existing skills data
3. ✅ Implement basic skills graph visualization (React Flow)
4. ✅ Add filters (department, proficiency)
5. ✅ Employee skill profile view
6. ✅ Basic skill gap identification
7. ✅ Unit tests

**Deliverable:** Interactive skills network graph showing who has what skills

---

### Phase 2: Learning Paths & Matching (3-4 weeks)

**Goal:** AI recommendations and peer matching

**Tasks:**

1. ✅ Design learning path data model
2. ✅ Implement FlowBot integration for learning path generation
3. ✅ Create learning path UI component
4. ✅ Build mentor matching algorithm
5. ✅ Mentor discovery UI
6. ✅ Mentorship request flow
7. ✅ Skill endorsement system
8. ✅ Backend GraphQL resolvers
9. ✅ Integration tests

**Deliverable:** Personalized learning paths with mentor recommendations

---

### Phase 3: Forecasting & Intelligence (2-3 weeks)

**Goal:** Predictive analytics and demand forecasting

**Tasks:**

1. ✅ Build forecasting engine (internal data)
2. ✅ Create forecast data model
3. ✅ Forecast visualization UI
4. ✅ Demand alerts system
5. ✅ Manager insights dashboard
6. ✅ Export/reporting features
7. ✅ E2E tests

**Deliverable:** Skills demand forecasting with strategic insights

---

### Phase 4: Polish & Scale (1-2 weeks)

**Goal:** Production-ready, performant, beautiful

**Tasks:**

1. ✅ Performance optimization (large graphs)
2. ✅ Mobile responsive design
3. ✅ Accessibility (WCAG compliance)
4. ✅ User onboarding flow
5. ✅ Documentation
6. ✅ Analytics tracking
7. ✅ Load testing

**Deliverable:** Production launch

---

## 6. Success Metrics (KPIs)

### Engagement Metrics

- **Adoption Rate:** % of employees who view their learning path
- **Active Learning:** % of employees actively pursuing recommended skills
- **Mentorship Connections:** # of mentorship relationships formed
- **Skill Updates:** Frequency of employees adding/updating skills

### Business Impact Metrics

- **Time to Competency:** Reduced time to reach target proficiency
- **Internal Mobility:** Increased internal promotions/role changes
- **Retention:** Correlation between learning path usage and retention
- **Training ROI:** Cost savings from peer mentorship vs. external training
- **Skill Gap Reduction:** Decrease in critical skill shortages

### Quality Metrics

- **Learning Path Accuracy:** % of users who find recommendations relevant
- **Mentor Match Quality:** Success rate of mentorship connections
- **Forecast Accuracy:** Actual vs. predicted skill demand

**Target Numbers (Year 1):**

- 70% employee adoption
- 500+ mentorship connections
- 30% reduction in external training costs
- 85% learning path satisfaction

---

## 7. Technical Considerations

### 7.1 Performance

**Challenge:** Large graphs (1000+ employees, 500+ skills)
**Solutions:**

- Virtual rendering (only render visible nodes)
- GraphQL pagination
- Server-side graph analysis
- Caching layer (Redis)
- Lazy loading

### 7.2 Data Privacy

- Skill visibility controls (public, team, private)
- Manager-only views for gap analysis
- Anonymized aggregate data for forecasts
- GDPR compliance (right to delete skills data)

### 7.3 Data Quality

**Challenges:**

- Self-reported skills (inflate proficiency)
- Outdated skills (not updated)
- Missing skills

**Solutions:**

- Skill endorsements (validation)
- Manager verification
- Auto-suggest skills from job descriptions
- Decay function (reduce proficiency over time if not used)
- Periodic skill review reminders

### 7.4 Scalability

- Microservice for AI/ML processing (separate from main GraphQL)
- Async job queue for forecast calculations
- CDN for graph visualizations
- Database indexing on skill queries

---

## 8. Integration Points

### 8.1 Existing Components

- **AddSkill Component:** Enhance with proficiency levels, endorsements
- **SkillsTab Component:** Add "View in Skills Graph" link
- **Employee Profile:** Embed learning path widget
- **Manager Dashboard:** Add skills gap widget

### 8.2 Future Integrations

- **Performance Reviews:** Link skills to goals
- **Hiring:** Match candidates to skill gaps
- **LinkedIn Learning API:** Direct course recommendations
- **Coursera API:** External learning resources
- **Project Management:** Auto-suggest team members by skills

---

## 9. Risk Analysis

### High Risk

❌ **AI Quality:** Bad recommendations damage trust

- Mitigation: Human-in-loop review, feedback system, gradual rollout

### Medium Risk

⚠️ **Adoption:** Users don't maintain skill profiles

- Mitigation: Manager-driven initiatives, gamification, integration with performance reviews

⚠️ **Data Privacy:** Employees uncomfortable sharing skills

- Mitigation: Clear privacy controls, opt-in features, transparent policies

### Low Risk

✓ **Technical Complexity:** Graph performance issues

- Mitigation: Standard engineering practices, load testing

---

## 10. Next Steps

### Immediate Actions (This Week)

1. ✅ Review and approve this specification
2. ✅ Decide on graph visualization library (React Flow vs. D3)
3. ✅ Create detailed designs/mockups for Phase 1
4. ✅ Set up project structure
5. ✅ Write first GraphQL queries for skills graph data

### Questions to Answer

- [ ] Do we have enough historical data for ML forecasting?
- [ ] What's the current quality of employee_skill data?
- [ ] Should learning paths be manager-initiated or employee-initiated?
- [ ] Do we need admin tools for skill taxonomy management?
- [ ] What's the privacy policy around skill visibility?

### Stakeholder Alignment Needed

- [ ] Product team: Feature prioritization
- [ ] Design team: UI/UX mockups
- [ ] Backend team: GraphQL schema approval
- [ ] Legal/Compliance: Data privacy review
- [ ] HR team: Learning path templates

---

## 11. Appendix

### A. Existing Data Schema Reference

```sql
-- Existing employee_skill table
CREATE TABLE employee_skill (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employee(id),
  skill_id UUID REFERENCES skill(id),
  level INTEGER, -- Already exists! Use this for proficiency (1-5)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Existing skill table
CREATE TABLE skill (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMPTZ
);
```

### B. Competitor Analysis

**LinkedIn Skills:**

- ✅ Skills endorsements
- ✅ Skills assessments
- ❌ No AI learning paths
- ❌ No internal network graph

**Degreed:**

- ✅ Learning path recommendations
- ✅ Skills tracking
- ❌ Expensive enterprise solution
- ❌ No real-time graph

**Our Advantage:**

- ✓ Integrated with existing HR data
- ✓ Real-time organizational insights
- ✓ Internal mentorship matching (unique!)
- ✓ AI-powered forecasting

### C. Technology Stack Summary

**Frontend:**

- React + TypeScript
- React Flow (graph visualization)
- @newwork/nw-design-system
- Recharts (forecasting charts)

**Backend:**

- GraphQL (existing)
- PostgreSQL (existing)
- FlowBot API (AI integration)

**Future:**

- Redis (caching)
- Dedicated ML service
- External learning platform APIs

---

**Document Version:** 1.0  
**Last Updated:** Feb 9, 2026  
**Author:** Skills Intelligence Team  
**Status:** 📋 Specification - Awaiting Approval
