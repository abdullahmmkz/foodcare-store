import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Leaf, Eye, EyeOff, LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const utils = trpc.useUtils();

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: async (data) => {
      await utils.localAuth.me.invalidate();
      toast.success(`مرحباً ${data.name}! تم تسجيل الدخول بنجاح`);
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تسجيل الدخول");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    loginMutation.mutate({ email, password });
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
          <p className="text-muted-foreground text-sm mt-2">منتجات صحية مختارة بعناية</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-border p-8">
          <h1 className="text-2xl font-black text-foreground mb-1">تسجيل الدخول</h1>
          <p className="text-muted-foreground text-sm mb-6">أدخل بياناتك للدخول إلى حسابك</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="••••••••"
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

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-bold mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  جارٍ الدخول...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={18} />
                  تسجيل الدخول
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ليس لديك حساب؟{" "}
              <Link href="/register" className="text-primary font-bold hover:underline">
                إنشاء حساب جديد
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
