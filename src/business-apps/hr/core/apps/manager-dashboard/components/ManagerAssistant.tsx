'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Button,
  Input
} from '@newwork/nw-design-system';
import {
  PiPaperPlaneRight,
  PiX,
  PiStar as PiSparkle, // Using PiStar as replacement for PiSparkle
} from 'react-icons/pi';

// AI suggestions
const aiSuggestions = [
  "Help me prepare for 1:1s",
  "Flag risks on my team",
  "Show team time off calendar",
  "Analyze team workload",
  "Identify skill gaps"
];

interface ManagerAssistantProps {
  className?: string;
}

/**
 * Manager Assistant Component
 * AI-powered assistant for managers to get insights and help with team management
 */
export const ManagerAssistant: React.FC<ManagerAssistantProps> = ({ className }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [showAiResponse, setShowAiResponse] = useState(false);

  // Handle AI prompt submission
  const handleAiPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!aiPrompt.trim()) return;
    
    // Simulate AI response
    setAiResponse(`Here's what I found about "${aiPrompt}":\n\nYou have 3 direct reports: Emily Davis, David Wilson, and Alex Johnson. Emily has a 1:1 scheduled for tomorrow at 2 PM. David is currently on leave until February 15th. Alex is still in the onboarding process (75% complete).\n\nWould you like me to prepare talking points for your 1:1 with Emily?`);
    setShowAiResponse(true);
    setAiPrompt('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setAiPrompt(suggestion);
    // Auto-submit after a short delay
    setTimeout(() => {
      handleAiPromptSubmit({ preventDefault: () => {} } as React.FormEvent);
    }, 300);
  };

  return (
    <Card className={`${className || ''} gba:mb-6`} data-testid="manager-dashboard-ai-card">
      <CardContent className="gba:p-4">
        {showAiResponse ? (
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-start">
              <div className="gba:flex-shrink-0 gba:mr-3">
                <div className="gba:h-8 gba:w-8 gba:bg-primary-100 gba:rounded-full gba:flex gba:items-center gba:justify-center">
                  <PiSparkle className="gba:h-4 gba:w-4 gba:text-primary-600" />
                </div>
              </div>
              <div className="gba:flex-1 gba:bg-neutral-50 gba:p-3 gba:rounded-lg gba:border gba:border-neutral-200">
                <p className="gba:text-sm gba:text-neutral-700 gba:whitespace-pre-line">{aiResponse}</p>
              </div>
              <button 
                className="gba:ml-2 gba:text-neutral-400 gba:hover:text-neutral-600"
                onClick={() => setShowAiResponse(false)}
                data-testid="manager-dashboard-ai-close-button"
              >
                <PiX size={16} />
              </button>
            </div>
            <form onSubmit={handleAiPromptSubmit} className="gba:flex gba:space-x-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="gba:flex-1"
                data-testid="manager-dashboard-ai-input"
              />
              <Button 
                type="submit" 
                variant="default"
                size="sm"
                data-testid="manager-dashboard-ai-submit-button"
              >
                <PiPaperPlaneRight size={16} />
              </Button>
            </form>
          </div>
        ) : (
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center">
              <div className="gba:h-8 gba:w-8 gba:bg-primary-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mr-3">
                <PiSparkle className="gba:h-4 gba:w-4 gba:text-primary-600" />
              </div>
              <div>
                <h3 className="gba:text-sm gba:font-medium gba:text-neutral-900">Manager Assistant</h3>
                <p className="gba:text-xs gba:text-neutral-500">Ask me anything about your team</p>
              </div>
            </div>
            <form onSubmit={handleAiPromptSubmit} className="gba:flex gba:space-x-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="How can I help you manage your team today?"
                className="gba:flex-1"
                data-testid="manager-dashboard-ai-input"
              />
              <Button 
                type="submit" 
                variant="default"
                size="sm"
                data-testid="manager-dashboard-ai-submit-button"
              >
                <PiPaperPlaneRight size={16} />
              </Button>
            </form>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {aiSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="gba:text-xs gba:bg-neutral-100 gba:hover:bg-neutral-200 gba:text-neutral-700 gba:px-3 gba:py-1.5 gba:rounded-full gba:transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                  data-testid={`manager-dashboard-ai-suggestion-${index}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManagerAssistant;
