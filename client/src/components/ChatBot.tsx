import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  X, Send, Stethoscope, User, ShoppingBag, ExternalLink, Loader2,
  AlertTriangle, AlertCircle, CheckCircle2, Package, Sparkles,
  Activity, ChevronRight, ImagePlus, FlaskConical, TrendingUp,
  TrendingDown, Minus, Camera,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageType = "chat" | "lab_result";

type Message = {
  role: "user" | "assistant";
  content: string;
  type?: MessageType;
  products?: RecommendedProduct[];
  analysisData?: AnalysisData | null;
  labData?: LabData | null;
  referDoctor?: boolean;
  imagePreview?: string;
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

type LabValue = {
  name: string;
  value: string;
  unit: string;
  status: "normal" | "low" | "high";
  normalRange: string;
};

type LabData = {
  extractedValues: LabValue[];
  abnormalValues: string[];
  overallStatus: "normal" | "needs_attention" | "critical";
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

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_SYMPTOMS = [
  { label: "دوخة" },
  { label: "إرهاق وتعب" },
  { label: "صداع متكرر" },
  { label: "خفقان قلب" },
  { label: "ألم مفاصل" },
  { label: "ضعف تركيز" },
  { label: "قلق وتوتر" },
  { label: "ضيق تنفس" },
  { label: "مشاكل هضم" },
  { label: "اضطراب نوم" },
  { label: "تساقط شعر" },
  { label: "برودة أطراف" },
];

const SEVERITY_CONFIG = {
  low: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2, label: "أعراض خفيفة", iconColor: "text-emerald-600" },
  medium: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: AlertCircle, label: "تحتاج متابعة", iconColor: "text-amber-500" },
  high: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertTriangle, label: "راجع طبيباً", iconColor: "text-red-500" },
};

