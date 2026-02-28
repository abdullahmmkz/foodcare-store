import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { X, Send, Bot, User, ShoppingBag, ExternalLink, Loader2, ChevronRight, Download, CheckCircle2, Sparkles, Package } from "lucide-react";
import { jsPDF } from "jspdf";

type Message = {
  role: "user" | "assistant";
  content: string;
  products?: RecommendedProduct[];
  pdfReady?: boolean;
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

type Step = "greeting" | "condition" | "details" | "plan" | "products";

const CONDITION_OPTIONS = [
  { label: "🩸 السكري", value: "سكري" },
  { label: "💓 الضغط", value: "ضغط" },
  { label: "🫀 الكوليسترول", value: "كوليسترول" },
  { label: "⚖️ السمنة", value: "سمنة" },
  { label: "💪 صحة عامة", value: "صحة عامة" },
  { label: "🥗 تنحيف", value: "تنحيف" },
];

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

function buildInitialMessage(profile: HealthProfile | null | undefined, userName?: string): string {
  if (!profile) {
    return `مرحباً${userName ? " " + userName : ""}! 👋 أنا مساعدك الغذائي الذكي في FoodCure.\n\nسأساعدك في صناعة نظام غذائي مخصص لحالتك الصحية وأرشّح لك أفضل المنتجات المناسبة من متجرنا.\n\nما هي حالتك الصحية أو هدفك؟`;
  }
  let diseases: string[] = [];
  try { diseases = profile.diseases ? JSON.parse(profile.diseases) : []; } catch { diseases = []; }
  const goalMap: Record<string, string> = {
    weight_loss: "خسارة الوزن", blood_sugar: "تنظيم السكر",
    blood_pressure: "تنظيم الضغط", cholesterol: "تحسين الكوليسترول", general_health: "صحة عامة",
  };
  const activityMap: Record<string, string> = {
    sedentary: "خامل", light: "خفيف", moderate: "متوسط", active: "نشيط",
  };
  let summary = `مرحباً${userName ? " " + userName : ""}! 👋 لقد قرأت ملفك الصحي:\n\n`;
  if (profile.age) summary += `📅 العمر: ${profile.age} سنة\n`;
  if (profile.weight) summary += `⚖️ الوزن: ${profile.weight} كجم\n`;
  if (profile.height) summary += `📏 الطول: ${profile.height} سم\n`;
  if (diseases.length > 0) summary += `🏥 الحالات الصحية: ${diseases.join("، ")}\n`;
  if (profile.goal) summary += `🎯 الهدف: ${goalMap[profile.goal] || profile.goal}\n`;
  if (profile.activityLevel) summary += `🏃 النشاط: ${activityMap[profile.activityLevel] || profile.activityLevel}\n`;
  if (profile.allergies) summary += `🚫 الحساسية: ${profile.allergies}\n`;
  summary += `\nسأصمم لك نظاماً غذائياً مخصصاً مع توصيات منتجات من متجرنا. هل تريد أن أبدأ الآن؟`;
  return summary;
}

export default function ChatBot({ onClose, healthProfile, userName }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: buildInitialMessage(healthProfile, userName) },
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<Step>("greeting");
  const [condition, setCondition] = useState<string | undefined>();
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = trpc.chatbot.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.message,
        products: data.recommendedProducts?.length > 0 ? data.recommendedProducts : undefined,
        pdfReady: data.pdfReady,
      }]);
      setIsTyping(false);
      setStep(prev => {
        if (prev === "greeting") return "condition";
        if (prev === "condition") return "details";
        if (prev === "details") return "plan";
        return "products";
      });
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
    const detectedCondition = CONDITION_OPTIONS.find(o => text.includes(o.value))?.value || condition;
    if (detectedCondition && !condition) setCondition(detectedCondition);
    chatMutation.mutate({
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      step,
      condition: detectedCondition,
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

  const downloadPlan = () => {
    const planContent = messages.filter(m => m.role === "assistant").map(m => m.content).join("\n\n---\n\n");
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      // Header
      doc.setFillColor(5, 150, 105);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("FoodCure - My Diet Plan", pageWidth / 2, 18, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString("en-US")}`, pageWidth / 2, 28, { align: "center" });
      // Content
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
      let y = 55;
      const lines = doc.splitTextToSize(planContent, maxWidth);
      for (const line of lines) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      }
      // Warning
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFillColor(254, 243, 199);
      doc.rect(margin, y + 5, maxWidth, 18, "F");
      doc.setTextColor(120, 80, 0);
      doc.setFontSize(9);
      doc.text("Warning: This plan is for general awareness only and not a substitute for medical advice.", margin + 3, y + 15);
      doc.save(`FoodCure-Diet-Plan-${new Date().toISOString().split("T")[0]}.pdf`);
      return;
    } catch (_) {
      // fallback to HTML
    }
    const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>نظامي الغذائي - FoodCure</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; background: #f9fafb; }
  .header { background: linear-gradient(135deg, #059669, #047857); color: white; padding: 28px; border-radius: 16px; margin-bottom: 28px; }
  .header h1 { margin: 0 0 8px; font-size: 24px; }
  .header p { margin: 4px 0; opacity: 0.85; font-size: 14px; }
  .section { background: white; border-right: 4px solid #059669; padding: 20px; border-radius: 12px; margin: 16px 0; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  pre { white-space: pre-wrap; font-family: inherit; line-height: 1.9; margin: 0; font-size: 14px; }
  .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 14px; border-radius: 10px; margin-top: 28px; font-size: 13px; }
  .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
</style>
</head>
<body>
<div class="header">
  <h1>🌿 نظامي الغذائي المخصص</h1>
  <p>مُصمَّم بواسطة المساعد الغذائي الذكي — FoodCure</p>
  <p>التاريخ: ${new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</p>
</div>
<div class="section">
<pre>${planContent}</pre>
</div>
<div class="warning">
  ⚠️ <strong>تنبيه مهم:</strong> هذا النظام الغذائي مقدَّم لأغراض توعوية عامة فقط وليس بديلاً عن استشارة طبيب أو أخصائي تغذية معتمد.
</div>
<div class="footer">FoodCure — متجرك الصحي الذكي</div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `نظامي-الغذائي-FoodCure-${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasPdfReady = messages.some(m => m.pdfReady);
  const stepIndex = ["greeting", "condition", "details", "plan"].indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-black/40 backdrop-blur-sm" dir="rtl">
      <div className="w-full sm:w-[460px] h-[90vh] sm:h-[650px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border">

        {/* Header */}
        <div className="bg-primary px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Bot size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-sm">المساعد الغذائي الذكي</h3>
            <p className="text-white/70 text-xs">FoodCure AI • نظام غذائي + منتجات مخصصة</p>
          </div>
          <div className="flex items-center gap-2">
            {hasPdfReady && (
              <button
                onClick={downloadPlan}
                title="تحميل النظام الغذائي"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-semibold transition-colors"
              >
                <Download size={13} />
                <span>تحميل</span>
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Health profile badge */}
        {healthProfile && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center gap-2 shrink-0">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">ملفك الصحي محمّل — سيرشّح لك منتجات من متجرنا مرتبطة بخطتك</p>
          </div>
        )}

        {/* Step indicator */}
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 shrink-0 bg-muted/30">
          {["الحالة الصحية", "التفاصيل", "النظام الغذائي", "المنتجات"].map((s, i) => {
            const isActive = i <= stepIndex;
            return (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>{s}</span>
                {i < 3 && <ChevronRight size={12} className="text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-primary/10" : "bg-primary"}`}>
                {msg.role === "user" ? <User size={16} className="text-primary" /> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`max-w-[82%] flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>

                {/* PDF download button inline */}
                {msg.pdfReady && (
                  <button
                    onClick={downloadPlan}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors shadow-md"
                  >
                    <Download size={13} />
                    تحميل نظامي الغذائي PDF
                  </button>
                )}

                {/* Product cards - linked to meal plan components */}
                {msg.products && msg.products.length > 0 && (
                  <div className="w-full mt-1">
                    {/* Section header */}
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                        <Sparkles size={12} />
                        <span className="text-xs font-bold">منتجات مرتبطة بخطتك من FoodCure</span>
                      </div>
                    </div>

                    {/* Product grid */}
                    <div className="space-y-2">
                      {msg.products.map((product, pIdx) => (
                        <div
                          key={`${product.id}-${pIdx}`}
                          className="bg-white border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-primary/30 group"
                        >
                          {/* Supplement link badge */}
                          {product.supplement && (
                            <div className="bg-primary/5 border-b border-primary/10 px-3 py-1.5 flex items-center gap-1.5">
                              <Package size={11} className="text-primary shrink-0" />
                              <span className="text-xs text-primary font-semibold line-clamp-1">
                                مرتبط بـ: {product.supplement}
                              </span>
                            </div>
                          )}

                          <div className="p-3 flex gap-3">
                            {/* Product image */}
                            <div className="relative shrink-0">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded-lg bg-muted"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://placehold.co/64x64/e8f5e9/059669?text=🌿";
                                }}
                              />
                              {product.diseaseIcon && (
                                <span className="absolute -top-1 -right-1 text-sm bg-white rounded-full shadow-sm w-5 h-5 flex items-center justify-center text-[10px]">
                                  {product.diseaseIcon}
                                </span>
                              )}
                            </div>

                            {/* Product info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-foreground line-clamp-2 leading-tight mb-1">
                                {product.name}
                              </p>
                              {product.reason && (
                                <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1.5 line-clamp-1">
                                  ✓ {product.reason}
                                </p>
                              )}
                              <div className="flex items-center justify-between gap-2">
                                {product.price && (
                                  <span className="text-xs font-bold text-primary">{product.price} ريال</span>
                                )}
                                {product.diseaseName && !product.price && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    {product.diseaseName}
                                  </span>
                                )}
                                <a
                                  href={product.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors shrink-0 group-hover:shadow-sm"
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
                    </div>

                    {/* View all products link */}
                    <div className="mt-2 text-center">
                      <button
                        onClick={onClose}
                        className="text-xs text-primary hover:text-primary/80 font-semibold underline underline-offset-2"
                      >
                        عرض جميع المنتجات في المتجر ←
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2 items-center">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Bot size={16} className="text-white" />
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

        {/* Quick replies for users WITHOUT health profile */}
        {!healthProfile && step === "greeting" && !isTyping && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-xs text-muted-foreground mb-2">اختر حالتك الصحية:</p>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => sendMessage(opt.value)}
                  className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick start for users WITH health profile */}
        {healthProfile && step === "greeting" && !isTyping && (
          <div className="px-4 pb-3 shrink-0">
            <button
              onClick={() => sendMessage("نعم، ابدأ تصميم نظامي الغذائي بناءً على ملفي الصحي")}
              className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              ابدأ تصميم نظامي الغذائي + ترشيح المنتجات
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-3 shrink-0 bg-white">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك هنا..."
              disabled={isTyping}
              className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 text-right"
              dir="rtl"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isTyping ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            ⚠️ التوصيات عامة وليست بديلاً عن استشارة الطبيب
          </p>
        </div>
      </div>
    </div>
  );
}
