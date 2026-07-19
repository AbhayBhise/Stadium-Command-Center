import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, ChevronDown, ChevronUp, ShieldAlert, ShieldCheck, FileText, Info, Activity, Search, Brain, CheckCircle2, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { AppContext } from '@/app/page';
import { useContext } from 'react';

interface ChatMessageProps {
  message: {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    actions?: { type: string; title: string; payload?: Record<string, unknown> }[];
    plan?: { step: number; action: string; description: string }[];
    reasoning?: {
      why: string;
      evidence: string[];
      alternatives: string[];
      tradeoffs?: string;
    };
    confidence?: {
      score: number;
      explanation: string;
      missingInformation?: string[];
      toolReliability?: Record<string, string>;
    };
    sources?: { id: string; title: string; documentType: string; relevanceScore: number }[];
    isTyping?: boolean;
    error?: boolean;
    intent?: string;
    agentUsed?: string;
    processingTimeMs?: number;
    requestId?: string;
  };
}

import { NavigationWidget } from './widgets/NavigationWidget';
import { FacilitiesWidget } from './widgets/FacilitiesWidget';
import { EmergencyWidget } from './widgets/EmergencyWidget';
import { PlanningWidget } from './widgets/PlanningWidget';
import { CrowdWidget } from './widgets/CrowdWidget';

