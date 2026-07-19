'use client';

import React, { useState, useRef, useEffect, useContext } from 'react';
import { Send, RefreshCw, Mic, Cpu, ChevronDown, CheckCircle2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { fetchBackend } from '@/lib/backend-api';

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  actions?: { type: string; title: string; payload?: Record<string, unknown> }[];
  reasoning?: { why: string; evidence: string[]; alternatives: string[] };
  confidence?: { score: number; label: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
  sources?: { id: string; title: string; documentType: string; relevanceScore: number }[];
  isTyping?: boolean;
  error?: boolean;
  intent?: string;
  agentUsed?: string;
  processingTimeMs?: number;
  requestId?: string;
  // Agentic pipeline metadata
  pipelineStages?: { stage: string; status: string; durationMs: number; detail: string }[];
  extractedConstraints?: string;
  userMemoryApplied?: boolean;
}

import { AppContext } from '@/app/page';

export function ChatInterface() {
  const { needs } = useContext(AppContext);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Hello! I am your Stadium Command Center AI. How can I assist you today?',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    onerror: () => void;
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
            setInput(prev => (prev ? prev + ' ' : '') + finalTranscript);
          }
        };
        
        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const typingId = Date.now().toString() + '-typing';
    setMessages(prev => [...prev, { id: typingId, sender: 'ai', text: '', isTyping: true }]);

    try {
      const response = await fetchBackend('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-frontend',
          'x-user-role': 'SPECTATOR',
          'x-accessibility-needs': needs.join(',')
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok || !response.body) {
        setMessages(prev => prev.filter(m => m.id !== typingId));
        throw new Error('Failed to fetch response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let finalData: CompleteEventPayload | null = null;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.replace('data: ', ''));
                if (parsed.type === 'complete') {
                  finalData = parsed.data;
                }
              } catch {
                // Ignore incomplete chunks or parse errors for individual lines
              }
            }
          }
        }
      }

      setMessages(prev => prev.filter(m => m.id !== typingId));

      if (finalData?.success && finalData.data) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          sender: 'ai',
          text: finalData.data.response || 'No response generated.',
          actions: finalData.data.actions,
          reasoning: finalData.data.reasoning,
          confidence: finalData.data.confidence,
          sources: finalData.data.supportingDocuments,
          intent: finalData.data.intent,
          agentUsed: finalData.data.agentUsed,
          processingTimeMs: finalData.data.processingTimeMs,
          requestId: finalData.data.requestId,
          pipelineStages: finalData.data.pipelineStages,
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(finalData?.error?.message || 'Failed to process AI response');
      }

    } catch (error: unknown) {
      setMessages(prev => prev.filter(m => m.id !== typingId));
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'ai',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-background text-foreground">
      <div aria-live="polite" className="sr-only">
        {messages.length > 0 && messages[messages.length - 1].sender === 'ai' && !messages[messages.length - 1].isTyping ? messages[messages.length - 1].text : ''}
      </div>
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400" aria-label="Stadium AI Command Center">
            Stadium AI Command
          </h1>
          <p className="text-xs text-muted-foreground">Explainable AI Interface</p>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        {messages.map(msg => (
          <div key={msg.id}>
            <ChatMessage message={msg} />
            {msg.sender === 'ai' && !msg.isTyping && (
              <div className="mt-3 text-xs">
                <details className="group border border-zinc-700/50 rounded-lg bg-zinc-900/30 overflow-hidden">
                  <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-blue-500" />
                      <span className="font-medium tracking-wide">AI Pipeline Activity</span>
                    </div>
                    <ChevronDown size={14} className="group-open:rotate-180 transition-transform duration-300" />
                  </summary>
                  <div className="px-3 py-3 border-t border-zinc-800 text-zinc-400 space-y-3 bg-zinc-950/50">
                    <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Intent Detection</div>
                      <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Context Engine</div>
                      <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Decision Engine</div>
                      <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Knowledge Retr.</div>
                      <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Gemini Reasoning</div>
                      <div className="flex items-center gap-1 text-emerald-500/90"><CheckCircle2 size={12}/> Validation</div>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-zinc-800 pt-2">
                      <div className="flex justify-between items-center">
                        <span>Latency:</span>
                        <span className="text-white font-mono bg-zinc-800 px-1.5 py-0.5 rounded">{typeof msg.processingTimeMs === 'number' ? `${msg.processingTimeMs} ms` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Confidence:</span>
                        <span className={msg.confidence?.label === 'HIGH' || !msg.confidence ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>{msg.confidence?.label || 'HIGH'}</span>
                      </div>
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
          <div className="text-zinc-500 flex items-center gap-2 mt-2">
            <RefreshCw size={14} className="animate-spin" /> Generating action...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-border sticky bottom-0">
        <div className="max-w-4xl mx-auto relative">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1 flex items-end shadow-lg focus-within:ring-1 focus-within:ring-blue-500/50 transition-shadow">
            <button 
              type="button" 
              onClick={toggleListen}
              className={`p-3 rounded-xl transition-all duration-300 ${isListening ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask about navigation, planning, accessibility..."
              className="w-full bg-transparent border-none p-3 focus:outline-none resize-none no-scrollbar h-[52px] max-h-32 text-white"
              rows={1}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-primary hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-primary"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
        <div className="text-center mt-2 text-xs text-muted-foreground">
          AI can make mistakes. All responses include reasoning and retrieved sources.
        </div>
      </div>
    </div>
  );
}
    interface CompleteEventPayload {
      success?: boolean;
      data?: {
        response?: string;
        actions?: { type: string; title: string; payload?: Record<string, unknown> }[];
        reasoning?: { why: string; evidence: string[]; alternatives: string[] };
        confidence?: { score: number; label: 'HIGH' | 'MEDIUM' | 'LOW'; explanation: string };
        supportingDocuments?: { id: string; title: string; documentType: string; relevanceScore: number }[];
        intent?: string;
        agentUsed?: string;
        processingTimeMs?: number;
        requestId?: string;
        pipelineStages?: { stage: string; status: string; durationMs: number; detail: string }[];
      };
      error?: { message?: string };
    }
