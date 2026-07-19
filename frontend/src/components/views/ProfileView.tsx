import React, { useContext, useState } from 'react';
import { User, Bell, Shield, LogOut, ChevronRight, Volume2, Eye, Accessibility, HeartPulse, Globe, LogIn } from 'lucide-react';
import { AppContext } from '@/app/page';
import { cn } from '@/lib/utils';

export function ProfileView() {
  const { isDebugMode, toggleDebugMode, language, setLanguage, needs, toggleNeed, user, login, logout } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      setError('Both fields are required.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    login(email, name);
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length === 0) return 'AS';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (!user) {
    return (
      <div className="flex-1 w-full h-full bg-black flex flex-col pt-4 pb-24 overflow-y-auto px-4 justify-center items-center">
        <div className="w-full max-w-sm bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <User size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h2>
            <span className="text-zinc-400 text-sm text-center">
              {isRegistering 
                ? 'Sign up to register your ticket and view personalized routes' 
                : 'Sign in to access your digital tickets and stadium features'}
            </span>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Abhay Singh"
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. abhay@example.com"
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
            >
              <LogIn size={18} /> {isRegistering ? 'Register' : 'Sign In'}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-blue-500 text-xs font-bold hover:underline animate-fade-in"
            >
              {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full bg-black flex flex-col pt-4 pb-24 overflow-y-auto">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-lg font-bold text-white">Profile & Settings</h2>
      </div>
      
      <div className="p-4 flex flex-col gap-6">
        {/* User Info */}
        <div className="flex items-center gap-4 bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-lg">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-2xl shadow-inner">
            {getInitials(user.name)}
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-xl font-bold text-white">{user.name}</span>
            <span className="text-zinc-400 text-sm">{user.email}</span>
          </div>
          <button onClick={() => logout()} className="text-red-500 text-sm font-bold bg-red-500/10 px-4 py-2 rounded-full hover:bg-red-500/20 transition-colors">
            Logout
          </button>
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

        <button onClick={() => logout()} className="flex items-center justify-center gap-2 w-full p-4 text-red-500 font-bold bg-zinc-900/50 hover:bg-zinc-900 rounded-2xl border border-zinc-800 mt-2 shadow-lg active:scale-95 transition-all">
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
