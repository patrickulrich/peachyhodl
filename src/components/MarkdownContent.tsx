import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Custom component for rendering links
function LinkRenderer({ href, children, ...props }: { href?: string; children?: React.ReactNode; [key: string]: unknown }) {
  if (!href) return <span {...props}>{children}</span>;
  
  // Handle Nostr URIs (nostr:npub1..., nostr:note1..., etc.)
  const nostrMatch = href.match(/^nostr:(npub1|note1|nprofile1|nevent1|naddr1)([023456789acdefghjklmnpqrstuvwxyz]+)$/);
  if (nostrMatch) {
    const [, prefix, data] = nostrMatch;
    const nostrId = `${prefix}${data}`;
    
    try {
      const decoded = nip19.decode(nostrId);
      let displayText = children;
      
      if (typeof children === 'string' && children === href) {
        // If the link text is the same as the href, show a nicer format
        if (decoded.type === 'npub' || decoded.type === 'nprofile') {
          displayText = `@${decoded.type === 'npub' ? decoded.data.slice(0, 8) : decoded.data.pubkey.slice(0, 8)}...`;
        } else if (decoded.type === 'note') {
          displayText = `Note @${decoded.data.slice(0, 8)}...`;
        } else if (decoded.type === 'nevent') {
          displayText = `Event @${decoded.data.id.slice(0, 8)}...`;
        } else if (decoded.type === 'naddr') {
          const shortId = decoded.data.identifier.length > 8 
            ? `${decoded.data.identifier.slice(0, 8)}...` 
            : decoded.data.identifier;
          displayText = `@${shortId}`;
        }
      }
      
      return (
        <Link 
          to={`/${nostrId}`}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
          {...props}
        >
          {displayText}
        </Link>
      );
    } catch {
      // If decoding fails, treat as regular link
    }
  }
  
  // Handle regular HTTP/HTTPS links
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
        {...props}
      >
        {children}
      </a>
    );
  }
  
  // Handle relative links (internal navigation)
  return (
    <Link 
      to={href}
      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
      {...props}
    >
      {children}
    </Link>
  );
}

// Custom component for rendering images
function ImageRenderer({ src, alt, ...props }: { src?: string; alt?: string; [key: string]: unknown }) {
  if (!src) return null;
  
  return (
    <img 
      src={src} 
      alt={alt || 'Blog post image'}
      className="max-w-full h-auto rounded-lg shadow-sm"
      loading="lazy"
      {...props}
    />
  );
}

// Custom component for code blocks
function CodeRenderer({ className, children, ...props }: { className?: string; children?: React.ReactNode; [key: string]: unknown }) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  return (
    <code 
      className={cn(
        "relative rounded bg-muted px-1 py-0.5 font-mono text-sm",
        className
      )}
      data-language={language}
      {...props}
    >
      {children}
    </code>
  );
}

// Custom component for blockquotes
function BlockquoteRenderer({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
  return (
    <blockquote 
      className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  );
}

/**
 * Renders markdown content with proper styling and Nostr-specific link handling
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const processedContent = useMemo(() => {
    // Pre-process the content to handle any special formatting
    return content
      .replace(/^[\s]*$/gm, '') // Remove empty lines
      .trim();
  }, [content]);

  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom link handling for Nostr URIs and external links
          a: LinkRenderer,
          
          // Enhanced image rendering
          img: ImageRenderer,
          
          // Custom code styling
          code: CodeRenderer,
          
          // Custom blockquote styling
          blockquote: BlockquoteRenderer,
          
          // Ensure headings have proper spacing and styling
          h1: ({ children, ...props }) => (
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-4" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0 mb-4" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-3" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight mb-2" {...props}>
              {children}
            </h4>
          ),
          
          // Style paragraphs
          p: ({ children, ...props }) => (
            <p className="leading-7 [&:not(:first-child)]:mt-6" {...props}>
              {children}
            </p>
          ),
          
          // Style lists
          ul: ({ children, ...props }) => (
            <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props}>
              {children}
            </ol>
          ),
          
          // Style tables
          table: ({ children, ...props }) => (
            <div className="my-6 w-full overflow-y-auto">
              <table className="w-full border-collapse border border-border" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-4 py-2 [&[align=center]]:text-center [&[align=right]]:text-right" {...props}>
              {children}
            </td>
          ),
          
          // Style horizontal rules
          hr: ({ ...props }) => (
            <hr className="my-8 border-border" {...props} />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}