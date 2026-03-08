import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Leaf, Eye, EyeOff, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setLocalToken } from "@/lib/localToken";

export default function Register() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const utils = trpc.useUtils();

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: async (data) => {
      if (data.token) setLocalToken(data.token);
      await utils.localAuth.me.invalidate();
      toast.success(`مرحباً ${data.name}! تم إنشاء حسابك بنجاح`);
      navigate("/");
    },
    onError: (err) => {
      // Extract Arabic message from zod validation errors or use server message
      let msg = err.message || "حدث خطأ أثناء إنشاء الحساب";
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed) && parsed[0]?.message) msg = parsed[0].message;
      } catch { /* use msg as-is */ }
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("كلمة المرور وتأكيدها غير متطابقتين");
      return;
    }
    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    registerMutation.mutate({ name, email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Leaf size={32} className="text-primary-foreground" />
            </div>
            <span className="font-black text-2xl text-foreground">
              Food<span className="text-primary">Cure</span>
            </span>
          </Link>
          <p className="text-muted-foreground text-sm mt-2">متجر صحة افليت</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-border p-8">
          <h1 className="text-2xl font-black text-foreground mb-1">إنشاء حساب جديد</h1>
          <p className="text-muted-foreground text-sm mb-6">انضم إلى FoodCure وابدأ رحلتك الصحية</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">الاسم الكامل</Label>
              <Input
                id="name"
                type="text"
                placeholder="محمد أحمد"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-12 rounded-xl text-right"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-12 rounded-xl text-right"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="8 أحرف على الأقل"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-12 rounded-xl pr-4 pl-10"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type={showPass ? "text" : "password"}
                placeholder="أعد كتابة كلمة المرور"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="h-12 rounded-xl"
                dir="ltr"
                required
              />
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        password.length >= i * 2
                          ? password.length >= 8 ? "bg-green-500" : "bg-amber-400"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${password.length >= 8 ? "text-green-600" : "text-amber-600"}`}>
                  {password.length >= 8 ? "كلمة مرور قوية" : `${8 - password.length} أحرف متبقية`}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-bold mt-2"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  جارٍ إنشاء الحساب...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus size={18} />
                  إنشاء الحساب
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="text-primary font-bold hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>

        {/* Back to store */}
        <div className="text-center mt-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowRight size={14} />
            العودة إلى المتجر
          </Link>
        </div>
      </div>
    </div>
  );
}
