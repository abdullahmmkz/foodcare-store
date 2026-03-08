import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowRight, Leaf, User, Activity, Heart, Target, CheckCircle2,
  Lock, Eye, EyeOff, ShieldCheck, Save, UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const DISEASES = [
  { id: "سكري", label: "السكري", color: "bg-red-50 border-red-200 text-red-700" },
  { id: "ضغط", label: "ضغط الدم", color: "bg-pink-50 border-pink-200 text-pink-700" },
  { id: "كوليسترول", label: "الكوليسترول", color: "bg-orange-50 border-orange-200 text-orange-700" },
  { id: "سمنة", label: "السمنة", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { id: "مناعة", label: "ضعف المناعة", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "مفاصل", label: "مشاكل المفاصل", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: "لا يوجد", label: "لا يوجد أمراض", color: "bg-green-50 border-green-200 text-green-700" },
];

const GOALS = [
  { id: "weight_loss", label: "خسارة الوزن" },
  { id: "blood_sugar", label: "تنظيم السكر" },
  { id: "blood_pressure", label: "تنظيم الضغط" },
  { id: "cholesterol", label: "تحسين الكوليسترول" },
  { id: "general_health", label: "صحة عامة" },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "خامل (جلوس معظم اليوم)" },
  { id: "light", label: "خفيف (تمشية خفيفة)" },
  { id: "moderate", label: "متوسط (رياضة 3 أيام)" },
  { id: "active", label: "نشيط (رياضة يومية)" },
];

