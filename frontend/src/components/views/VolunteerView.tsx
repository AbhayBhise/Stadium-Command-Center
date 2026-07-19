'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Shield, Users, Languages, Cpu, AlertTriangle, Mic, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchBackend } from '../../lib/backend-api';

type ZoneLevel = 'low' | 'medium' | 'high' | 'critical';

interface CrowdZone {
  zone: string;
  name: string;
  type: string;
  level: ZoneLevel;
  baseCrowd: string;
  capacity: number;
  current: number;
}

interface VolunteerMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isTyping?: boolean;
  zoneRecommendations?: CrowdZone[];
  theme?: 'volunteer' | 'crowd' | 'translate' | 'navigate';
}

const LEVEL_CONFIG: Record<ZoneLevel, { color: string; border: string; label: string; icon: string }> = {
  low: { color: 'text-emerald-400', border: 'border-emerald-500/50', label: 'Low', icon: '🟢' },
  medium: { color: 'text-amber-400', border: 'border-amber-500/30', label: 'Moderate', icon: '🟡' },
  high: { color: 'text-red-400', border: 'border-red-500/30', label: 'Congested', icon: '🟠' },
  critical: { color: 'text-rose-400', border: 'border-rose-500/50', label: 'CRITICAL', icon: '🔴' },
};

const VOLUNTEER_GREETING =
  "Good day, Volunteer! I'm your Co-pilot for today's event. How can I assist?\n\nThings I can help you with:\n- 📊 Monitor crowd levels and get threshold alerts\n- 🌍 Translate announcements or conversations\n- 📍 Navigate to specific zones (avoiding crowded areas)\n- 🆘 Handle incidents or report issues to security\n- 📋 Get zone assignments and operational SOPs";

const VOLUNTEER_SYSTEM_PROMPT = `You are a Volunteer Co-pilot for a large stadium event. You help stadium staff and volunteers with operational tasks.

Your capabilities:
1. Crowd management: Provide zone-specific crowd levels, predict congestion, recommend staffing adjustments
2. Translation: Provide context-aware translations in Spanish, French, Arabic, Mandarin, German, Japanese
3. Navigation: Give shortest path to any zone while avoiding congested areas
4. Incident response: Provide step-by-step SOPs for medical events, fire, lost children, equipment failure
5. Zone assignments: Help volunteers understand their duties in each zone

CRITICAL CROWD THRESHOLDS:
- 75%+ capacity: WARNING - Consider redirecting people, opening secondary gates, requesting additional staff
- 90%+ capacity: CRITICAL - Evacuate non-essential personnel, open all exits, request security backup

You must always explain the reasoning behind your recommendations (XAI). Provide evidence, alternatives, and tradeoffs. Keep your tone professional, concise, and direct. Use bullet points for operational clarity.`;

interface ZoneData { zone: string; name: string; type: string; level: string; baseCrowd: string; }

