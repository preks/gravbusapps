import React, { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { Bot, FileText, StickyNote, Clock, Globe, Inbox, Users } from 'lucide-react'
import {
  HeroSection,
  ToolCard,
  AIQuickStart,
  OrbitBackground,
  ConnectionsVisualization,
  ToolCardProps
} from './components'

export interface NewworkEveryProps extends BusinessAppContextProps {
  'data-testid'?: string
}

/**
 * NEWWORK EVERY - Personal productivity landing page
 *
 * Provides unified access to all NEWWORK personal productivity tools:
 * - EveryAI (AI Assistant)
 * - Chat (Messages & Calendar)
 * - MyDocuments (Files & Spreadsheets)
 * - Notes
 * - Time (Time Tracking)
 * - Glue (Intranet)
 */
export const NewworkEvery: React.FC<NewworkEveryProps> = ({ 'data-testid': testId = 'newwork-every' }) => {
  // Tool definitions - organized in rows:
  // Row 1: Every* family (EveryAI, EveryOne, EveryBox)
  // Row 2: Productivity tools (MyDocuments, Time, Glue)
  // Row 3: Coming Soon (Notes - centered)
  const tools: Array<Omit<ToolCardProps, 'data-testid'> & { id: string }> = [
    // Row 1: The "Every" family
    {
      id: 'every-ai',
      title: 'EveryAI',
      description: 'Your intelligent AI assistant. Ask questions, get help with tasks, and let AI automate your work.',
      icon: Bot,
      href: '/platform/every-ai',
      badge: 'AI-Powered',
      badgeVariant: 'info',
      accentColor: 'ai'
    },
    {
      id: 'every-one',
      title: 'EveryOne',
      description: 'Messages, calendar integration, and reminders. Stay connected with your team and organized.',
      icon: Users,
      href: '/platform/apps/platform/apps/chat',
      badge: 'Popular',
      badgeVariant: 'success',
      accentColor: 'primary'
    },
    {
      id: 'every-box',
      title: 'EveryBox',
      description: 'Your unified inbox for tasks and approvals. Manage workflows and stay on top of your work.',
      icon: Inbox,
      href: '/platform/apps/core/every/apps/every-box',
      badge: 'Essential',
      badgeVariant: 'info',
      accentColor: 'warning'
    },
    // Row 2: Productivity tools
    {
      id: 'my-documents',
      title: 'MyDocuments',
      description: 'Create and manage documents and spreadsheets. Collaborate with AI-powered editing features.',
      icon: FileText,
      href: '/platform/apps/document-apps',
      badge: 'New',
      badgeVariant: 'success',
      accentColor: 'success'
    },
    {
      id: 'time',
      title: 'Time',
      description: 'Track your work hours and productivity. View time sheets and manage attendance.',
      icon: Clock,
      href: '/platform/apps/hr/core/apps/my-time',
      badge: 'Essential',
      badgeVariant: 'info',
      accentColor: 'info'
    },
    {
      id: 'glue',
      title: 'Glue',
      description: 'Your company intranet. News, knowledge base, and everything about your organization.',
      icon: Globe,
      href: '/platform/content/intranet',
      badge: 'Intranet',
      badgeVariant: 'success',
      accentColor: 'success'
    },
    // Row 3: Coming Soon (centered)
    {
      id: 'notes',
      title: 'Notes',
      description: 'Quick capture for your thoughts and ideas. Organize notes with tags and search.',
      icon: StickyNote,
      href: '/platform/apps/notes',
      isComingSoon: true,
      badge: 'Coming Soon',
      accentColor: 'offline'
    }
  ]

  // Handle AI quick start submission
  const handleAIQuickStart = useCallback((prompt: string) => {
    const lowerPrompt = prompt.toLowerCase()

    // Keywords for different tools
    const aiKeywords = ['ai', 'help', 'assistant', 'ask', 'question', 'how do i', 'what is', 'explain']
    const everyOneKeywords = [
      'chat',
      'message',
      'meeting',
      'calendar',
      'reminder',
      'schedule',
      'call',
      'video',
      'everyone',
      'team'
    ]
    const everyBoxKeywords = [
      'inbox',
      'task',
      'approval',
      'workflow',
      'pending',
      'approve',
      'reject',
      'box',
      'everybox'
    ]
    const documentKeywords = ['document', 'file', 'spreadsheet', 'create doc', 'edit', 'write', 'excel', 'word']
    const notesKeywords = ['note', 'idea', 'thought', 'capture', 'quick note', 'jot down']
    const timeKeywords = ['time', 'hours', 'track', 'timesheet', 'attendance', 'clock', 'log time']
    const glueKeywords = ['intranet', 'news', 'policy', 'company', 'knowledge', 'search', 'find info', 'glue']

    // Score each tool
    const scores = {
      everyAi: aiKeywords.filter(k => lowerPrompt.includes(k)).length,
      everyOne: everyOneKeywords.filter(k => lowerPrompt.includes(k)).length,
      everyBox: everyBoxKeywords.filter(k => lowerPrompt.includes(k)).length,
      documents: documentKeywords.filter(k => lowerPrompt.includes(k)).length,
      notes: notesKeywords.filter(k => lowerPrompt.includes(k)).length,
      time: timeKeywords.filter(k => lowerPrompt.includes(k)).length,
      glue: glueKeywords.filter(k => lowerPrompt.includes(k)).length
    }

    const maxScore = Math.max(...Object.values(scores))

    // Default to EveryAI for general questions
    let targetUrl = '/platform/every-ai'

    if (maxScore > 0) {
      if (scores.everyOne === maxScore) {
        targetUrl = '/platform/apps/platform/apps/chat'
      } else if (scores.everyBox === maxScore) {
        targetUrl = '/platform/apps/core/every/apps/every-box'
      } else if (scores.documents === maxScore) {
        targetUrl = '/platform/apps/document-apps'
      } else if (scores.notes === maxScore) {
        // Notes coming soon, redirect to EveryAI
        targetUrl = '/platform/every-ai'
      } else if (scores.time === maxScore) {
        targetUrl = '/platform/apps/hr/core/apps/my-time'
      } else if (scores.glue === maxScore) {
        targetUrl = '/platform/content/intranet'
      }
    }

    // Store prompt for target app
    try {
      sessionStorage.setItem('newworkEveryPrompt', prompt)
    } catch {
      // Ignore storage errors
    }

    navigateTo(targetUrl)
  }, [])

  // Handle tool card click
  const handleToolClick = useCallback((href: string) => {
    navigateTo(href)
  }, [])

  return (
    <div className="gba:min-h-screen gba:bg-background gba:relative" data-testid={testId}>
      {/* Orbit Background - Warm productivity atmosphere */}
      <div className="gba:fixed gba:inset-0 gba:pointer-events-none gba:z-0 gba:overflow-hidden">
        <OrbitBackground />
      </div>

      {/* Content layer */}
      <div className="gba:relative gba:z-10">
        {/* Hero Section */}
        <HeroSection data-testid={`${testId}-hero`} />

        {/* AI Quick Start Section */}
        <AIQuickStart onSubmit={handleAIQuickStart} data-testid={`${testId}-ai-quickstart`} />

        {/* Tools Grid Section */}
        <section className="gba:py-6 gba:px-6 gba:relative" data-testid={`${testId}-tools-section`}>
          {/* Background */}
          <div className="gba:absolute gba:inset-0 gba:bg-background" />

          <div className="gba:relative gba:max-w-6xl gba:mx-auto">
            {/* Section header */}
            <div className="gba:text-center gba:mb-6">
              <h2 className="gba:text-2xl gba:sm:text-3xl gba:font-bold gba:text-foreground gba:mb-2">
                Your productivity toolkit
              </h2>
              <p className="gba:text-muted-foreground gba:max-w-xl gba:mx-auto">
                Everything you need for a productive workday, powered by AI and designed for you
              </p>
            </div>

            {/* Featured EveryAI card - Hero style */}
            <div className="gba:mb-4">
              <ToolCard
                {...tools[0]}
                onClick={() => handleToolClick(tools[0].href)}
                data-testid={`${testId}-tool-${tools[0].id}`}
                animationDelay={0.1}
                featured
              />
            </div>

            {/* Remaining tools in 2 rows of 3 */}
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4">
              {tools.slice(1).map((tool, index) => (
                <ToolCard
                  key={tool.id}
                  {...tool}
                  onClick={() => handleToolClick(tool.href)}
                  data-testid={`${testId}-tool-${tool.id}`}
                  animationDelay={0.1 * (index + 2)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Connections Visualization Section */}
        <ConnectionsVisualization data-testid={`${testId}-connections`} />

        {/* Footer tagline */}
        <section className="gba:py-6 gba:px-6 gba:border-t gba:border-border gba:relative">
          <div className="gba:absolute gba:inset-0 gba:bg-background" />
          <div className="gba:relative gba:max-w-4xl gba:mx-auto gba:text-center">
            <p className="gba:text-muted-foreground">
              Part of the <span className="gba:font-semibold gba:text-foreground">NEWWORK</span> platform. Your
              productivity, amplified.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default NewworkEvery
