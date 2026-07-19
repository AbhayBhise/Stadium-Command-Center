import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Volume2, VolumeX, Square, Navigation2, Loader2, AlertTriangle, CheckCircle, ChevronDown, Search, Compass } from 'lucide-react';
import { NavigationTarget } from '@/app/page';

interface DefaultIcon extends L.Icon.Default {
  _getIconUrl?: string;
}
delete (L.Icon.Default.prototype as DefaultIcon)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.DivIcon({
  html: `<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function getDistance(p1: [number, number], p2: [number, number]) {
  const R = 6371e3;
  const φ1 = p1[0] * Math.PI / 180;
  const φ2 = p2[0] * Math.PI / 180;
  const Δφ = (p2[0] - p1[0]) * Math.PI / 180;
  const Δλ = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function distToSegmentSquared(p: [number, number], v: [number, number], w: [number, number]) {
  const l2 = Math.pow(v[0] - w[0], 2) + Math.pow(v[1] - w[1], 2);
  if (l2 === 0) return Math.pow(p[0] - v[0], 2) + Math.pow(p[1] - v[1], 2);
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.pow(p[0] - (v[0] + t * (w[0] - v[0])), 2) + Math.pow(p[1] - (v[1] + t * (w[1] - v[1])), 2);
}

function distToSegment(p: [number, number], v: [number, number], w: [number, number]) {
  return Math.sqrt(distToSegmentSquared(p, v, w)) * 111320;
}

function destinationOffsetForLabel(label: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) % 3600;
  }
  const angle = (hash / 10) * (Math.PI / 180);
  const distanceMeters = 180 + (hash % 120);
  const metersToLat = 1 / 111320;
  const metersToLng = 1 / (111320 * Math.cos(angle));
  const dLat = Math.sin(angle) * distanceMeters * metersToLat;
  const dLng = Math.cos(angle) * distanceMeters * metersToLng;
  return [dLat, dLng];
}

function MapUpdater({ 
  currentLoc, 
  navState, 
  recenterCount,
  onUserPanned 
}: { 
  currentLoc: [number, number] | null; 
  navState: string; 
  recenterCount: number;
  onUserPanned: () => void;
}) {
  const map = useMap();
  const isAutoCentering = useRef(true);

  // Auto center on new GPS location ticks if enabled
  useEffect(() => {
    if (currentLoc && isAutoCentering.current) {
      map.setView(currentLoc, navState === 'NAVIGATING' ? 18 : 16);
    }
  }, [currentLoc, navState, map]);

  // Force recenter when button is clicked
  useEffect(() => {
    if (currentLoc) {
      map.setView(currentLoc, navState === 'NAVIGATING' ? 18 : 16);
      isAutoCentering.current = true;
    }
  }, [recenterCount]);

  // Disable auto centering when user pans/zooms map manually
  useEffect(() => {
    const onMoveStart = (e: any) => {
      if (e.originalEvent) {
        isAutoCentering.current = false;
        onUserPanned();
      }
    };
    map.on('movestart', onMoveStart);
    return () => {
      map.off('movestart', onMoveStart);
    };
  }, [map, onUserPanned]);

  return null;
}

const DEFAULT_DESTINATIONS = [
  { label: 'Washroom', icon: '🚻' },
  { label: 'Exit Gate', icon: '🚪' },
  { label: 'First Aid', icon: '🏥' },
  { label: 'Food Court', icon: '🍔' },
  { label: 'Ticket Booth', icon: '🎫' },
  { label: 'Parking', icon: '🅿️' },
];

interface RouteStep {
  order: number;
  instruction: string;
  to_zone: string;
}

export default function MapInner({ onClose, target }: { onClose?: () => void; target?: NavigationTarget | null }) {
  type NavState = 'LOADING' | 'IDLE' | 'NAVIGATING' | 'PAUSED' | 'ARRIVED' | 'ERROR';
  
  const [navState, setNavState] = useState<NavState>('LOADING');
  const [currentLoc, setCurrentLoc] = useState<[number, number] | null>(null);
  const [destLoc, setDestLoc] = useState<[number, number] | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [steps, setSteps] = useState<unknown[]>([]);
  const [currentInstruction, setCurrentInstruction] = useState<string>("Head to route");
  const [nextTurnDistance, setNextTurnDistance] = useState<number>(0);
  const [destinationLabel, setDestinationLabel] = useState<string>('Destination');
  const [plannedSteps, setPlannedSteps] = useState<RouteStep[]>([]);
  
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [routePanelOpen, setRoutePanelOpen] = useState(true);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [destInput, setDestInput] = useState('');
  const [recenterCount, setRecenterCount] = useState(0);
  const [showRecenterBtn, setShowRecenterBtn] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);
  const lastLoc = useRef<[number, number] | null>(null);
  const lastTime = useRef<number>(0);
  const currentStepIdx = useRef<number>(0);
  const announcedSteps = useRef<Set<number>>(new Set());
  const locState = useRef<'INIT' | 'OK'>('INIT');
  const lastTargetRef = useRef<NavigationTarget | null>(null);

  const speak = useCallback((text: string, force = false) => {
    if (isMuted && !force) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(text);
      msg.rate = 1.0;
      window.speechSynthesis.speak(msg);
    }
  }, [isMuted]);

  const fetchRoute = useCallback(async (start: [number, number], end: [number, number]) => {
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`);
      if (!res.ok) throw new Error('Route fetch failed');
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
        setRouteCoords(coords);
        setTotalDistance(route.distance);
        
        if (route.legs && route.legs[0].steps) {
          setSteps(route.legs[0].steps);
          currentStepIdx.current = 0;
          announcedSteps.current.clear();
        }
        setErrorMsg(null);
        return true;
      }
    } catch {
      setErrorMsg("Route unavailable");
      setNavState('ERROR');
      return false;
    }
    return false;
  }, []);

  const pickDestination = useCallback((label: string) => {
    setDestinationLabel(label);
    setShowDestPicker(false);
    setDestInput('');
    if (currentLoc) {
      const [dLat, dLng] = destinationOffsetForLabel(label);
      const nextDest: [number, number] = [currentLoc[0] + dLat, currentLoc[1] + dLng];
      setDestLoc(nextDest);
      void fetchRoute(currentLoc, nextDest);
      setNavState('IDLE');
    }
  }, [currentLoc, fetchRoute]);

  useEffect(() => {
    if (!target || target === lastTargetRef.current) return;
    
    const nextLabel = target.destination && target.destination.trim().length > 0 ? target.destination : 'Destination';
    setDestinationLabel(nextLabel);
    setPlannedSteps(Array.isArray(target.routeSteps) ? target.routeSteps : []);

    if (currentLoc) {
      lastTargetRef.current = target;
      const [dLat, dLng] = destinationOffsetForLabel(nextLabel);
      const nextDest: [number, number] = [currentLoc[0] + dLat, currentLoc[1] + dLng];
      setDestLoc(nextDest);
      void fetchRoute(currentLoc, nextDest);
      setNavState('IDLE');
    }
  }, [target, currentLoc, fetchRoute]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setTimeout(() => { setNavState('ERROR'); setErrorMsg('GPS not supported'); }, 0);
      return;
    }

    try {
      const saved = localStorage.getItem('loc');
      if (saved) {
        const parsed = JSON.parse(saved) as [number, number];
        const dLatOffset = destinationOffsetForLabel(destinationLabel)[0];
        const dLngOffset = destinationOffsetForLabel(destinationLabel)[1];
        setCurrentLoc(parsed);
        setDestLoc([parsed[0] + dLatOffset, parsed[1] + dLngOffset]);
        setNavState('IDLE');
      }
    } catch { /* ignore */ }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newLoc: [number, number] = [latitude, longitude];
        localStorage.setItem('loc', JSON.stringify(newLoc));

        const dLatOffset = destinationOffsetForLabel(destinationLabel)[0];
        const dLngOffset = destinationOffsetForLabel(destinationLabel)[1];

        const now = Date.now();
        if (lastLoc.current) {
          const dist = getDistance(lastLoc.current, newLoc);
          const timeDiff = (now - lastTime.current) / 1000;
          if (timeDiff > 0) setSpeed(Math.round((dist / timeDiff) * 3.6));
        } else {
          if (!destLoc) {
            const simDest: [number, number] = [latitude + dLatOffset, longitude + dLngOffset];
            setDestLoc(simDest);
          }
          if (locState.current === 'INIT') { locState.current = 'OK'; setNavState('IDLE'); }
        }

        lastLoc.current = newLoc;
        lastTime.current = now;
        setCurrentLoc(newLoc);
        setErrorMsg(null);
      },
      (err) => {
        if (err.code === 1) { setErrorMsg('Permission denied.'); setNavState('ERROR'); }
        else if (err.code === 3 && locState.current === 'INIT') {
          setNavState('LOADING');
          setErrorMsg('Acquiring GPS\u2026');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [destinationLabel]);

  // Route monitoring loop
  useEffect(() => {
    if (navState !== 'NAVIGATING' || !currentLoc || !destLoc || routeCoords.length === 0) return;

    const distToDest = getDistance(currentLoc, destLoc);
    
    if (distToDest < 15) {
      setNavState('ARRIVED');
      speak(`You have reached ${destinationLabel}.`, true);
      return;
    }

    // Check deviation — only recalc if >50m off route to avoid loops
    let minSegDist = Infinity;
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const d = distToSegment(currentLoc, routeCoords[i], routeCoords[i+1]);
      if (d < minSegDist) minSegDist = d;
    }
    
    if (minSegDist > 50) {
      fetchRoute(currentLoc, destLoc);
      return;
    }

    if (steps.length > currentStepIdx.current) {
      const step = steps[currentStepIdx.current];
      type StepWithLocation = { maneuver: { location: [number, number] } };
      const stepLoc: [number, number] = [(step as StepWithLocation).maneuver.location[1], (step as StepWithLocation).maneuver.location[0]];
      const distToStep = getDistance(currentLoc, stepLoc);
      
      if (distToStep < 20 && !announcedSteps.current.has(currentStepIdx.current)) {
        announcedSteps.current.add(currentStepIdx.current);
        
        type StepType = { maneuver?: { type?: string; modifier?: string }, name?: string };
        const s = step as StepType;
        
        let instructionText = s.maneuver?.type || 'Proceed';
        if (s.maneuver?.modifier) instructionText += ` ${s.maneuver.modifier}`;
        if (s.name) instructionText += ` onto ${s.name}`;
        
        setCurrentInstruction(instructionText);
        setNextTurnDistance(Math.round(distToStep));

        if (s.maneuver?.type === 'turn') {
          speak(`Turn ${s.maneuver.modifier}.`);
        } else if (s.maneuver?.type === 'arrive') {
          speak("Destination is ahead.");
        } else if (currentStepIdx.current === 0) {
          speak(`Walk straight for ${Math.round((step as { distance?: number }).distance || 0)} meters.`);
        }
        
        currentStepIdx.current += 1;
      }
    }
  }, [currentLoc, navState, destLoc, routeCoords, steps, fetchRoute, speak, destinationLabel]);


  const toggleMute = () => setIsMuted(m => !m);
  
  const startNav = () => {
    setNavState('NAVIGATING');
    speak("Starting navigation. Walk towards the route.");
  };

  const endNav = () => {
    setNavState('IDLE');
    window.speechSynthesis.cancel();
    if (onClose) onClose();
  };

  const computedDistance = currentLoc && destLoc ? Math.round(getDistance(currentLoc, destLoc)) : 0;
  
  const [etaStr, setEtaStr] = useState('');
  useEffect(() => {
    if (computedDistance > 0) {
      const mins = Math.max(1, Math.round(computedDistance / 80));
      setEtaStr(new Date(Date.now() + mins * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    }
  }, [computedDistance]);

  if (navState === 'LOADING') {
    return (
      <div className="w-full h-[300px] bg-zinc-900 rounded-xl flex flex-col items-center justify-center border border-zinc-800">
        <Loader2 className="animate-spin text-primary mb-2" size={32} />
        <span className="text-zinc-400 text-sm">Acquiring GPS location...</span>
      </div>
    );
  }

  if (navState === 'ERROR') {
    return (
      <div className="w-full h-[300px] bg-red-950/20 rounded-xl flex flex-col items-center justify-center border border-red-900/50">
        <AlertTriangle className="text-red-500 mb-2" size={32} />
        <span className="text-red-400 font-medium">Navigation Error</span>
        <span className="text-red-400/80 text-sm mb-4">{errorMsg}</span>
        <button 
          onClick={() => { window.location.reload(); }}
          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Retry Location
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-zinc-900">
      
      {/* Destination Picker Modal */}
      {showDestPicker && (
        <div className="absolute inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden text-zinc-900 shadow-2xl">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="font-bold text-lg text-zinc-900">Choose Destination</h3>
              <button onClick={() => setShowDestPicker(false)} className="text-zinc-500 text-2xl">&times;</button>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2 bg-zinc-100 rounded-xl px-3 py-2">
                <Search size={18} className="text-zinc-400" />
                <input
                  type="text"
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  placeholder="Search destinations..."
                  className="bg-transparent outline-none text-sm flex-1 text-zinc-900"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-1">
              {DEFAULT_DESTINATIONS
                .filter(d => d.label.toLowerCase().includes(destInput.toLowerCase()))
                .map(d => (
                  <button
                    key={d.label}
                    onClick={() => pickDestination(d.label)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-100 transition-colors text-left text-zinc-900"
                  >
                    <span className="text-xl">{d.icon}</span>
                    <span className="font-semibold text-zinc-900">{d.label}</span>
                  </button>
                ))}
              {destInput.trim() && (
                <button
                  onClick={() => pickDestination(destInput.trim())}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-blue-50 transition-colors text-left text-blue-600"
                >
                  <Search size={18} />
                  <span className="font-medium">Go to &ldquo;{destInput.trim()}&rdquo;</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HUD: Turn Instruction Card */}
      {navState === 'NAVIGATING' && (
        <div className="absolute top-0 left-0 right-0 z-[1000] p-3 pointer-events-none transition-transform">
          <div className="bg-green-600 rounded-2xl shadow-xl p-4 flex items-center gap-4 text-white pointer-events-auto border-b-4 border-green-700">
            <div className="bg-white/20 p-3 rounded-full">
              <Navigation2 size={32} className="transform -rotate-45" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-3xl font-bold">{nextTurnDistance > 0 ? `${nextTurnDistance}m` : ''}</span>
              <span className="text-lg font-medium leading-tight">{currentInstruction}</span>
            </div>
          </div>
        </div>
      )}

      {/* Map Area */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer center={currentLoc || [0,0]} zoom={16} className="h-full w-full" zoomControl={true}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {currentLoc && <Marker position={currentLoc} icon={userIcon} zIndexOffset={1000} />}
          {destLoc && (
            <Marker position={destLoc} icon={destIcon}>
              <Popup>{destinationLabel}</Popup>
            </Marker>
          )}
          {routeCoords.length > 0 && (
            <Polyline positions={routeCoords} color="#3b82f6" weight={8} opacity={0.9} />
          )}
          <MapUpdater currentLoc={currentLoc} navState={navState} recenterCount={recenterCount} onUserPanned={() => setShowRecenterBtn(true)} />
        </MapContainer>
        
        {navState === 'NAVIGATING' && (
          <div className="absolute top-32 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
            <div className="bg-white rounded-full p-2 pointer-events-auto shadow-md flex flex-col items-center justify-center w-12 h-12">
              <span className="text-black font-bold text-sm">{speed}</span>
              <span className="text-zinc-500 text-[10px] uppercase leading-none">km/h</span>
            </div>
          </div>
        )}

        {showRecenterBtn && currentLoc && (
          <div className="absolute top-48 right-3 z-[1000]">
            <button 
              onClick={() => {
                setRecenterCount(c => c + 1);
                setShowRecenterBtn(false);
              }}
              className="p-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Recenter Map"
            >
              <Compass size={20} className="text-blue-500" />
            </button>
          </div>
        )}
      </div>
      
      {/* Collapsible Route Panel */}
      <div className={`absolute bottom-0 left-0 right-0 z-[1000] transition-all duration-300 ${routePanelOpen ? '' : 'translate-y-[calc(100%-48px)]'}`}>
        {/* Collapse Handle */}
        <button
          onClick={() => setRoutePanelOpen(p => !p)}
          className="mx-auto flex items-center gap-2 bg-zinc-950 border-t border-x border-zinc-800 rounded-t-2xl px-5 py-2.5 shadow-2xl w-fit active:scale-95 transition-all text-white"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {routePanelOpen ? "Hide Route Details" : "Show Route Details"}
          </span>
          <ChevronDown size={14} className={`text-zinc-400 transition-transform ${routePanelOpen ? '' : 'rotate-180'}`} />
        </button>

        <div className="bg-zinc-950 border-t border-zinc-800 shadow-2xl p-4 max-h-[40vh] overflow-y-auto text-white">
          {navState === 'ARRIVED' ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-col items-center justify-center gap-2 text-emerald-600 font-bold py-4">
                <CheckCircle size={40} />
                <span className="text-xl">You have arrived</span>
              </div>
              <button 
                onClick={endNav}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-lg font-bold transition-colors active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Quick destination chips */}
              {navState === 'IDLE' && (
                <div 
                  className="flex flex-row flex-nowrap overflow-x-auto gap-2 pb-2 w-full select-none" 
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {DEFAULT_DESTINATIONS.map(d => (
                    <button
                      key={d.label}
                      onClick={() => pickDestination(d.label)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors flex-shrink-0 cursor-pointer ${
                        destinationLabel === d.label
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      <span>{d.icon}</span>
                      {d.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowDestPicker(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <Search size={12} />
                    More
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-inner">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Route Summary</div>
                <div className="mt-1 text-sm text-zinc-100">
                  <div><span className="font-semibold text-zinc-400">To:</span> {destinationLabel}</div>
                  <div><span className="font-semibold text-zinc-400">Distance:</span> {computedDistance}m</div>
                </div>
                {plannedSteps.length > 0 && (
                  <ol className="mt-2 list-decimal pl-4 text-xs text-zinc-300 space-y-1">
                    {plannedSteps.slice(0, 3).map((step) => (
                      <li key={`${step.order}-${step.to_zone}`} className="leading-snug">{step.instruction}</li>
                    ))}
                  </ol>
                )}
              </div>

              {navState === 'NAVIGATING' && totalDistance > 0 && (
                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.max(0, Math.min(100, ((totalDistance - computedDistance) / totalDistance) * 100))}%` }}
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-green-500">{Math.max(1, Math.round(computedDistance/80))} min</span>
                  <span className="text-sm text-zinc-400 font-medium">{computedDistance} meters {etaStr ? `\u2022 Arrival ${etaStr}` : ''}</span>
                </div>
                <button 
                  onClick={toggleMute}
                  className="p-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-full transition-colors active:scale-95 cursor-pointer"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
              
              <div className="flex gap-3">
                {navState === 'IDLE' && (
                  <button 
                    onClick={startNav}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-base font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                  >
                    <Navigation2 size={20} /> Start
                  </button>
                )}
                
                {navState === 'NAVIGATING' && (
                  <button 
                    onClick={endNav}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-base font-bold transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                  >
                    <Square size={20} /> Exit
                  </button>
                )}

                {navState === 'IDLE' && (
                  <button 
                    onClick={endNav}
                    className="w-auto px-6 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-3 rounded-xl text-base font-bold border border-zinc-800 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
