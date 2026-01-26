/**
 * Note Templates
 *
 * Pre-built templates for common note types.
 */

import type { NoteTemplate, NoteColor } from '../types'

/**
 * Built-in note templates
 */
export const builtInTemplates: NoteTemplate[] = [
  {
    id: 'template-meeting-notes',
    name: 'Meeting Notes',
    description: 'Capture meeting agenda, attendees, and action items',
    icon: '📋',
    color: 'blue',
    category: 'meeting',
    isBuiltIn: true,
    content: `
      <h2>Meeting Details</h2>
      <p><strong>Date:</strong> [Date]</p>
      <p><strong>Time:</strong> [Time]</p>
      <p><strong>Attendees:</strong> [Names]</p>
      
      <h2>Agenda</h2>
      <ul>
        <li>Topic 1</li>
        <li>Topic 2</li>
        <li>Topic 3</li>
      </ul>
      
      <h2>Discussion Notes</h2>
      <p>[Add your notes here]</p>
      
      <h2>Action Items</h2>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">Action item 1 - @owner</li>
        <li data-type="taskItem" data-checked="false">Action item 2 - @owner</li>
      </ul>
      
      <h2>Next Steps</h2>
      <p>[Next meeting date, follow-ups]</p>
    `.trim()
  },
  {
    id: 'template-daily-journal',
    name: 'Daily Journal',
    description: 'Reflect on your day with prompts for gratitude and goals',
    icon: '📓',
    color: 'yellow',
    category: 'personal',
    isBuiltIn: true,
    content: `
      <h2>📅 Date: [Today's Date]</h2>
      
      <h3>🌅 Morning Intentions</h3>
      <p>What do I want to accomplish today?</p>
      <ul>
        <li></li>
        <li></li>
        <li></li>
      </ul>
      
      <h3>🙏 Gratitude</h3>
      <p>Three things I'm grateful for:</p>
      <ol>
        <li></li>
        <li></li>
        <li></li>
      </ol>
      
      <h3>📝 Notes & Reflections</h3>
      <p>[Your thoughts for the day]</p>
      
      <h3>🌙 Evening Reflection</h3>
      <p><strong>What went well today?</strong></p>
      <p></p>
      <p><strong>What could have been better?</strong></p>
      <p></p>
      <p><strong>What did I learn?</strong></p>
      <p></p>
    `.trim()
  },
  {
    id: 'template-project-plan',
    name: 'Project Plan',
    description: 'Structure your project with goals, milestones, and tasks',
    icon: '🎯',
    color: 'green',
    category: 'project',
    isBuiltIn: true,
    content: `
      <h1>Project: [Project Name]</h1>
      
      <h2>📋 Overview</h2>
      <p><strong>Goal:</strong> [What are you trying to achieve?]</p>
      <p><strong>Timeline:</strong> [Start Date] - [End Date]</p>
      <p><strong>Team:</strong> [Team members]</p>
      
      <h2>🎯 Objectives</h2>
      <ol>
        <li>Objective 1</li>
        <li>Objective 2</li>
        <li>Objective 3</li>
      </ol>
      
      <h2>📅 Milestones</h2>
      <table>
        <tr><th>Milestone</th><th>Due Date</th><th>Status</th></tr>
        <tr><td>Milestone 1</td><td>[Date]</td><td>🟡 In Progress</td></tr>
        <tr><td>Milestone 2</td><td>[Date]</td><td>⚪ Not Started</td></tr>
        <tr><td>Milestone 3</td><td>[Date]</td><td>⚪ Not Started</td></tr>
      </table>
      
      <h2>✅ Tasks</h2>
      <h3>Phase 1</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">Task 1</li>
        <li data-type="taskItem" data-checked="false">Task 2</li>
      </ul>
      
      <h3>Phase 2</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">Task 3</li>
        <li data-type="taskItem" data-checked="false">Task 4</li>
      </ul>
      
      <h2>⚠️ Risks & Blockers</h2>
      <ul>
        <li></li>
      </ul>
      
      <h2>📎 Resources</h2>
      <ul>
        <li><a href="#">Link to resource</a></li>
      </ul>
    `.trim()
  },
  {
    id: 'template-weekly-review',
    name: 'Weekly Review',
    description: 'Review your week and plan for the next one',
    icon: '📊',
    color: 'purple',
    category: 'personal',
    isBuiltIn: true,
    content: `
      <h1>Weekly Review: [Week of Date]</h1>
      
      <h2>🔄 Last Week in Review</h2>
      <h3>Accomplishments</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true">Completed item 1</li>
        <li data-type="taskItem" data-checked="true">Completed item 2</li>
      </ul>
      
      <h3>What Didn't Get Done</h3>
      <ul>
        <li>Item 1 - [Reason]</li>
      </ul>
      
      <h3>Key Learnings</h3>
      <ul>
        <li></li>
      </ul>
      
      <h2>📅 Next Week Planning</h2>
      <h3>Top Priorities</h3>
      <ol>
        <li>Priority 1</li>
        <li>Priority 2</li>
        <li>Priority 3</li>
      </ol>
      
      <h3>Tasks</h3>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">Task 1</li>
        <li data-type="taskItem" data-checked="false">Task 2</li>
        <li data-type="taskItem" data-checked="false">Task 3</li>
      </ul>
      
      <h3>Meetings</h3>
      <ul>
        <li>[Day] - [Meeting]</li>
      </ul>
      
      <h2>💭 Notes</h2>
      <p></p>
    `.trim()
  },
  {
    id: 'template-brainstorm',
    name: 'Brainstorm',
    description: 'Capture ideas freely with mind mapping structure',
    icon: '💡',
    color: 'orange',
    category: 'work',
    isBuiltIn: true,
    content: `
      <h1>💡 Brainstorm: [Topic]</h1>
      
      <h2>Central Question</h2>
      <blockquote>
        <p>[What problem are you trying to solve?]</p>
      </blockquote>
      
      <h2>Ideas</h2>
      <h3>Category 1</h3>
      <ul>
        <li>Idea 1</li>
        <li>Idea 2</li>
        <li>Idea 3</li>
      </ul>
      
      <h3>Category 2</h3>
      <ul>
        <li>Idea 4</li>
        <li>Idea 5</li>
        <li>Idea 6</li>
      </ul>
      
      <h3>Wild Ideas 🚀</h3>
      <ul>
        <li></li>
      </ul>
      
      <h2>Evaluation</h2>
      <table>
        <tr><th>Idea</th><th>Pros</th><th>Cons</th><th>Feasibility</th></tr>
        <tr><td>Idea 1</td><td></td><td></td><td>⭐⭐⭐</td></tr>
        <tr><td>Idea 2</td><td></td><td></td><td>⭐⭐</td></tr>
      </table>
      
      <h2>Next Steps</h2>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">Research idea X further</li>
        <li data-type="taskItem" data-checked="false">Discuss with team</li>
      </ul>
    `.trim()
  },
  {
    id: 'template-1on1',
    name: '1:1 Meeting',
    description: 'Template for one-on-one meetings with team members',
    icon: '👥',
    color: 'teal',
    category: 'meeting',
    isBuiltIn: true,
    content: `
      <h1>1:1 with [Name]</h1>
      <p><strong>Date:</strong> [Date]</p>
      
      <h2>🔄 Updates</h2>
      <p>[What have you been working on since last time?]</p>
      
      <h2>🎯 Goals Check-in</h2>
      <ul>
        <li>Goal 1: [Status]</li>
        <li>Goal 2: [Status]</li>
      </ul>
      
      <h2>💬 Discussion Topics</h2>
      <ul>
        <li></li>
        <li></li>
      </ul>
      
      <h2>🙋 Questions / Concerns</h2>
      <ul>
        <li></li>
      </ul>
      
      <h2>🌱 Growth & Development</h2>
      <p>[Skills to develop, training opportunities, career goals]</p>
      
      <h2>✅ Action Items</h2>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">Action 1 - @owner</li>
        <li data-type="taskItem" data-checked="false">Action 2 - @owner</li>
      </ul>
      
      <h2>📅 Next Meeting</h2>
      <p>[Date and time]</p>
    `.trim()
  },
  {
    id: 'template-bug-report',
    name: 'Bug Report',
    description: 'Document bugs with steps to reproduce and expected behavior',
    icon: '🐛',
    color: 'red',
    category: 'work',
    isBuiltIn: true,
    content: `
      <h1>🐛 Bug Report: [Brief Description]</h1>
      
      <h2>Summary</h2>
      <p>[One-line description of the bug]</p>
      
      <h2>Environment</h2>
      <ul>
        <li><strong>Browser:</strong> [Chrome/Firefox/Safari + version]</li>
        <li><strong>OS:</strong> [Windows/macOS/Linux + version]</li>
        <li><strong>App Version:</strong> [Version number]</li>
      </ul>
      
      <h2>Steps to Reproduce</h2>
      <ol>
        <li>Step 1</li>
        <li>Step 2</li>
        <li>Step 3</li>
      </ol>
      
      <h2>Expected Behavior</h2>
      <p>[What should happen?]</p>
      
      <h2>Actual Behavior</h2>
      <p>[What actually happens?]</p>
      
      <h2>Screenshots / Videos</h2>
      <p>[Attach or link to visual evidence]</p>
      
      <h2>Console Errors</h2>
      <pre><code>[Paste any error messages here]</code></pre>
      
      <h2>Additional Context</h2>
      <p>[Any other relevant information]</p>
      
      <h2>Severity</h2>
      <p>🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low</p>
    `.trim()
  },
  {
    id: 'template-blank',
    name: 'Blank Note',
    description: 'Start with a clean slate',
    icon: '📄',
    color: 'default',
    category: 'other',
    isBuiltIn: true,
    content: '<p></p>'
  }
]

/**
 * Get template by ID
 */
export function getTemplateById(id: string): NoteTemplate | undefined {
  return builtInTemplates.find(t => t.id === id)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: NoteTemplate['category']): NoteTemplate[] {
  return builtInTemplates.filter(t => t.category === category)
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): Array<{ value: NoteTemplate['category']; label: string }> {
  return [
    { value: 'meeting', label: 'Meetings' },
    { value: 'project', label: 'Projects' },
    { value: 'personal', label: 'Personal' },
    { value: 'work', label: 'Work' },
    { value: 'other', label: 'Other' }
  ]
}

/**
 * Apply template to create note content
 */
export function applyTemplate(template: NoteTemplate, replacements?: Record<string, string>): string {
  let content = template.content

  // Replace placeholders
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), value)
    })
  }

  // Replace date placeholders
  const today = new Date()
  content = content.replace(/\[Date\]/g, today.toLocaleDateString())
  content = content.replace(/\[Today's Date\]/g, today.toLocaleDateString())
  content = content.replace(/\[Time\]/g, today.toLocaleTimeString())
  content = content.replace(
    /\[Week of Date\]/g,
    `Week of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
  )

  return content
}
