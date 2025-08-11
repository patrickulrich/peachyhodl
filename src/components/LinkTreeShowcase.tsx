import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Settings } from 'lucide-react';
import { usePeachyLinktree, LinktreeEntry } from '@/hooks/usePeachyLinktree';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ManageLinksDialog } from '@/components/ManageLinksDialog';
import { cn } from '@/lib/utils';

const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

interface LinkTreeCardProps {
  entry: LinktreeEntry;
  className?: string;
}

function LinkTreeCard({ entry, className }: LinkTreeCardProps) {
  const handleClick = () => {
    // Handle Nostr URIs specially
    if (entry.url.startsWith('nostr:')) {
      // Extract the NIP-19 identifier and navigate
      const identifier = entry.url.replace('nostr:', '');
      window.location.href = `/${identifier}`;
      return;
    }
    
    // For regular URLs, open in new tab
    window.open(entry.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border-2 hover:border-primary/50",
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500/20 to-yellow-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              {entry.icon}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                {entry.title}
              </h3>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </div>
            {entry.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {entry.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LinkTreeSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface LinkTreeShowcaseProps {
  className?: string;
}

export function LinkTreeShowcase({ className }: LinkTreeShowcaseProps) {
  const { data: entries = [], isLoading, error } = usePeachyLinktree();
  const { user } = useCurrentUser();
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  
  // Type-safe entries array
  const typedEntries: LinktreeEntry[] = entries || [];
  
  // Check if current user is Peachy
  const isPeachy = user?.pubkey === PEACHY_PUBKEY;

  const handleManageList = () => {
    setManageDialogOpen(true);
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Unable to load links</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Links & Resources</h2>
            <p className="text-muted-foreground">
              Quick access to Peachy's favorite links and resources
            </p>
          </div>
          {isPeachy && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManageList}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Manage List
            </Button>
          )}
        </div>

      {/* Content */}
      <div className="relative">
        {isLoading ? (
          <LinkTreeSkeleton />
        ) : typedEntries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="text-6xl">🔗</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">No links yet</h3>
                  <p className="text-muted-foreground">
                    {isPeachy ? "Add some links to showcase your favorite resources!" : "Check back soon for Peachy's favorite links!"}
                  </p>
                </div>
                {isPeachy && (
                  <Button onClick={handleManageList} className="mt-4">
                    <Settings className="h-4 w-4 mr-2" />
                    Add Links
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {typedEntries.map((entry) => (
              <LinkTreeCard key={entry.id} entry={entry} />
            ))}
            
            {/* Entry count badge */}
            <div className="flex justify-center mt-4">
              <Badge variant="secondary" className="text-xs">
                {typedEntries.length} {typedEntries.length === 1 ? 'link' : 'links'}
              </Badge>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Manage Links Dialog */}
      <ManageLinksDialog 
        open={manageDialogOpen} 
        onOpenChange={setManageDialogOpen} 
      />
    </>
  );
}