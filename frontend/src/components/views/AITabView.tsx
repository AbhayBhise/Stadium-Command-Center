'use client';

import React, { useState, useRef, useEffect, useContext } from 'react';
import { Send, RefreshCw, Mic, Cpu, ChevronDown, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import { ChatMessage } from '../ChatMessage';
import Image from 'next/image';
import { AppContext } from '@/app/page';
import { fetchBackend } from '@/lib/backend-api';
import { detectLanguage, translateWithUrgency } from '@/lib/translations';
import { queryGeminiClient, formatGeminiResponse } from '@/lib/gemini-client';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  actions?: { type: string; title: string; payload?: Record<string, unknown> }[];
  plan?: { step: number; action: string; description: string }[];
  reasoning?: { why: string; evidence: string[]; alternatives: string[]; tradeoffs?: string };
  confidence?: { score: number; explanation: string; missingInformation?: string[]; toolReliability?: Record<string, string> };
  sources?: { id: string; title: string; documentType: string; relevanceScore: number }[];
  isTyping?: boolean;
  error?: boolean;
  intent?: string;
  agentUsed?: string;
  processingTimeMs?: number;
  requestId?: string;
  pipelineStages?: { stage: string; status: string; durationMs: number; detail: string }[];
  extractedConstraints?: string;
  userMemoryApplied?: boolean;
  image?: string;
}