const LAB_STATUS_CONFIG = {
  normal: { bg: "needs_attention", icon: Minus, color: "text-emerald-600", bgColor: "bg-emerald-50" },
  needs_attention: { bg: "bg-amber-50", icon: AlertCircle, color: "text-amber-600", bgColor: "bg-amber-50" },
  critical: { bg: "bg-red-50", icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50" },
};

function buildWelcomeMessage(profile: HealthProfile | null | undefined, userName?: string): string {
  const name = userName ? ` ${userName}` : "";
  if (!profile) {
    return `مرحباً${name}! أنا **د. نيوتري**، محلل الأعراض الذكي من Nutritional Care.\n\nأخبرني عن الأعراض التي تشعر بها، أو ارفع صورة نتيجة فحص الدم وسأحللها لك.\n\nما الذي يمكنني مساعدتك به اليوم؟`;
  }
  let diseases: string[] = [];
  try { diseases = profile.diseases ? JSON.parse(profile.diseases) : []; } catch { diseases = []; }
  let msg = `مرحباً${name}! أنا **د. نيوتري** — محلل الأعراض الذكي.\n\n`;
  if (diseases.length > 0) msg += `لاحظت أن لديك: ${diseases.join("، ")}.\n\n`;
  msg += `يمكنك:\n• وصف أعراضك وسأحللها\n• رفع صورة نتيجة فحص الدم للتحليل الفوري\n\nكيف يمكنني مساعدتك؟`;
  return msg;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatBot({ onClose, healthProfile, userName }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: buildWelcomeMessage(healthProfile, userName) },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [collectedSymptoms, setCollectedSymptoms] = useState<string[]>([]);
  const [showQuickSymptoms, setShowQuickSymptoms] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImageMutation = trpc.labAnalysis.uploadImage.useMutation();
  const analyzeImageMutation = trpc.labAnalysis.analyzeImage.useMutation();

  const chatMutation = trpc.chatbot.chat.useMutation({
    onSuccess: (data) => {
      if (data.analysisData?.symptoms?.length) {
        setCollectedSymptoms(prev => {
          const combined = [...prev, ...data.analysisData!.symptoms];
          return combined.filter((v, i) => combined.indexOf(v) === i);
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

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isTyping) return;
    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);
    setShowQuickSymptoms(false);

    const matchedSymptom = QUICK_SYMPTOMS.find(s => s.label === text.trim());
    if (matchedSymptom && !collectedSymptoms.includes(matchedSymptom.label)) {
      setCollectedSymptoms(prev => [...prev, matchedSymptom.label]);
    }

    chatMutation.mutate({
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      collectedSymptoms,
      healthProfile: healthProfile ? {
        age: healthProfile.age, weight: healthProfile.weight, height: healthProfile.height,
        gender: healthProfile.gender, diseases: healthProfile.diseases,
        goal: healthProfile.goal, activityLevel: healthProfile.activityLevel,
        allergies: healthProfile.allergies,
      } : undefined,
    });
  }, [messages, isTyping, collectedSymptoms, healthProfile, chatMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // ── Image upload & analysis ──────────────────────────────────────────────
  const handleImageSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("يرجى اختيار ملف صورة صالح (JPG، PNG، إلخ)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("حجم الصورة كبير جداً (الحد الأقصى 10MB)");
      return;
    }

    setUploadError(null);
    setUploadingImage(true);
    setShowQuickSymptoms(false);

    // Create preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type;

      // Show user message with image preview
      const userMsg: Message = {
        role: "user",
        content: "رفعت صورة نتيجة فحص دم للتحليل",
        imagePreview: dataUrl,
        type: "lab_result",
      };
      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);

      try {
        // Step 1: Upload to S3
        const { url } = await uploadImageMutation.mutateAsync({
          base64,
          mimeType,
          fileName: file.name || "lab-result.jpg",
        });

        // Step 2: Analyze with Vision LLM
        const result = await analyzeImageMutation.mutateAsync({
          imageUrl: url,
          healthProfile: healthProfile ? {
            age: healthProfile.age, weight: healthProfile.weight,
            gender: healthProfile.gender, diseases: healthProfile.diseases,
            allergies: healthProfile.allergies,
          } : undefined,
        });

        setMessages(prev => [...prev, {
          role: "assistant",
          content: result.message,
          type: "lab_result",
          labData: {
            extractedValues: result.extractedValues,
            abnormalValues: result.abnormalValues,
            overallStatus: result.overallStatus,
          },
          products: result.recommendedProducts?.length > 0 ? result.recommendedProducts : undefined,
          referDoctor: result.referDoctor,
        }]);
      } catch (err: any) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "عذراً، حدث خطأ أثناء تحليل الصورة. تأكد من وضوح الصورة وحاول مرة أخرى.",
        }]);
      } finally {
        setIsTyping(false);
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  }, [uploadImageMutation, analyzeImageMutation, healthProfile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
    e.target.value = "";
  };

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderLabValues = (labData: LabData) => {
    const abnormal = labData.extractedValues.filter(v => v.status !== "normal");
    const normal = labData.extractedValues.filter(v => v.status === "normal");

    const statusIcon = (status: string) => {
      if (status === "high") return <TrendingUp size={12} className="text-red-500 shrink-0" />;
      if (status === "low") return <TrendingDown size={12} className="text-blue-500 shrink-0" />;
      return <Minus size={12} className="text-emerald-500 shrink-0" />;
    };

    const overallCfg = {
      normal: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "جميع القيم طبيعية" },
      needs_attention: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "بعض القيم تحتاج متابعة" },
      critical: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "قيم حرجة — راجع طبيباً" },
    }[labData.overallStatus];

    return (
      <div className="w-full space-y-2 mt-1">
        {/* Overall status badge */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${overallCfg.bg}`}>
          <FlaskConical size={14} className={overallCfg.text} />
          <span className={`text-xs font-bold ${overallCfg.text}`}>{overallCfg.label}</span>
        </div>

        {/* Abnormal values */}
        {abnormal.length > 0 && (
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="bg-red-50 px-3 py-1.5 border-b border-red-100">
              <span className="text-xs font-bold text-red-700">قيم خارج النطاق الطبيعي</span>
            </div>
            <div className="divide-y divide-border">
              {abnormal.map((v, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {statusIcon(v.status)}
                    <span className="text-xs font-semibold text-foreground truncate">{v.name}</span>
                  </div>
                  <div className="text-left shrink-0">
                    <span className={`text-xs font-bold ${v.status === "high" ? "text-red-600" : "text-blue-600"}`}>
                      {v.value} {v.unit}
                    </span>
                    <span className="text-xs text-muted-foreground block">طبيعي: {v.normalRange}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Normal values (collapsed) */}
        {normal.length > 0 && (
          <details className="bg-white border border-border rounded-xl overflow-hidden">
            <summary className="px-3 py-2 cursor-pointer text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors list-none flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-600" />
              {normal.length} قيمة طبيعية — اضغط للعرض
            </summary>
            <div className="divide-y divide-border">
              {normal.map((v, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Minus size={12} className="text-emerald-500 shrink-0" />
                    <span className="text-xs text-foreground truncate">{v.name}</span>
                  </div>
                  <span className="text-xs font-medium text-emerald-600 shrink-0">{v.value} {v.unit}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderProducts = (products: RecommendedProduct[]) => (
    <div className="w-full mt-1 space-y-2">
      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full w-fit">
        <Sparkles size={12} />
        <span className="text-xs font-bold">منتجات مرشّحة من Nutritional Care</span>
      </div>
      {products.map((product, pIdx) => (
        <div key={`${product.id}-${pIdx}`} className="bg-white border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-primary/30">
          {product.supplement && (
            <div className="bg-primary/5 border-b border-primary/10 px-3 py-1.5 flex items-center gap-1.5">
              <Package size={11} className="text-primary shrink-0" />
              <span className="text-xs text-primary font-semibold line-clamp-1">لعلاج: {product.supplement}</span>
            </div>
          )}
          <div className="p-3 flex gap-3">
            <div className="relative shrink-0">
              <img
                src={product.image}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-lg bg-muted"
                onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/64x64/e8f5e9/059669?text=FC"; }}
              />
              {product.diseaseIcon && (
                <span className="absolute -top-1 -right-1 bg-white rounded-full shadow-sm w-5 h-5 flex items-center justify-center text-[10px]">
                  {product.diseaseIcon}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xs text-foreground line-clamp-2 leading-tight mb-1">{product.name}</p>
              {product.reason && (
                <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1.5 line-clamp-2">{product.reason}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                {product.price
                  ? <span className="text-xs font-bold text-primary">{product.price} ريال</span>
                  : product.diseaseName && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{product.diseaseName}</span>
                }
                <a
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  <ExternalLink size={11} />عرض المنتج
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="text-center pt-1">
        <button onClick={onClose} className="text-xs text-primary hover:text-primary/80 font-semibold underline underline-offset-2">
          عرض جميع منتجات المتجر ←
        </button>
      </div>
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-black/40 backdrop-blur-sm" dir="rtl">
      {/* Fixed height container with explicit flex layout to prevent input from being pushed off */}
      <div
        className="w-full sm:w-[480px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border flex flex-col"
        style={{ height: "min(92vh, 700px)" }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-l from-primary to-emerald-700 px-4 py-3 flex items-center gap-3 shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Stethoscope size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm">د. فود — محلل الأعراض والفحوصات</h3>
            <p className="text-white/70 text-xs truncate">يحلل أعراضك وفحوصاتك ويرشّح مكملات مناسبة</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors shrink-0">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* ── Symptoms tracker ───────────────────────────────────────── */}
        {collectedSymptoms.length > 0 && (
          <div className="bg-primary/5 border-b border-primary/10 px-3 py-2 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-primary">
                <Activity size={12} />
                <span className="text-xs font-bold">الأعراض المُسجَّلة:</span>
              </div>
              {collectedSymptoms.map((s, i) => (
                <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Messages (scrollable) ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === "user" ? "bg-primary/10" : "bg-gradient-to-br from-primary to-emerald-700"
              }`}>
                {msg.role === "user"
                  ? <User size={16} className="text-primary" />
                  : msg.type === "lab_result"
                    ? <FlaskConical size={15} className="text-white" />
                    : <Stethoscope size={15} className="text-white" />
                }
              </div>

              <div className={`max-w-[84%] flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {/* Image preview (user uploaded) */}
                {msg.imagePreview && (
                  <div className="relative">
                    <img src={msg.imagePreview} alt="نتيجة الفحص" className="w-40 h-28 object-cover rounded-xl border-2 border-primary/20 shadow-sm" />
                    <div className="absolute bottom-1 right-1 bg-primary/80 text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                      <Camera size={9} className="inline ml-0.5" />فحص دم
                    </div>
                  </div>
                )}

                {/* Message bubble */}
                {msg.content && (
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                )}

                {/* Refer doctor warning */}
                {msg.referDoctor && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 w-full">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-700">يُنصح بمراجعة طبيب</p>
                      <p className="text-xs text-red-600 mt-0.5">النتائج تستدعي تقييماً طبياً متخصصاً.</p>
                    </div>
                  </div>
                )}

                {/* Lab analysis results */}
                {msg.labData && renderLabValues(msg.labData)}

                {/* Symptom analysis summary */}
                {msg.analysisData && (
                  <div className={`w-full border rounded-xl p-3 ${SEVERITY_CONFIG[msg.analysisData.severity].bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const cfg = SEVERITY_CONFIG[msg.analysisData.severity];
                        const Icon = cfg.icon;
                        return (
                          <>
                            <Icon size={15} className={cfg.iconColor} />
                            <span className={`text-xs font-bold ${cfg.color}`}>نتيجة التحليل — {cfg.label}</span>
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
                {msg.products && msg.products.length > 0 && renderProducts(msg.products)}
              </div>
            </div>
          ))}

          {/* Typing / uploading indicator */}
          {(isTyping || uploadingImage) && (
            <div className="flex gap-2.5 items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center shrink-0">
                {uploadingImage ? <FlaskConical size={15} className="text-white" /> : <Stethoscope size={15} className="text-white" />}
              </div>
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <Loader2 size={14} className="text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">
                  {uploadingImage ? "جاري تحليل الفحص..." : "جاري التحليل..."}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick symptom chips ────────────────────────────────────── */}
        {showQuickSymptoms && !isTyping && !uploadingImage && (
          <div className="border-t border-border px-3 pt-2.5 pb-2 shrink-0 bg-muted/20">
            <p className="text-xs text-muted-foreground mb-2 font-medium">اختر عرضاً أو اكتب بنفسك:</p>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {QUICK_SYMPTOMS.map(s => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.label)}
                  className="text-xs px-2.5 py-1 bg-white border border-border text-foreground rounded-full hover:bg-primary hover:text-white hover:border-primary transition-all font-medium shadow-sm"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="px-3 py-2 bg-red-50 border-t border-red-200 shrink-0">
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle size={12} />
              {uploadError}
            </p>
          </div>
        )}

        {/* ── Input area ─────────────────────────────────────────────── */}
        <div className="border-t border-border px-3 pt-2.5 pb-3 shrink-0 bg-white">
          {/* Lab image upload button */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping || uploadingImage}
              className="flex items-center gap-1.5 text-xs text-primary bg-primary/8 hover:bg-primary/15 border border-primary/20 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              <ImagePlus size={13} />
              رفع نتيجة فحص دم
            </button>
            <span className="text-xs text-muted-foreground">أو اكتب أعراضك أدناه</span>
          </div>

          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="صف أعراضك بكلماتك..."
              disabled={isTyping || uploadingImage}
              className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 text-right"
              dir="rtl"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping || uploadingImage}
              className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isTyping
                ? <Loader2 size={16} className="text-white animate-spin" />
                : <Send size={16} className="text-white" />
              }
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-2">
            التحليل توعوي فقط وليس بديلاً عن استشارة طبيب متخصص
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
