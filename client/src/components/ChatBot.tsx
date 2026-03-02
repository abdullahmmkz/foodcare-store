import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  X, Send, Bot, User, ShoppingBag, ExternalLink, Loader2,
  AlertTriangle, AlertCircle, CheckCircle2, Stethoscope,
  Package, Sparkles, Activity, ChevronRight,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  products?: RecommendedProduct[];
  analysisData?: AnalysisData | null;
  referDoctor?: boolean;
};

type RecommendedProduct = {
  id: number;
  name: string;
  image: string;
  link: string;
  price?: string | null;
  diseaseName?: string;
  diseaseIcon?: string;
  reason?: string;
  supplement?: string;
};

type AnalysisData = {
  symptoms: string[];
  possibleCauses: string[];
  severity: "low" | "medium" | "high";
};

interface HealthProfile {
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  gender?: string | null;
  diseases?: string | null;
  goal?: string | null;
  activityLevel?: string | null;
  allergies?: string | null;
}

interface ChatBotProps {
  onClose: () => void;
  healthProfile?: HealthProfile | null;
  userName?: string;
}

// Common symptom quick-picks
const QUICK_SYMPTOMS = [
  { icon: "😵", label: "دوخة" },
  { icon: "😴", label: "إرهاق وتعب" },
  { icon: "🤕", label: "صداع متكرر" },
  { icon: "💔", label: "خفقان قلب" },
  { icon: "🦴", label: "ألم مفاصل" },
  { icon: "🧠", label: "ضعف تركيز" },
  { icon: "😰", label: "قلق وتوتر" },
  { icon: "🫁", label: "ضيق تنفس" },
  { icon: "🤢", label: "مشاكل هضم" },
  { icon: "💤", label: "اضطراب نوم" },
  { icon: "💇", label: "تساقط شعر" },
  { icon: "🥶", label: "برودة أطراف" },
];

const SEVERITY_CONFIG = {
  low: {
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
    label: "أعراض خفيفة",
    iconColor: "text-emerald-600",
  },
  medium: {
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: AlertCircle,
    label: "تحتاج متابعة",
    iconColor: "text-amber-500",
  },
  high: {
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: AlertTriangle,
    label: "راجع طبيباً",
    iconColor: "text-red-500",
  },
};

function buildWelcomeMessage(profile: HealthProfile | null | undefined, userName?: string): string {
  const name = userName ? ` ${userName}` : "";
  if (!profile) {
    return `مرحباً${name}! 👋 أنا **د. فود**، محلل الأعراض الذكي من FoodCure.\n\nأخبرني عن الأعراض التي تشعر بها، وسأحللها وأرشّح لك المكملات الغذائية المناسبة من متجرنا.\n\nما هي الأعراض التي تعاني منها؟`;
  }
  let diseases: string[] = [];
  try { diseases = profile.diseases ? JSON.parse(profile.diseases) : []; } catch { diseases = []; }
  let msg = `مرحباً${name}! 👋 أنا **د. فود** — محلل الأعراض الذكي.\n\n`;
  if (diseases.length > 0) {
    msg += `لاحظت أن لديك: ${diseases.join("، ")}.\n`;
  }
  msg += `\nأخبرني عن أي أعراض تشعر بها الآن (دوخة، إرهاق، صداع...) وسأحللها وأرشّح لك المنتجات المناسبة من متجرنا.`;
  return msg;
}

