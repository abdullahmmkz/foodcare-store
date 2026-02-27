import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { X, Send, Bot, User, ShoppingBag, ExternalLink, Loader2, Leaf, ChevronRight } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  products?: RecommendedProduct[];
};

type RecommendedProduct = {
  id: number;
  name: string;
  image: string;
  link: string;
  diseaseName?: string;
  reason?: string;
};

type Step = "greeting" | "condition" | "details" | "plan" | "products";

// Quick reply options for guided flow
const CONDITION_OPTIONS = [
  { label: "🩸 السكري", value: "سكري" },
  { label: "💓 الضغط", value: "ضغط" },
  { label: "🫀 الكوليسترول", value: "كوليسترول" },
  { label: "⚖️ السمنة", value: "سمنة" },
  { label: "💪 صحة عامة", value: "صحة عامة" },
  { label: "🥗 تنحيف", value: "تنحيف" },
];

interface ChatBotProps {
  onClose: () => void;
}

export default function ChatBot({ onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً! 👋 أنا مساعدك الغذائي الذكي في FoodCure.\n\nسأساعدك في صناعة نظام غذائي مخصص لحالتك الصحية وأرشّح لك أفضل المنتجات المناسبة.\n\nما هي حالتك الصحية أو هدفك؟",
    },
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
      }]);
      setIsTyping(false);
      // Advance step
      setStep(prev => {
        if (prev === "greeting") return "condition";
        if (prev === "condition") return "details";
        if (prev === "details") return "plan";
        return "products";
      });
    },
    onError: () => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "عذراً، حدث خطأ. حاول مرة أخرى.",
      }]);
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

    // Track condition
    const detectedCondition = CONDITION_OPTIONS.find(o => text.includes(o.value))?.value || condition;
    if (detectedCondition && !condition) setCondition(detectedCondition);

    chatMutation.mutate({
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      step,
      condition: detectedCondition,
    });
  };

  const handleQuickReply = (value: string) => {
    sendMessage(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:w-[420px] h-[85vh] sm:h-[600px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border">

        {/* Header */}
        <div className="bg-primary px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Bot size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-sm">المساعد الغذائي الذكي</h3>
            <p className="text-white/70 text-xs">FoodCure AI • نظام غذائي مخصص</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="bg-primary/5 border-b border-border px-4 py-2 flex items-center gap-1 shrink-0">
          {["الحالة الصحية", "التفاصيل", "النظام الغذائي", "المنتجات"].map((s, i) => {
            const stepIndex = ["greeting", "condition", "details", "plan"].indexOf(step);
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
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary/10" : "bg-primary"}`}>
                {msg.role === "user"
                  ? <User size={16} className="text-primary" />
                  : <Bot size={16} className="text-white" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-2`}>
                <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>

                {/* Product Cards */}
                {msg.products && msg.products.length > 0 && (
                  <div className="w-full space-y-2 mt-1">
                    <p className="text-xs font-bold text-primary flex items-center gap-1">
                      <ShoppingBag size={12} />
                      منتجات مقترحة لك من FoodCure:
                    </p>
                    {msg.products.map(product => (
                      <div key={product.id} className="bg-white border border-border rounded-xl p-3 flex gap-3 shadow-sm hover:shadow-md transition-shadow">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-14 h-14 object-cover rounded-lg shrink-0 bg-muted"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/56x56?text=🌿"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-foreground line-clamp-2">{product.name}</p>
                          {product.reason && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">✓ {product.reason}</p>
                          )}
                          {product.diseaseName && (
                            <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {product.diseaseName}
                            </span>
                          )}
                          <a
                            href={product.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 flex items-center gap-1 text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors w-fit"
                          >
                            <ShoppingBag size={11} />
                            اشتر الآن
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    ))}
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

        {/* Quick Replies - show only at greeting step */}
        {step === "greeting" && !isTyping && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-xs text-muted-foreground mb-2">اختر حالتك الصحية:</p>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleQuickReply(opt.value)}
                  className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