/* ─── Password strength helper ──────────────────────────────────────────── */
function getStrength(pwd: string) {
  if (pwd.length === 0) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

/* ─── Main Component ────────────────────────────────────────────────────── */
export default function Profile() {
  const [, navigate] = useLocation();
  const { data: user } = trpc.localAuth.me.useQuery();
  const { data: healthProfile } = trpc.healthProfile.get.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user?.id }
  );

  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  /* ── Health profile state ── */
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [allergies, setAllergies] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Pre-fill form when profile loads
  if (healthProfile && !profileLoaded) {
    setProfileLoaded(true);
    if (healthProfile.age) setAge(String(healthProfile.age));
    if (healthProfile.weight) setWeight(String(healthProfile.weight));
    if (healthProfile.height) setHeight(String(healthProfile.height));
    if (healthProfile.gender) setGender(healthProfile.gender as "male" | "female");
    if (healthProfile.diseases) {
      try { setSelectedDiseases(JSON.parse(healthProfile.diseases)); } catch {}
    }
    if (healthProfile.goal) setGoal(healthProfile.goal);
    if (healthProfile.activityLevel) setActivityLevel(healthProfile.activityLevel);
    if (healthProfile.allergies) setAllergies(healthProfile.allergies);
  }

  const saveProfile = trpc.healthProfile.save.useMutation({
    onSuccess: () => toast.success("تم حفظ ملفك الصحي بنجاح!"),
    onError: () => toast.error("حدث خطأ أثناء الحفظ"),
  });

  const toggleDisease = (id: string) => {
    if (id === "لا يوجد") { setSelectedDiseases(["لا يوجد"]); return; }
    setSelectedDiseases(prev => {
      const filtered = prev.filter(d => d !== "لا يوجد");
      return filtered.includes(id) ? filtered.filter(d => d !== id) : [...filtered, id];
    });
  };

  const handleSaveProfile = () => {
    if (!user?.id) return;
    saveProfile.mutate({
      userId: user.id,
      age: age ? parseInt(age) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      height: height ? parseInt(height) : undefined,
      gender: gender || undefined,
      diseases: JSON.stringify(selectedDiseases.filter(d => d !== "لا يوجد")),
      goal: goal as any || undefined,
      activityLevel: activityLevel as any || undefined,
      allergies: allergies || undefined,
    });
  };

  /* ── Password state ── */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const strength = getStrength(newPassword);
  const strengthLabel = ["", "ضعيفة", "مقبولة", "جيدة", "قوية", "ممتازة"][strength];
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500", "bg-emerald-600"][strength];

  const changePassword = trpc.localAuth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور بنجاح");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPwdError("");
    },
    onError: (err) => setPwdError(err.message || "حدث خطأ، حاول مرة أخرى"),
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (newPassword !== confirmPassword) { setPwdError("كلمة المرور الجديدة وتأكيدها غير متطابقتين"); return; }
    if (newPassword.length < 8) { setPwdError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"); return; }
    if (newPassword === currentPassword) { setPwdError("كلمة المرور الجديدة يجب أن تختلف عن الحالية"); return; }
    changePassword.mutate({ currentPassword, newPassword });
  };

  /* ── Not logged in ── */
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <Lock size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">يجب تسجيل الدخول أولاً</h2>
          <Link href="/login"><Button className="mt-4">تسجيل الدخول</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 to-white" dir="rtl">
      {/* ── Header ── */}
      <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight size={18} />
            <span className="text-sm">العودة</span>
          </button>
        </Link>
        <div className="flex items-center gap-2 mr-auto">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
            <Leaf size={16} className="text-primary-foreground" />
          </div>
          <span className="font-black text-foreground">FoodCure</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* ── Page title ── */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-primary/20">
            <span className="text-3xl font-black text-primary">{user.name?.[0]?.toUpperCase() || "م"}</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">لنتعرف عليك</h1>
          <p className="text-muted-foreground text-sm mt-1">مرحباً <strong>{user.name}</strong>، يمكنك تحديث معلوماتك هنا</p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-6 bg-muted rounded-xl p-1">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "profile"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCircle size={16} />
            لنتعرف عليك
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "password"
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock size={16} />
            كلمة المرور
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: Health Profile
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="space-y-5">
            {/* Gender */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User size={18} className="text-primary" />
                  الجنس
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {["male", "female"].map(g => (
                    <button
                      key={g}
                      onClick={() => setGender(g as "male" | "female")}
                      className={`p-4 rounded-xl border-2 text-center transition-all font-semibold ${
                        gender === g
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {g === "male" ? "ذكر" : "أنثى"}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Basic info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity size={18} className="text-primary" />
                  المعلومات الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">العمر (سنة)</Label>
                    <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="35" min="1" max="120" className="text-right" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">الوزن (كغ)</Label>
                    <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="80" min="20" max="300" className="text-right" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">الطول (سم)</Label>
                    <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" min="100" max="250" className="text-right" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Diseases */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart size={18} className="text-primary" />
                  الحالة الصحية
                </CardTitle>
                <CardDescription className="text-xs">يمكنك اختيار أكثر من حالة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {DISEASES.map(d => (
                    <button
                      key={d.id}
                      onClick={() => toggleDisease(d.id)}
                      className={`p-3 rounded-xl border-2 text-right transition-all flex items-center gap-2 ${
                        selectedDiseases.includes(d.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="text-sm font-medium text-foreground">{d.label}</span>
                      {selectedDiseases.includes(d.id) && (
                        <CheckCircle2 size={16} className="text-primary mr-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Goal */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target size={18} className="text-primary" />
                  هدفك الصحي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {GOALS.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={`w-full p-3 rounded-xl border-2 text-right transition-all flex items-center gap-3 ${
                        goal === g.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="text-sm font-medium text-foreground">{g.label}</span>
                      {goal === g.id && <CheckCircle2 size={16} className="text-primary mr-auto" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Activity + Allergies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity size={18} className="text-primary" />
                  مستوى النشاط والحساسية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {ACTIVITY_LEVELS.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setActivityLevel(a.id)}
                      className={`w-full p-3 rounded-xl border-2 text-right transition-all flex items-center gap-3 ${
                        activityLevel === a.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="text-sm font-medium text-foreground">{a.label}</span>
                      {activityLevel === a.id && <CheckCircle2 size={16} className="text-primary mr-auto" />}
                    </button>
                  ))}
                </div>
                <div>
                  <Label className="text-sm mb-1 block">
                    الحساسية الغذائية <span className="text-muted-foreground text-xs">(اختياري)</span>
                  </Label>
                  <Input
                    value={allergies}
                    onChange={e => setAllergies(e.target.value)}
                    placeholder="مثال: المكسرات، الحليب..."
                    className="text-right"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save button */}
            <Button
              onClick={handleSaveProfile}
              disabled={saveProfile.isPending}
              className="w-full h-12 text-base font-bold"
            >
              {saveProfile.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري الحفظ...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save size={18} />
                  حفظ المعلومات
                </span>
              )}
            </Button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: Change Password
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "password" && (
          <Card className="shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={28} className="text-primary" />
              </div>
              <CardTitle className="text-xl font-black">تغيير كلمة المرور</CardTitle>
              <CardDescription>أدخل كلمة مرورك الحالية ثم الجديدة</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-5 mt-2">
                {/* Current */}
                <div className="space-y-1.5">
                  <Label htmlFor="current">كلمة المرور الحالية</Label>
                  <div className="relative">
                    <Input
                      id="current"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10 text-right"
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New */}
                <div className="space-y-1.5">
                  <Label htmlFor="new">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="new"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10 text-right"
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "bg-muted"}`} />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${strength >= 4 ? "text-green-600" : strength >= 2 ? "text-orange-500" : "text-red-500"}`}>
                        قوة كلمة المرور: {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">تأكيد كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10 text-right"
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
                  )}
                  {confirmPassword.length > 0 && newPassword === confirmPassword && confirmPassword.length >= 8 && (
                    <p className="text-xs text-green-600">كلمتا المرور متطابقتان</p>
                  )}
                </div>

                {pwdError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 text-center">
                    {pwdError}
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-base font-bold" disabled={changePassword.isPending}>
                  {changePassword.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري التغيير...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShieldCheck size={18} />
                      تغيير كلمة المرور
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
