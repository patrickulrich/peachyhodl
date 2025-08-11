import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit3, Save, X, ExternalLink, GripVertical } from 'lucide-react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { usePeachyLinktree, LinktreeEntry } from '@/hooks/usePeachyLinktree';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { IconSelector } from '@/components/IconSelector';

interface ManageLinksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditingEntry extends LinktreeEntry {
  isNew?: boolean;
  isEditing?: boolean;
}

export function ManageLinksDialog({ open, onOpenChange }: ManageLinksDialogProps) {
  const { data: currentEntries = [], refetch } = usePeachyLinktree();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  
  const [entries, setEntries] = useState<EditingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize entries when dialog opens or data changes
  useEffect(() => {
    if (open) {
      setEntries(currentEntries.map(entry => ({ ...entry })));
    }
  }, [open, currentEntries]);

  const handleAddEntry = () => {
    const newEntry: EditingEntry = {
      id: `new-${Date.now()}`,
      title: '',
      url: '',
      description: '',
      icon: '🔗',
      isNew: true,
      isEditing: true
    };
    setEntries(prev => [...prev, newEntry]);
  };

  const handleEditEntry = (id: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, isEditing: true } : entry
    ));
  };

  const handleSaveEntry = (id: string, updates: Partial<EditingEntry>) => {
    if (!updates.title?.trim() || !updates.url?.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and URL are required",
        variant: "destructive"
      });
      return;
    }

    // Validate URL format
    try {
      new URL(updates.url!.startsWith('nostr:') ? 'https://example.com' : updates.url!);
    } catch {
      if (!updates.url!.startsWith('nostr:')) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid URL or nostr: identifier",
          variant: "destructive"
        });
        return;
      }
    }

    setEntries(prev => prev.map(entry => 
      entry.id === id ? { 
        ...entry, 
        ...updates, 
        isEditing: false,
        icon: getDomainIcon(updates.url || entry.url)
      } : entry
    ));
  };

  const handleCancelEdit = (id: string) => {
    setEntries(prev => {
      return prev.map(entry => {
        if (entry.id === id) {
          if (entry.isNew) {
            return null; // Will be filtered out
          }
          // Revert to original values for existing entries
          const original = currentEntries.find(ce => ce.id === id);
          return original ? { ...original } : entry;
        }
        return entry;
      }).filter(Boolean) as EditingEntry[];
    });
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleSaveAll = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Create r tags for each entry with extended format: ["r", "url", "title", "description", "icon", "iconUrl"]
      const rTags = entries
        .filter(entry => entry.title.trim() && entry.url.trim())
        .map(entry => [
          'r', 
          entry.url.trim(), 
          entry.title.trim(), 
          entry.description?.trim() || '',
          entry.icon?.trim() || '',
          entry.iconUrl?.trim() || ''
        ]);

      // Publish the updated bookmark set as kind 30003 per NIP-51
      await publishEvent({
        kind: 30003,
        content: 'Peachy\'s Links & Resources',
        tags: [
          ['d', 'peachy-linktree'],
          ['title', 'Links & Resources'],
          ['description', 'Quick access to Peachy\'s favorite links and resources'],
          ...rTags
        ]
      });

      toast({
        title: "Links Updated",
        description: `Successfully updated ${rTags.length} links`,
      });

      // Refetch the data and close dialog
      await refetch();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Failed to save links:', error);
      toast({
        title: "Error",
        description: "Failed to save links. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDomainIcon = (url: string): string => {
    try {
      const domain = new URL(url.startsWith('nostr:') ? 'https://example.com' : url).hostname.toLowerCase();
      
      const iconMap: Record<string, string> = {
        'twitter.com': '🐦', 'x.com': '❌', 'github.com': '🐙',
        'youtube.com': '📺', 'youtu.be': '📺', 'twitch.tv': '💜',
        'instagram.com': '📸', 'linkedin.com': '💼', 'discord.gg': '💬',
        'discord.com': '💬', 'telegram.org': '📱', 't.me': '📱',
        'medium.com': '📝', 'substack.com': '📰', 'spotify.com': '🎵',
        'apple.com': '🍎'
      };
      
      if (url.startsWith('nostr:')) return '⚡';
      if (iconMap[domain]) return iconMap[domain];
      
      for (const [key, icon] of Object.entries(iconMap)) {
        if (domain.includes(key.split('.')[0])) return icon;
      }
      
      return '🔗';
    } catch {
      return '🔗';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Manage Links & Resources</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col p-6 pt-0 gap-6 flex-1 min-h-0">
          {/* Add Button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Add and organize your favorite links and resources
            </p>
            <Button onClick={handleAddEntry} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Link
            </Button>
          </div>

          {/* Entries List */}
          <ScrollArea className="flex-1 -mx-2">
            <div className="space-y-4 px-2">
              {entries.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="text-6xl mb-4">🔗</div>
                    <h3 className="text-lg font-semibold mb-2">No links yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first link to get started
                    </p>
                    <Button onClick={handleAddEntry}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                entries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={() => handleEditEntry(entry.id)}
                    onSave={(updates) => handleSaveEntry(entry.id, updates)}
                    onCancel={() => handleCancelEdit(entry.id)}
                    onDelete={() => handleDeleteEntry(entry.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <Badge variant="secondary" className="mr-2">
                {entries.filter(e => e.title.trim() && e.url.trim()).length} links
              </Badge>
              Changes are saved to the Nostr network
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveAll} 
                disabled={isLoading || entries.length === 0}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EntryCardProps {
  entry: EditingEntry;
  onEdit: () => void;
  onSave: (updates: Partial<EditingEntry>) => void;
  onCancel: () => void;
  onDelete: () => void;
}

function EntryCard({ entry, onEdit, onSave, onCancel, onDelete }: EntryCardProps) {
  const [title, setTitle] = useState(entry.title);
  const [url, setUrl] = useState(entry.url);
  const [description, setDescription] = useState(entry.description || '');
  const [icon, setIcon] = useState(entry.icon || '');
  const [iconUrl, setIconUrl] = useState(entry.iconUrl || '');

  useEffect(() => {
    if (!entry.isEditing) {
      setTitle(entry.title);
      setUrl(entry.url);
      setDescription(entry.description || '');
      setIcon(entry.icon || '');
      setIconUrl(entry.iconUrl || '');
    }
  }, [entry.isEditing, entry.title, entry.url, entry.description, entry.icon, entry.iconUrl]);

  const handleIconChange = (newIcon: string, newIconUrl?: string) => {
    setIcon(newIcon);
    setIconUrl(newIconUrl || '');
  };

  const handleSave = () => {
    onSave({ title, url, description, icon, iconUrl });
  };

  if (entry.isEditing) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">{entry.icon}</div>
            <Badge variant={entry.isNew ? "default" : "secondary"}>
              {entry.isNew ? "New" : "Editing"}
            </Badge>
          </div>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor={`title-${entry.id}`}>Title *</Label>
              <Input
                id={`title-${entry.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Link title"
              />
            </div>
            
            <div>
              <Label htmlFor={`url-${entry.id}`}>URL *</Label>
              <Input
                id={`url-${entry.id}`}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com or nostr:npub1..."
              />
            </div>
            
            <div>
              <Label htmlFor={`description-${entry.id}`}>Description</Label>
              <Textarea
                id={`description-${entry.id}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <IconSelector
              currentIcon={icon}
              currentIconUrl={iconUrl}
              onIconChange={handleIconChange}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            <div className="flex-shrink-0">
              {entry.iconUrl ? (
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={entry.iconUrl} 
                    alt={entry.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to emoji if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xl">${entry.icon}</div>`;
                    }}
                  />
                </div>
              ) : (
                <div className="text-2xl">{entry.icon}</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{entry.title}</h3>
                {entry.url.startsWith('nostr:') ? (
                  <Badge variant="outline" className="text-xs flex-shrink-0">⚡ Nostr</Badge>
                ) : (
                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{entry.url}</p>
              {entry.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {entry.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}