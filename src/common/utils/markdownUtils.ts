/**
 * Markdown to HTML Parser Utility
 * 
 * A lightweight markdown parser specifically designed for AI responses and content rendering.
 * Supports common markdown features without requiring external dependencies.
 * 
 * Features:
 * - Links: [text](url)
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code: `code`
 * - Code blocks: ```code```
 * - Line breaks and paragraphs
 * - Lists: - item or * item
 * - Headers: # Header
 * 
 * @example
 * ```typescript
 * import { parseMarkdownToHtml } from '@/common/utils/markdownUtils';
 * 
 * const html = parseMarkdownToHtml('Check this [link](https://example.com)!');
 * // Returns: 'Check this <a href="https://example.com" target="_blank">link</a>!'
 * ```
 */

export interface MarkdownParseOptions {
  /** Whether to open links in new tab (default: true) */
  openLinksInNewTab?: boolean;
  /** Custom CSS classes to apply to elements */
  cssClasses?: {
    link?: string;
    bold?: string;
    italic?: string;
    code?: string;
    codeBlock?: string;
    list?: string;
    listItem?: string;
    header?: string;
  };
  /** Whether to sanitize HTML (default: true) */
  sanitizeHtml?: boolean;
}

const DEFAULT_OPTIONS: MarkdownParseOptions = {
  openLinksInNewTab: true,
  cssClasses: {
    link: 'gba:text-blue-600 gba:underline gba:hover:text-blue-800',
    bold: 'gba:font-semibold',
    italic: 'gba:italic',
    code: 'gba:bg-gray-100 gba:px-1 gba:py-0.5 gba:rounded gba:text-sm gba:font-mono',
    codeBlock: 'gba:bg-gray-100 gba:p-3 gba:rounded gba:text-sm gba:font-mono gba:block gba:whitespace-pre',
    list: 'gba:list-disc gba:list-inside gba:space-y-1',
    listItem: 'gba:ml-4',
    header: 'gba:font-bold gba:text-lg gba:mt-4 gba:mb-2'
  },
  sanitizeHtml: true
};

/**
 * Simple HTML sanitization to prevent XSS attacks
 */
const sanitizeHtml = (html: string): string => {
  if (typeof window === 'undefined') return html;
  
  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Remove script tags and event handlers
  const scripts = temp.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // Remove dangerous attributes
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(element => {
    // Remove event handler attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    });
    
    // Only allow safe attributes for links
    if (element.tagName.toLowerCase() === 'a') {
      const href = element.getAttribute('href');
      const target = element.getAttribute('target');
      const rel = element.getAttribute('rel');
      const className = element.getAttribute('class');
      
      // Clear all attributes
      Array.from(element.attributes).forEach(attr => {
        element.removeAttribute(attr.name);
      });
      
      // Re-add safe attributes
      if (href) element.setAttribute('href', href);
      if (target) element.setAttribute('target', target);
      if (rel) element.setAttribute('rel', rel);
      if (className) element.setAttribute('class', className);
    }
  });
  
  return temp.innerHTML;
};

/**
 * Parse markdown text to HTML
 */
