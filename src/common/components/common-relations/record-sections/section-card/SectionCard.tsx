import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system';

export interface Section<T = Record<string, any>> {
  id: string;
  component: React.ComponentType<T>;
  props: T;
}

export interface SectionWrapperProps<T = Record<string, any>> {
  sections: Section<T>[];
  className?: string;
  'data-testid'?: string;
}

const SectionWrapper = <T = Record<string, any>>({ sections, className, 'data-testid': dataTestId }: SectionWrapperProps<T>) => {
  const [activeTab, setActiveTab] = useState(sections[0]?.id || '');
  const isSingleSection = sections.length === 1;
  const singleSection = sections[0];

  // Helper function to get section info from component
  const getSectionInfo = (section: Section<T>) => {
    const Component = section.component;
    const props = { ...section.props, showHeader: false };
    
    // Extract title and actions from component props or static methods
    const sectionTitleProp = (Component as any).sectionTitle;
    const title = typeof sectionTitleProp === 'function' 
      ? sectionTitleProp(section.props)
      : sectionTitleProp || (section.props as any).sectionTitle || 'Section';
    const actions = (Component as any).sectionActions ? (Component as any).sectionActions(section.props) : (section.props as any).sectionActions;
    
    return { title, actions, content: <Component {...(props as any)} /> };
  };

  if (isSingleSection) {
    const sectionInfo = getSectionInfo(singleSection);
    
    // Single section: Card with header containing title and actions
    return (
      <Card className={`${className} gba:flex-col gba:h-full`} data-testid={dataTestId || "section-wrapper-single"}>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-center gba:w-full">
            <CardTitle>{sectionInfo.title}</CardTitle>
            {sectionInfo.actions}
          </div>
        </CardHeader>
        <CardContent className="gba:overflow-auto gba:h-full">
          {sectionInfo.content}
        </CardContent>
      </Card>
    );
  }

  // Multiple sections: Card with custom tab implementation
  return (
    <Card className={`${className} gba:flex-col gba:h-full`} data-testid={dataTestId || "section-wrapper-tabs"}>
      <CardHeader>
        <div
          className="gba:flex gba:justify-between gba:items-center gba:w-full"
        >
          <div>
            {sections.map((section) => {
              const sectionInfo = getSectionInfo(section);
              return (
                <Button
                  key={section.id}
                  variant={activeTab === section.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(section.id)}
                  data-testid={`${section.id}-tab`}
                >
                  {sectionInfo.title}
                </Button>
              );
            })}
          </div>
          {/* Show actions for the active section */}
          {(() => {
            const activeSection = sections.find(section => section.id === activeTab);
            if (activeSection) {
              const sectionInfo = getSectionInfo(activeSection);
              return sectionInfo.actions;
            }
            return null;
          })()}
        </div>
      </CardHeader>
      <CardContent className="gba:overflow-auto gba:h-full">
        {sections.map((section) => (
          activeTab === section.id && (
            <div key={section.id}>
              {getSectionInfo(section).content}
            </div>
          )
        ))}
      </CardContent>
    </Card>
  );
};

export default SectionWrapper as <T = Record<string, any>>(props: SectionWrapperProps<T>) => JSX.Element;
