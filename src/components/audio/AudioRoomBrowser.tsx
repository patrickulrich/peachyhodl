import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useNIP100, type AudioRoom } from '@/hooks/useNIP100';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { 
  Users, 
  Plus, 
  Search, 
  Lock, 
  Globe,
  Mic,
  Clock
} from 'lucide-react';

interface AudioRoomBrowserProps {
  onJoinRoom: (room: AudioRoom) => void;
}

export function AudioRoomBrowser({ onJoinRoom }: AudioRoomBrowserProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { availableRooms, startListening, isListening } = useNIP100();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);

  // Start listening for rooms if not already
  const handleStartBrowsing = useCallback(() => {
    if (!isListening) {
      startListening();
    }
  }, [isListening, startListening]);

  // Create new room
  const createRoom = useCallback(() => {
    if (!newRoomName.trim()) {
      toast({
        title: 'Room Name Required',
        description: 'Please enter a name for the room.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to create rooms.',
        variant: 'destructive',
      });
      return;
    }

    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newRoom: AudioRoom = {
      id: roomId,
      name: newRoomName.trim(),
      participants: [],
      isPrivate: newRoomPrivate,
      createdBy: user.pubkey,
      createdAt: Math.floor(Date.now() / 1000),
    };

    onJoinRoom(newRoom);
    setShowCreateDialog(false);
    setNewRoomName('');
    setNewRoomPrivate(false);
  }, [newRoomName, newRoomPrivate, user, onJoinRoom, toast]);

  // Filter rooms based on search
  const filteredRooms = Array.from(availableRooms.values()).filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">
              Please sign in to browse and join audio rooms.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audio Rooms</h2>
          <p className="text-muted-foreground">
            Join conversations and connect with others using Bitcoin and Lightning.
          </p>
        </div>

        <div className="flex gap-2">
          {!isListening && (
            <Button onClick={handleStartBrowsing} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Browse Rooms
            </Button>
          )}
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Audio Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="room-name">Room Name</Label>
                  <Input
                    id="room-name"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="My Awesome Room"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="private-room"
                    checked={newRoomPrivate}
                    onChange={(e) => setNewRoomPrivate(e.target.checked)}
                  />
                  <Label htmlFor="private-room">Private room</Label>
                </div>
                <Button onClick={createRoom} className="w-full">
                  Create & Join Room
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search bar */}
      {isListening && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms..."
            className="pl-10"
          />
        </div>
      )}

      {/* Room list */}
      {isListening ? (
        <div className="space-y-4">
          {filteredRooms.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? 'No matching rooms' : 'No active rooms'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? 'Try adjusting your search terms.'
                      : 'Be the first to start a conversation by creating a room!'
                    }
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Room
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onJoin={() => onJoinRoom(room)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Browse</h3>
              <p className="text-muted-foreground mb-4">
                Click "Browse Rooms" to see active audio rooms and join conversations.
              </p>
              <Button onClick={handleStartBrowsing}>
                <Search className="h-4 w-4 mr-2" />
                Browse Rooms
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual room card component
interface RoomCardProps {
  room: AudioRoom;
  onJoin: () => void;
}

function RoomCard({ room, onJoin }: RoomCardProps) {
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {room.isPrivate ? (
                <Lock className="h-5 w-5 text-primary" />
              ) : (
                <Globe className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{room.name}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{room.participants.length} participant{room.participants.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimeAgo(room.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {room.isPrivate && <Badge variant="secondary">Private</Badge>}
            <Button onClick={onJoin} size="sm">
              Join
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}