import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Leaf, LayoutDashboard, Package, Tag, TrendingUp, Plus, Pencil, Trash2,
  X, Check, AlertCircle, LogOut, ChevronRight, BarChart3, Eye, ShoppingCart, Home
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { clearLocalToken } from "@/lib/localToken";

type AdminTab = "dashboard" | "diseases" | "products";

// ─── Disease Form ─────────────────────────────────────────────────────────────
function DiseaseForm({ initial, onSave, onCancel }: {
  initial?: { id?: number; name: string; nameAr: string; icon?: string | null };
  onSave: (data: { name: string; nameAr: string; icon?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [nameAr, setNameAr] = useState(initial?.nameAr || "");
  const [icon, setIcon] = useState(initial?.icon || "");

  return (
    <div className="bg-accent/30 rounded-2xl p-5 border border-border mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">الاسم بالعربي *</label>
          <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="مثال: السكري"
            className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">الاسم بالإنجليزي *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: Diabetes"
            className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">الأيقونة (اختياري)</label>
          <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="مثال: سكري"
            className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 justify-end">
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
          <X size={14} /> إلغاء
        </button>
        <button
          onClick={() => { if (!name || !nameAr) { toast.error("يرجى ملء جميع الحقول المطلوبة"); return; } onSave({ name, nameAr, icon: icon || undefined }); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Check size={14} /> حفظ
        </button>
      </div>
    </div>
  );
}

// ─── Product Form ─────────────────────────────────────────────────────────────
function ProductForm({ initial, diseases, onSave, onCancel }: {
  initial?: { id?: number; name: string; image: string; link: string; diseaseId: number; price?: string | null; featured?: number };
  diseases: { id: number; nameAr: string; icon?: string | null }[];
  onSave: (data: { name: string; image: string; link: string; diseaseId: number; price?: string; featured?: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [image, setImage] = useState(initial?.image || "");
  const [link, setLink] = useState(initial?.link || "");
  const [diseaseId, setDiseaseId] = useState(initial?.diseaseId || 0);
  const [price, setPrice] = useState(initial?.price || "");
  const [featured, setFeatured] = useState(initial?.featured || 0);

  const handleSave = () => {
    if (!name || !image || !link || !diseaseId) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    try { new URL(image); } catch { toast.error("رابط الصورة غير صحيح"); return; }
    try { new URL(link); } catch { toast.error("رابط المنتج غير صحيح"); return; }
    onSave({ name, image, link, diseaseId, price: price || undefined, featured });
  };

  return (
    <div className="bg-accent/30 rounded-2xl p-5 border border-border mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">اسم المنتج *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="اسم المنتج الكامل"
            className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">رابط الصورة *</label>
          <input value={image} onChange={e => setImage(e.target.value)} placeholder="https://..."
            className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" dir="ltr" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">رابط المنتج *</label>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://amazon.com/..."
            className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" dir="ltr" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">التصنيف (المرض) *</label>
          <select value={diseaseId} onChange={e => setDiseaseId(Number(e.target.value))}
            className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value={0}>اختر التصنيف</option>
            {diseases.map(d => (
              <option key={d.id} value={d.id}>{d.icon} {d.nameAr}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">السعر (اختياري)</label>
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="مثال: 45 ريال"
            className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex items-center gap-3 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={featured === 1} onChange={e => setFeatured(e.target.checked ? 1 : 0)}
              className="w-4 h-4 rounded accent-primary" />
            <span className="text-sm font-medium text-foreground">الأكثر مبيعاً</span>
          </label>
        </div>
      </div>
      {image && (
        <div className="mt-3">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">معاينة الصورة</label>
          <img src={image} alt="preview" className="h-20 w-20 object-cover rounded-xl border border-border" onError={e => (e.target as HTMLImageElement).style.display = "none"} />
        </div>
      )}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
          <X size={14} /> إلغاء
        </button>
        <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Check size={14} /> حفظ
        </button>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function Admin() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: localUser, isLoading: localUserLoading } = trpc.localAuth.me.useQuery();
  const localLogout = trpc.localAuth.logout.useMutation({
    onSuccess: async () => {
      clearLocalToken();
      await utils.localAuth.me.invalidate();
      toast.success("تم تسجيل الخروج");
      navigate("/");
    },
  });
  const isAuthenticated = !!localUser;
  const loading = localUserLoading;
  const user = localUser;
  const logout = () => localLogout.mutate();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [showDiseaseForm, setShowDiseaseForm] = useState(false);
  const [editingDisease, setEditingDisease] = useState<{ id: number; name: string; nameAr: string; icon?: string | null } | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{ id: number; name: string; image: string; link: string; diseaseId: number; price?: string | null; featured?: number } | null>(null);

  const { data: diseases, isLoading: diseasesLoading } = trpc.diseases.list.useQuery();
  const { data: products, isLoading: productsLoading } = trpc.products.adminList.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const createDisease = trpc.diseases.create.useMutation({
    onSuccess: () => { utils.diseases.list.invalidate(); setShowDiseaseForm(false); toast.success("تم إضافة التصنيف"); },
    onError: () => toast.error("حدث خطأ"),
  });
  const updateDisease = trpc.diseases.update.useMutation({
    onSuccess: () => { utils.diseases.list.invalidate(); setEditingDisease(null); toast.success("تم تحديث التصنيف"); },
    onError: () => toast.error("حدث خطأ"),
  });
  const deleteDisease = trpc.diseases.delete.useMutation({
    onSuccess: () => { utils.diseases.list.invalidate(); toast.success("تم حذف التصنيف"); },
    onError: () => toast.error("حدث خطأ"),
  });

  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => { utils.products.adminList.invalidate(); setShowProductForm(false); toast.success("تم إضافة المنتج"); },
    onError: () => toast.error("حدث خطأ"),
  });
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => { utils.products.adminList.invalidate(); setEditingProduct(null); toast.success("تم تحديث المنتج"); },
    onError: () => toast.error("حدث خطأ"),
  });
  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => { utils.products.adminList.invalidate(); toast.success("تم حذف المنتج"); },
    onError: () => toast.error("حدث خطأ"),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center bg-card rounded-3xl p-10 border border-border shadow-lg max-w-sm w-full mx-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">تسجيل الدخول مطلوب</h2>
          <p className="text-muted-foreground text-sm mb-6">يجب تسجيل الدخول للوصول إلى لوحة الأدمن</p>
          <Link href="/login">
            <button className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors">
              تسجيل الدخول
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center bg-card rounded-3xl p-10 border border-border shadow-lg max-w-sm w-full mx-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">غير مصرح</h2>
          <p className="text-muted-foreground text-sm mb-6">ليس لديك صلاحية الوصول إلى لوحة الأدمن</p>
          <Link href="/">
            <button className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors">
              العودة للرئيسية
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const totalClicks = products?.reduce((sum, p) => sum + p.clicks, 0) || 0;

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "لوحة التحكم", icon: <LayoutDashboard size={18} /> },
    { id: "diseases", label: "التصنيفات", icon: <Tag size={18} /> },
    { id: "products", label: "المنتجات", icon: <Package size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* ─── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-l border-border flex flex-col shrink-0 hidden md:flex">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Leaf size={20} className="text-primary-foreground" />
            </div>
            <div>
              <div className="font-black text-sm text-foreground">Nutritional <span className="text-primary">Care</span></div>
              <div className="text-xs text-muted-foreground">لوحة الأدمن</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
              {tab === item.id && <ChevronRight size={14} className="mr-auto" />}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <Link href="/">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Home size={16} />
              المتجر
            </button>
          </Link>
          <button
            onClick={() => { logout(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all duration-200 border border-destructive/20"
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ─── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-foreground text-lg">
              {navItems.find(n => n.id === tab)?.label}
            </h1>
            <p className="text-xs text-muted-foreground">مرحباً، {user?.name || "أدمن"}</p>
          </div>
          {/* Mobile Nav + Logout */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 md:hidden">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`p-2 rounded-xl transition-colors ${tab === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {item.icon}
                </button>
              ))}
            </div>
            {/* Back to store button */}
            <Link href="/">
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all duration-200">
                <Home size={15} />
                <span className="hidden sm:inline">المتجر</span>
              </button>
            </Link>
            {/* Logout button visible on all screen sizes */}
            <button
              onClick={() => { logout(); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-destructive border border-destructive/30 hover:bg-destructive hover:text-white transition-all duration-200"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">

          {/* ─── Dashboard Tab ─────────────────────────────────────────────── */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "إجمالي المنتجات", value: products?.length || 0, icon: <Package size={20} />, color: "bg-primary/10 text-primary" },
                  { label: "التصنيفات", value: diseases?.length || 0, icon: <Tag size={20} />, color: "bg-blue-100 text-blue-600" },
                  { label: "إجمالي النقرات", value: totalClicks.toLocaleString(), icon: <TrendingUp size={20} />, color: "bg-amber-100 text-amber-600" },
                  { label: "منتجات مميزة", value: products?.filter(p => p.featured === 1).length || 0, icon: <BarChart3 size={20} />, color: "bg-purple-100 text-purple-600" },
                ].map((stat, i) => (
                  <div key={i} className="bg-card rounded-2xl border border-border p-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                      {stat.icon}
                    </div>
                    <div className="text-2xl font-black text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Top Products by Clicks */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary" />
                  أكثر المنتجات نقراً
                </h3>
                <div className="space-y-3">
                  {products
                    ?.sort((a, b) => b.clicks - a.clicks)
                    .slice(0, 5)
                    .map((product, i) => (
                      <div key={product.id} className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {i + 1}
                        </span>
                        <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-border shrink-0"
                          onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.diseaseName}</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold text-primary shrink-0">
                          <Eye size={13} />
                          {product.clicks.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  {(!products || products.length === 0) && (
                    <p className="text-muted-foreground text-sm text-center py-4">لا توجد منتجات بعد</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Diseases Tab ──────────────────────────────────────────────── */}
          {tab === "diseases" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{diseases?.length || 0} تصنيف</p>
                <button
                  onClick={() => { setShowDiseaseForm(true); setEditingDisease(null); }}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Plus size={16} />
                  إضافة تصنيف
                </button>
              </div>

              {showDiseaseForm && !editingDisease && (
                <DiseaseForm
                  onSave={data => createDisease.mutate(data)}
                  onCancel={() => setShowDiseaseForm(false)}
                />
              )}

              <div className="space-y-2">
                {diseasesLoading ? (
                  [...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)
                ) : diseases?.map(disease => (
                  <div key={disease.id}>
                    {editingDisease?.id === disease.id ? (
                      <DiseaseForm
                        initial={editingDisease}
                        onSave={data => updateDisease.mutate({ id: disease.id, ...data })}
                        onCancel={() => setEditingDisease(null)}
                      />
                    ) : (
                      <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Tag size={18} className="text-primary shrink-0" />
                          <div>
                            <p className="font-semibold text-foreground">{disease.nameAr}</p>
                            <p className="text-xs text-muted-foreground">{disease.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingDisease({ id: disease.id, name: disease.name, nameAr: disease.nameAr, icon: disease.icon })}
                            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => { if (confirm("هل تريد حذف هذا التصنيف؟")) deleteDisease.mutate({ id: disease.id }); }}
                            className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!diseasesLoading && diseases?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Tag size={40} className="mx-auto mb-3 opacity-30" />
                    <p>لا توجد تصنيفات بعد</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Products Tab ──────────────────────────────────────────────── */}
          {tab === "products" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{products?.length || 0} منتج</p>
                <button
                  onClick={() => { setShowProductForm(true); setEditingProduct(null); }}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Plus size={16} />
                  إضافة منتج
                </button>
              </div>

              {showProductForm && !editingProduct && (
                <ProductForm
                  diseases={diseases || []}
                  onSave={data => createProduct.mutate(data)}
                  onCancel={() => setShowProductForm(false)}
                />
              )}

              <div className="space-y-2">
                {productsLoading ? (
                  [...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
                ) : products?.map(product => (
                  <div key={product.id}>
                    {editingProduct?.id === product.id ? (
                      <ProductForm
                        initial={editingProduct}
                        diseases={diseases || []}
                        onSave={data => updateProduct.mutate({ id: product.id, ...data })}
                        onCancel={() => setEditingProduct(null)}
                      />
                    ) : (
                      <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
                        <img src={product.image} alt={product.name}
                          className="w-14 h-14 object-cover rounded-xl border border-border shrink-0"
                          onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm line-clamp-1">{product.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{product.diseaseName}</span>
                            {product.price && <span className="text-xs text-muted-foreground">{product.price}</span>}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <ShoppingCart size={10} /> {product.clicks} نقرة
                            </span>
                            {product.featured === 1 && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">مميز</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setEditingProduct({ id: product.id, name: product.name, image: product.image, link: product.link, diseaseId: product.diseaseId, price: product.price, featured: product.featured })}
                            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => { if (confirm("هل تريد حذف هذا المنتج؟")) deleteProduct.mutate({ id: product.id }); }}
                            className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!productsLoading && products?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    <p>لا توجد منتجات بعد</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
