/**
 * Script to update Tailwind class names to include the gba: prefix
 * This script processes .tsx and .ts files to update Tailwind utility classes
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

// Configuration
const SRC_DIR = path.resolve(process.cwd(), 'src');
const FILE_PATTERN = '**/*.{ts,tsx}';
const PREFIX = 'gba:';
const DRY_RUN = false; // Set to false to apply changes to files

// Log the resolved path for debugging
console.log(`Looking for files in: ${SRC_DIR}`);

// List of common Tailwind utility classes to look for
// This list is not exhaustive but covers the most common ones
const tailwindClasses = [
  // Layout
  'container', 'flex', 'grid', 'block', 'inline', 'hidden', 'inline-block', 'inline-flex',
  // Flexbox
  'flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap', 'flex-1', 'flex-auto', 'flex-initial', 'flex-none',
  'justify-start', 'justify-end', 'justify-center', 'justify-between', 'justify-around', 'justify-evenly',
  'items-start', 'items-end', 'items-center', 'items-baseline', 'items-stretch',
  'self-auto', 'self-start', 'self-end', 'self-center', 'self-stretch',
  // Grid
  'grid-cols', 'col-span', 'col-start', 'col-end', 'grid-rows', 'row-span', 'row-start', 'row-end', 'gap',
  // Spacing
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'space-x', 'space-y',
  // Sizing
  'w', 'h', 'min-w', 'min-h', 'max-w', 'max-h',
  // Typography
  'font', 'text', 'tracking', 'leading', 'font-sans', 'font-serif', 'font-mono', 'font-thin',
  'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold',
  'font-black', 'italic', 'not-italic', 'uppercase', 'lowercase', 'capitalize', 'normal-case',
  'truncate', 'overflow-ellipsis', 'overflow-clip',
  // Backgrounds
  'bg', 'bg-opacity', 'bg-clip', 'bg-repeat', 'bg-fixed', 'bg-local', 'bg-scroll',
  // Borders
  'border', 'border-t', 'border-r', 'border-b', 'border-l', 'border-opacity', 'rounded', 'rounded-t',
  'rounded-r', 'rounded-b', 'rounded-l', 'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl',
  // Effects
  'shadow', 'opacity', 'transition', 'duration', 'ease', 'animate',
  // Filters
  'blur', 'brightness', 'contrast', 'drop-shadow', 'grayscale', 'hue-rotate', 'invert', 'saturate', 'sepia',
  // Tables
  'table', 'table-auto', 'table-fixed',
  // Transitions and Animations
  'transition', 'duration', 'ease', 'delay', 'animate',
  // Transforms
  'transform', 'scale', 'rotate', 'translate', 'skew', 'origin',
  // Interactivity
  'cursor', 'select', 'resize', 'pointer-events', 'user-select',
  // SVG
  'fill', 'stroke', 'stroke-width',
  // Accessibility
  'sr-only', 'not-sr-only',
  // Positions
  'static', 'fixed', 'absolute', 'relative', 'sticky',
  // Z-index
  'z', 'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-auto', 
  // Whitespace
  'whitespace', 'whitespace-normal', 'whitespace-nowrap', 'whitespace-pre', 'whitespace-pre-line', 'whitespace-pre-wrap',
  // Overflow
  'overflow', 'overflow-auto', 'overflow-hidden', 'overflow-visible', 'overflow-scroll', 
  'overflow-x', 'overflow-x-auto', 'overflow-x-hidden', 'overflow-x-visible', 'overflow-x-scroll',
  'overflow-y', 'overflow-y-auto', 'overflow-y-hidden', 'overflow-y-visible', 'overflow-y-scroll',
  // Additional transform classes that were missing
  'rotate', 'rotate-0', 'rotate-45', 'rotate-90', 'rotate-180', '-rotate-90', '-rotate-180',
  // Top, Right, Bottom, Left positioning
  'top', 'right', 'bottom', 'left', 'inset',
  // Additional classes to add
  'ring', 'ring-offset', 'appearance', 'cursor-pointer', 'cursor-not-allowed',
  'focus-within', 'focus-visible', 'outline', 'outline-none', 'outline-offset',
  'invisible', 'visible', 'pointer-events-none', 'pointer-events-auto',
  'break-words', 'break-all', 'break-normal',
  'truncate', 'text-ellipsis', 'text-clip',
  'align-top', 'align-middle', 'align-bottom', 'align-baseline',
  'shrink', 'shrink-0', 'grow', 'grow-0',
  'object-cover', 'object-contain', 'object-fill', 'object-none', 'object-scale-down',
  'backdrop-blur', 'backdrop-filter', 'backdrop-brightness', 'backdrop-contrast', 'backdrop-grayscale',
  'touch-auto', 'touch-none', 'touch-pan-x', 'touch-pan-y', 'touch-manipulation'
];

