import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface MainLayoutProps {
  children: React.ReactNode;
}

// Peachy's pubkey
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useCurrentUser();
  const isPeachy = user?.pubkey === PEACHY_PUBKEY;

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex">
        <Sidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          isPeachy={isPeachy}
        />
        <main className="flex-1 w-full lg:pl-64">
          {children}
        </main>
      </div>
    </div>
  );
}