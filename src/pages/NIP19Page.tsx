import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { ArticleStructuredData } from '@/components/StructuredData';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { MarkdownContent } from '@/components/MarkdownContent';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { useBlogPost } from '@/hooks/useBlogPosts';
import { Calendar, Clock, ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotFound from './NotFound';

// Component for displaying blog posts
function BlogPostView({ naddr }: { naddr: { identifier: string; pubkey: string; kind: number } }) {
  const { data: blogPost, isLoading, error } = useBlogPost(naddr.identifier);

  const blogPostUrl = `https://peachyhodl.com/${nip19.naddrEncode({
    identifier: naddr.identifier,
    pubkey: naddr.pubkey,
    kind: 30023,
  })}`;

  const publishedDate = blogPost?.publishedAt 
    ? new Date(blogPost.publishedAt * 1000).toISOString()
    : blogPost?.createdAt 
    ? new Date(blogPost.createdAt * 1000).toISOString()
    : new Date().toISOString();

  const modifiedDate = blogPost?.updatedAt 
    ? new Date(blogPost.updatedAt * 1000).toISOString()
    : publishedDate;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const estimateReadTime = (content: string) => {
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Skeleton className="h-10 w-32 mb-4" />
            </div>
            
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !blogPost) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Button variant="ghost" asChild className="mb-4">
                <Link to="/blog">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Blog
                </Link>
              </Button>
            </div>
            
            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Blog post not found</h3>
                    <p className="text-muted-foreground">
                      This blog post couldn't be found. It may have been removed or the link is incorrect.
                    </p>
                  </div>
                  <RelaySelector className="w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      <SEOHead
        title={blogPost.title}
        description={blogPost.summary || blogPost.content.slice(0, 160) + '...'}
        keywords={`Bitcoin, blog, ${blogPost.hashtags.join(', ')}`}
        image={blogPost.image}
        url={blogPostUrl}
        type="article"
        publishedTime={publishedDate}
        modifiedTime={modifiedDate}
        author="Peachy"
      />
      <ArticleStructuredData
        headline={blogPost.title || 'Untitled'}
        description={blogPost.summary || blogPost.content.slice(0, 160) + '...'}
        author="Peachy"
        datePublished={publishedDate}
        dateModified={modifiedDate}
        image={blogPost.image}
        url={blogPostUrl}
        keywords={blogPost.hashtags}
      />
      
      <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/blog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Link>
            </Button>
          </div>

          <article>
            <Card>
              <CardHeader className="pb-8">
                <div className="space-y-4">
                  <CardTitle className="text-3xl md:text-4xl font-bold leading-tight">
                    {blogPost.title || 'Untitled'}
                  </CardTitle>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(blogPost.publishedAt || blogPost.updatedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {estimateReadTime(blogPost.content)}
                    </span>
                  </div>

                  {blogPost.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {blogPost.hashtags.map(tag => (
                        <Badge key={tag} variant="secondary">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {blogPost.summary && (
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {blogPost.summary}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {blogPost.image && (
                  <div className="mb-8 rounded-lg overflow-hidden">
                    <img 
                      src={blogPost.image} 
                      alt={blogPost.title || 'Blog post image'}
                      className="w-full h-auto"
                    />
                  </div>
                )}
                
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <MarkdownContent 
                    content={blogPost.content}
                    className="leading-relaxed"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="mt-8">
              <CommentsSection 
                root={{
                  id: blogPost.id,
                  pubkey: blogPost.pubkey,
                  created_at: blogPost.createdAt,
                  kind: 30023,
                  content: blogPost.content,
                  sig: '',
                  tags: [['d', blogPost.dTag]]
                }}
                title="Comments"
                className="mt-8"
              />
            </div>
          </article>
        </div>
      </div>
    </MainLayout>
    </>
  );
}

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type, data } = decoded;

  switch (type) {
    case 'npub':
    case 'nprofile':
      // AI agent should implement profile view here
      return <div>Profile placeholder</div>;

    case 'note':
      // AI agent should implement note view here
      return <div>Note placeholder</div>;

    case 'nevent':
      // AI agent should implement event view here
      return <div>Event placeholder</div>;

    case 'naddr': {
      const naddr = data as { identifier: string; pubkey: string; kind: number };
      
      // Check if this is a blog post (kind 30023)
      if (naddr.kind === 30023) {
        return <BlogPostView naddr={naddr} />;
      }
      
      // For other addressable event kinds, show placeholder
      return <div>Addressable event placeholder</div>;
    }

    default:
      return <NotFound />;
  }
} 