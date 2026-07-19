import { MapPin, LogOut, Droplets, Utensils, Phone, Car, Accessibility, Ticket, Shield, ThermometerSun, BatteryMedium, Wifi, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

const actions = [
  { id: 'seat', icon: MapPin, title: 'Find My Seat', subtitle: 'Navigate to section', color: 'from-blue-500 to-cyan-500', intent: 'NAVIGATION', query: 'Take me to my seat' },
  { id: 'exit', icon: LogOut, title: 'Nearest Exit', subtitle: 'Quickest way out', color: 'from-emerald-500 to-teal-500', intent: 'NAVIGATION', query: 'Find nearest exit' },
  { id: 'washroom', icon: Droplets, title: 'Washrooms', subtitle: 'Find facilities', color: 'from-sky-500 to-blue-500', intent: 'FACILITY_SEARCH', query: 'Where is the nearest washroom?' },
  { id: 'food', icon: Utensils, title: 'Food & Drinks', subtitle: 'Order or navigate', color: 'from-amber-500 to-orange-500', intent: 'FACILITY_SEARCH', query: 'Find food and drinks' },
  { id: 'emergency', icon: Phone, title: 'Emergency', subtitle: 'Get help now', color: 'from-red-500 to-rose-500', intent: 'EMERGENCY', query: 'I need emergency help' },
  { id: 'parking', icon: Car, title: 'Parking', subtitle: 'Find your vehicle', color: 'from-indigo-500 to-violet-500', intent: 'NAVIGATION', query: 'Where is my parking?' },
  { id: 'accessible', icon: Accessibility, title: 'Accessible Route', subtitle: 'Wheelchair friendly', color: 'from-fuchsia-500 to-pink-500', intent: 'NAVIGATION', query: 'Find an accessible route' },
  { id: 'ticket', icon: Ticket, title: 'My Tickets', subtitle: 'View QR code', color: 'from-zinc-500 to-zinc-700', intent: 'TICKETS', query: 'Show my tickets' },
];

import { eventProvider } from '../../providers/event.provider';

export function HomeView({ onAction }: { onAction: (query: string, intent: string) => void }) {
  const eventContext = eventProvider.getEventContext();
  return (
    <div className="flex-1 overflow-y-auto pb-24 pt-4 no-scrollbar bg-black text-white" role="main" aria-label="Stadium Command Center Home">
      {/* Header Dashboard */}
      <div className="bg-zinc-900/50 p-6 rounded-b-3xl border-b border-zinc-800">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-sm text-zinc-400">{eventContext.venue} • Match Day</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full"><Wifi size={12}/> Live</span>
            <span className="flex items-center gap-1 text-zinc-300 bg-zinc-800 px-2 py-1 rounded-full"><BatteryMedium size={12}/> 84%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-800/80 p-3 rounded-xl border border-zinc-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 bg-blue-500/10 rounded-bl-lg">
              <Cpu size={10} className="text-blue-500" />
            </div>
            <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><ThermometerSun size={12}/> AI Weather</div>
            <div className="font-semibold">{eventContext.weather}</div>
            <div className="text-[9px] text-zinc-500 mt-0.5">{eventContext.weatherDetail}</div>
          </div>
          <div className="bg-zinc-800/80 p-3 rounded-xl border border-zinc-700 relative overflow-hidden" onClick={() => onAction('How crowded is it?', 'CROWD_QUERY')}>
            <div className="absolute top-0 right-0 p-1 bg-emerald-500/10 rounded-bl-lg">
              <Cpu size={10} className="text-emerald-500" />
            </div>
            <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><Shield size={12}/> Crowd AI</div>
            <div className="font-semibold text-emerald-400">{eventContext.crowdStatus}</div>
            <div className="text-[9px] text-zinc-500 mt-0.5">{eventContext.crowdConfidence}</div>
          </div>
          <div className="bg-zinc-800/80 p-3 rounded-xl border border-zinc-700 relative overflow-hidden" onClick={() => onAction('Where is parking?', 'NAVIGATION')}>
            <div className="absolute top-0 right-0 p-1 bg-indigo-500/10 rounded-bl-lg">
              <Car size={10} className="text-indigo-500" />
            </div>
            <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><Car size={12}/> Parking</div>
            <div className="font-semibold text-indigo-400">P2 Available</div>
            <div className="text-[9px] text-zinc-500 mt-0.5">3 min walk to gate</div>
          </div>
          <div className="bg-zinc-800/80 p-3 rounded-xl border border-zinc-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1 bg-orange-500/10 rounded-bl-lg">
              <Ticket size={10} className="text-orange-500" />
            </div>
            <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1"><Ticket size={12}/> Match</div>
            <div className="font-semibold text-white">Group Stage</div>
            <div className="text-[9px] text-zinc-500 mt-0.5">Kickoff in 2h 45m</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 pt-6">
        <h2 className="text-lg font-bold text-white mb-4 px-2">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {actions.map((action, i) => (
            <motion.button
              key={action.id}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              onClick={() => onAction(action.query, action.intent)}
              className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col items-start gap-3 touch-manipulation text-left"
            >
              <div className={`p-2.5 rounded-full bg-gradient-to-br ${action.color}`}>
                <action.icon size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm leading-tight">{action.title}</h3>
                <p className="text-[10px] text-zinc-500 mt-1">{action.subtitle}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