export const parseMarkdownToHtml = (
  markdown: string, 
  options: MarkdownParseOptions = {}
): string => {
  if (!markdown) return '';
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const classes = { ...DEFAULT_OPTIONS.cssClasses, ...options.cssClasses };
  
  let html = markdown;
  
  // Convert code blocks first (to avoid conflicts with inline code)
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const className = classes.codeBlock ? ` class="${classes.codeBlock}"` : '';
    return `<pre${className}><code>${code.trim()}</code></pre>`;
  });
  
  // Convert inline code
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const className = classes.code ? ` class="${classes.code}"` : '';
    return `<code${className}>${code}</code>`;
  });
  
  // Convert headers (# Header)
  html = html.replace(/^# (.+)$/gm, (match, text) => {
    const className = classes.header ? ` class="${classes.header}"` : '';
    return `<h1${className}>${text}</h1>`;
  });
  
  html = html.replace(/^## (.+)$/gm, (match, text) => {
    const className = classes.header ? ` class="${classes.header}"` : '';
    return `<h2${className}>${text}</h2>`;
  });
  
  html = html.replace(/^### (.+)$/gm, (match, text) => {
    const className = classes.header ? ` class="${classes.header}"` : '';
    return `<h3${className}>${text}</h3>`;
  });
  
  // Convert links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    const className = classes.link ? ` class="${classes.link}"` : '';
    const target = opts.openLinksInNewTab ? ' target="_blank"' : '';
    const rel = opts.openLinksInNewTab ? ' rel="noopener noreferrer"' : '';
    return `<a href="${url}"${target}${rel}${className}>${text}</a>`;
  });
  
  // Convert bold **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, (match, text) => {
    const className = classes.bold ? ` class="${classes.bold}"` : '';
    return `<strong${className}>${text}</strong>`;
  });
  
  html = html.replace(/__([^_]+)__/g, (match, text) => {
    const className = classes.bold ? ` class="${classes.bold}"` : '';
    return `<strong${className}>${text}</strong>`;
  });
  
  // Convert italic *text* or _text_ (but not inside words)
  html = html.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, (match, text) => {
    const className = classes.italic ? ` class="${classes.italic}"` : '';
    return `<em${className}>${text}</em>`;
  });
  
  html = html.replace(/(?<!\w)_([^_]+)_(?!\w)/g, (match, text) => {
    const className = classes.italic ? ` class="${classes.italic}"` : '';
    return `<em${className}>${text}</em>`;
  });
  
  // Convert lists (- item or * item)
  html = html.replace(/^[\-\*] (.+)$/gm, (match, text) => {
    const itemClassName = classes.listItem ? ` class="${classes.listItem}"` : '';
    return `<li${itemClassName}>${text}</li>`;
  });
  
  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li[^>]*>.*<\/li>\s*)+/g, (match) => {
    const listClassName = classes.list ? ` class="${classes.list}"` : '';
    return `<ul${listClassName}>${match}</ul>`;
  });
  
  // Convert line breaks to <br> tags
  html = html.replace(/\n/g, '<br>');
  
  // Sanitize HTML if enabled
  if (opts.sanitizeHtml) {
    html = sanitizeHtml(html);
  }
  
  return html;
};

/**
 * Parse markdown for display in React components using dangerouslySetInnerHTML
 */
export const parseMarkdownForReact = (
  markdown: string, 
  options: MarkdownParseOptions = {}
): { __html: string } => {
  return { __html: parseMarkdownToHtml(markdown, options) };
};

/**
 * Extract plain text from markdown (removes all formatting)
 */
export const extractPlainTextFromMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  
  let text = markdown;
  
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code
  text = text.replace(/`[^`]+`/g, '');
  
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove bold/italic markers
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  
  // Remove headers
  text = text.replace(/^#{1,6} (.+)$/gm, '$1');
  
  // Remove list markers
  text = text.replace(/^[\-\*] (.+)$/gm, '$1');
  
  // Clean up extra whitespace
  text = text.replace(/\n+/g, ' ').trim();
  
  return text;
};

/**
 * Check if text contains markdown formatting
 */
export const hasMarkdownFormatting = (text: string): boolean => {
  if (!text) return false;
  
  const markdownPatterns = [
    /\[([^\]]+)\]\([^)]+\)/, // Links
    /\*\*[^*]+\*\*/, // Bold
    /__[^_]+__/, // Bold
    /\*[^*]+\*/, // Italic
    /_[^_]+_/, // Italic
    /`[^`]+`/, // Code
    /```[\s\S]*?```/, // Code blocks
    /^#{1,6} .+$/m, // Headers
    /^[\-\*] .+$/m // Lists
  ];
  
  return markdownPatterns.some(pattern => pattern.test(text));
};
