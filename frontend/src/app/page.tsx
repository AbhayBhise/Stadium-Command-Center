'use client';

import React, { useState, useEffect } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { FloatingSOS } from '@/components/FloatingSOS';
import { HomeView } from '@/components/views/HomeView';
import { NavigateView } from '@/components/views/NavigateView';
import { AITabView } from '@/components/views/AITabView';
import { TicketsView } from '@/components/views/TicketsView';
import { ProfileView } from '@/components/views/ProfileView';
import { VolunteerView } from '@/components/views/VolunteerView';
import { Cpu, AlertTriangle } from 'lucide-react';

export const AppContext = React.createContext({
  isDebugMode: false,
  toggleDebugMode: () => {},
  language: 'English',
  setLanguage: (lang: string) => {},
  needs: [] as string[],
  toggleNeed: (need: string) => {}
});

export interface NavigationTarget {
  destination?: string;
  routeSteps?: { order: number; instruction: string; to_zone: string }[];
}

export default function Home() {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const toggleDebugMode = () => setIsDebugMode(prev => !prev);
  const [language, setLanguage] = useState('English');
  const [needs, setNeeds] = useState<string[]>([]);

  const toggleNeed = (need: string) => {
    setNeeds(prev => prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]);
  };

  const [activeTab, setActiveTab] = useState('home');
  const [aiQuery, setAiQuery] = useState<{text: string, ts: number} | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<NavigationTarget | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationText, setNotificationText] = useState('Heavy congestion has developed near Gate 6. Switching to Gate 8 will reduce your walking time by approximately 6 minutes.');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Offline listener
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleAction = (query: string, intent: string) => {
    if (intent === 'NAVIGATION') {
      setNavigationTarget({ destination: query });
      setActiveTab('navigate');
    } else if (intent === 'TICKETS') {
      setActiveTab('tickets');
    } else {
      setAiQuery({ text: query, ts: Date.now() });
      setActiveTab('ai');
    }
  };

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<NavigationTarget | undefined>;
      if (customEvent.detail) {
        setNavigationTarget(customEvent.detail);
      }
      setActiveTab('navigate');
    };

    const handleSosAction = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setAiQuery({ text: `EMERGENCY: ${customEvent.detail}`, ts: Date.now() });
      setActiveTab('ai');
    };

    window.addEventListener('action-navigate', handleNavigate);
    window.addEventListener('sos-action', handleSosAction);

    return () => {
      window.removeEventListener('action-navigate', handleNavigate);
      window.removeEventListener('sos-action', handleSosAction);
    };
  }, []);

  return (
    <AppContext.Provider value={{ isDebugMode, toggleDebugMode, language, setLanguage, needs, toggleNeed }}>
      <main className={`w-full h-[100dvh] bg-black overflow-hidden flex flex-col relative ${needs.includes('visual') ? 'high-contrast-mode' : ''}`}>
        
        <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col">
        {activeTab === 'home' && <HomeView onAction={handleAction} />}
        {activeTab === 'navigate' && <NavigateView onClose={() => setActiveTab('ai')} target={navigationTarget} />}
        <div className={activeTab === 'ai' ? 'flex-1 w-full h-full flex flex-col' : 'hidden'}>
          <AITabView initialQuery={aiQuery?.text} queryTimestamp={aiQuery?.ts} />
        </div>
        {activeTab === 'tickets' && <TicketsView onNavigate={() => setActiveTab('navigate')} />}
        {activeTab === 'volunteer' && <VolunteerView />}
        {activeTab === 'profile' && <ProfileView />}
      </div>

      {showNotification && (
        <div className="absolute top-4 left-4 right-4 z-[2000] bg-zinc-900 rounded-2xl p-4 shadow-2xl border border-rose-500/50 animate-in slide-in-from-top fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="bg-rose-500/20 p-2 rounded-full mt-1">
              <AlertTriangle className="text-rose-500" size={24} />
            </div>
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-center w-full">
                <span className="font-bold text-lg text-white leading-tight">Crowd Alert</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Cpu size={10} /> AI Generated
                </span>
              </div>
              <span className="text-sm text-zinc-300 mt-2 leading-tight">
                {notificationText}
              </span>
              <div className="flex gap-2 mt-4 w-full">
                <button 
                  onClick={() => setShowNotification(false)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-all shadow-lg shadow-rose-600/20"
                >
                  Switch Route
                </button>
                <button 
                  onClick={() => setShowNotification(false)}
                  className="px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors active:scale-95"
                >
                  Ignore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOffline && (
        <div className="absolute top-0 left-0 right-0 z-[3000] bg-orange-600 px-4 py-2 flex items-center justify-center gap-2 animate-in slide-in-from-top fade-in duration-300">
          <AlertTriangle size={16} className="text-white" />
          <span className="text-white text-sm font-bold">No Internet Connection. Functionality limited.</span>
        </div>
      )}

      <FloatingSOS />
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </main>
    </AppContext.Provider>
  );
}
