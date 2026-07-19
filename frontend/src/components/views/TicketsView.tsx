'use client';

import React, { useRef, useEffect } from 'react';
import { Ticket, Navigation, Share2, Wallet, Phone, Map } from 'lucide-react';
import { eventProvider } from '../../providers/event.provider';

function QRCodeCanvas({ value, size = 160 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    const moduleCount = 25;
    const cellSize = size / moduleCount;

    const hash = simpleHash(value);
    const modules: boolean[][] = [];
    for (let row = 0; row < moduleCount; row++) {
      modules[row] = [];
      for (let col = 0; col < moduleCount; col++) {
        if (isFinderPattern(row, col, moduleCount)) {
          modules[row][col] = true;
        } else if (isTimingPattern(row, col, moduleCount)) {
          modules[row][col] = (row % 2 === 0);
        } else {
          modules[row][col] = ((hash + row * moduleCount + col) % 3) !== 0;
        }
      }
    }

    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules[row][col]) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg" style={{ width: size, height: size }} />;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function isFinderPattern(row: number, col: number, size: number): boolean {
  const inTopLeft = row < 7 && col < 7;
  const inTopRight = row < 7 && col >= size - 7;
  const inBottomLeft = row >= size - 7 && col < 7;
  if (!inTopLeft && !inTopRight && !inBottomLeft) return false;
  const r = inTopLeft ? row : inTopRight ? row : row - (size - 7);
  const c = inTopLeft ? col : inTopRight ? col - (size - 7) : col;
  if (r === 0 || r === 6 || c === 0 || c === 6) return true;
  if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
  return false;
}

function isTimingPattern(row: number, col: number, size: number): boolean {
  return (row === 6 && col >= 8 && col < size - 8) || (col === 6 && row >= 8 && row < size - 8);
}

export function TicketsView({ onNavigate }: { onNavigate?: () => void }) {
  const eventContext = eventProvider.getEventContext();

  return (
    <div className="flex-1 w-full h-full bg-black flex flex-col pt-4 pb-24 overflow-y-auto">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white">Today&apos;s Event</h2>
      </div>
      
      <div className="p-4 flex flex-col gap-4">
        
        {/* Countdown Banner */}
        <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-2xl p-4 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-emerald-400 font-bold text-sm uppercase tracking-wider">Gate Opens In</span>
            <span className="text-2xl font-bold text-emerald-500">{eventContext.gateCountdown}</span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-zinc-400 text-xs">Parking {eventContext.parking}</span>
            <span className="text-zinc-200 font-bold text-sm">{eventContext.parkingStatus}</span>
          </div>
        </div>

        {/* Active Ticket Card */}
        <div className="bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-3xl overflow-hidden border border-zinc-700 shadow-2xl relative mt-2">
          
          {/* Header */}
          <div className="p-6 border-b border-zinc-700/50 border-dashed relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{eventContext.event}</h3>
                <h4 className="text-sm font-semibold text-emerald-400">{eventContext.match}</h4>
                <p className="text-zinc-400 text-sm">Saturday • {eventContext.kickoff}</p>
                <p className="text-zinc-500 text-xs mt-1">Ticket Holder: Abhay Singh</p>
              </div>
              <div className="bg-primary/20 text-primary p-2 rounded-xl">
                <Ticket size={24} />
              </div>
            </div>
            
            {/* Cutouts */}
            <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-black rounded-full border-t border-r border-zinc-700/50"></div>
            <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-black rounded-full border-t border-l border-zinc-700/50"></div>
          </div>
          
          {/* Seat Details */}
          <div className="p-6 flex justify-between items-center bg-zinc-900/50">
            <div className="flex flex-col">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Gate</span>
              <span className="font-bold text-lg text-white">{eventContext.ticketHolder}</span>
            </div>
            <div className="w-px h-10 bg-zinc-700"></div>
            <div className="flex flex-col">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Section</span>
              <span className="text-xl font-bold text-white">{eventContext.section}</span>
            </div>
            <div className="w-px h-10 bg-zinc-700"></div>
            <div className="flex flex-col">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Row</span>
              <span className="text-xl font-bold text-white">{eventContext.row}</span>
            </div>
            <div className="w-px h-10 bg-zinc-700"></div>
            <div className="flex flex-col">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Seat</span>
              <span className="text-xl font-bold text-white text-primary">{eventContext.seat}</span>
            </div>
          </div>
          
          {/* QR Code */}
          <div className="p-6 flex flex-col items-center border-t border-zinc-800 bg-white">
            <QRCodeCanvas
              value={`SCC-TICKET:${eventContext.event}:${eventContext.match}:${eventContext.section}-${eventContext.row}-${eventContext.seat}:ABHAY-SINGH:WMB-2938-XYZ`}
              size={160}
            />
            <span className="text-zinc-500 text-xs mb-1 mt-4">ORDER ID</span>
            <span className="text-zinc-800 font-mono tracking-[0.2em] font-bold text-sm">WMB-2938-XYZ</span>
          </div>
        </div>
        
        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={onNavigate}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold transition-all duration-200 flex flex-col items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.97]"
          >
            <Navigation size={24} /> 
            <span>Directions</span>
          </button>
          
          <button
            onClick={onNavigate}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white p-4 rounded-2xl font-bold transition-all duration-200 flex flex-col items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.97]"
          >
            <Map size={24} /> 
            <span>Stadium Map</span>
          </button>
          
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: eventContext.event, text: `${eventContext.match} - Section ${eventContext.section}, Row ${eventContext.row}, Seat ${eventContext.seat}` });
              }
            }}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white p-4 rounded-2xl font-bold transition-all duration-200 flex flex-col items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.97]"
          >
            <Share2 size={24} /> 
            <span>Share Ticket</span>
          </button>
          
          <button
            onClick={() => alert('Apple Wallet pass generation coming soon!')}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white p-4 rounded-2xl font-bold transition-all duration-200 flex flex-col items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.97]"
          >
            <Wallet size={24} /> 
            <span>Apple Wallet</span>
          </button>
        </div>

        <button
          onClick={() => window.location.href = 'tel:+12015550112'}
          className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-400 p-4 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 mt-2 active:scale-[0.97]"
        >
          <Phone size={20} /> Emergency Contact
        </button>
      </div>
    </div>
  );
}