// Function to check if a class name is a Tailwind utility class
// Function to check if a class name is a Tailwind utility class
function isTailwindClass(className) {
  // Skip classes that already have the prefix
  if (className.startsWith(PREFIX)) return false;

  // Handle arbitrary values like text-[#333]
  const arbitraryValuePattern = /^([a-z][\w-]*)\[(.+)\]$/;
  if (arbitraryValuePattern.test(className)) {
    const base = className.match(arbitraryValuePattern)[1];
    return tailwindClasses.some(prefix => base === prefix || base.startsWith(`${prefix}-`));
  }

  // Handle special patterns: negative values like -mt-2
  const negativeValuePattern = /^-([a-z][\w-]*)-([0-9]+)$/;
  if (negativeValuePattern.test(className)) {
    const base = className.match(negativeValuePattern)[1];
    return tailwindClasses.some(prefix => base === prefix || base.startsWith(`${prefix}-`));
  }

  // Handle regular utility classes
  return tailwindClasses.some(prefix => 
    className === prefix || 
    className.startsWith(`${prefix}-`) || 
    // Handle responsive prefixes (e.g., md:flex)
    /^(sm|md|lg|xl|2xl):/.test(className) && 
    isTailwindClass(className.replace(/^(sm|md|lg|xl|2xl):/, '')) ||
    // Handle state variants like hover:, focus:, active: etc.
    /^(hover|focus|active|disabled|group-hover|focus-within|focus-visible):/.test(className) &&
    isTailwindClass(className.replace(/^(hover|focus|active|disabled|group-hover|focus-within|focus-visible):/, ''))
  );
}

// Function to process className strings
function processClassNames(classStr) {
  if (!classStr || typeof classStr !== 'string') return classStr;

  // Split class names and process each one
  return classStr.split(/\s+/).map(cls => {
    if (!cls) return cls;
    
    // Check for variant prefixes like hover: or md:
    const variantMatch = cls.match(/^(hover|focus|focus-within|focus-visible|active|disabled|group-hover|sm|md|lg|xl|2xl|dark):(.+)$/);
    if (variantMatch) {
      const [, variant, actualClass] = variantMatch;
      // If the actual class is a Tailwind class, add the prefix
      if (isTailwindClass(actualClass)) {
        return `${variant}:${PREFIX}${actualClass}`;
      }
      return cls;
    }
    
    // Regular class without variant
    if (isTailwindClass(cls)) {
      return `${PREFIX}${cls}`;
    }
    return cls;
  }).join(' ');
}

