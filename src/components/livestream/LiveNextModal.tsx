import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Users, Sparkles, Bell } from "lucide-react";
import { useUpcomingStreams } from "@/hooks/useUpcomingStreams";

interface LiveNextModalProps {
  children: React.ReactNode;
}

export function LiveNextModal({ children }: LiveNextModalProps) {
  const [open, setOpen] = useState(false);
  const { data: upcomingStreams = [], isLoading } = useUpcomingStreams();

  const nextStream = upcomingStreams[0];

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const getTimeUntil = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = timestamp - now;
    
    if (diff <= 0) return "Starting now!";
    
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Live Next
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ) : nextStream ? (
            <Card className="relative overflow-hidden">
              {nextStream.image && (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-10"
                  style={{ backgroundImage: `url(${nextStream.image})` }}
                />
              )}
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">
                    {nextStream.title || "Upcoming Stream"}
                  </CardTitle>
                  <Badge 
                    variant={nextStream.status === "live" ? "destructive" : "secondary"}
                    className="ml-2"
                  >
                    {nextStream.status === "live" ? "🔴 LIVE" : "📅 Planned"}
                  </Badge>
                </div>
                {nextStream.summary && (
                  <p className="text-muted-foreground">{nextStream.summary}</p>
                )}
              </CardHeader>
              <CardContent className="relative space-y-4">
                {nextStream.startsAt && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium">
                          {formatDate(nextStream.startsAt)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(nextStream.startsAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium">
                          {nextStream.status === "live" 
                            ? "Live now!" 
                            : getTimeUntil(nextStream.startsAt)
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {nextStream.status === "live" ? "Join now" : "Until stream"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {nextStream.participants.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Participants:</span>
                    <div className="flex flex-wrap gap-1">
                      {nextStream.participants.slice(0, 3).map((participant, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {participant.role}
                        </Badge>
                      ))}
                      {nextStream.participants.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{nextStream.participants.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button className="flex-1">
                    <Bell className="h-4 w-4 mr-2" />
                    Set Reminder
                  </Button>
                  <Button variant="outline">
                    Share Stream
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No upcoming streams</h3>
                <p className="text-muted-foreground mb-4">
                  Peachy hasn't scheduled any upcoming livestreams yet. 
                  Follow to get notified when new streams are announced!
                </p>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Show additional upcoming streams */}
          {upcomingStreams.length > 1 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">More Upcoming</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {upcomingStreams.slice(1, 4).map((stream, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {stream.title || "Untitled Stream"}
                      </div>
                      {stream.startsAt && (
                        <div className="text-xs text-muted-foreground">
                          {formatDate(stream.startsAt)}
                        </div>
                      )}
                    </div>
                    {stream.startsAt && (
                      <Badge variant="outline" className="text-xs">
                        {getTimeUntil(stream.startsAt)}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}