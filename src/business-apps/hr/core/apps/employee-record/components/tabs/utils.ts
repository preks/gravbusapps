import dayjs from 'dayjs';

/**
 * Helper function to get level color and description
 */
export const getLevelInfo = (level: number) => {
  switch (level) {
    case 1: return { 
      color: 'var(--nw-color-chart-2)', // Blue
      bgColor: 'var(--nw-color-info-secondary)', 
      textColor: 'var(--nw-color-info-secondary-foreground)',
      label: 'Beginner',
      description: 'Basic understanding'
    };
    case 2: return { 
      color: 'var(--nw-color-success)', // Green
      bgColor: 'var(--nw-color-success-secondary)', 
      textColor: 'var(--nw-color-success-secondary-foreground)',
      label: 'Intermediate',
      description: 'Working knowledge'
    };
    case 3: return { 
      color: 'var(--nw-color-chart-5)', // Yellow
      bgColor: 'var(--nw-color-warning-secondary)', 
      textColor: 'var(--nw-color-warning-secondary-foreground)',
      label: 'Advanced',
      description: 'Proficient level'
    };
    case 4: return { 
      color: 'var(--nw-color-chart-6)', // Amber/Orange
      bgColor: 'var(--nw-color-warning-secondary)', 
      textColor: 'var(--nw-color-warning-secondary-foreground)',
      label: 'Expert',
      description: 'Deep expertise'
    };
    case 5: return { 
      color: 'var(--nw-color-destructive)', // Red
      bgColor: 'var(--nw-color-destructive-secondary)', 
      textColor: 'var(--nw-color-destructive-secondary-foreground)',
      label: 'Master',
      description: 'Subject matter expert'
    };
    default: return { 
      color: 'var(--nw-color-muted-foreground)', 
      bgColor: 'var(--nw-color-muted)', 
      textColor: 'var(--nw-color-muted-foreground)',
      label: 'Unknown',
      description: 'Level not specified'
    };
  }
};

/**
 * Helper function to get skill category from additional properties
 */
export const getSkillCategory = (additionalProperties?: any): string => {
  if (!additionalProperties) return 'General';
  
  // Try to extract category from additional properties
  const category = additionalProperties.category || 
                 additionalProperties.type || 
                 additionalProperties.skillType ||
                 'General';
  
  return category;
};

/**
 * Helper function to get time since creation
 */
export const getTimeSince = (dateString: string | null): string => {
  if (!dateString) return 'Unknown';
  
  const date = dayjs(dateString);
  const now = dayjs();
  const diffInDays = now.diff(date, 'day');
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
};

/**
 * Helper function to convert skill level to number
 */
const getLevelNumber = (level: any): number => {
  if (typeof level === 'number') return level;
  if (typeof level === 'string') {
    // Handle string levels like "Advanced", "Beginner", etc.
    const levelMap: { [key: string]: number } = {
      'Beginner': 1,
      'Intermediate': 2,
      'Advanced': 3,
      'Expert': 4,
      'Master': 5
    };
    return levelMap[level] || Number(level) || 0;
  }
  return 0;
};

/**
 * Calculate skill statistics
 */
export const calculateSkillStats = (employeeSkills: any[]) => {
  const validSkills = employeeSkills.filter(skill => !skill.isDeleted);
  
  if (validSkills.length === 0) {
    return {
      total: 0,
      highestSkills: []
    };
  }
  
  // Filter skills that have levels for highest level calculation
  const skillsWithLevels = validSkills.filter(skill => skill.level && skill.level !== null && skill.level !== '');
  
  if (skillsWithLevels.length === 0) {
    return {
      total: validSkills.length,
      highestSkills: []
    };
  }
  
  // Find the highest level using the helper function
  const highestLevel = Math.max(...skillsWithLevels.map(skill => getLevelNumber(skill.level)));
  
  // Find all skills with the highest level
  const highestSkills = skillsWithLevels.filter(skill => getLevelNumber(skill.level) === highestLevel);
  
  return {
    total: validSkills.length,
    highestSkills
  };
}; 