// Function to update className in JSX/TSX
function updateClassNameInJSX(content) {
  // Patterns to match different ways className can be used
  const patterns = [
    // className="fixed class names"
    {
      regex: /className=["']([^"']+)["']/g,
      replacer: (match, classNames) => `className="${processClassNames(classNames)}"`
    },
    // className={`template literals ${dynamic}`}
    {
      regex: /className={\s*`([^`]*)`\s*}/g,
      replacer: (match, classNames) => {
        // Handle template literals with expressions
        const parts = classNames.split(/(\${[^}]+})/);
        const processed = parts.map((part, index) => {
          // Skip expressions like ${var}
          if (index % 2 === 1) return part;
          return processClassNames(part);
        }).join('');
        return `className={\`${processed}\`}`;
      }
    },
    // className={variable}
    // This case is trickier and may require manual review after
    // We can only handle simple expressions here
    {
      regex: /className={\s*(['"])([^'"]+)\1\s*}/g,
      replacer: (match, quote, classNames) => `className={${quote}${processClassNames(classNames)}${quote}}`
    },
    // Special case for conditional classes
    // className={condition ? "class1" : "class2"}
    {
      regex: /className={\s*(.+)\s*\?\s*(['"])([^'"]+)\2\s*:\s*(['"])([^'"]+)\4\s*}/g,
      replacer: (match, condition, quote1, classTrue, quote2, classFalse) => 
        `className={${condition} ? ${quote1}${processClassNames(classTrue)}${quote1} : ${quote2}${processClassNames(classFalse)}${quote2}}`
    },
    // Add these pattern handlers to the patterns array
    // Handle clsx and classnames libraries
    {
      regex: /className=\{(clsx|classnames)\(([^)]+)\)\}/g,
      replacer: (match, funcName, args) => {
        // Process string arguments in clsx/classnames
        const processedArgs = args.replace(/(['"])([^'"]+)\1/g, (match, quote, classes) => 
          `${quote}${processClassNames(classes)}${quote}`);
        return `className={${funcName}(${processedArgs})}`;
      }
    },
    // Handle twMerge utility
    {
      regex: /className=\{twMerge\(([^)]+)\)\}/g,
      replacer: (match, args) => {
        // Process string arguments in twMerge
        const processedArgs = args.replace(/(['"])([^'"]+)\1/g, (match, quote, classes) => 
          `${quote}${processClassNames(classes)}${quote}`);
        return `className={twMerge(${processedArgs})}`;
      }
    }
  ];
  const cnPattern = /className=\{cn\(\s*(['"][^'"]+['"])(?:[,\s]*([^)]+))?\s*\)\}/g;
  const standaloneCnPattern = /cn\(\s*(['"][^'"]+['"])(?:\s*,\s*([^)]+))?\s*\)/g;

  let updatedContent = content;
  patterns.forEach(pattern => {
    updatedContent = updatedContent.replace(pattern.regex, pattern.replacer);
  });
  updatedContent = updatedContent.replace(cnPattern, (match, firstClass, restParams) => {
    const processedFirstClass = `"${processClassNames(firstClass.replace(/['\"]/g, ''))}"`;  
    if (restParams) {
      return `className={cn(${processedFirstClass}, ${restParams})}`;  
    }
    return `className={cn(${processedFirstClass})}`;
  });
  updatedContent = updatedContent.replace(standaloneCnPattern, (match, firstClass, restParams) => {
    const processedFirstClass = `"${processClassNames(firstClass.replace(/['\"]/g, ''))}"`;  
    if (restParams) {
      return `cn(${processedFirstClass}, ${restParams})`;  
    }
    return `cn(${processedFirstClass})`;
  });

  // Process standalone clsx, classnames, and twMerge function calls
  updatedContent = updatedContent.replace(/(clsx|classnames|twMerge)\(([^)]+)\)/g, (match, funcName, args) => {
    // Process string arguments in utility functions
    const processedArgs = args.replace(/(['"])([^'"]+)\1/g, (match, quote, classes) => 
      `${quote}${processClassNames(classes)}${quote}`);
    return `${funcName}(${processedArgs})`;
  });
  
  // Process cva and style definitions
  // Match cva style variant definitions - e.g. "fixed z-50 gap-4 bg-background p-6 shadow-lg..."
  updatedContent = updatedContent.replace(/cva\(\s*(['"](.*?)['"])\s*,/g, (match, fullString, classStr) => {
    const processedClasses = processClassNames(classStr);
    return `cva("${processedClasses}",`;
  });

  // Match variant definitions in cva objects
  updatedContent = updatedContent.replace(/(['"](.*?)['"]):?\s*(['"](.*?)['"])/g, (match, key, keyContent, quote, classStr) => {
    // Only process if it looks like a class string (contains spaces)
    if (classStr && classStr.includes(' ')) {
      const processedClasses = processClassNames(classStr);
      return `${key}: ${quote}${processedClasses}${quote}`;
    }
    return match;
  });

  // Process style objects in React components
  updatedContent = updatedContent.replace(/style=\{\{([^{}]+)\}\}/g, (match, styleContent) => {
    // Process class names in style objects if they appear to be Tailwind classes
    // This is for inline styles, not Tailwind, so typically we wouldn't modify this
    return match;
  });

  // Process object literals with style classes
  updatedContent = processObjectLiterals(updatedContent);

  return updatedContent;
}

// Function to process object literals with style classes
function processObjectLiterals(content) {
  // Match object literals with string values that might contain Tailwind classes
  // This pattern looks for: 'key': 'value' or "key": "value" patterns in objects
  const objectLiteralPattern = /(['"]([\w-]+)['"]\s*:\s*['"]([^'"]+)['"])/g;
  
  return content.replace(objectLiteralPattern, (match, full, key, value) => {
    // Skip if it doesn't look like it contains Tailwind classes or already has the prefix
    if (value.includes(PREFIX) || 
        (!value.includes('bg-') && !value.includes('text-') && !value.includes('border-') && 
         !value.includes('p-') && !value.includes('m-') && !value.includes('flex') &&
         !value.includes('grid') && !value.includes('rounded'))) {
      return match;
    }
    
    // Process the value string to add prefixes to Tailwind classes
    const processedValue = processClassNames(value);
    
    // Reconstruct the key-value pair using the same quotes that were in the original
    const quote = match.charAt(0) === "'" ? "'" : '"';
    return `${quote}${key}${quote}: ${quote}${processedValue}${quote}`;
  });
}

// Function to process a file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const updatedContent = updateClassNameInJSX(content);

    // Check if any changes were made
    if (content !== updatedContent) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would update: ${filePath}`);
      } else {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`Updated: ${filePath}`);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

// Function to check if a file has been modified by this script
function hasBeenModified(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Check if the file already contains gba: prefixed classes
    return content.includes('gba:');
  } catch (error) {
    console.error(`Error checking if file ${filePath} has been modified:`, error);
    return false;
  }
}

// Main function to process all files
function main() {
  console.log(`Updating Tailwind classes to use '${PREFIX}' prefix...`);
  
  // Use fs to directly get all files instead of glob
  const allFiles = [];
  
  // Recursive function to get all .ts and .tsx files
  function getAllFiles(directory) {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        getAllFiles(fullPath); // Recurse into subdirectories
      } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        // Skip node_modules, build directories, and other non-source files
        if (!fullPath.includes('node_modules') && 
            !fullPath.includes('dist') && 
            !fullPath.includes('.git')) {
          allFiles.push(fullPath);
        }
      }
    }
  }
  
  try {
    // Start recursion from the src directory
    getAllFiles(SRC_DIR);
    
    console.log(`Found ${allFiles.length} files to process.`);
    
    let updatedCount = 0;
    
    allFiles.forEach(file => {
      if (processFile(file)) {
        updatedCount++;
      }
    });
    
    console.log(`\nProcess complete!`);
    console.log(`${updatedCount} files updated${DRY_RUN ? ' (dry run)' : ''}.`);
  } catch (error) {
    console.error(`Error finding files:`, error);
  }
}

// Run the script
main();
