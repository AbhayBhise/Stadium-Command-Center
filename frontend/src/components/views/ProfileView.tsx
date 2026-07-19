import React, { useContext, useState } from 'react';
import { User, Bell, Shield, LogOut, ChevronRight, Volume2, Eye, Accessibility, HeartPulse, Globe, TerminalSquare } from 'lucide-react';
import { AppContext } from '@/app/page';
import { cn } from '@/lib/utils';

export function ProfileView() {
  const { isDebugMode, toggleDebugMode, language, setLanguage, needs, toggleNeed } = useContext(AppContext);

  
  const handleNotImplemented = () => {
    alert("This feature is not yet available in the preview.");
  };

  return (
    <div className="flex-1 w-full h-full bg-black flex flex-col pt-4 pb-24 overflow-y-auto">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-lg font-bold text-white">Profile & Settings</h2>
      </div>
      
      <div className="p-4 flex flex-col gap-6">
        {/* User Info */}
        <div className="flex items-center gap-4 bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-lg">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-2xl shadow-inner">
            AS
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-xl font-bold text-white">Abhay Singh</span>
            <span className="text-zinc-400 text-sm">abhay.singh@example.com</span>
          </div>
          <button onClick={handleNotImplemented} className="text-blue-500 text-sm font-bold bg-blue-500/10 px-4 py-2 rounded-full hover:bg-blue-500/20 transition-colors">Edit</button>
        </div>
        
        {/* Settings Group */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider px-2">Settings</h3>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col shadow-lg">
            <ProfileRow 
              icon={<Globe size={20} />} 
              label="Language" 
              value={language} 
              onClick={() => {
                const next = language === 'English' ? 'Spanish' : language === 'Spanish' ? 'French' : 'English';
                setLanguage(next);
              }} 
            />
          </div>
        </div>

        {/* Accessibility Group */}
        <div className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider px-2">Accessibility Options</h3>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col shadow-lg">
            <ProfileRow 
              icon={<Accessibility size={20} />} 
              label="Wheelchair Navigation" 
              active={needs.includes('wheelchair')} 
              onClick={() => toggleNeed('wheelchair')} 
            />
            <ProfileRow 
              icon={<Eye size={20} />} 
              label="Visual Assistance (High Contrast)" 
              active={needs.includes('visual')} 
              onClick={() => toggleNeed('visual')} 
            />
            <ProfileRow 
              icon={<Volume2 size={20} />} 
              label="Hearing Assistance (Captioned)" 
              active={needs.includes('hearing')} 
              onClick={() => toggleNeed('hearing')} 
            />
          </div>
        </div>



        <button onClick={handleNotImplemented} className="flex items-center justify-center gap-2 w-full p-4 text-red-500 font-bold bg-zinc-900/50 hover:bg-zinc-900 rounded-2xl border border-zinc-800 mt-2 shadow-lg active:scale-95 transition-all">
          <LogOut size={20} /> Log Out
        </button>
      </div>
    </div>
  );
}

function ProfileRow({ icon, label, value, active, onClick }: { icon: React.ReactNode; label: string; value?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/80 transition-colors active:bg-zinc-800">
      <div className="flex items-center gap-3">
        <div className={active ? "text-blue-400" : "text-zinc-400"}>{icon}</div>
        <span className="text-zinc-200 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {value && <span className="text-zinc-500 text-sm font-medium">{value}</span>}
        {active !== undefined && (
          <div className={cn("w-10 h-6 rounded-full flex items-center p-1 transition-colors", active ? "bg-blue-600 justify-end" : "bg-zinc-700 justify-start")}>
            <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
          </div>
        )}
        {active === undefined && !value && <ChevronRight size={20} className="text-zinc-600" />}
      </div>
    </button>
  );
}