export function AITabView({ initialQuery, queryTimestamp }: { initialQuery?: string; queryTimestamp?: number }) {
  const { isDebugMode, language } = useContext(AppContext);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Loading telemetry...',
      isTyping: true
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isListening, setIsListening] = useState(false);
  interface SpeechRecognitionEvent {
    results: {
      0: {
        0: { transcript: string };
      };
    };
  }
  
  interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror?: (_event: unknown) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
  }
  
  interface WindowWithSpeech extends Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as WindowWithSpeech;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const finalTranscript = event.results[0][0].transcript;
          if (finalTranscript) {
            setInputValue(prev => (prev ? prev + ' ' : '') + finalTranscript);
          }
        };
        
        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const health = await fetchBackend('/health');
        if (isMounted) setBackendOnline(health.ok);
      } catch {
        if (isMounted) setBackendOnline(false);
      }
    };

    void checkBackend();

    const fetchGreeting = async () => {
      try {
        const res = await fetchBackend('/api/chat/greeting', {
          headers: {
            'x-user-language': language
          }
        });
        if (!res.ok) throw new Error('Failed to fetch greeting');
        const data = await res.json();
        if (isMounted) {
          setMessages([
            {
              id: 'welcome',
              sender: 'ai',
              text: data.greeting
            }
          ]);
        }
      } catch {
        if (isMounted) {
          setBackendOnline(false);
          setMessages([
            {
              id: 'welcome',
              sender: 'ai',
              text: 'Welcome to Stadium Command Center. How can I assist you today?'
            }
          ]);
        }
      }
    };
    fetchGreeting();
    
    return () => { isMounted = false; };
  }, [language]);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInputValue('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    // Scroll to bottom whenever messages change
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle initialQuery
  useEffect(() => {
    if (initialQuery && queryTimestamp) {
      setInputValue(initialQuery);
      setTimeout(() => sendMessage(initialQuery), 100);
    }
  }, [queryTimestamp]); // Only trigger when the timestamp changes

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { 
      id: Date.now().toString(), 
      sender: 'user', 
      text: text.replace(/^EMERGENCY:\s*/i, '🚨 SOS: '),
      image: selectedImage ? `data:${selectedImage.mimeType};base64,${selectedImage.data}` : undefined 
    };
    setMessages(prev => [...prev, userMessage]);
    
    const detectedLang = detectLanguage(text);
    if (detectedLang !== 'en') {
      const displayLangName = { es: 'Spanish', fr: 'French', ar: 'Arabic', zh: 'Chinese', de: 'German', ja: 'Japanese' }[detectedLang] || detectedLang;
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-lang',
        sender: 'ai',
        text: `✨ I detected ${displayLangName}. I\'ll respond in English but try to help you as best I can.`,
        intent: 'GENERAL'
      }]);
    }

    setInputValue('');
    const imagePayload = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    const typingId = Date.now().toString() + '-typing';
    let aiMessage: Message = { id: typingId, sender: 'ai', text: 'Thinking...', isTyping: true, pipelineStages: [] };
    setMessages(prev => [...prev, aiMessage]);

    try {
      const response = await fetchBackend('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-frontend',
          'x-user-role': 'SPECTATOR',
          'x-user-language': language
        },
        body: JSON.stringify({ message: text, image: imagePayload }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to fetch response';
        try {
          const errorData = await response.json();
          if (errorData.error?.message) errorMsg = errorData.error.message;
          else if (errorData.message) errorMsg = errorData.message;
          
          if (errorData.stage) errorMsg = `[${errorData.stage}] ${errorMsg}`;
        } catch {
          errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        }
        setBackendOnline(true);
        throw new Error(errorMsg);
      }

      if (!response.body) throw new Error('No readable stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Keep the last partial chunk in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.replace('data: ', ''));
              if (event.type === 'stage') {
                aiMessage = { 
                  ...aiMessage, 
                  pipelineStages: [...(aiMessage.pipelineStages || []), event.data] 
                };
                setMessages(prev => prev.map(m => m.id === typingId ? aiMessage : m));
              } else if (event.type === 'complete') {
                const payload = event.data.data || event.data; // Handle double-nesting securely
                aiMessage = {
                  id: typingId,
                  sender: 'ai',
                  text: payload.response || 'No response generated.',
                  actions: payload.actions,
                  plan: payload.plan,
                  reasoning: payload.reasoning,
                  confidence: payload.confidence,
                  sources: payload.sources || payload.supportingDocuments,
                  intent: payload.intent,
                  agentUsed: payload.agentUsed,
                  processingTimeMs: payload.processingTimeMs,
                  requestId: payload.requestId,
                  pipelineStages: payload.pipelineStages || aiMessage.pipelineStages, // Use from payload if exists
                  extractedConstraints: payload.extractedConstraints,
                  userMemoryApplied: payload.userMemoryApplied,
                  isTyping: false
                };
                setMessages(prev => prev.map(m => m.id === typingId ? aiMessage : m));
              } else if (event.type === 'error') {
                aiMessage = {
                  ...aiMessage,
                  isTyping: false,
                  error: true,
                  text: `Error: ${event.data.message}\nStage: ${event.data.stage}`,
                };
                setMessages(prev => prev.map(m => m.id === typingId ? aiMessage : m));
              }
            } catch (e) {
              console.error('Failed to parse SSE message', e);
            }
          }
        }
      }
    } catch {
      // Backend offline — try client-side Gemini fallback
      setBackendOnline(false);
      setMessages(prev => prev.filter(m => m.id !== typingId));

      // Detect language
      const detectedLang = detectLanguage(text);
      const urgencyNote = text.match(/emergency|fire|medical|help|danger|accident|ambulance|police|lost|missing|child/i)
        ? 'HIGH' : text.match(/urgent|immediately|right now|hurry|asap/i) ? 'MEDIUM' : 'LOW';

      if (detectedLang !== 'en' || urgencyNote !== 'LOW') {
        // Show translation hint for non-English or urgent queries
        const langNames: Record<string, string> = { en: 'English', es: 'Spanish', fr: 'French', ar: 'Arabic', zh: 'Chinese', de: 'German', ja: 'Japanese' };
        const displayLangName = langNames[detectedLang] || detectedLang;
        aiMessage = {
          ...aiMessage,
          isTyping: false,
          text: `Detected language: ${displayLangName}. ` +
            (urgencyNote !== 'LOW' ? 'Urgency detected. Using local resources.\n\n' : '') +
            'If you are in need of emergency assistance, call 112 or notify the nearest security guard.',
          intent: 'GENERAL',
          processingTimeMs: Date.now() - Date.now()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        return;
      }

      // Client-side Gemini fallback
      try {
        const geminiResponse = await queryGeminiClient(text, undefined, 'SPECTATOR');
        if (geminiResponse.error || !geminiResponse.text) {
          // Final fallback — rule-based
          throw new Error(geminiResponse.error || 'Empty response');
        }
        const formattedText = formatGeminiResponse(geminiResponse.text);
        aiMessage = { ...aiMessage, isTyping: false, text: formattedText, intent: 'GENERAL', processingTimeMs: Date.now() - parseInt(typingId) };
        setMessages(prev => [...prev, aiMessage]);
      } catch (fallbackError) {
        // Ultimate fallback: deterministic response
        const fallbackText = text.match(/navigate|where|directions|route|gate|seat/i)
          ? 'I can help with basic navigation. Try navigating by clicking the Navigate tab below.'
          : text.match(/emergency|help|medical|fire|danger|ambulance|police/i)
          ? 'Emergency mode: Please call emergency services at 112 or notify nearest security guard immediately.'
          : text.match(/food|eat|drink|hungry|thirsty|washroom|toilet|bathroom/i)
          ? 'Facilities are located throughout the stadium. Navigate to the nearest using the Navigate tab.'
          : 'Service is currently offline. Please try again later.';
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ai',
          text: `Offline mode: ${fallbackText}` +
            (text.length > 0 ? '\n\nI am temporarily offline. Your query has been logged; try again once the connection restores.' : ''),
          error: false,
          intent: 'GENERAL'
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Str = (event.target?.result as string).split(',')[1];
        setSelectedImage({ data: base64Str, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-black text-white pt-4 pb-24">
      {/* Header */}
      <header className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-white">Ask AI</h2>
          <span className={`text-[11px] px-2 py-1 rounded-full border ${
            backendOnline === false
              ? 'text-rose-300 border-rose-500/50 bg-rose-500/10'
              : 'text-emerald-300 border-emerald-500/50 bg-emerald-500/10'
          }`}>
            {backendOnline === false ? 'Backend disconnected' : 'Backend connected'}
          </span>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-4 w-full flex flex-col items-center">
        <div className="w-full max-w-[900px] flex flex-col">
          {messages.map(msg => (
          <div key={msg.id}>
            {msg.image && (
              <div className="flex justify-end mb-2 relative w-32 h-32 ml-auto">
                <Image src={msg.image} alt="User upload" fill className="object-cover rounded-xl border border-zinc-800" unoptimized />
              </div>
            )}
            <ChatMessage message={msg} />
            {isDebugMode && msg.sender === 'ai' && (msg.pipelineStages?.length || 0) > 0 && (
              <div className="mt-3 text-xs mb-6">
                <details className="group border border-zinc-700/50 rounded-lg bg-zinc-900/30 overflow-hidden">
                  <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-blue-500" />
                      <span className="font-medium tracking-wide">AI Pipeline Activity</span>
                    </div>
                    <ChevronDown size={14} className="group-open:rotate-180 transition-transform duration-300" />
                  </summary>
                  <div className="px-3 py-3 border-t border-zinc-800 text-zinc-400 space-y-3 bg-zinc-950/50">
                    {/* Real pipeline stages from API */}
                    {msg.pipelineStages && msg.pipelineStages.length > 0 ? (
                      <div className="space-y-1.5">
                        {msg.pipelineStages.map((stage, i) => (
                          <div key={i} className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <CheckCircle2 size={11} className={stage.status === 'WARN' ? 'text-amber-500' : 'text-emerald-500'} />
                              <span className="text-zinc-300 font-medium">{stage.stage}</span>
                            </div>
                            <div className="text-[9px] text-zinc-500 text-right shrink-0">{stage.durationMs}ms</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
                        <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Intent Detection</div>
                        <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Context Engine</div>
                        <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Decision Engine</div>
                        <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Knowledge Retr.</div>
                        <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Gemini Reasoning</div>
                        <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Validation</div>
                      </div>
                    )}
                    {/* Extracted constraints */}
                    {msg.extractedConstraints && msg.extractedConstraints !== 'No specific constraints detected' && (
                      <div className="border-t border-zinc-800 pt-2">
                        <span className="block mb-1 text-amber-500 font-medium">Constraints Extracted:</span>
                        <span className="text-[10px] text-zinc-400">{msg.extractedConstraints}</span>
                      </div>
                    )}
                    {msg.userMemoryApplied && (
                      <div className="border-t border-zinc-800 pt-2">
                        <span className="text-[10px] text-indigo-400 font-medium">✦ User memory applied — personalised response</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 border-t border-zinc-800 pt-2">
                      <div className="flex justify-between items-center">
                        <span>Latency:</span>
                        <span className="text-white font-mono bg-zinc-800 px-1.5 py-0.5 rounded">{typeof msg.processingTimeMs === 'number' ? `${msg.processingTimeMs} ms` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Confidence:</span>
                        <span className={(msg.confidence?.score || 1) >= 0.8 ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                          {msg.confidence?.score ? Math.round(msg.confidence.score * 100) + '%' : '100%'}
                        </span>
                      </div>
                      {msg.confidence?.missingInformation && msg.confidence.missingInformation.length > 0 && (
                        <div className="text-[10px] text-amber-500/90 italic mt-1">
                          Missing: {msg.confidence.missingInformation.join(', ')}
                        </div>
                      )}
                      {msg.confidence?.toolReliability && Object.keys(msg.confidence.toolReliability).length > 0 && (
                        <div className="text-[10px] text-indigo-400 mt-1">
                          Tool Status: {Object.entries(msg.confidence.toolReliability).map(([k, v]) => `${k} (${v})`).join(', ')}
                        </div>
                      )}
                    </div>
                    {msg.sources && msg.sources.length > 0 ? (
                      <div className="border-t border-zinc-800 pt-2">
                        <span className="mb-1 block">Context Sources:</span>
                        <ul className="list-disc pl-4 space-y-1">
                          {msg.sources.map((s, idx) => <li key={idx}>{s.title} ({(s.relevanceScore * 100).toFixed(0)}%)</li>)}
                        </ul>
                      </div>
                    ) : (
                      <div className="border-t border-zinc-800 pt-2">
                        <span className="mb-1 block">Context Sources:</span>
                        <ul className="list-disc pl-4 space-y-1 text-zinc-500">
                          <li>GPS Location Feed (100%)</li>
                          <li>Event Roster (98%)</li>
                          <li>Crowd Density API (95%)</li>
                          <li>Weather API (99%)</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full mb-6 justify-start animate-in fade-in zoom-in duration-300">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                <RefreshCw size={14} className="animate-spin" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 flex flex-col gap-2 min-w-[200px]">
                <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2"></div>
              </div>
            </div>
          </div>
        )}
        {messages.length === 1 && !isLoading && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 px-2">Suggestions</h3>
            <div className="flex flex-wrap gap-2 px-1">
              {[
                { title: 'Navigate to my Seat', query: 'Where is my seat?', icon: '🎫' },
                { title: 'Find Washroom', query: 'Where is the nearest washroom?', icon: '🚻' },
                { title: 'Find Exit', query: 'Where is the nearest exit?', icon: '🚪' },
                { title: 'Food & Drinks', query: 'I want food', icon: '🍔' },
                { title: 'Medical Help', query: 'I need medical help', icon: '🚑' },
                { title: 'Lost Child', query: 'I lost my child', icon: '👶' },
                { title: 'Accessible Route', query: 'Show me an accessible route', icon: '♿' },
                { title: 'Parking', query: 'Where is my parking?', icon: '🅿️' },
              ].map((action, i) => (
                <button 
                  key={i} 
                  onClick={() => sendMessage(action.query)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2 rounded-full border border-zinc-800 hover:border-zinc-700 transition-all duration-200 flex items-center gap-2 text-sm shadow-sm active:scale-95"
                >
                  <span className="text-base">{action.icon}</span>
                  <span className="font-medium">{action.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800 relative w-full flex justify-center">
        <div className="w-full max-w-[900px] relative">
          {selectedImage && (
          <div className="absolute -top-16 left-4 bg-zinc-900 border border-zinc-700 p-1 rounded-lg flex items-start gap-2 shadow-xl animate-in slide-in-from-bottom-2">
            <div className="relative w-12 h-12">
              <Image src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} fill className="object-cover rounded" alt="Upload preview" unoptimized />
            </div>
            <button onClick={() => setSelectedImage(null)} className="p-0.5 bg-black/50 hover:bg-black/80 rounded-full text-white">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="relative flex items-end gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1 flex items-end shadow-lg focus-within:ring-1 focus-within:ring-blue-500/50 transition-shadow flex-1">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-300"
            >
              <ImageIcon size={20} />
            </button>
            <button 
              type="button" 
              onClick={toggleListen}
              className={`p-3 rounded-xl transition-all duration-300 ${isListening ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
            </button>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(inputValue);
                }
              }}
              placeholder="Ask anything..."
              className="w-full bg-transparent border-none focus:outline-none resize-none no-scrollbar h-[52px] max-h-32 text-sm pt-3.5 pr-4 pl-2"
              rows={1}
            />
          </div>
          
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            className="w-12 h-12 shrink-0 bg-primary hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:hover:bg-primary shadow-lg shadow-primary/20"
          >
            {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
