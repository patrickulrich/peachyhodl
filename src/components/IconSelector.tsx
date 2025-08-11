import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Image, Smile, Loader2, X } from 'lucide-react';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';

interface IconSelectorProps {
  currentIcon?: string;
  currentIconUrl?: string;
  onIconChange: (icon: string, iconUrl?: string) => void;
  className?: string;
}

// Comprehensive emoji categories for link icons
const EMOJI_CATEGORIES = {
  'Popular': ['🔗', '🌐', '🌟', '⭐', '🏠', '📱', '💻', '📧', '📞', '💼', '🏢', '🛒', '🎵', '🎥', '📺', '🎮'],
  'Social': ['👥', '💬', '📢', '📣', '💌', '👋', '🤝', '💕', '❤️', '👍', '🔔', '📲', '💭', '🗣️', '👁️', '📝'],
  'Technology': ['💻', '📱', '🖥️', '⌚', '🖱️', '⌨️', '🖨️', '📷', '📹', '🔌', '🔋', '💾', '💿', '📀', '🎧', '🔊'],
  'Business': ['💼', '🏢', '🏦', '📊', '📈', '📉', '💰', '💳', '💎', '🏆', '🎯', '📋', '📑', '🗂️', '📁', '📂'],
  'Media': ['📺', '📻', '🎵', '🎶', '🎤', '🎧', '📽️', '🎬', '🎨', '🖼️', '📰', '📖', '📚', '✍️', '🖊️', '🖍️'],
  'Shopping': ['🛒', '🛍️', '💳', '💰', '🏪', '🏬', '🏭', '🎁', '📦', '📮', '📫', '📬', '🚚', '✈️', '🚢', '🏷️'],
  'Entertainment': ['🎮', '🎲', '🎯', '🎪', '🎭', '🎨', '🎬', '🎤', '🎸', '🎹', '🥳', '🎉', '🎊', '🍿', '🎈', '🎆'],
  'Health': ['🏥', '💊', '🩺', '💉', '🌡️', '😷', '🧘', '🏃', '💪', '🥗', '🍎', '💚', '❤️‍🩹', '🦷', '👁️‍🗨️', '🧠'],
  'Education': ['🎓', '📚', '📖', '✏️', '📝', '📊', '🔬', '🧪', '📐', '📏', '🗺️', '🌍', '🧮', '💡', '🔍', '📋'],
  'Food': ['🍕', '🍔', '🍟', '🌭', '🥪', '🍖', '🍗', '🥓', '🍳', '🧀', '🥗', '🍝', '🍜', '🍲', '☕', '🍺'],
  'Travel': ['✈️', '🚗', '🚕', '🚌', '🚎', '🏨', '🗺️', '🧳', '🎒', '📷', '🏖️', '⛰️', '🏛️', '🗽', '🎡', '🎢'],
  'Finance': ['💰', '💸', '💳', '🏦', '📈', '📉', '💹', '💎', '🪙', '💵', '💴', '💶', '💷', '🏧', '💱', '📊']
};

const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

export function IconSelector({ currentIcon, currentIconUrl, onIconChange, className }: IconSelectorProps) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'upload'>('emoji');
  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const [customEmoji, setCustomEmoji] = useState(currentIcon || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();

  const handleEmojiSelect = (emoji: string) => {
    setCustomEmoji(emoji);
    onIconChange(emoji, undefined); // Clear iconUrl when using emoji
  };

  const handleCustomEmojiChange = (value: string) => {
    setCustomEmoji(value);
    onIconChange(value, undefined);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      const tags = await uploadFile(file);
      const imageUrl = tags.find(([tag]) => tag === 'url')?.[1];
      
      if (imageUrl) {
        onIconChange(customEmoji || '🖼️', imageUrl);
        toast({
          title: "Image Uploaded",
          description: "Icon image uploaded successfully",
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    onIconChange(customEmoji || '🔗', undefined);
  };

  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-3 block">Icon</Label>
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'emoji' | 'upload')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="emoji">
            <Smile className="h-4 w-4 mr-2" />
            Emoji
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emoji" className="space-y-4">
          {/* Current Selection */}
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="text-2xl">{customEmoji || currentIcon || '🔗'}</div>
            <Input
              placeholder="Custom emoji or paste emoji here"
              value={customEmoji}
              onChange={(e) => handleCustomEmojiChange(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Category Selection */}
          <div className="flex flex-wrap gap-2">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Emoji Grid */}
          <ScrollArea className="h-48 border rounded-lg p-3">
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-2xl hover:bg-accent rounded p-2 transition-colors"
                  title={`Select ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Quick Access to All */}
          <details className="border rounded-lg">
            <summary className="p-3 cursor-pointer text-sm font-medium">All Emojis ({ALL_EMOJIS.length})</summary>
            <div className="p-3 pt-0 border-t">
              <div className="grid grid-cols-12 gap-1">
                {ALL_EMOJIS.map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="text-xl hover:bg-accent rounded p-1 transition-colors"
                    title={`Select ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </details>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          {/* Current Selection */}
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="flex-shrink-0">
              {currentIconUrl ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={currentIconUrl} 
                    alt="Current icon" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
                  {customEmoji || currentIcon || '🔗'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {currentIconUrl ? (
                <div>
                  <p className="text-sm font-medium">Custom image uploaded</p>
                  <p className="text-xs text-muted-foreground truncate">{currentIconUrl}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No custom image uploaded</p>
              )}
            </div>
            {currentIconUrl && (
              <Button variant="ghost" size="sm" onClick={handleRemoveImage}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Upload Section */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading}
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
              variant="outline"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  Upload Icon Image
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Supported formats: PNG, JPG, GIF, WebP</p>
              <p>• Maximum file size: 5MB</p>
              <p>• Square images work best (will be displayed as circles)</p>
              <p>• Images are uploaded to Blossom servers</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}