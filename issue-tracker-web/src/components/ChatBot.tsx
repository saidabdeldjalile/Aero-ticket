import { useState, useEffect, useRef, useCallback } from "react";
import useAuth from "../hooks/useAuth";
import { aiService } from "../api/axios";
import { useWebSocket } from "../hooks/useWebSocket";
import { useTranslation } from "react-i18next";
import {
  Send,
  X,
  Bot,
  Sparkles,
  CheckCircle2,
  Star,
  ChevronRight,
  PhoneCall,
  Terminal,
  Activity,
  Zap,
  Ticket
} from "lucide-react";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  action?: {
    label: string;
    draft?: TicketDraft;
  };
  meta?: string;
  ticketCreated?: boolean;
  ticketId?: number;
  ticketUrl?: string;
  sentiment?: string;
  urgency?: string;
  category?: string;
  department?: string;
  entities?: Record<string, string[]>;
  needsEscalation?: boolean;
}

interface ChatBotProps {
  onClose: () => void;
}

interface TicketDraft {
  title: string;
  description: string;
  category?: string;
  priority?: string;
  suggestedDepartment?: string;
  projectId?: number | null;
  projectName?: string | null;
}

interface SentimentInfo {
  sentiment: string;
  urgency: string;
  confidence: number;
}

interface Entities {
  equipment?: string[];
  software?: string[];
  dates?: string[];
  locations?: string[];
  ticket_ids?: string[];
}

interface TicketForm {
  step: number;
  totalSteps: number;
  field: string;
  draft: {
    title: string;
    description: string;
    category: string;
    priority: string;
  };
}

interface ChatApiResponse {
  response: string;
  sessionId?: string;
  intent?: string;
  intentConfidence?: number;
  category?: string;
  suggestedDepartment?: string;
  priority?: string;
  sentiment?: SentimentInfo;
  entities?: Entities;
  waitingFor?: string;
  ticketForm?: TicketForm;
  ticketDraft?: TicketDraft;
  needsTicketCreation?: boolean;
  suggestedCategory?: string;
  suggestedPriority?: string;
  suggestedProjectId?: number;
  suggestedProjectName?: string;
  draftTitle?: string;
  draftDescription?: string;
  knowledgeType?: string;
  knowledgeTitle?: string;
  ticketCreated?: boolean;
  ticketId?: number;
  ticketUrl?: string;
  createTicket?: boolean;
  needFeedback?: boolean;
  need_feedback?: boolean;
  waitingForClarification?: boolean;
  ticketLookup?: string;
  confidenceScore?: number;
  needsEscalation?: boolean;
  source?: string;
  conversationEnded?: boolean;
}

const urgencyColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
};