export default function ChatBot({ onClose, healthProfile, userName }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: buildWelcomeMessage(healthProfile, userName) },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [collectedSymptoms, setCollectedSymptoms] = useState<string[]>([]);
  const [showQuickSymptoms, setShowQuickSymptoms] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = trpc.chatbot.chat.useMutation({
    onSuccess: (data) => {
      // Extract any new symptoms mentioned from the last user message
      const lastUserMsg = messages.filter(m => m.role === "user").pop()?.content || "";
      const newSymptoms = QUICK_SYMPTOMS
        .filter(s => lastUserMsg.includes(s.label))
        .map(s => s.label)
        .filter(s => !collectedSymptoms.includes(s));

      if (newSymptoms.length > 0) {
        setCollectedSymptoms(prev => [...prev, ...newSymptoms]);
      }

      // Also extract from analysisData
      if (data.analysisData?.symptoms?.length) {
        setCollectedSymptoms(prev => {
          const combined = [...prev, ...data.analysisData!.symptoms];
          const merged = combined.filter((v, i) => combined.indexOf(v) === i);
          return merged;
        });
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.message,
        products: data.recommendedProducts?.length > 0 ? data.recommendedProducts : undefined,
        analysisData: data.analysisData,
        referDoctor: data.referDoctor,
      }]);
      setIsTyping(false);
      setShowQuickSymptoms(false);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "assistant", content: "عذراً، حدث خطأ. حاول مرة أخرى." }]);
      setIsTyping(false);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    // Track quick symptom selections
    const matchedSymptom = QUICK_SYMPTOMS.find(s => s.label === text.trim());
    if (matchedSymptom && !collectedSymptoms.includes(matchedSymptom.label)) {
      setCollectedSymptoms(prev => [...prev, matchedSymptom.label]);
    }

    chatMutation.mutate({
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      collectedSymptoms,
      healthProfile: healthProfile ? {
        age: healthProfile.age,
        weight: healthProfile.weight,
        height: healthProfile.height,
        gender: healthProfile.gender,
        diseases: healthProfile.diseases,
        goal: healthProfile.goal,
        activityLevel: healthProfile.activityLevel,
        allergies: healthProfile.allergies,
      } : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const hasAnalysis = messages.some(m => m.analysisData);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-black/40 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="w-full sm:w-[480px] h-[92vh] sm:h-[680px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-l from-primary to-emerald-700 px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Stethoscope size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm">د. فود — محلل الأعراض</h3>
            <p className="text-white/70 text-xs truncate">يحلل أعراضك ويرشّح مكملات مناسبة</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors shrink-0"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* ── Symptoms tracker bar ────────────────────────────────────────── */}
        {collectedSymptoms.length > 0 && (
          <div className="bg-primary/5 border-b border-primary/10 px-3 py-2 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-primary">
                <Activity size={12} />
                <span className="text-xs font-bold">الأعراض المُسجَّلة:</span>
              </div>
              {collectedSymptoms.map((s, i) => (
                <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Messages ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === "user" ? "bg-primary/10" : "bg-gradient-to-br from-primary to-emerald-700"
              }`}>
                {msg.role === "user"
                  ? <User size={16} className="text-primary" />
                  : <Stethoscope size={15} className="text-white" />
                }
              </div>

              <div className={`max-w-[84%] flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {/* Message bubble */}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>

                {/* Refer doctor warning */}
                {msg.referDoctor && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 w-full">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-700">يُنصح بمراجعة طبيب</p>
                      <p className="text-xs text-red-600 mt-0.5">الأعراض التي ذكرتها تستدعي تقييماً طبياً متخصصاً.</p>
                    </div>
                  </div>
                )}

                {/* Analysis summary card */}
                {msg.analysisData && (
                  <div className={`w-full border rounded-xl p-3 ${SEVERITY_CONFIG[msg.analysisData.severity].bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const cfg = SEVERITY_CONFIG[msg.analysisData.severity];
                        const Icon = cfg.icon;
                        return (
                          <>
                            <Icon size={15} className={cfg.iconColor} />
                            <span className={`text-xs font-bold ${cfg.color}`}>
                              نتيجة التحليل — {cfg.label}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    {msg.analysisData.possibleCauses.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground/70">الأسباب الغذائية المحتملة:</p>
                        {msg.analysisData.possibleCauses.map((cause, ci) => (
                          <div key={ci} className="flex items-center gap-1.5">
                            <ChevronRight size={11} className="text-primary shrink-0" />
                            <span className="text-xs text-foreground">{cause}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Product recommendations */}
                {msg.products && msg.products.length > 0 && (
                  <div className="w-full mt-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                        <Sparkles size={12} />
                        <span className="text-xs font-bold">منتجات مرشّحة من FoodCure</span>
                      </div>
                    </div>

                    {msg.products.map((product, pIdx) => (
                      <div
                        key={`${product.id}-${pIdx}`}
                        className="bg-white border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-primary/30 group"
                      >
                        {/* Supplement link */}
                        {product.supplement && (
                          <div className="bg-primary/5 border-b border-primary/10 px-3 py-1.5 flex items-center gap-1.5">
                            <Package size={11} className="text-primary shrink-0" />
                            <span className="text-xs text-primary font-semibold line-clamp-1">
                              لعلاج: {product.supplement}
                            </span>
                          </div>
                        )}

                        <div className="p-3 flex gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg bg-muted"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://placehold.co/64x64/e8f5e9/059669?text=🌿";
                              }}
                            />
                            {product.diseaseIcon && (
                              <span className="absolute -top-1 -right-1 bg-white rounded-full shadow-sm w-5 h-5 flex items-center justify-center text-[10px]">
                                {product.diseaseIcon}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-foreground line-clamp-2 leading-tight mb-1">
                              {product.name}
                            </p>
                            {product.reason && (
                              <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1.5 line-clamp-2">
                                ✓ {product.reason}
                              </p>
                            )}
                            <div className="flex items-center justify-between gap-2">
                              {product.price && (
                                <span className="text-xs font-bold text-primary">{product.price} ريال</span>
                              )}
                              {!product.price && product.diseaseName && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {product.diseaseName}
                                </span>
                              )}
                              <a
                                href={product.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                              >
                                <ShoppingBag size={11} />
                                اشتر الآن
                                <ExternalLink size={9} />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="text-center pt-1">
                      <button
                        onClick={onClose}
                        className="text-xs text-primary hover:text-primary/80 font-semibold underline underline-offset-2"
                      >
                        عرض جميع منتجات المتجر ←
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2.5 items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center shrink-0">
                <Stethoscope size={15} className="text-white" />
              </div>
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick symptom chips (shown at start) ────────────────────────── */}
        {showQuickSymptoms && !isTyping && (
          <div className="border-t border-border px-3 pt-3 pb-2 shrink-0 bg-muted/20">
            <p className="text-xs text-muted-foreground mb-2 font-medium">اختر عرضاً أو اكتب بنفسك:</p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {QUICK_SYMPTOMS.map(s => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.label)}
                  className="text-xs px-2.5 py-1.5 bg-white border border-border text-foreground rounded-full hover:bg-primary hover:text-white hover:border-primary transition-all font-medium shadow-sm"
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input area ──────────────────────────────────────────────────── */}
        <div className="border-t border-border p-3 shrink-0 bg-white">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="صف أعراضك بكلماتك..."
              disabled={isTyping}
              className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 text-right"
              dir="rtl"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isTyping
                ? <Loader2 size={16} className="text-white animate-spin" />
                : <Send size={16} className="text-white" />
              }
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            ⚠️ التحليل توعوي فقط وليس بديلاً عن استشارة طبيب متخصص
          </p>
        </div>
      </div>
    </div>
  );
}
