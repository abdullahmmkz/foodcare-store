import { Leaf, ShoppingBag, Shield, Heart } from "lucide-react";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container">
          <div className="flex items-center gap-3 h-16">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                <Leaf size={20} className="text-primary-foreground" />
              </div>
              <span className="font-black text-lg text-foreground hidden sm:block">
                Nutritional <span className="text-primary">Care</span>
              </span>
            </Link>
            <div className="flex-1" />
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
              العودة للمتجر
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-12 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart size={32} className="text-primary" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-3">من نحن</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Nutritional Care هي منصة متخصصة في توصية المنتجات الصحية والمكملات الغذائية
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <ShoppingBag size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">رسالتنا</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              نسعى إلى تسهيل وصول مرضى السكري وضغط الدم والسمنة إلى أفضل المنتجات الصحية والمكملات الغذائية المناسبة لحالتهم الصحية، من خلال توصيات موثوقة ومختارة بعناية من قِبل متخصصين.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">التزامنا بالجودة</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              جميع المنتجات المعروضة على منصتنا تمر بعملية اختيار دقيقة تضمن جودتها وسلامتها. نحن نتعاون مع أفضل العلامات التجارية الصحية لتقديم منتجات موثوقة تلبي احتياجات مرضانا.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Leaf size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">تصنيفاتنا الصحية</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              نقدم منتجات مصنفة حسب الحالة الصحية لتسهيل البحث والوصول. تشمل تصنيفاتنا: السكري، ضغط الدم، السمنة، وغيرها من الحالات الصحية الشائعة.
            </p>
          </div>
        </div>

        <div className="text-center mt-10">
          <Link href="/">
            <button className="bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors">
              تصفح المنتجات
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
