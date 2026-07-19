import { Home, Navigation, MessageSquare, Ticket, User, ShieldAlert, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'navigate', icon: Navigation, label: 'Navigate' },
    { id: 'volunteer', icon: Shield, label: 'Co-pilot' },
    { id: 'ai', icon: MessageSquare, label: 'Ask AI' },
    { id: 'tickets', icon: Ticket, label: 'Tickets' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 h-20 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800 z-50 px-4 pb-4 flex justify-between items-center max-w-md mx-auto w-full">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex flex-col items-center justify-center w-14 h-14 min-w-[44px] min-h-[44px] touch-manipulation"
          >
            <div className={cn(
              "p-1.5 rounded-full transition-all duration-300",
              isActive ? "bg-primary/20 text-primary" : "text-zinc-500 hover:text-zinc-300"
            )}>
              <Icon size={22} />
            </div>
            <span className={cn(
              "text-[10px] mt-1 font-medium transition-colors",
              isActive ? "text-primary" : "text-zinc-500"
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
      
      {/* SOS Button inside App Shell */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('toggle-sos'))}
        className="flex flex-col items-center justify-center w-14 h-14 min-w-[44px] min-h-[44px] touch-manipulation relative group"
      >
        <div className="p-2 bg-red-600 rounded-full text-white shadow-lg group-hover:bg-red-500 transition-colors shadow-red-600/50">
          <ShieldAlert size={20} strokeWidth={2.5} />
        </div>
        <span className="text-[10px] mt-1 font-bold text-red-500">SOS</span>
      </button>
    </div>
  );
}