export function ChatMessage({ message }: ChatMessageProps) {
  const [showReasoning, setShowReasoning] = useState(true);
  const { isDebugMode } = useContext(AppContext);
  const isAI = message.sender === 'ai';

  const confidenceColor = 
    (message.confidence?.score || 1) >= 0.8 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
    (message.confidence?.score || 1) >= 0.5 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
    'text-rose-400 bg-rose-400/10 border-rose-400/20';

  const renderAdaptiveWidget = () => {
    if (!isAI || !message.intent) return null;
    const handleNavigate = (query: string) => {
      window.dispatchEvent(new CustomEvent('action-navigate', { detail: { destination: query } }));
    };
    switch (message.intent) {
      case 'NAVIGATION': {
        const navigateAction = message.actions?.find(a => a.type === 'NAVIGATE');
        const destination = navigateAction?.payload?.destination as string | undefined;
        const routeSteps = message.plan?.map(p => ({
          order: p.step,
          instruction: p.description,
          to_zone: p.action
        }));
        const targetPayload = destination ? { destination, routeSteps } : null;
        return <NavigationWidget target={targetPayload} />;
      }
      case 'FACILITY_SEARCH':
        return <FacilitiesWidget onNavigate={handleNavigate} />;
      case 'EMERGENCY':
        return <EmergencyWidget />;
      case 'PLANNING':
        return <PlanningWidget />;
      case 'CROWD_QUERY':
        return <CrowdWidget onNavigate={handleNavigate} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full gap-4 p-4 md:p-6 rounded-2xl mb-4 max-w-4xl mx-auto",
        isAI ? "bg-muted/30 border border-border" : "flex-row-reverse"
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
        isAI ? "bg-primary text-primary-foreground" : "bg-zinc-700 text-zinc-100"
      )}>
        {isAI ? <Bot size={20} /> : <User size={20} />}
      </div>

      <div className={cn("flex flex-col gap-3 min-w-0 flex-1", isAI ? "items-start" : "items-end")}>
        {message.isTyping ? (
          <div className="flex gap-1 h-10 items-center px-4 bg-muted/50 rounded-2xl rounded-tl-none w-fit">
            <div className="w-2 h-2 bg-zinc-400 rounded-full typing-dot" />
            <div className="w-2 h-2 bg-zinc-400 rounded-full typing-dot" />
            <div className="w-2 h-2 bg-zinc-400 rounded-full typing-dot" />
          </div>
        ) : (
          <div className="w-full">
            <div className={cn(
              "prose prose-invert max-w-none text-sm md:text-base leading-relaxed break-words",
              isAI ? "text-zinc-200" : "bg-zinc-800 px-5 py-3 rounded-2xl rounded-tr-none text-zinc-100",
              message.error && "text-rose-400",
              message.intent ? "mb-4" : ""
            )}>
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>
            
            {message.intent && (
              <div className="w-full mt-3 rounded-xl overflow-hidden border border-zinc-700/50 bg-zinc-900/50 flex flex-col relative" style={{ minHeight: message.intent === 'NAVIGATION' ? '400px' : 'auto' }}>
                {renderAdaptiveWidget()}
              </div>
            )}

            {/* Agentic Plan */}
            {isAI && message.plan && message.plan.length > 0 && (
              <div className="mt-4 mb-4 flex flex-col gap-2 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2">
                  <Activity size={16} /> Agent Execution Plan
                </div>
                {message.plan.map((step, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/30">
                        {step.step}
                      </div>
                      {i < message.plan!.length - 1 && <div className="w-px h-full bg-zinc-800 my-1" />}
                    </div>
                    <div className="pb-3">
                      <div className="text-zinc-200 font-medium">{step.action}</div>
                      <div className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{step.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Cards */}
            {isAI && message.actions && message.actions.length > 0 && (
              <div className="flex flex-col gap-2 mt-4 mb-2 w-full max-w-sm">
                {message.actions.filter(a => a.type !== 'WIDGET').map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (action.type === 'NAVIGATE') {
                        window.dispatchEvent(new CustomEvent('action-navigate', { detail: action.payload }));
                      } else if (action.type === 'CALL') {
                        const phone = typeof action.payload?.phone === 'string' ? action.payload.phone : '112';
                        window.location.href = `tel:${phone}`;
                      } else if (action.type === 'NOTIFY') {
                        alert('Security has been notified of your exact location.');
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between w-full p-4 rounded-xl border font-medium text-sm transition-all active:scale-[0.98]",
                      action.type === 'NAVIGATE' ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" :
                      action.type === 'CALL' ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600" :
                      action.type === 'NOTIFY' ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600" :
                      "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                    )}
                  >
                    <span>{action.title}</span>
                    <span className="text-xl">
                      {action.type === 'NAVIGATE' ? '📍' : action.type === 'CALL' ? '📞' : action.type === 'NOTIFY' ? '🚨' : '→'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* AI Explainability Badges (Always visible for XAI compliance) */}
            {isAI && (message.confidence || message.reasoning) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {message.confidence && (
                  <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border", confidenceColor)}>
                    {(message.confidence.score || 1) >= 0.8 ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                    {Math.round(message.confidence.score * 100)}% Confidence
                  </div>
                )}
                
                {message.reasoning && (
                  <button 
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors border border-border"
                  >
                    <Info size={14} />
                    View Reasoning
                    {showReasoning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>
            )}

            {/* Expandable Reasoning Panel */}
            <AnimatePresence>
              {showReasoning && message.reasoning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full overflow-hidden"
                >
                  <div className="mt-2 p-4 bg-zinc-900/50 rounded-xl border border-border/50 text-sm text-zinc-400 space-y-4">
                    <div>
                      <strong className="text-zinc-300 block mb-1">Why this recommendation?</strong>
                      <p>{message.reasoning.why}</p>
                    </div>
                    {message.reasoning.evidence.length > 0 && (
                      <div>
                        <strong className="text-zinc-300 block mb-1">Evidence</strong>
                        <ul className="list-disc pl-4 space-y-1">
                          {message.reasoning.evidence.map((ev, i) => <li key={i}>{ev}</li>)}
                        </ul>
                      </div>
                    )}
                    {message.reasoning.tradeoffs && (
                      <div>
                        <strong className="text-zinc-300 block mb-1">Tradeoffs Analyzed</strong>
                        <p>{message.reasoning.tradeoffs}</p>
                      </div>
                    )}

                    {message.confidence && (
                      <div className="pt-4 border-t border-border/50 mt-4 space-y-3">
                        <strong className="text-zinc-300 block mb-2 flex items-center gap-2">
                          <ShieldCheck size={16} className={confidenceColor.split(' ')[0]} /> Confidence Breakdown
                        </strong>
                        <p className="text-xs text-zinc-300">{message.confidence.explanation}</p>
                        
                        {message.confidence.missingInformation && message.confidence.missingInformation.length > 0 && (
                          <div>
                            <strong className="text-zinc-400 text-[10px] uppercase tracking-wider block mb-1">Missing Data</strong>
                            <ul className="list-disc pl-4 space-y-1 text-xs">
                              {message.confidence.missingInformation.map((info, i) => <li key={i}>{info}</li>)}
                            </ul>
                          </div>
                        )}
                        
                        {message.confidence.toolReliability && Object.keys(message.confidence.toolReliability).length > 0 && (
                          <div>
                            <strong className="text-zinc-400 text-[10px] uppercase tracking-wider block mb-1">Tool Reliability</strong>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Object.entries(message.confidence.toolReliability).map(([tool, status], i) => (
                                <span key={i} className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs font-mono">
                                  <span className="text-zinc-500">{tool}:</span> <span className={String(status).toLowerCase().includes('fail') || String(status).toLowerCase().includes('error') ? 'text-rose-400' : 'text-emerald-400'}>{String(status)}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Decision Timeline */}
                    {message.intent && (
                      <div className="pt-4 border-t border-border/50 mt-4">
                        <strong className="text-zinc-300 block mb-4 flex items-center gap-2">
                          <Activity size={16} className="text-primary" /> AI Decision Pipeline
                        </strong>
                        <div className="relative pl-6 space-y-6 before:absolute before:inset-y-1 before:left-2 before:w-[2px] before:bg-zinc-800">
                          <div className="relative">
                            <div className="absolute -left-[22px] top-1 w-3 h-3 bg-zinc-900 border-2 border-emerald-500 rounded-full z-10" />
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                              <Brain size={14} className="text-zinc-500" /> Intent Detection
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">Classified query as <span className="text-emerald-400 font-mono px-1.5 py-0.5 bg-emerald-400/10 rounded">{message.intent}</span></div>
                          </div>
                          
                          <div className="relative">
                            <div className="absolute -left-[22px] top-1 w-3 h-3 bg-zinc-900 border-2 border-blue-500 rounded-full z-10" />
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                              <Search size={14} className="text-zinc-500" /> Knowledge Retrieval
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">Injected <span className="text-zinc-300 font-medium">{message.sources?.length || 0}</span> contextual sources into prompt</div>
                          </div>

                          <div className="relative">
                            <div className="absolute -left-[22px] top-1 w-3 h-3 bg-zinc-900 border-2 border-purple-500 rounded-full z-10" />
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                              <Bot size={14} className="text-zinc-500" /> Agent Invocation
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">Delegated execution to <span className="text-purple-400 font-mono px-1.5 py-0.5 bg-purple-400/10 rounded">{message.agentUsed}</span> expert agent</div>
                          </div>

                          <div className="relative">
                            <div className="absolute -left-[22px] top-1 w-3 h-3 bg-zinc-900 border-2 border-primary rounded-full z-10" />
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                              <CheckCircle2 size={14} className="text-zinc-500" /> Validation & Formatting
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                              Response verified in <span className="flex items-center gap-1 inline-flex text-amber-400"><Clock size={12} /> {message.processingTimeMs}ms</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sources Cards */}
            {isAI && message.sources && message.sources.length > 0 && (
              <div className="w-full mt-2">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sources Referenced</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {message.sources.map((source, i) => (
                    <div key={i} className="flex-shrink-0 flex items-start gap-2 bg-zinc-900 border border-border rounded-lg p-3 w-64">
                      <FileText size={16} className="text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-zinc-200 line-clamp-1">{source.title}</div>
                        <div className="text-xs text-zinc-500">{source.documentType}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