export default function ChatBot({ onClose }: ChatBotProps) {
  const { auth } = useAuth();
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: t('chatbot.welcome'),
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [expectingFeedback, setExpectingFeedback] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isConnected: wsConnected, connect: connectWs, subscribe: subscribeWs } = useWebSocket({
    url: 'http://localhost:6969',
    onConnect: () => setIsWsConnected(true),
    onDisconnect: () => setIsWsConnected(false),
  });

  const connectWebSocket = useCallback(() => {
    connectWs();
  }, [connectWs]);

  useEffect(() => {
    if (wsConnected && auth?.email) {
      subscribeWs('/topic/chat', (message: unknown) => {
        const msg = message as { sender?: string; text?: string };
        if (msg.sender === 'bot') {
          const botMessage: Message = {
            id: Date.now() + 1,
            text: msg.text || t('chatbot.errors.technical'),
            sender: "bot",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMessage]);
        }
      });
    }
  }, [wsConnected, auth?.email, subscribeWs, t]);

  useEffect(() => {
    if (auth?.email) {
      connectWebSocket();
    }
    return () => {
    };
  }, [auth?.email, connectWebSocket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (messageText: string) => {
    const clean = messageText.trim();
    if (!clean) return;

    const userMessage: Message = {
      id: Date.now(),
      text: clean,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Get auth token from auth context or localStorage
      const token = auth?.accessToken || auth?.token || localStorage.getItem("accessToken") || "";

      const response = await aiService.post<ChatApiResponse>("/chat", {
        message: clean,
        userEmail: auth?.email || "user@airalgerie.dz",
        sessionId,
        authToken: token,
      });

      const data = response.data;
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      let draft: TicketDraft | undefined;

      // Handle ticket form progress (multi-step form)
      if (data.ticketForm && data.waitingFor?.startsWith("ticket_field_")) {
        // Don't show action button during form fill, just display the text
        draft = undefined;
      } else if (data.ticketDraft && data.createTicket) {
        draft = {
          title: data.ticketDraft.title || clean.slice(0, 100),
          description: data.ticketDraft.description || clean,
          category: data.ticketDraft.category || data.category,
          priority: data.ticketDraft.priority || data.priority,
          suggestedDepartment: data.ticketDraft.suggestedDepartment || data.suggestedDepartment,
        };
      } else if (data.needsTicketCreation && data.draftTitle) {
        draft = {
          title: data.draftTitle,
          description: data.draftDescription || "",
          category: data.suggestedCategory,
          priority: data.suggestedPriority,
          suggestedDepartment: data.suggestedDepartment,
        };
      }

      const metaParts: string[] = [];
      if (data.category) metaParts.push(`📁 ${data.category}`);
      if (data.suggestedDepartment) metaParts.push(`🏢 ${data.suggestedDepartment}`);
      if (data.priority === "High") metaParts.push(`🔴 Prioritaire`);

      const botMessage: Message = {
        id: Date.now() + 1,
        text: data.response || t('chatbot.errors.technical'),
        sender: "bot",
        timestamp: new Date(),
        action: draft
          ? {
            label: t('chatbot.createTicket'),
            draft,
          }
          : undefined,
        meta: metaParts.join(" • "),
        sentiment: data.sentiment?.sentiment,
        urgency: data.sentiment?.urgency,
        category: data.category,
        department: data.suggestedDepartment,
        entities: data.entities as Record<string, string[]> | undefined,
        ticketCreated: data.ticketCreated,
        ticketId: data.ticketId,
        ticketUrl: data.ticketUrl,
        needsEscalation: data.needsEscalation,
      };

      setMessages((prev) => [...prev, botMessage]);

      const wantsFeedback = Boolean((data as any).need_feedback || data.needFeedback);
      setExpectingFeedback(wantsFeedback);
      if (!wantsFeedback) {
        setShowFeedback(false);
        setFeedbackRating(null);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const botMessage: Message = {
        id: Date.now() + 1,
        text: t('chatbot.errors.technical'),
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setExpectingFeedback(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    await sendMessage(inputText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openDraft = (draft?: TicketDraft) => {
    if (!draft) return;
    localStorage.setItem("chatbotTicketDraft", JSON.stringify(draft));
    onClose();
    window.location.href = "/projects";
  };

  const handleConfirmTicket = async (draft: TicketDraft) => {
    setIsLoading(true);
    try {
      const response = await aiService.post<ChatApiResponse>("/chat", {
        message: "Confirmer la création du ticket",
        userEmail: auth?.email || "user@airalgerie.dz",
        sessionId,
        createTicket: true,
        title: draft.title,
        description: draft.description,
        category: draft.category,
        priority: draft.priority,
        suggestedDepartment: draft.suggestedDepartment,
      });

      const data = response.data;
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const botMessage: Message = {
        id: Date.now() + 1,
        text: data.response || t('common.message.ticketCreated'),
        sender: "bot",
        timestamp: new Date(),
        ticketCreated: data.ticketCreated,
        ticketId: data.ticketId,
        ticketUrl: data.ticketUrl,
        category: data.category,
        department: data.suggestedDepartment,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const botMessage: Message = {
        id: Date.now() + 1,
        text: t('chatbot.errors.technical'),
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscalateToHuman = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await aiService.post<ChatApiResponse>("/chat", {
        message: "Oui, je veux parler à un technician",
        userEmail: auth?.email || "user@airalgerie.dz",
        sessionId,
      });

      const data = response.data;
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const botMessage: Message = {
        id: Date.now() + 1,
        text: data.response || t('chatbot.errors.escalateError'),
        sender: "bot",
        timestamp: new Date(),
        ticketCreated: data.ticketCreated,
        ticketId: data.ticketId,
        ticketUrl: data.ticketUrl,
        needsEscalation: false,
      };

      setMessages((prev) => [...prev, botMessage]);
      setExpectingFeedback(false);
    } catch (error) {
      console.error("Chat error:", error);
      const botMessage: Message = {
        id: Date.now() + 1,
        text: t('chatbot.errors.technical'),
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setExpectingFeedback(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (rating: number, feedback?: string) => {
    try {
      const lastBotMessage = messages.filter(m => m.sender === 'bot').slice(-1)[0];
      const lastUserMessage = messages.filter(m => m.sender === 'user').slice(-1)[0];

      await aiService.post("/chat/feedback", {
        sessionId,
        userEmail: auth?.email || "user@airalgerie.dz",
        message: lastUserMessage?.text || "",
        response: lastBotMessage?.text || "",
        rating,
        feedback,
        helpful: rating >= 4
      });

      setShowFeedback(false);
      setFeedbackRating(null);

      const thankYouMessage: Message = {
        id: Date.now() + 1,
        text: t('chatbot.feedback.thanks'),
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, thankYouMessage]);

    } catch (error) {
      console.error("Feedback error:", error);
    }
  };

  const quickActions = [
    { label: t('chatbot.quickActions.createTicket'), prompt: "Je veux créer un ticket" },
    { label: t('chatbot.quickActions.password'), prompt: "J'ai oublié mon mot de passe, comment le réinitialiser?" },
    { label: t('chatbot.quickActions.wifi'), prompt: "Comment se connecter au Wi-Fi d'Air Algérie?" },
    { label: t('chatbot.quickActions.vpn'), prompt: "Je besoin d'un accès VPN pour le télétravail" },
    { label: t('chatbot.quickActions.hardware'), prompt: "Je souhaite faire une demande de matériel" },
    { label: t('chatbot.quickActions.leave'), prompt: "Je veux faire une demande de congés" },
    { label: t('chatbot.quickActions.itIncident'), prompt: "Mon ordinateur ne démarre plus, c'est urgent!" },
    { label: t('chatbot.quickActions.myTickets'), prompt: "Comment consulter mes tickets?" },
    { label: t('chatbot.quickActions.dashboard'), prompt: "Comment lire les statistiques du dashboard?" },
    { label: t('chatbot.quickActions.ticketStatus'), prompt: "Comment vérifier le statut de mon ticket?" },
    { label: t('chatbot.quickActions.urgentTicket'), prompt: "Comment signaler un ticket urgent?" },
  ];

  return (
    <div className="fixed bottom-0 right-6 z-[70] flex max-h-[calc(100vh-5rem)] h-[650px] w-[26rem] flex-col overflow-hidden rounded-t-[2.5rem] rounded-b-none border border-white/20 bg-white/70 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-[20px] dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-scaleUp">
      {/* Header */}
      <div className="relative overflow-hidden px-6 py-5">
        {/* Animated background element */}
        <div className="absolute -right-10 -top-10 h-32 w-32 animate-blob rounded-full bg-red-500/10 blur-2xl"></div>
        <div className="absolute -left-10 -bottom-10 h-32 w-32 animate-blob animation-delay-2000 rounded-full bg-gray-500/10 blur-2xl"></div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-red-800 shadow-lg shadow-red-500/30">
                <Bot className="h-8 w-8 text-white" />
              </div>
              {isWsConnected ? (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-amber-500 dark:border-slate-800"></div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
                {t('chatbot.title')}
              </h3>
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${isWsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isWsConnected ? 'Assistant Actif' : 'Mode Hors-ligne'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100/50 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-800 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scroll-smooth">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} animate-slideInUp`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-end gap-2 max-w-[85%]">
              {msg.sender === "bot" && (
                <div className="mb-1 hidden h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 sm:flex">
                  <Sparkles className="h-3 w-3 text-red-500" />
                </div>
              )}

              <div
                className={`group relative rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${msg.sender === "user"
                  ? "rounded-br-none bg-gradient-to-br from-red-600 to-red-800 text-white"
                  : "rounded-bl-none bg-white border border-slate-100 text-slate-800 dark:bg-slate-800/50 dark:border-white/5 dark:text-slate-100"
                  }`}
              >
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                {/* Meta info / Sentiment */}
                {msg.urgency && msg.sender === "bot" && (
                  <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${urgencyColors[msg.urgency] || "bg-slate-100 text-slate-500"}`}>
                    <Activity className="h-3 w-3" />
                    {msg.urgency === "high" ? t('chatbot.urgency.high') : msg.urgency === "medium" ? t('chatbot.urgency.medium') : t('chatbot.urgency.low')}
                  </div>
                )}

                {msg.meta && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                    {msg.meta.split(' • ').map((part, i) => (
                      <span key={i} className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        {part}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {msg.action && (
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      onClick={() => handleConfirmTicket(msg.action!.draft!)}
                      className="group flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-700 hover:shadow-red-500/40"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {msg.action.label}
                    </button>
                    <button
                      onClick={() => openDraft(msg.action?.draft)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {t('chatbot.edit')}
                    </button>
                  </div>
                )}

                {/* Entities */}
                {msg.entities && Object.keys(msg.entities).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {msg.entities.equipment?.map((eq, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        <Terminal className="h-2.5 w-2.5" /> {eq}
                      </span>
                    ))}
                    {msg.entities.software?.map((sw, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        <Zap className="h-2.5 w-2.5" /> {sw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ticket Info */}
                {msg.ticketCreated && (
                  <div className="mt-4">
                    <a
                      href={msg.ticketUrl || "/projects"}
                      className="flex items-center gap-3 rounded-xl bg-emerald-500 p-3 text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                        <Ticket className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase opacity-80">Ticket Confirmé</span>
                        <span className="text-[13px] font-bold"># {msg.ticketId}</span>
                      </div>
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </a>
                  </div>
                )}

                {msg.needsEscalation && !msg.ticketCreated && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleEscalateToHuman()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 text-[13px] font-bold text-white shadow-lg shadow-red-500/25 transition-all hover:opacity-90"
                      disabled={isLoading}
                    >
                      <PhoneCall className="h-4 w-4" />
                      Contacter un technicien
                    </button>
                  </div>
                )}

                {/* Feedback */}
                {msg.sender === "bot" && expectingFeedback && index === messages.length - 1 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        setExpectingFeedback(false);
                        await sendMessage("Oui");
                      }}
                      className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95"
                      disabled={isLoading}
                    >
                      Oui
                    </button>
                    <button
                      onClick={async () => {
                        setExpectingFeedback(false);
                        await sendMessage("Non");
                      }}
                      className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600 transition-all hover:scale-105 active:scale-95 dark:bg-slate-700 dark:text-slate-300"
                      disabled={isLoading}
                    >
                      Non
                    </button>
                    <button
                      onClick={() => setShowFeedback(true)}
                      className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline"
                      disabled={isLoading}
                    >
                      <Star className="h-3 w-3" />
                      Évaluer
                    </button>
                  </div>
                )}

                {msg.sender === "bot" && showFeedback && index === messages.length - 1 && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-slate-900/50">
                    <p className="mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">VOTRE AVIS EST IMPORTANT</p>
                    <div className="mb-3 flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setFeedbackRating(star)}
                          className={`transition-all hover:scale-110 ${feedbackRating && feedbackRating >= star ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}`}
                        >
                          <Star className={`h-5 w-5 ${feedbackRating && feedbackRating >= star ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                    {feedbackRating && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFeedback(feedbackRating)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-red-700"
                        >
                          Envoyer
                        </button>
                        <button
                          onClick={() => {
                            setShowFeedback(false);
                            setFeedbackRating(null);
                          }}
                          className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <span className="mt-1.5 px-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex animate-slideInUp items-start gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Sparkles className="h-3 w-3 text-red-500" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl bg-white border border-slate-100 px-4 py-3 dark:bg-slate-800/50 dark:border-white/5">
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-600"></div>
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-600 [animation-delay:0.2s]"></div>
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-600 [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer / Input area */}
      <div className="bg-white/80 p-6 backdrop-blur-md dark:bg-slate-900/80">
        {/* Quick Actions Carousel */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {quickActions.slice(0, 8).map((action, idx) => (
            <button
              key={idx}
              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
              onClick={() => setInputText(action.prompt)}
              disabled={isLoading}
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Écrivez votre message..."
            className="w-full rounded-2xl border-none bg-slate-100 px-5 py-4 pr-14 text-[14px] text-slate-800 focus:ring-2 focus:ring-red-600/20 dark:bg-slate-800 dark:text-white dark:focus:ring-red-600/30"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            className={`absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl transition-all ${!inputText.trim() || isLoading
              ? "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-600"
              : "bg-red-600 text-white shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95"
              }`}
            disabled={isLoading || !inputText.trim()}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
          Propulsé par l'IA d'Air Algérie • Support IT 24/7
        </p>
      </div>
    </div>
  );
}
