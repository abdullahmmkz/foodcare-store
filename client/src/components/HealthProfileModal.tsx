import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, ChevronRight, ChevronLeft, Heart, User, Activity, Target, AlertCircle, CheckCircle2 } from "lucide-react";

interface HealthProfileModalProps {
  userId: number;
  userName: string;
  onClose: () => void;
  onComplete: () => void;
}

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

export default function HealthProfileModal({ userId, userName, onClose, onComplete }: HealthProfileModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [allergies, setAllergies] = useState("");

  const saveProfile = trpc.healthProfile.save.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ ملفك الصحي بنجاح!");
      onComplete();
    },
    onError: (err) => {
      toast.error("حدث خطأ أثناء الحفظ");
    },
  });

  const toggleDisease = (id: string) => {
    if (id === "لا يوجد") {
      setSelectedDiseases(["لا يوجد"]);
      return;
    }
    setSelectedDiseases(prev => {
      const filtered = prev.filter(d => d !== "لا يوجد");
      if (filtered.includes(id)) return filtered.filter(d => d !== id);
      return [...filtered, id];
    });
  };

  const handleSubmit = () => {
    const diseasesJson = JSON.stringify(selectedDiseases.filter(d => d !== "لا يوجد"));
    saveProfile.mutate({
      userId,
      age: age ? parseInt(age) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      height: height ? parseInt(height) : undefined,
      gender: gender || undefined,
      diseases: diseasesJson,
      goal: goal as any || undefined,
      activityLevel: activityLevel as any || undefined,
      allergies: allergies || undefined,
    });
  };

  const canProceed = () => {
    if (step === 1) return gender !== "";
    if (step === 2) return age !== "" && weight !== "" && height !== "";
    if (step === 3) return selectedDiseases.length > 0;
    if (step === 4) return goal !== "";
    if (step === 5) return activityLevel !== "";
    return true;
  };

  const stepTitles = [
    "الجنس",
    "المعلومات الأساسية",
    "الحالة الصحية",
    "هدفك الصحي",
    "مستوى النشاط",
  ];

  const stepIcons = [User, Activity, Heart, Target, Activity];
  const StepIcon = stepIcons[step - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-emerald-600 to-emerald-500 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">مرحباً {userName}!</h2>
              <p className="text-emerald-100 text-sm mt-1">أخبرنا عن صحتك لنصمم نظامك الغذائي</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < step ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
          <p className="text-emerald-100 text-xs mt-2">الخطوة {step} من {totalSteps}: {stepTitles[step - 1]}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Gender */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-800 text-lg">ما هو جنسك؟</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGender("male")}
                  className={`p-5 rounded-2xl border-2 text-center transition-all ${gender === "male" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-300"}`}
                >
                  <div className="mb-2"><User className="w-10 h-10 mx-auto text-emerald-600" /></div>
                  <div className="font-semibold text-gray-700">ذكر</div>
                </button>
                <button
                  onClick={() => setGender("female")}
                  className={`p-5 rounded-2xl border-2 text-center transition-all ${gender === "female" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-300"}`}
                >
                  <div className="mb-2"><User className="w-10 h-10 mx-auto text-pink-500" /></div>
                  <div className="font-semibold text-gray-700">أنثى</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Age, Weight, Height */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-800 text-lg">معلوماتك الأساسية</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العمر (بالسنوات)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="مثال: 35"
                    min="1" max="120"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوزن (كيلوغرام)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="مثال: 80"
                    min="20" max="300"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الطول (سنتيمتر)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    placeholder="مثال: 175"
                    min="100" max="250"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-right"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Diseases */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-800 text-lg">هل تعاني من أي من هذه الحالات؟</h3>
              </div>
              <p className="text-sm text-gray-500 -mt-2">يمكنك اختيار أكثر من حالة</p>
              <div className="grid grid-cols-2 gap-2">
                {DISEASES.map(d => (
                  <button
                    key={d.id}
                    onClick={() => toggleDisease(d.id)}
                    className={`p-3 rounded-xl border-2 text-right transition-all flex items-center gap-2 ${
                      selectedDiseases.includes(d.id)
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-emerald-300"
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-700">{d.label}</span>
                    {selectedDiseases.includes(d.id) && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Goal */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-800 text-lg">ما هو هدفك الصحي الرئيسي؟</h3>
              </div>
              <div className="space-y-2">
                {GOALS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={`w-full p-4 rounded-xl border-2 text-right transition-all flex items-center gap-3 ${
                      goal === g.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-300"
                    }`}
                  >
                    <span className="font-medium text-gray-700">{g.label}</span>
                    {goal === g.id && <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-auto" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Activity Level + Allergies */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-800 text-lg">مستوى نشاطك اليومي</h3>
              </div>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setActivityLevel(a.id)}
                    className={`w-full p-3 rounded-xl border-2 text-right transition-all flex items-center gap-3 ${
                      activityLevel === a.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-300"
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-700">{a.label}</span>
                    {activityLevel === a.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-auto" />}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  هل لديك حساسية من أطعمة معينة؟ <span className="text-gray-400">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                  placeholder="مثال: المكسرات، الحليب..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-right"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-600 hover:border-gray-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </button>
          )}
          <button
            onClick={() => {
              if (step < totalSteps) setStep(s => s + 1);
              else handleSubmit();
            }}
            disabled={!canProceed() || saveProfile.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveProfile.isPending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : step < totalSteps ? (
              <>
                التالي
                <ChevronLeft className="w-4 h-4" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                احفظ وابدأ
              </>
            )}
          </button>
        </div>

        {/* Skip option */}
        <div className="text-center pb-4">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            تخطي الآن وأكمل لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
