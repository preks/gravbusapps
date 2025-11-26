import React, { useState, useEffect } from 'react';
import { RobotIcon, SparkleIcon } from '@phosphor-icons/react';

// Development configuration
const DEV_CONFIG = {
  SHOW_IMMEDIATELY: false, // Set to true to show tooltip immediately (for development)
  DELAY_MS: 10000, // Delay in milliseconds when SHOW_IMMEDIATELY is false
  CLEAR_STORAGE_ON_LOAD: false // Set to true to clear localStorage on component load (for testing)
};

export const AIOnboardingTooltip: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    console.log('🤖 [AI Tooltip] useEffect triggered');
    console.log('🤖 [AI Tooltip] SHOW_IMMEDIATELY:', DEV_CONFIG.SHOW_IMMEDIATELY);
    console.log('🤖 [AI Tooltip] DELAY_MS:', DEV_CONFIG.DELAY_MS);
    
    // Clear localStorage for testing (development only)
    if (DEV_CONFIG.CLEAR_STORAGE_ON_LOAD) {
      console.log('🤖 [AI Tooltip] Clearing localStorage for testing');
      localStorage.removeItem('ai-tooltip-dismissed');
    }
    
    // Check if user has dismissed this before (skip in dev mode when showing immediately)
    if (!DEV_CONFIG.SHOW_IMMEDIATELY) {
      const dismissed = localStorage.getItem('ai-tooltip-dismissed');
      console.log('🤖 [AI Tooltip] Dismissed status:', dismissed);
      if (dismissed) {
        console.log('🤖 [AI Tooltip] Previously dismissed, not showing');
        setIsDismissed(true);
        return;
      }
    }

    if (DEV_CONFIG.SHOW_IMMEDIATELY) {
      // Show immediately for development
      console.log('🤖 [AI Tooltip] Showing immediately');
      setIsVisible(true);
      setIsAnimating(true);
    } else {
      // Show tooltip after configured delay
      console.log('🤖 [AI Tooltip] Setting timer for', DEV_CONFIG.DELAY_MS, 'ms');
      const timer = setTimeout(() => {
        console.log('🤖 [AI Tooltip] Timer fired! Showing tooltip');
        setIsVisible(true);
        setIsAnimating(true);
      }, DEV_CONFIG.DELAY_MS);

      return () => {
        console.log('🤖 [AI Tooltip] Cleaning up timer');
        clearTimeout(timer);
      };
    }
  }, []);

  const handleClose = () => {
    // Just close for this session, don't save to localStorage
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      setIsDismissed(true);
    }, 300);
  };

  const handleDismissPermanently = () => {
    // Permanently dismiss and save to localStorage
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      setIsDismissed(true);
      localStorage.setItem('ai-tooltip-dismissed', 'true');
    }, 300);
  };

  const handleAskAI = () => {
    console.log('🤖 [AI Tooltip] Ask AI button clicked!');
    
    // Add visual feedback first
    const button = document.querySelector('[data-testid="ai-tooltip-ask-ai"]') as HTMLElement;
    if (button) {
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = '';
      }, 150);
    }
    
    // Trigger the existing chat system - targeting the specific gravity-platform chat button
    try {
      console.log('🤖 [AI Tooltip] Attempting to open gravity-platform chat...');
      
      // Method 1: Target the specific chat button structure from gravity-platform
      const specificChatSelectors = [
        // Exact match for the gravity-platform chat button
        'button[title="Open AI Assistant"]',
        // Backup selectors based on the HTML structure
        'button.fixed.bottom-4.right-4.z-30',
        '.fixed.bottom-4.right-4 button',
        // Generic chat selectors as fallback
        '[title*="AI Assistant"]',
        '[title*="Chat"]',
        '[class*="fixed"][class*="bottom-4"][class*="right-4"]'
      ];

      let chatOpened = false;
      
      // Debug: Log all buttons found
      console.log('🤖 [Debug] Searching for chat buttons...');
      specificChatSelectors.forEach((selector, index) => {
        const elements = document.querySelectorAll(selector);
        console.log(`🤖 [Debug] Selector ${index + 1} "${selector}": Found ${elements.length} elements`);
        elements.forEach((el, i) => {
          const rect = el.getBoundingClientRect();
          console.log(`  Element ${i + 1}:`, {
            visible: rect.width > 0 && rect.height > 0,
            rect: { width: rect.width, height: rect.height },
            title: el.getAttribute('title'),
            classes: el.className
          });
        });
      });
      
      for (const selector of specificChatSelectors) {
        const chatButton = document.querySelector(selector);
        if (chatButton && chatButton instanceof HTMLElement) {
          // Verify it's visible and clickable
          const rect = chatButton.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            console.log(`🤖 Found chat button with selector: ${selector}`);
            console.log('🤖 Button details:', {
              title: chatButton.getAttribute('title'),
              classes: chatButton.className,
              rect: { width: rect.width, height: rect.height }
            });
            
            // Add visual highlight before clicking
            chatButton.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.8)';
            setTimeout(() => {
              chatButton.style.boxShadow = '';
            }, 1000);
            
            chatButton.click();
            console.log('🤖 ✅ Successfully clicked gravity-platform chat button!');
            chatOpened = true;
            break;
          }
        }
      }

      // Method 2: If specific selectors fail, try broader search
      if (!chatOpened) {
        console.log('🤖 [Debug] Trying fallback selectors...');
        const fallbackSelectors = [
          '[data-testid*="chat"]',
          '[class*="chat"]', 
          '[id*="chat"]',
          'button[class*="fixed"][class*="bottom"]',
          '.fixed button[title*="Assistant"]'
        ];

        for (const selector of fallbackSelectors) {
          const chatElement = document.querySelector(selector);
          if (chatElement && chatElement instanceof HTMLElement) {
            const rect = chatElement.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              chatElement.click();
              console.log(`🤖 ✅ Clicked fallback chat element: ${selector}`);
              chatOpened = true;
              break;
            }
          }
        }
      }

      // Method 3: Dispatch custom events for gravity-platform chat system
      if (!chatOpened) {
        console.log('🤖 [Debug] Dispatching custom events...');
        const events = [
          'openAIChat',
          'showAIAssistant', 
          'toggleChat',
          'openGravityChat'
        ];

        events.forEach(eventName => {
          window.dispatchEvent(new CustomEvent(eventName, { 
            detail: { 
              source: 'ai-onboarding-tooltip',
              prefilledMessage: 'Hi! I need help finding the right service template for my request.',
              context: 'service-portal-onboarding',
              platform: 'gravity-platform'
            }
          }));
          console.log(`🤖 Dispatched event: ${eventName}`);
        });
        
        console.log('🤖 Dispatched gravity-platform chat events');
        chatOpened = true;
      }

      if (chatOpened) {
        console.log('🤖 ✅ Chat integration successful with gravity-platform!');
        // Close tooltip after successful chat opening (temporary close, not permanent)
        setTimeout(() => {
          handleClose();
        }, 500);
      } else {
        console.log('🤖 ❌ No chat button found, showing fallback message');
        alert('Chat button not found. Please look for the chat icon in the bottom-right corner of your screen.');
      }
      
    } catch (error) {
      console.error('🤖 ❌ Error opening chat:', error);
      // Fallback: show a message or redirect to a help page
      alert('Chat system is temporarily unavailable. Please try again later.');
    }
  };

  if (isDismissed || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Overlay backdrop */}
      <div 
        className={`gba:fixed gba:inset-0 gba:bg-black/20 gba:backdrop-blur-sm gba:z-40 gba:transition-opacity gba:duration-500 ${
          isAnimating ? 'gba:opacity-100' : 'gba:opacity-0'
        }`}
        onClick={(e) => {
          // Only close if clicking the backdrop itself, not child elements
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      />

      {/* Main Cloud Tooltip */}
      <div 
        className={`gba:fixed gba:z-50 gba:transition-all gba:duration-700 gba:ease-out ${
          isAnimating 
            ? 'gba:opacity-100 gba:scale-100 gba:translate-y-0' 
            : 'gba:opacity-0 gba:scale-95 gba:translate-y-4'
        }`}
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '30vw',
          minWidth: '400px',
          maxWidth: '600px'
        }}
      >
        {/* Cloud Shape Container */}
        <div className="gba:relative">
          {/* Main Cloud Body */}
          <div 
            className="gba:relative gba:backdrop-blur-xl gba:border-2 gba:border-white/30 gba:overflow-hidden"
            style={{
              borderRadius: '60px 60px 60px 20px',
              padding: '2.5rem',
              background: 'linear-gradient(-45deg, #6366f1, #9333ea, #ec4899, #14b8a6)',
              backgroundSize: '400% 400%',
              boxShadow: `
                0 32px 64px -12px rgba(59, 130, 246, 0.15),
                0 25px 50px -12px rgba(139, 92, 246, 0.1),
                0 0 0 1px rgba(255, 255, 255, 0.8) inset,
                0 1px 0 0 rgba(255, 255, 255, 0.9) inset
              `,
              animation: 'cloud-float 6s ease-in-out infinite, gradient-shift 15s ease infinite'
            }}
          >
            {/* Enhanced floating particles animation */}
            <div className="gba:absolute gba:inset-0 gba:overflow-hidden gba:rounded-[60px_60px_60px_20px]">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className={`gba:absolute gba:rounded-full ${
                    i % 3 === 0 ? 'gba:bg-blue-400/20' : 
                    i % 3 === 1 ? 'gba:bg-purple-400/20' : 
                    'gba:bg-pink-400/20'
                  }`}
                  style={{
                    width: `${4 + (i % 3) * 2}px`,
                    height: `${4 + (i % 3) * 2}px`,
                    left: `${10 + (i * 7) % 80}%`,
                    top: `${5 + (i * 11) % 70}%`,
                    animation: `particle-float ${3 + (i % 4)}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`
                  }}
                />
              ))}
              
              {/* Magical sparkles */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={`sparkle-${i}`}
                  className="gba:absolute gba:text-yellow-400"
                  style={{
                    left: `${15 + (i * 12) % 70}%`,
                    top: `${10 + (i * 8) % 60}%`,
                    fontSize: `${8 + (i % 3) * 2}px`,
                    animation: `sparkle-twinkle ${2 + (i % 3)}s ease-in-out infinite`,
                    animationDelay: `${i * 0.4}s`
                  }}
                >
                  ✨
                </div>
              ))}
            </div>

            {/* Semi-transparent overlay for better text readability */}
            <div className="gba:absolute gba:inset-0 gba:bg-black/20 gba:rounded-[60px_60px_60px_20px]"></div>

            {/* AI Avatar */}
            <div className="gba:relative gba:z-10 gba:flex gba:items-start gba:space-x-4">
              <div className="gba:relative">
                <div 
                  className="gba:w-16 gba:h-16 gba:bg-white/20 gba:backdrop-blur-sm gba:rounded-full gba:flex gba:items-center gba:justify-center gba:shadow-2xl gba:border-2 gba:border-white/30"
                  style={{
                    animation: 'gentle-bounce 2s ease-in-out infinite',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                  }}
                >
                  <RobotIcon className="gba:w-8 gba:h-8 gba:text-white gba:drop-shadow-lg" />
                </div>
                
                {/* Sparkle effects around avatar */}
                <SparkleIcon 
                  className="gba:absolute gba:-top-1 gba:-right-1 gba:w-4 gba:h-4 gba:text-yellow-300 gba:animate-ping gba:drop-shadow-lg" 
                  style={{ animationDelay: '0.5s' }}
                />
                <SparkleIcon 
                  className="gba:absolute gba:-bottom-1 gba:-left-1 gba:w-3 gba:h-3 gba:text-white gba:animate-ping gba:drop-shadow-lg" 
                  style={{ animationDelay: '1s' }}
                />
              </div>

              {/* Message Content */}
              <div className="gba:flex-1 gba:space-y-4">
                <div>
                  <h3 className="gba:text-xl gba:font-bold gba:text-white gba:mb-2 gba:drop-shadow-sm">
                    Hey!<br />
                    AI can help you find the solution!
                  </h3>
                  <p className="gba:text-white/90 gba:leading-relaxed gba:drop-shadow-sm">
                    I noticed you're browsing service categories. Instead of searching through all options, 
                    <span className="gba:font-semibold gba:text-yellow-200"> just tell me what issue you're facing</span> and 
                    I'll try to help you or find the exact template for you in seconds!
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="gba:space-y-3 gba:relative gba:z-20" style={{ pointerEvents: 'auto' }}>
                  <div className="gba:flex gba:space-x-3">
                    <button
                      onClick={handleAskAI}
                      className="gba:group gba:relative gba:px-6 gba:py-3 gba:bg-white/20 gba:backdrop-blur-sm gba:text-white gba:font-semibold gba:rounded-full gba:border-2 gba:border-white/30 gba:shadow-2xl gba:hover:gba:shadow-2xl gba:transform gba:hover:gba:scale-105 gba:active:gba:scale-95 gba:transition-all gba:duration-300 gba:flex gba:items-center gba:space-x-2 gba:overflow-hidden gba:cursor-pointer"
                      data-testid="ai-tooltip-ask-ai"
                      style={{
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
                        transition: 'all 0.3s ease, box-shadow 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.3) inset, 0 0 20px rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                    >
                      {/* Shimmer effect on hover */}
                      <div 
                        className="gba:absolute gba:inset-0 gba:bg-gradient-to-r gba:from-transparent gba:via-white gba:to-transparent gba:opacity-0 group-hover:gba:opacity-30 gba:transition-opacity gba:duration-300"
                        style={{
                          width: '30%',
                          transform: 'translateX(-200%) skewX(-15deg)',
                          animation: 'shimmer 1.5s ease-in-out infinite'
                        }}
                      />
                      
                      {/* Glow effect */}
                      <div 
                        className="gba:absolute gba:inset-0 gba:rounded-full gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:duration-300" 
                        style={{
                          boxShadow: '0 0 30px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.4)'
                        }}
                      />
                      
                      {/* Content */}
                      <div className="gba:relative gba:z-10 gba:flex gba:items-center gba:space-x-2">
                        <RobotIcon className="gba:w-5 gba:h-5 group-hover:gba:animate-bounce" />
                        <span className="gba:relative">
                          Ask AI Now
                          {/* Sparkle on hover */}
                          <SparkleIcon className="gba:absolute gba:-top-1 gba:-right-1 gba:w-3 gba:h-3 gba:text-yellow-300 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:duration-300 gba:animate-ping" />
                        </span>
                      </div>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        console.log('🔍 [Browse More] Button clicked!');
                        e.preventDefault();
                        e.stopPropagation();
                        handleClose();
                      }}
                      className="gba:relative gba:z-10 gba:px-6 gba:py-3 gba:bg-white/10 gba:backdrop-blur-sm gba:text-white gba:font-medium gba:rounded-full gba:border-2 gba:border-white/20 gba:hover:gba:bg-white/20 gba:hover:gba:border-white/40 gba:hover:gba:scale-105 gba:active:gba:scale-95 gba:transition-all gba:duration-300 gba:cursor-pointer"
                      data-testid="ai-tooltip-browse-more"
                      style={{ 
                        pointerEvents: 'auto',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                      }}
                      onMouseEnter={(e) => {
                        console.log('🔍 [Browse More] Mouse enter');
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 0 15px rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        console.log('🔍 [Browse More] Mouse leave');
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
                      }}
                    >
                      Browse More
                    </button>
                  </div>
                  
                  {/* Don't show again option */}
                  <div className="gba:text-center">
                    <button
                      onClick={() => {
                        console.log('🚫 [Don\'t Show Again] Button clicked!');
                        handleDismissPermanently();
                      }}
                      className="gba:text-xs gba:text-white/70 gba:hover:gba:text-white gba:underline gba:transition-colors gba:drop-shadow-sm"
                      data-testid="ai-tooltip-dont-show-again"
                    >
                      Don't show this again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>



      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes gentle-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        
        
        @keyframes cloud-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-2px) rotate(0.5deg); }
          66% { transform: translateY(1px) rotate(-0.3deg); }
        }
        
        @keyframes particle-float {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.3; }
          25% { transform: translateY(-8px) translateX(2px) scale(1.1); opacity: 0.6; }
          50% { transform: translateY(-4px) translateX(-1px) scale(0.9); opacity: 0.8; }
          75% { transform: translateY(-6px) translateX(1px) scale(1.05); opacity: 0.4; }
        }
        
        @keyframes sparkle-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }
        
        
        .hero-gradient {
          background: linear-gradient(-45deg, #6366f1, #9333ea, #ec4899, #14b8a6);
          background-size: 400% 400%;
          animation: gradient-shift 15s ease infinite;
        }
        
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-200%) skewX(-15deg); }
          100% { transform: translateX(300%) skewX(-15deg); }
        }
      `}</style>
    </>
  );
};
