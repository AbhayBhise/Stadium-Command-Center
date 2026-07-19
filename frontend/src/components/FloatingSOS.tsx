import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldPlus, Flame, MapPin, Phone, UserRoundX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FloatingSOS() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setOpen(o => !o);
    window.addEventListener('toggle-sos', handleToggle);
    return () => window.removeEventListener('toggle-sos', handleToggle);
  }, []);

  const sosOptions = [
    { icon: ShieldPlus, label: 'Medical', color: 'bg-red-500' },
    { icon: ShieldAlert, label: 'Security', color: 'bg-blue-600' },
    { icon: Flame, label: 'Fire', color: 'bg-orange-500' },
    { icon: UserRoundX, label: 'Lost Child', color: 'bg-purple-500' },
    { icon: Phone, label: 'Call Control', color: 'bg-zinc-700' },
    { icon: MapPin, label: 'Share Location', color: 'bg-emerald-600' },
  ];

  const handleAction = (label: string) => {
    // Send a query to the AI to trigger the emergency intent
    window.dispatchEvent(new CustomEvent('sos-action', { detail: label }));
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 transition-all"
          />
        )}
      </AnimatePresence>

      {/* SOS Bottom Sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-[60px] md:bottom-24 left-0 right-0 md:left-auto md:right-8 z-50 bg-zinc-900 rounded-t-3xl md:rounded-3xl border-t md:border border-zinc-800 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6 shadow-[0_-10px_40px_rgba(220,38,38,0.15)] flex flex-col md:w-96"
          >
            <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6 opacity-50" />
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="text-red-500" /> Emergency Actions
            </h2>
            <div className="flex flex-col gap-3">
              {sosOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(opt.label)}
                  className="bg-zinc-800/80 border border-zinc-700/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-zinc-800 active:scale-[0.98] transition-all w-full text-left"
                >
                  <div className={`p-2.5 rounded-xl text-white shadow-lg ${opt.color}`}>
                    <opt.icon size={22} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-zinc-100 block">{opt.label}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Connects to Command Center</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button removed, triggered via BottomNav now */}
    </>
  );
}
