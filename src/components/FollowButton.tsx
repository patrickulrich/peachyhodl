import { Button } from "@/components/ui/button";
import { Heart, HeartHandshake, Loader2 } from "lucide-react";
import { useIsFollowing, useFollowUser } from "@/hooks/useFollows";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  pubkey: string;
  petname?: string;
  relay?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function FollowButton({ 
  pubkey, 
  petname, 
  relay, 
  variant = "default",
  size = "default",
  className 
}: FollowButtonProps) {
  const { user } = useCurrentUser();
  const isFollowing = useIsFollowing(pubkey);
  const { mutate: toggleFollow, isPending } = useFollowUser();

  // Don't show follow button for own profile
  if (user?.pubkey === pubkey) return null;

  // Show login prompt if not logged in
  if (!user) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Heart className="h-4 w-4 mr-2" />
        Sign in to Follow
      </Button>
    );
  }

  const handleClick = () => {
    toggleFollow({ pubkey, petname, relay });
  };

  return (
    <Button
      variant={isFollowing ? "outline" : variant}
      size={size}
      className={cn(
        isFollowing && "border-primary text-primary hover:bg-primary/10",
        className
      )}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isFollowing ? (
        <HeartHandshake className="h-4 w-4 mr-2" />
      ) : (
        <Heart className="h-4 w-4 mr-2" />
      )}
      {isPending ? "..." : isFollowing ? "Following" : "Follow"}
    </Button>
  );
}