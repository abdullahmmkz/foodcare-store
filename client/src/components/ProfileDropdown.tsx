import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  UserCircle, Lock, Eye, EyeOff, ShieldCheck, Save,
  User, Activity, Heart, Target, CheckCircle2, ChevronDown, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const DISEASES = [
  { id: "سكري", label: "السكري" },
  { id: "ضغط", label: "ضغط الدم" },
  { id: "كوليسترول", label: "الكوليسترول" },
  { id: "سمنة", label: "السمنة" },
  { id: "مناعة", label: "ضعف المناعة" },
  { id: "مفاصل", label: "مشاكل المفاصل" },
  { id: "لا يوجد", label: "لا يوجد أمراض" },
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

function getStrength(pwd: string) {
  if (!pwd.length) return 0;
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

interface Props {
  user: { id: number; name?: string | null; role?: string };
}

export default function ProfileDropdown({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"profile" | "password">("profile");
  const dropRef = useRef<HTMLDivElement>(null);

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Health profile data ── */
  const { data: healthProfile } = trpc.healthProfile.get.useQuery(
    { userId: user.id },
    { enabled: open }
  );

  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [allergies, setAllergies] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
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
  }, [healthProfile, profileLoaded]);

  const saveProfile = trpc.healthProfile.save.useMutation({
    onSuccess: () => { toast.success("تم حفظ المعلومات!"); setOpen(false); },
    onError: () => toast.error("حدث خطأ أثناء الحفظ"),
  });

  const toggleDisease = (id: string) => {
    if (id === "لا يوجد") { setSelectedDiseases(["لا يوجد"]); return; }
    setSelectedDiseases(prev => {
      const f = prev.filter(d => d !== "لا يوجد");
      return f.includes(id) ? f.filter(d => d !== id) : [...f, id];
    });
  };

  const handleSaveProfile = () => {
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

  /* ── Password ── */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const strength = getStrength(newPassword);
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500", "bg-emerald-600"][strength];
  const strengthLabel = ["", "ضعيفة", "مقبولة", "جيدة", "قوية", "ممتازة"][strength];

  const changePassword = trpc.localAuth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPwdError("");
      setOpen(false);
    },
    onError: (err) => setPwdError(err.message || "حدث خطأ"),
  });

  const handleChangePwd = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (newPassword !== confirmPassword) { setPwdError("كلمتا المرور غير متطابقتين"); return; }
    if (newPassword.length < 8) { setPwdError("8 أحرف على الأقل"); return; }
    if (newPassword === currentPassword) { setPwdError("يجب أن تختلف عن الحالية"); return; }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="relative" ref={dropRef} dir="rtl">
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors px-2 py-1.5 rounded-lg border border-primary/20"
      >
        <UserCircle size={15} />
        <span className="hidden sm:inline text-xs">ملقي</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-[340px] bg-white rounded-2xl shadow-2xl border border-border z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-l from-primary to-primary/80 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user.name?.[0]?.toUpperCase() || "م"}
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-tight">{user.name}</p>
                <p className="text-white/70 text-xs">مرحباً بك</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("profile")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all border-b-2 ${
                tab === "profile" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCircle size={14} />
              لنتعرف عليك
            </button>
            <button
              onClick={() => setTab("password")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all border-b-2 ${
                tab === "password" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock size={14} />
              كلمة المرور
            </button>
          </div>

          {/* Scrollable content */}
          <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">

            {/* ══ TAB: Profile ══ */}
            {tab === "profile" && (
              <>
                {/* Gender */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <User size={12} /> الجنس
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["male", "female"] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                          gender === g ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {g === "male" ? "ذكر" : "أنثى"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Basic info */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Activity size={12} /> المعلومات الأساسية
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "العمر", val: age, set: setAge, ph: "35", min: 1, max: 120 },
                      { label: "الوزن كغ", val: weight, set: setWeight, ph: "80", min: 20, max: 300 },
                      { label: "الطول سم", val: height, set: setHeight, ph: "175", min: 100, max: 250 },
                    ].map(f => (
                      <div key={f.label}>
                        <Label className="text-[10px] text-muted-foreground block mb-1">{f.label}</Label>
                        <Input
                          type="number"
                          value={f.val}
                          onChange={e => f.set(e.target.value)}
                          placeholder={f.ph}
                          min={f.min} max={f.max}
                          className="text-right h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Diseases */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Heart size={12} /> الحالة الصحية
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DISEASES.map(d => (
                      <button
                        key={d.id}
                        onClick={() => toggleDisease(d.id)}
                        className={`py-2 px-3 rounded-lg border text-xs text-right transition-all flex items-center gap-1 ${
                          selectedDiseases.includes(d.id)
                            ? "border-primary bg-primary/5 text-primary font-semibold"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {selectedDiseases.includes(d.id) && <CheckCircle2 size={12} className="shrink-0" />}
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Goal */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Target size={12} /> الهدف الصحي
                  </p>
                  <div className="space-y-1.5">
                    {GOALS.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={`w-full py-2 px-3 rounded-lg border text-xs text-right transition-all flex items-center gap-1 ${
                          goal === g.id ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {goal === g.id && <CheckCircle2 size={12} className="shrink-0" />}
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Activity size={12} /> مستوى النشاط
                  </p>
                  <div className="space-y-1.5">
                    {ACTIVITY_LEVELS.map(a => (
                      <button
                        key={a.id}
                        onClick={() => setActivityLevel(a.id)}
                        className={`w-full py-2 px-3 rounded-lg border text-xs text-right transition-all flex items-center gap-1 ${
                          activityLevel === a.id ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {activityLevel === a.id && <CheckCircle2 size={12} className="shrink-0" />}
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Allergies */}
                <div>
                  <Label className="text-xs text-muted-foreground block mb-1">
                    الحساسية الغذائية <span className="text-muted-foreground/60">(اختياري)</span>
                  </Label>
                  <Input
                    value={allergies}
                    onChange={e => setAllergies(e.target.value)}
                    placeholder="مثال: المكسرات، الحليب..."
                    className="text-right h-8 text-sm"
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={saveProfile.isPending} className="w-full h-9 text-sm">
                  {saveProfile.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري الحفظ...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2"><Save size={14} /> حفظ المعلومات</span>
                  )}
                </Button>
              </>
            )}

            {/* ══ TAB: Password ══ */}
            {tab === "password" && (
              <form onSubmit={handleChangePwd} className="space-y-4">
                <div className="text-center pb-1">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <ShieldCheck size={20} className="text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">تغيير كلمة المرور</p>
                  <p className="text-xs text-muted-foreground">أدخل كلمة مرورك الحالية ثم الجديدة</p>
                </div>

                {/* Current */}
                <div className="space-y-1">
                  <Label className="text-xs">كلمة المرور الحالية</Label>
                  <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pl-8 text-right h-9 text-sm"
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* New */}
                <div className="space-y-1">
                  <Label className="text-xs">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pl-8 text-right h-9 text-sm"
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : "bg-muted"}`} />
                        ))}
                      </div>
                      <p className={`text-[10px] font-medium ${strength >= 4 ? "text-green-600" : strength >= 2 ? "text-orange-500" : "text-red-500"}`}>
                        القوة: {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div className="space-y-1">
                  <Label className="text-xs">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pl-8 text-right h-9 text-sm"
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="text-[10px] text-red-500">كلمتا المرور غير متطابقتين</p>
                  )}
                </div>

                {pwdError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 text-center">
                    {pwdError}
                  </div>
                )}

                <Button type="submit" className="w-full h-9 text-sm" disabled={changePassword.isPending}>
                  {changePassword.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري التغيير...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2"><ShieldCheck size={14} /> تغيير كلمة المرور</span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
