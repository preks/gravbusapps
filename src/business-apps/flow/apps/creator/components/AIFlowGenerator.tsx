import React, { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Textarea, Spinner } from '@newwork/nw-design-system';
import { Sparkles, Zap } from 'lucide-react';
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient';
import { flowAIClient } from '@/common/network/flows/FlowAIClient';

interface AIFlowGeneratorProps {
  onFlowGenerated: (template: FlowTemplate) => void;
  accessToken: string;
  'data-testid'?: string;
}

/**
 * AI-powered flow generation component with exact original styling
 */
export const AIFlowGenerator: React.FC<AIFlowGeneratorProps> = ({
  onFlowGenerated,
  accessToken,
  'data-testid': testId = 'ai-flow-generator'
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      console.log('Generating flow from prompt:', aiPrompt);
      
      // Call AI service to generate flow template
      const generatedTemplate = await flowAIClient.generateFlowTemplate(aiPrompt.trim(), accessToken);
      
      console.log('Generated template:', generatedTemplate);
      
      // Pass the generated template to parent component
      onFlowGenerated(generatedTemplate);
      
      // Clear the prompt after successful generation
      setAiPrompt('');
      
    } catch (error) {
      console.error('Error generating flow:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="gba:relative gba:overflow-hidden gba:rounded-xl gba:bg-gradient-to-br gba:from-purple-600 gba:via-purple-700 gba:to-indigo-800 gba:p-1" data-testid={testId}>
      {/* Animated background pattern */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-r gba:from-purple-400/20 gba:via-pink-500/20 gba:to-indigo-600/20 gba:animate-pulse"></div>
      
      {/* Content Card */}
      <Card className="gba:relative gba:bg-white gba:border-0 gba:shadow-2xl">
        <CardHeader className="gba:text-center gba:pb-4">
          {/* Sparkles Icon with Glow Effect */}
          <div className="gba:mx-auto gba:mb-3 gba:relative">
            <div className="gba:absolute gba:inset-0 gba:bg-purple-500 gba:rounded-full gba:blur-xl gba:opacity-30 gba:animate-pulse"></div>
            <div className="gba:relative gba:p-3 gba:bg-gradient-to-br gba:from-purple-500 gba:to-indigo-600 gba:rounded-full">
              <Sparkles className="gba:h-8 gba:w-8 gba:text-white" />
            </div>
          </div>
          
          <CardTitle className="gba:text-xl gba:font-bold gba:bg-gradient-to-r gba:from-purple-600 gba:to-indigo-600 gba:bg-clip-text gba:text-transparent">
            Create with AI
          </CardTitle>
          <p className="gba:text-sm gba:text-gray-600 gba:mt-2">
            Describe your workflow and watch AI bring it to life
          </p>
        </CardHeader>
        
        <CardContent className="gba:space-y-6 gba:pt-0">
          {/* Enhanced Textarea */}
          <div className="gba:relative">
            <Textarea
              placeholder="✨ Try something like: 'Create an approval workflow for expense reports with manager review, finance approval, and automatic notifications...'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={6}
              className="gba:min-h-[150px] gba:text-sm gba:border-2 gba:border-purple-200 gba:focus:border-purple-500 gba:rounded-lg gba:bg-gradient-to-br gba:from-purple-50/50 gba:to-indigo-50/50"
              data-testid={`${testId}-ai-prompt`}
            />
            {/* Character counter */}
            <div className="gba:absolute gba:bottom-2 gba:right-2 gba:text-xs gba:text-gray-400">
              {aiPrompt.length}/500
            </div>
          </div>
          
          {/* Enhanced Generate Button */}
          <Button
            onClick={handleAIGenerate}
            disabled={!aiPrompt.trim() || isGenerating}
            className="gba:w-full gba:bg-gradient-to-r gba:from-purple-600 gba:to-indigo-600 gba:hover:from-purple-700 gba:hover:to-indigo-700 gba:text-white gba:font-semibold gba:py-3 gba:rounded-lg gba:shadow-lg gba:shadow-purple-500/25 gba:transition-all gba:duration-200 gba:hover:shadow-xl gba:hover:shadow-purple-500/40 gba:hover:scale-[1.02]"
            data-testid={`${testId}-ai-generate`}
          >
            {isGenerating ? (
              <>
                <Spinner size="sm" className="gba:mr-2" />
                <span className="gba:animate-pulse">Generating Magic...</span>
              </>
            ) : (
              <>
                <Zap className="gba:h-5 gba:w-5 gba:mr-2" />
                Generate Flow
              </>
            )}
          </Button>
          
          {/* AI Tips with Better Design */}
          <div className="gba:bg-gradient-to-r gba:from-purple-50 gba:to-indigo-50 gba:border gba:border-purple-200 gba:rounded-lg gba:p-4">
            <h4 className="gba:font-semibold gba:text-sm gba:mb-3 gba:text-purple-800 gba:flex gba:items-center gba:gap-2">
              <Sparkles className="gba:h-4 gba:w-4" />
              Pro Tips for Amazing Results
            </h4>
            <div className="gba:grid gba:grid-cols-1 gba:gap-2">
              <div className="gba:flex gba:items-start gba:gap-2 gba:text-xs gba:text-purple-700">
                <div className="gba:w-1.5 gba:h-1.5 gba:bg-purple-400 gba:rounded-full gba:mt-1.5"></div>
                <span>Specify roles involved (e.g., Manager, HR, Finance)</span>
              </div>
              <div className="gba:flex gba:items-start gba:gap-2 gba:text-xs gba:text-purple-700">
                <div className="gba:w-1.5 gba:h-1.5 gba:bg-purple-400 gba:rounded-full gba:mt-1.5"></div>
                <span>Describe decision points and conditions</span>
              </div>
              <div className="gba:flex gba:items-start gba:gap-2 gba:text-xs gba:text-purple-700">
                <div className="gba:w-1.5 gba:h-1.5 gba:bg-purple-400 gba:rounded-full gba:mt-1.5"></div>
                <span>Mention timing and approval levels</span>
              </div>
              <div className="gba:flex gba:items-start gba:gap-2 gba:text-xs gba:text-purple-700">
                <div className="gba:w-1.5 gba:h-1.5 gba:bg-purple-400 gba:rounded-full gba:mt-1.5"></div>
                <span>Include notifications and outcomes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};