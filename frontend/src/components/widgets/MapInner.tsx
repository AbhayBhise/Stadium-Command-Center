import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Volume2, VolumeX, Square, Navigation2, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
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

// Distance from point to a line segment
function distToSegmentSquared(p: [number, number], v: [number, number], w: [number, number]) {
  const l2 = Math.pow(v[0] - w[0], 2) + Math.pow(v[1] - w[1], 2);
  if (l2 === 0) return Math.pow(p[0] - v[0], 2) + Math.pow(p[1] - v[1], 2);
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.pow(p[0] - (v[0] + t * (w[0] - v[0])), 2) + Math.pow(p[1] - (v[1] + t * (w[1] - v[1])), 2);
}

function distToSegment(p: [number, number], v: [number, number], w: [number, number]) {
  return Math.sqrt(distToSegmentSquared(p, v, w)) * 111320; // approximate meters
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

function MapUpdater({ currentLoc, navState }: { currentLoc: [number, number] | null, navState: string }) {
  const map = useMap();
  useEffect(() => {
    if (currentLoc && navState === 'NAVIGATING') {
      map.setView(currentLoc, 18, { animate: true, duration: 1 });
    } else if (currentLoc && navState === 'IDLE') {
      map.setView(currentLoc, 16);
    }
  }, [currentLoc, navState, map]);
  return null;
}

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
  
  const watchId = useRef<number | null>(null);
  const lastLoc = useRef<[number, number] | null>(null);
  const lastTime = useRef<number>(0);
  const currentStepIdx = useRef<number>(0);
  const announcedSteps = useRef<Set<number>>(new Set());

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
      // OSRM: lon,lat
      const res = await fetch(`https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`);
      if (!res.ok) throw new Error('Route fetch failed');
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
        setRouteCoords(coords);
        if (totalDistance === 0) setTotalDistance(route.distance);
        
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
  }, [totalDistance]);

  useEffect(() => {
    if (!target) return;
    const nextLabel = target.destination && target.destination.trim().length > 0 ? target.destination : 'Destination';
    setDestinationLabel(nextLabel);
    setPlannedSteps(Array.isArray(target.routeSteps) ? target.routeSteps : []);

    if (currentLoc) {
      const [dLat, dLng] = destinationOffsetForLabel(nextLabel);
      const nextDest: [number, number] = [currentLoc[0] + dLat, currentLoc[1] + dLng];
      setDestLoc(nextDest);
      void fetchRoute(currentLoc, nextDest);
      setNavState('IDLE');
    }
  }, [target, currentLoc, fetchRoute]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setTimeout(() => {
        setErrorMsg("GPS not supported");
        setNavState('ERROR');
      }, 0);
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const startWatch = () => {
      watchId.current = navigator.geolocation.watchPosition(
        async (pos: GeolocationPosition) => {
          retryCount = 0; // Reset on success
          setErrorMsg(null);
          
          const { latitude, longitude } = pos.coords;
          const newLoc: [number, number] = [latitude, longitude];
          
          const now = Date.now();
          if (lastLoc.current) {
            const dist = getDistance(lastLoc.current, newLoc);
            const timeDiff = (now - lastTime.current) / 1000;
            if (timeDiff > 0) {
              setSpeed(Math.round((dist / timeDiff) * 3.6)); // km/h
            }
          } else {
            setCurrentLoc(newLoc);
            const [dLat, dLng] = destinationOffsetForLabel(destinationLabel);
            const simulatedDest: [number, number] = [latitude + dLat, longitude + dLng];
            setDestLoc(simulatedDest);
            setNavState('IDLE');
            await fetchRoute(newLoc, simulatedDest);
          }
          
          lastLoc.current = newLoc;
          lastTime.current = now;
          setCurrentLoc(newLoc);
        },
        (err) => {
          if (err.code === 1) {
            setErrorMsg("Location permission denied.");
            if (!lastLoc.current) setNavState('ERROR');
          } else if (err.code === 2) {
            setErrorMsg("Current location unavailable.");
            if (!lastLoc.current) setNavState('ERROR');
          } else if (err.code === 3) {
            if (retryCount < maxRetries) {
              retryCount++;
              setErrorMsg("Unable to obtain GPS location. Retrying...");
              if (!lastLoc.current) setNavState('LOADING');
              
              if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
              timeoutId = setTimeout(() => startWatch(), 2000);
            } else {
              setErrorMsg("Unable to obtain GPS location.");
              if (!lastLoc.current) setNavState('ERROR');
            }
          } else {
            setErrorMsg("Unknown location error.");
            if (!lastLoc.current) setNavState('ERROR');
          }
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 1000 }
      );
    };

    startWatch();

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchRoute, destinationLabel]);

  // Route monitoring loop
  useEffect(() => {
    if (navState !== 'NAVIGATING' || !currentLoc || !destLoc || routeCoords.length === 0) return;

    // 1. Check arrival
    const distToDest = getDistance(currentLoc, destLoc);
    
    if (distToDest < 15) {
      setTimeout(() => {
        setNavState('ARRIVED');
        speak(`You have reached ${destinationLabel}.`, true);
      }, 0);
      return;
    }

    // 2. Check route deviation
    let minSegDist = Infinity;
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const d = distToSegment(currentLoc, routeCoords[i], routeCoords[i+1]);
      if (d < minSegDist) minSegDist = d;
    }
    
    // If deviation > 30m, recalculate
    if (minSegDist > 30) {
      setTimeout(() => fetchRoute(currentLoc, destLoc), 0);
      speak("Recalculating route.", true);
      return;
    }

    // 3. Voice guidance for steps
    if (steps.length > currentStepIdx.current) {
      const step = steps[currentStepIdx.current];
      // step location is [lon, lat]
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

        // Simple human-readable string mapping
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
      setTimeout(() => {
        const mins = Math.max(1, Math.round(computedDistance / 80));
        setEtaStr(new Date(Date.now() + mins * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
      }, 0);
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
          onClick={() => {
            window.location.reload();
          }}
          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Retry Location
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-zinc-900">
      
      {/* HUD: Turn Instruction Card (Google Maps Style Top Banner) */}
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
        <MapContainer center={currentLoc || [0,0]} zoom={16} className="h-full w-full" zoomControl={false}>
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
          <MapUpdater currentLoc={currentLoc} navState={navState} />
        </MapContainer>
        
        {/* On-Map HUD overlay (Compass, Recenter, Speed) */}
        {navState === 'NAVIGATING' && (
          <div className="absolute top-32 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
            <div className="bg-white rounded-full p-2 pointer-events-auto shadow-md flex flex-col items-center justify-center w-12 h-12">
              <span className="text-black font-bold text-sm">{speed}</span>
              <span className="text-zinc-500 text-[10px] uppercase leading-none">km/h</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Floating Panel */}
      <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-3xl shadow-2xl z-[1000] flex flex-col pointer-events-auto p-4 pb-4">
        
        {navState === 'ARRIVED' ? (
          <div className="px-2 pb-2">
            <div className="w-full flex flex-col items-center justify-center gap-2 text-emerald-600 font-bold py-4">
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
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Route Summary</div>
              <div className="mt-1 text-sm text-zinc-800">
                <div><span className="font-medium">Current:</span> {currentLoc ? `${currentLoc[0].toFixed(5)}, ${currentLoc[1].toFixed(5)}` : 'Locating...'}</div>
                <div><span className="font-medium">Destination:</span> {destinationLabel}</div>
                <div><span className="font-medium">Route:</span> {routeCoords.length > 1 ? `Highlighted (${routeCoords.length} points)` : 'Computing...'}</div>
              </div>
              {plannedSteps.length > 0 && (
                <ol className="mt-2 list-decimal pl-4 text-xs text-zinc-600">
                  {plannedSteps.slice(0, 3).map((step) => (
                    <li key={`${step.order}-${step.to_zone}`}>{step.instruction}</li>
                  ))}
                </ol>
              )}
            </div>

            {/* Progress Bar */}
            {navState === 'NAVIGATING' && totalDistance > 0 && (
              <div className="w-full bg-zinc-100 rounded-full h-2 mt-1 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${Math.max(0, Math.min(100, ((totalDistance - computedDistance) / totalDistance) * 100))}%` }}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-green-600">{Math.max(1, Math.round(computedDistance/80))} min</span>
                <span className="text-sm text-zinc-500 font-medium">{computedDistance} meters • Arrival {etaStr}</span>
              </div>
              <button 
                onClick={toggleMute}
                className="p-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition-colors"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
            
            <div className="flex gap-3 mt-1">
              {navState === 'IDLE' && (
                <button 
                  onClick={startNav}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-base font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Navigation2 size={20} /> Start
                </button>
              )}
              
              {navState === 'NAVIGATING' && (
                <button 
                  onClick={endNav}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-base font-bold transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Square size={20} /> Exit
                </button>
              )}

              {navState === 'IDLE' && (
                <button 
                  onClick={endNav}
                  className="w-auto px-6 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 py-3 rounded-xl text-base font-bold transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
