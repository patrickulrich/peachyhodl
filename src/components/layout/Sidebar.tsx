import { Link, useLocation } from "react-router-dom";
import { Camera, User, Mic, Calendar, Music, BookOpen, Home } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: User, label: "About", path: "/about" },
  { icon: Camera, label: "Photos", path: "/photos" },
  { icon: Calendar, label: "Events", path: "/events" },
  { icon: BookOpen, label: "Blog", path: "/blog" },
  { icon: Mic, label: "Audio Rooms", path: "/audio-rooms" },
  { icon: Music, label: "Peachy's Weekly Wavlake Picks", path: "/wavlake-picks" },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Peachy
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-4 left-4 right-4">
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center block"
            >
              Vibed with MKStack
            </a>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-sidebar-background h-screen fixed top-0 left-0 z-40">
        <nav className="flex-1 p-4 pt-20">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-1",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-primary text-sidebar-primary-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <a
            href="https://soapbox.pub/mkstack"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center block"
          >
            Vibed with MKStack
          </a>
        </div>
      </aside>
    </>
  );
}