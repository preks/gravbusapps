/**
 * AI Assistant Panel
 * Context-aware insights and recommendations for bank managers
 */

import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Badge,
  Button
} from '@newwork/nw-design-system'
import { Sparkle, ArrowRight, Info, Warning, CheckCircle } from '@phosphor-icons/react'
import { AIInsight } from '../types/banking.types'
import { getTimeAgo } from '../utils/formatters'

export interface AIAssistantPanelProps extends BusinessAppContextProps {
  pendingApprovalsCount?: number
  vipCustomersCount?: number
  teamAbsencesCount?: number
  onOpenChat?: (message: string) => void
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  pendingApprovalsCount = 0,
  vipCustomersCount = 0,
  teamAbsencesCount = 0,
  onOpenChat,
  ...context
}) => {
  // Generate context-aware AI insights
  const aiInsights: AIInsight[] = useMemo(() => {
    const insights: AIInsight[] = []
    const now = new Date()
    const hour = now.getHours()

    // Morning briefing (8:00-10:00)
    if (hour >= 8 && hour < 10) {
      insights.push({
        id: 'morning-briefing',
        type: 'information',
        priority: 'high',
        title: 'Guten Morgen!',
        message: `Heute haben Sie ${pendingApprovalsCount} Genehmigungen und ${vipCustomersCount} VIP-Kunden-Termine.`,
        suggestedAction: 'Morgenbriefing anzeigen',
        actionLabel: 'Briefing öffnen',
        timestamp: now.toISOString()
      })
    }

    // Urgent approvals
    if (pendingApprovalsCount > 0) {
      const urgency = pendingApprovalsCount > 3 ? 'high' : 'medium'
      insights.push({
        id: 'urgent-approvals',
        type: urgency === 'high' ? 'warning' : 'action',
        priority: urgency,
        title: 'Ausstehende Genehmigungen',
        message: `${pendingApprovalsCount} Kreditanträge benötigen Ihre Genehmigung bis ${hour + 4}:00 Uhr`,
        suggestedAction: 'Mit KI-Empfehlungen prüfen',
        actionLabel: 'Prüfen',
        timestamp: now.toISOString()
      })
    }

    // VIP Customer opportunities
    if (vipCustomersCount > 0) {
      insights.push({
        id: 'vip-opportunities',
        type: 'opportunity',
        priority: 'medium',
        title: 'VIP-Kunden Potenzial',
        message: `${vipCustomersCount} VIP-Kunden haben offene Investment-Möglichkeiten`,
        suggestedAction: 'Portfolio-Analyse anzeigen',
        actionLabel: 'Analyse',
        timestamp: now.toISOString()
      })
    }

    // Team performance (afternoon insight)
    if (hour >= 14 && hour < 18) {
      insights.push({
        id: 'team-performance',
        type: 'information',
        priority: 'low',
        title: 'Team Performance Update',
        message: 'Ihr Team liegt diese Woche 12% über dem Ziel. Ausgezeichnete Arbeit!',
        suggestedAction: 'Detaillierte Analyse',
        actionLabel: 'Details',
        timestamp: now.toISOString()
      })
    }

    // Compliance reminder (daily)
    const dayOfMonth = now.getDate()
    if (dayOfMonth >= 25 && dayOfMonth <= 31) {
      insights.push({
        id: 'compliance-reminder',
        type: 'warning',
        priority: 'medium',
        title: 'Monatsabschluss-Compliance',
        message: 'Bitte stellen Sie sicher, dass alle Compliance-Berichte bis Monatsende eingereicht werden.',
        suggestedAction: 'Compliance-Dashboard öffnen',
        actionLabel: 'Dashboard',
        timestamp: now.toISOString()
      })
    }

    // Sort by priority
    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [pendingApprovalsCount, vipCustomersCount, teamAbsencesCount])

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'action':
        return <CheckCircle className="gba:h-5 gba:w-5 gba:text-info" />
      case 'warning':
        return <Warning className="gba:h-5 gba:w-5 gba:text-warning" />
      case 'opportunity':
        return <Sparkle className="gba:h-5 gba:w-5 gba:text-success" />
      default:
        return <Info className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
    }
  }

  const getPriorityBadge = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Dringend</Badge>
      case 'medium':
        return <Badge variant="warning">Wichtig</Badge>
      default:
        return <Badge variant="default">Info</Badge>
    }
  }

  const handleInsightAction = (insight: AIInsight) => {
    if (onOpenChat && insight.suggestedAction) {
      // Open chat with contextual question
      let chatMessage = insight.suggestedAction

      // Enhance with context
      if (insight.id === 'urgent-approvals') {
        chatMessage = 'Zeige mir alle dringenden Genehmigungen mit KI-Empfehlungen und Risikoanalyse'
      } else if (insight.id === 'vip-opportunities') {
        chatMessage = 'Analysiere die Investment-Möglichkeiten meiner VIP-Kunden und gib Empfehlungen'
      } else if (insight.id === 'team-performance') {
        chatMessage = 'Gib mir eine detaillierte Analyse der Team-Performance mit Verbesserungsvorschlägen'
      }

      onOpenChat(chatMessage)
    }
  }

  return (
    <Card data-testid="ai-assistant-panel">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Sparkle className="gba:h-5 gba:w-5" />
          KI-Assistent
        </CardTitle>
        <CardDescription>Intelligente Empfehlungen für Sie</CardDescription>
      </CardHeader>
      <CardContent>
        {aiInsights.length === 0 ? (
          <div className="gba:text-center gba:py-6">
            <Sparkle className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
            <p className="gba:text-sm gba:text-muted-foreground">
              Keine neuen Empfehlungen
            </p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              <CheckCircle className="gba:inline gba:h-3 gba:w-3 gba:mr-1" />
              Alles erledigt!
            </p>
          </div>
        ) : (
          <div className="gba:space-y-3">
            {aiInsights.map(insight => (
              <div
                key={insight.id}
                className="gba:p-4 gba:border gba:rounded-lg hover:gba:bg-accent gba:cursor-pointer gba:transition-colors"
                onClick={() => handleInsightAction(insight)}
                data-testid={`ai-insight-${insight.id}`}
              >
                <div className="gba:flex gba:items-start gba:gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                      <h4 className="gba:font-medium gba:text-sm">{insight.title}</h4>
                      {getPriorityBadge(insight.priority)}
                    </div>
                    <p className="gba:text-sm gba:text-muted-foreground">{insight.message}</p>
                    {insight.actionLabel && (
                      <div className="gba:mt-2">
                        <span className="gba:text-xs gba:text-primary gba:flex gba:items-center gba:gap-1">
                          {insight.actionLabel}
                          <ArrowRight className="gba:h-3 gba:w-3" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ask AI Button */}
        <div className="gba:mt-4 gba:pt-4 gba:border-t">
          <Button
            variant="outline"
            className="gba:w-full"
            onClick={() => onOpenChat?.('Was sollte ich heute priorisieren?')}
            data-testid="ask-ai-button"
          >
            <Sparkle className="gba:h-4 gba:w-4 gba:mr-2" />
            KI-Assistent fragen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