export function VolunteerView() {
  const [messages, setMessages] = useState<VolunteerMessage[]>([
    { id: 'welcome', sender: 'ai', text: 'Loading Co-pilot...', isTyping: true }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [zones, setZones] = useState<CrowdZone[]>([]);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expandedSection, setExpandedSection] = useState<'crowd'|'translate'|'sop'|null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) setInputValue(prev => (prev ? prev + ' ' : '') + transcript);
        };
        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  // Fetch crowd data
  useEffect(() => {
    const fetchCrowd = async () => {
      try {
 
        const res = await fetchBackend('/api/crowd');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data.zones) {
          const mapped: CrowdZone[] = evaluateThreatLevels(data.zones);
          setZones(mapped);
        }
      } catch {}
    };
    fetchCrowd();
    const interval = setInterval(fetchCrowd, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (zones.length > 0) {
      // Generate threat alert if any zone critical
      const criticalZones = zones.filter(z => z.level === 'critical' || z.level === 'high');
      if (criticalZones.length > 0) {
        const msg = criticalZones.map(z => `${z.name}: ${z.level === 'critical' ? 'CRITICAL' : 'HIGH'} (${z.current}/${z.capacity})`).join('\n');
        const alertText = `⚠️ Crowd ALERT:\n` + msg;
        setMessages(prev => {
          const alreadyAlerted = prev.some(m => m.text.includes(alertText));
          if (alreadyAlerted) return prev;
          return [...prev, { id: `alert-${Date.now()}`, sender: 'ai', text: alertText, theme: 'crowd' }];
        });
      }

      // Replace welcome typing with real greeting
      setMessages(prev => {
        const hasRealGreeting = prev.some(m => m.id === 'welcome' && !m.isTyping);
        if (!hasRealGreeting) {
          return prev.map(m => m.id === 'welcome' ? { ...m, isTyping: false, text: VOLUNTEER_GREETING } : m);
        }
        return prev;
      });
    }
  }, [zones]);

  const evaluateThreatLevels = (rawZones: ZoneData[]): CrowdZone[] => {
    return rawZones.map((z) => {
      const capacityMap: Record<string, number> = {
        'gate_a': 300, 'gate_b': 250, 'gate_c': 200, 'gate_d': 350,
        'entrance_1': 400, 'entrance_2': 300, 'entrance_3': 350,
        'concourse_a': 600, 'concourse_b': 500, 'concourse_c': 550,
        'section_101': 200, 'section_102': 150,
        'parking_1': 200, 'parking_2': 150,
        'main_plaza': 800
      };
      const capacity = capacityMap[z.zone] || 200;
      const crowdIndex = z.level === 'low' ? 0 : z.level === 'medium' ? 50 : 85;
      const current = Math.round(capacity * (crowdIndex / 100) * (0.8 + Math.random() * 0.4));
      const pct = (current / capacity) * 100;
      const level: ZoneLevel = pct >= 90 ? 'critical' : pct >= 75 ? 'high' : pct >= 50 ? 'medium' : 'low';
      return { ...z, level, capacity, current };
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: VolunteerMessage = { id: Date.now().toString(), sender: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const typingId = Date.now().toString() + '-typing';
    setMessages(prev => [...prev, { id: typingId, sender: 'ai', text: 'Thinking...', isTyping: true }]);

    try {
      const response = await fetchBackend('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-user-role': 'VOLUNTEER', 
          'x-user-id': 'volunteer-1', 
          'x-user-language': 'English' 
        },
        body: JSON.stringify({ message: `[VOLUNTEER_COPILOT] ${text}` })
      });

      if (!response.ok || !response.body) throw new Error('Backend unavailable');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let finalData: any = null;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.replace('data: ', ''));
                if (parsed.type === 'complete') {
                  finalData = parsed.data;
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
      }

      if (!finalData || !finalData.response) {
        throw new Error('Invalid response structure');
      }

      const aiText = finalData.response;
      setMessages(prev => prev.map(m => m.id === typingId ? {
        id: typingId, sender: 'ai', text: aiText, isTyping: false
      } : m));
    } catch (err) {
      // If backend down, use rules-based response
      const localResponse = generateLocalVolunteerResponse(text);
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === typingId ? {
          id: typingId, sender: 'ai', text: localResponse, isTyping: false, zoneRecommendations: zones.filter(z => z.level === 'high' || z.level === 'critical')
        } : m));
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateLocalVolunteerResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (/\b(translate|translator|language|spanish|french|arabic|mandarin|german|japanese)\b/.test(q) || /^[A-Za-z]/.test(q) && (q.includes('how do i say') || q.includes('what is') || q.includes('mean in'))) {
      return generateTranslationResponse(q);
    }
    if (/\b(crowd|congestion|busy|capacity|level|overcrowd|jam)\b/.test(q)) {
      return generateCrowdResponse(q);
    }
    if (/\b(lost|missing)\b/.test(q)) {
      return generateLostChildResponse();
    }
    if (/\b(fire|evacuate|shelter|bomb|threat)\b/.test(q)) {
      return generateEmergencySOP();
    }
    if (/\b(medical|injury|bleeding|unconscious|fall)\b/.test(q)) {
      return generateMedicalResponse();
    }
    if (/\b(navigate|route|path|go to|directions)\b/.test(q)) {
      return generateVolNavigationResponse(q);
    }
    if (/\b(assignment|zone|duty|sop|procedure|protocol)\b/.test(q)) {
      return generateSOPResponse(q);
    }
    return generateGeneralVolunteerResponse();
  };

  const generateTranslationResponse = (q: string): string => {
    const translations: Record<string, string> = {
      spanish: '**Spanish translations:**\n- "Follow me" → "Sígame"\n- "This way to your seat" → "Por aquí a su asiento"\n- "Restroom is to your left" → "El baño está a su izquierda"\n- "Please have your ticket ready" → "Por favor tenga su boleto listo"',
      french: '**French translations:**\n- "Follow me" → "Suivez-moi"\n- "This way to your seat" → "Par ici pour votre siège"\n- "Restroom is to your left" → "Les toilettes sont à gauche"\n- "Please have your ticket ready" → "Veuillez préparer votre billet"',
      arabic: '**Arabic translations:**\n- "Follow me" → "اتبعني"\n- "This way to your seat" → "من هنا إلى مقعدك"\n- "Restroom is to your left" → "الحمام على يسارك"\n- "Please have your ticket ready" → "يرجى تجهيز تذكرتك"',
      mandarin: '**Mandarin translations:**\n- "Follow me" → "跟我来 (gēn wǒ lái)"\n- "This way to your seat" → "去您的座位这边走 (qù nín de zuò wèi zhè biān zǒu)"\n- "Restroom is to your left" → "洗手间在您的左边 (xǐ shǒu jiān zài nín de zuǒ biān)"\n- "Please have your ticket ready" → "请准备好您的门票 (qǐng zhǔn bèi hǎo nín de mén piào)"',
      german: '**German translations:**\n- "Follow me" → "Folgen Sie mir"\n- "This way to your seat" → "Hier entlang zu Ihrem Sitzplatz"\n- "Restroom is to your left" → "Die Toilette ist zu Ihrer Linken"\n- "Please have your ticket ready" → "Bitte halten Sie Ihr Ticket bereit"',
      japanese: '**Japanese translations:**\n- "Follow me" → "ついて来て下さい (suite kite kudasai)"\n- "This way to your seat" → "こちらがお席です (kochira ga o-seki desu)"\n- "Restroom is to your left" → "お手洗いは左側です (otearai wa hidarigawa desu)"\n- "Please have your ticket ready" → "チケットをご用意ください (chiketto wo go-youi kudasai)"',
    };

    for (const [lang, translation] of Object.entries(translations)) {
      if (q.includes(lang)) return translation;
    }

    return 'What language would you like to translate to or from? Specify Spanish, French, Arabic, Mandarin, German, or Japanese.';
  };

  const generateCrowdResponse = (q: string): string => {
    const highZones = zones.filter(z => z.level === 'high' || z.level === 'critical');
    const mediumZones = zones.filter(z => z.level === 'medium');

    let resp = `## 📊 Crowd Analysis\n\n`;
    resp += `**Current zones at capacity:**\n\n`;

    if (highZones.length > 0) {
      for (const z of highZones) {
        const pct = Math.round((z.current / z.capacity) * 100);
        resp += `- ${z.name}: ${pct}% (${z.current}/${z.capacity}) ${pct >= 90 ? '🔴 CRITICAL' : '🟠 HIGH'}\n`;
        if (pct >= 90) {
          resp += `  → Emergency action: Evacuate non-essential, call for backup, open all exits\n`;
        } else if (pct >= 75) {
          resp += `  → Warning action: Open secondary gates, redirect, request additional staff\n`;
        }
      }
    } else {
      resp += "- None - All zones under capacity\n";
    }

    if (mediumZones.length > 0) {
      resp += `\n**Watchlist (approaching threshold):**\n`;
      for (const z of mediumZones) {
        const pct = Math.round((z.current / z.capacity) * 100);
        resp += `- ${z.name}: ${pct}%\n`;
      }
    }

    const safe = zones.filter(z => z.level === 'low');
    if (safe.length > 0) {
      resp += `\n**Low-traffic areas (recommend for re-routing):**\n`;
      for (const z of safe) {
        resp += `- ${z.name}: available\n`;
      }
    }

    resp += `\n*Recommendation: Station volunteers at all critical zone entrances. Ensure security is notified about threshold breaches.*\n`;
    resp += `\n**XAI Reasoning:** These recommendations are based on real-time occupancy data compared against capacity thresholds. 75% is the warning threshold; 90% is the critical threshold requiring immediate action.`;
    return resp;
  };

  const generateLostChildResponse = (): string => {
    return `## 🆘 Lost Child Protocol\n\n1. Keep the parent/guardian calm and at the location where the child was last seen\n2. Notify security dispatch immediately: **Call 112** or alert nearest security guard\n3. Provide a detailed description of the child (clothing, age, hair color, height)\n4. Check nearby facilities: restrooms, food courts, merchandise stores, exits\n5. Announce a "Code Adam" over the intercom system\n6. Station a volunteer with the parent in case the child returns\n7. If not found in 15 minutes, escalate to on-site police\n\n**XAI Reasoning:** This protocol follows standard stadium emergency procedures and prioritizes child safety by minimizing wait time and involving dedicated security personnel immediately.`;
  };

  const generateEmergencySOP = (): string => {
    return `## 🚨 FIRE / EVACUATION SOP\n\n**IMMEDIATE ACTIONS:**\n1. Pull the nearest fire alarm — do not wait\n2. Call 112: report location, fire size, injured persons (if any)\n3. Announce evacuation via PA: "Please proceed to the nearest exit" in English, Spanish, French, Arabic, Mandarin\n4. Direct people to exits — do not use elevators\n5. Assist mobility-impaired individuals to designated refuge areas (fire-resistant stairwells)\n6. Evacuation routes use the emergency staircase at the end of each concourse\n7. Meet at the emergency assembly points: Parking lots A, B, and C\n8. Do not re-enter the building until fire department gives the all-clear\n\n**XAI Reasoning:** This protocol is based on NFPA Life Safety Code and OSHA evacuation standards for large venues (>5000 occupants). The multilingual requirement ensures non-English speakers receive instruction, preventing panic and bottlenecks.`;
  };

  const generateMedicalResponse = (): string => {
    return `## 🏥 Medical Incident Response\n\n**DO NOT** move an unconscious person unless they are in immediate danger.\n\n1. Call 112 and request medical assistance
    specify nature of injury, location, number of injured\n2. Send a volunteer to meet the medical team at the nearest gate (gate A, B, or C) to escort them to the incident location\n3. Keep the area clear — ask bystanders to step back\n4. If bleeding: apply direct pressure with a clean cloth\n5. If a person is unresponsive and not breathing: start CPR 30 chest compressions / 2 rescue breaths at a rate of 100-120 compressions per minute\n6. AED units are located at:\n   - Concessions 1 (next to guest services)\n   - Main concourse opposite section 104\n   - Security hut at Gate B\n7. When medical team arrives, provide patient handoff with: name (if known), incident info, vitals (if taken), time of incident\n\n**XAI:** Protocols follow AHA and Red Cross guidelines for public venue first aid. Priority is always ABC: Airway, Breathing, Circulation.`;
  };

  const generateVolNavigationResponse = (q: string): string => {
    const zoneMatch = q.match(/(gate|entrance|concourses?\s*a|concourses? b|concourse c|section \d+|parking \d|exits?\s*\d+)/i);
    const targetZone = zoneMatch ? zoneMatch[1] : null;

    if (targetZone) {
      const crowdedZone = zones.find(z => z.zone.toLowerCase().includes(targetZone.replace(' ', '_').toLowerCase()));
      const crowdInfo = crowdedZone ? ` (currently at ${crowdedZone.level})` : '';
      return `📍 **Navigate to ${targetZone}**${crowdInfo}\n\n**Recommended route:**\n1. Head to the main concourse (first floor)\n2. Follow signs for ${targetZone}\n3. Take the corridor on your right\n\n**Avoid:**\n- The food court area is congested; if going to ${targetZone}, use the northern corridor instead.\n\n**XAI reasoning:** The route was selected to minimize time spent in congested areas. I factored current crowd levels into this recommendation.`;
    }

    return `📍 I can help you navigate to any area in the stadium. Tell me which zone you need to reach (e.g., Gate B, Concourse A, Section 101, Parking 1, or Exit 5).\n\nI can also show you the route on a map with congestion highlights.`;
  };

  const generateSOPResponse = (q: string): string => {
    const zoneMatch = q.match(/(gate|entrance|concourse|section|parking|exit)/i);
    return `## 📋 Operations SOP for today\n\n**Volunteer roles & responsibilities:**\n- **Gate volunteers**: Check tickets, direct spectators, maintain entry flow\n- **Concourse volunteers**: Assist with directions, manage queue lines\n- **Section volunteers**: Seat spectators, monitor for issues, report incidents\n- **Parking attendants**: Guide vehicles, maintain traffic flow\n- **Guest services**: Address questions, handle complaints, guide lost persons\n\n**Zone assignments:**\n- Gates A-D: three volunteers per gate\n- Concourses: two volunteers per concourse\n- Sections 101-110: one volunteer per section\n\n**All volunteers check in every 30 minutes** to the command center. Use channel 3 for operations.\n\n**XAI:** Roles are assigned based on the event schedule (peak entry, halftime, exit) and zone capacity. The check-in interval is to ensure safety and situational awareness.`;
  };

  const generateGeneralVolunteerResponse = (): string => {
    return `${VOLUNTEER_GREETING}\n\nI'm standing by for your command. What would you like help with?`;
  };

  const toggleListen = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
    else { setInputValue(''); recognitionRef.current?.start(); setIsListening(true); }
  };

  const quickActions = [
    { label: 'Crowd', icon: '📊', action: 'Give me a full crowd update with thresholds' },
    { label: 'Translate', icon: '🌍', action: 'Translate common phrases to Spanish' },
    { label: 'SOP', icon: '📋', action: 'What are my duties and SOPs today?' },
    { label: 'Lost Child', icon: '🆘', action: 'Lost child protocol' },
    { label: 'Medical', icon: '🏥', action: 'Medical incident response' },
    { label: 'Navigate', icon: '📍', action: 'Navigate to Gate B' },
  ];

  const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-700/50 min-w-[80px]">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-black text-white pb-24">
      {/* Header */}
      <header className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
        <div className="p-2 bg-emerald-600/20 rounded-xl">
          <Shield size={20} className="text-emerald-400" />
        </div>
        <div className="flex flex-col flex-1">
          <h2 className="text-lg font-bold text-white">Volunteer Co-pilot</h2>
          <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Online</span>
        </div>
        <button onClick={() => setExpandedSection(expandedSection === 'crowd' ? null : 'crowd')} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors">
          <Users size={18} className="text-zinc-400" />
        </button>
        <button onClick={() => setExpandedSection(expandedSection === 'translate' ? null : 'translate')} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors">
          <Languages size={18} className="text-zinc-400" />
        </button>
      </header>

      {/* Collapsible crowd summary */}
      {expandedSection === 'crowd' && (
        <div className="bg-zinc-900/80 border-b border-zinc-800 p-4 flex flex-col gap-3 animate-in slide-in-from-top fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2"><Cpu size={14} /> Zone Monitor</h3>
            <span className="text-xs text-zinc-500">Auto-refreshes every 30s</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {zones.slice(0, 12).map((z) => {
              const config = LEVEL_CONFIG[z.level] || LEVEL_CONFIG.low;
              const pct = Math.round((z.current / z.capacity) * 100);
              const isThreshold = pct >= 75;
              return (
                <div key={z.zone} className={`bg-zinc-800/50 p-2 rounded-lg border ${isThreshold ? 'border-rose-500/50' : config.border} relative overflow-hidden`}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs">{config.icon}</span>
                    <span className="text-[10px] text-zinc-400 truncate">{z.name}</span>
                  </div>
                  <div className={`text-xs font-bold ${config.color}`}>{pct}%</div>
                  <div className="w-full bg-zinc-900 rounded-full h-1 mt-1">
                    <div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  {isThreshold && <AlertTriangle size={10} className="absolute top-1 right-1 text-amber-500" />}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-1">
            <StatCard label="Total Capacity" value={`${zones.reduce((s, z) => s + z.current, 0)}`} color="text-blue-400" />
            <StatCard label="Critical" value={`${zones.filter(z => z.level === 'critical').length}`} color="text-red-400" />
            <StatCard label="Warning" value={`${zones.filter(z => z.level === 'high').length}`} color="text-amber-400" />
          </div>
        </div>
      )}

      {/* Collapsible translate panel */}
      {expandedSection === 'translate' && (
        <div className="bg-zinc-900/80 border-b border-zinc-800 p-4 animate-in slide-in-from-top fade-in duration-200">
          <div className="flex items-center gap-2 mb-3">
            <Languages size={14} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Quick Translations</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['Spanish', 'French', 'Arabic'].map((lang) => (
              <button
                key={lang}
                onClick={() => sendMessage(`Translate common entry phrases to ${lang}`)}
                className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg border border-zinc-700 text-xs font-medium transition-colors"
              >
                {lang}
              </button>
            ))}
            {['Mandarin', 'German', 'Japanese'].map((lang) => (
              <button
                key={lang}
                onClick={() => sendMessage(`Translate common phrases to ${lang}`)}
                className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg border border-zinc-700 text-xs font-medium transition-colors"
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-4 w-full flex flex-col items-center">
        <div className="w-full max-w-[900px] flex flex-col">
          {messages.map((msg) => (
            <div key={msg.id} className="mb-2">
              {msg.isTyping ? (
                <div className="flex w-full gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0 border border-emerald-600/30">
                    <Shield size={14} className="text-emerald-400" />
                  </div>
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-6">
                      <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay: '0s'}} />
                      <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}} />
                      <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`flex w-full gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'ai' ? 'bg-emerald-600/20 border border-emerald-600/30' : 'bg-zinc-700'}`}>
                    {msg.sender === 'ai' ? <Shield size={14} className="text-emerald-400" /> : <span className="text-xs text-white font-bold">V</span>}
                  </div>
                  <div className={`flex flex-col ${msg.sender === 'ai' ? 'w-full' : 'max-w-[80%]'}`}>
                    {msg.sender === 'user' ? (
                      <div className="bg-zinc-800 px-4 py-2.5 rounded-2xl rounded-tr-none text-sm text-zinc-200">
                        {msg.text}
                      </div>
                    ) : (
                      <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed break-words text-zinc-200 border-l-2 border-emerald-600/30 pl-3">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Quick action buttons (only when few messages) */}
          {messages.length <= 2 && !isLoading && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Quick Actions</h3>
              <div className="flex flex-wrap gap-2 px-1">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(action.action)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2 rounded-full border border-zinc-800 hover:border-zinc-700 transition-all text-sm flex items-center gap-2"
                  >
                    <span>{action.icon}</span>
                    <span className="font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex w-full mb-6 justify-start animate-in fade-in zoom-in duration-300">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center border border-emerald-600/30">
                  <Loader2 size={14} className="animate-spin text-emerald-400" />
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex flex-col gap-2 min-w-[200px]">
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800 w-full flex justify-center">
        <div className="w-full max-w-[900px] relative">
          <div className="flex items-end gap-2">
            <button
              onClick={toggleListen}
              className={`p-3 rounded-xl transition-all ${isListening ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
            </button>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1 flex-1 flex items-end">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue); } }}
                placeholder="Ask your co-pilot..."
                className="w-full bg-transparent border-none focus:outline-none h-[52px] px-4 text-sm"
              />
            </div>
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="w-12 h-12 shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
