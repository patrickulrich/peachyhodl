import { useSeoMeta } from '@unhead/react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { BookOpen, Calendar, Clock, ArrowRight, FileText } from 'lucide-react';

const Blog = () => {
  useSeoMeta({
    title: 'Blog - Peachy',
    description: 'Read Peachy\'s thoughts on Bitcoin, Lightning, and the future of money.',
  });

  const { data: blogPosts, isLoading, error } = useBlogPosts();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const estimateReadTime = (content: string) => {
    // Rough estimate: 200 words per minute
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const getExcerpt = (content: string, maxLength = 200) => {
    // Remove markdown formatting for a cleaner excerpt
    const cleaned = content
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .trim();
    
    if (cleaned.length <= maxLength) return cleaned;
    
    // Find the last complete word within the limit
    const truncated = cleaned.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
  };

  // Get featured post (most recent or first with image)
  const featuredPost = blogPosts?.find(post => post.image) || blogPosts?.[0];
  const otherPosts = blogPosts?.filter(post => post.id !== featuredPost?.id) || [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
            <BookOpen className="h-10 w-10 text-primary" />
            Blog
          </h1>
          <p className="text-lg text-muted-foreground">
            Long-form thoughts on Bitcoin, Lightning, and Nostr. All articles are published on Nostr using NIP-23.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {/* Featured Post Skeleton */}
            <section className="mb-12">
              <Card className="overflow-hidden">
                <div className="grid md:grid-cols-2">
                  <Skeleton className="aspect-video md:aspect-auto" />
                  <CardContent className="p-6 md:p-8 space-y-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                  </CardContent>
                </div>
              </Card>
            </section>

            {/* Other Posts Skeleton */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">Recent Posts</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-full" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-14" />
                        <Skeleton className="h-5 w-18" />
                      </div>
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        ) : error ? (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <p className="text-muted-foreground">
                  Failed to load blog posts. Try another relay?
                </p>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        ) : blogPosts && blogPosts.length > 0 ? (
          <>
            {/* Featured Post */}
            {featuredPost && (
              <section className="mb-12">
                <Card className="overflow-hidden">
                  <div className="grid md:grid-cols-2">
                    <div className="aspect-video md:aspect-auto bg-muted overflow-hidden">
                      {featuredPost.image ? (
                        <img 
                          src={featuredPost.image} 
                          alt={featuredPost.title || 'Featured post'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 flex items-center justify-center">
                          <FileText className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 md:p-8 flex flex-col justify-center">
                      <Badge className="w-fit mb-3">Featured</Badge>
                      <h2 className="text-2xl md:text-3xl font-bold mb-3">
                        {featuredPost.title || 'Untitled'}
                      </h2>
                      {featuredPost.summary ? (
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {featuredPost.summary}
                        </p>
                      ) : (
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {getExcerpt(featuredPost.content)}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(featuredPost.publishedAt || featuredPost.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {estimateReadTime(featuredPost.content)}
                        </span>
                      </div>
                      {featuredPost.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {featuredPost.hashtags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button className="w-fit" asChild>
                        <a href={`/naddr1${featuredPost.dTag}`}>
                          Read More
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              </section>
            )}

            {/* Other Posts */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">
                {featuredPost ? 'Recent Posts' : 'All Posts'}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherPosts.map(post => (
                  <Card key={post.id} className="flex flex-col">
                    {post.image && (
                      <div className="aspect-video bg-muted overflow-hidden">
                        <img 
                          src={post.image} 
                          alt={post.title || 'Blog post'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-xl line-clamp-2">
                        {post.title || 'Untitled'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <p className="text-muted-foreground mb-4 line-clamp-3 flex-1">
                        {post.summary || getExcerpt(post.content)}
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(post.publishedAt || post.updatedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {estimateReadTime(post.content)}
                          </span>
                        </div>
                        {post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.hashtags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                            {post.hashtags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{post.hashtags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        <Button variant="ghost" className="w-full justify-between" asChild>
                          <a href={`/naddr1${post.dTag}`}>
                            Read Post
                            <ArrowRight className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No blog posts yet</h3>
                  <p className="text-muted-foreground">
                    Peachy hasn't published any long-form content yet. Check back soon for insights on Bitcoin and Nostr!
                  </p>
                </div>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-12">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Powered by Nostr</h3>
              <p className="text-muted-foreground mb-4">
                All blog posts are published using NIP-23 long-form content on Nostr. 
                This ensures censorship resistance and true ownership of content.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Blog;