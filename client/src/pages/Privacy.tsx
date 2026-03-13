import { Leaf, FileText } from "lucide-react";
import { Link } from "wouter";

export default function Privacy() {
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
            <FileText size={32} className="text-primary" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-3">سياسة الخصوصية</h1>
          <p className="text-muted-foreground text-sm">آخر تحديث: مارس 2026</p>
        </div>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-3">1. جمع المعلومات</h2>
            <p>
              نقوم بجمع المعلومات التي تقدمها عند إنشاء حساب على منصتنا، بما في ذلك الاسم وعنوان البريد الإلكتروني. كما نجمع معلومات حول استخدامك للموقع لتحسين تجربتك.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-3">2. استخدام المعلومات</h2>
            <p>
              نستخدم المعلومات التي نجمعها لتقديم خدماتنا وتحسينها، وتخصيص توصيات المنتجات بناءً على حالتك الصحية، والتواصل معك بشأن تحديثات الخدمة.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-3">3. حماية المعلومات</h2>
            <p>
              نلتزم بحماية معلوماتك الشخصية ولا نشاركها مع أطراف ثالثة إلا بموافقتك الصريحة أو عند الاقتضاء القانوني. نستخدم تشفير SSL لحماية بياناتك أثناء النقل.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-3">4. ملفات تعريف الارتباط (Cookies)</h2>
            <p>
              نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وحفظ تفضيلاتك. يمكنك تعطيل هذه الملفات من إعدادات متصفحك، مع العلم أن ذلك قد يؤثر على بعض وظائف الموقع.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-3">5. روابط الشركاء</h2>
            <p>
              يحتوي موقعنا على روابط تابعة لمتاجر خارجية. عند النقر على هذه الروابط وإتمام عملية الشراء، قد نحصل على عمولة. هذا لا يؤثر على سعر المنتج بالنسبة لك.
            </p>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-3">6. التواصل معنا</h2>
            <p>
              إذا كان لديك أي استفسار حول سياسة الخصوصية، يمكنك التواصل معنا عبر البريد الإلكتروني:
              <a href="mailto:info@nutritional-care.manus.space" className="text-primary hover:underline mr-1">
                info@nutritional-care.manus.space
              </a>
            </p>
          </section>
        </div>

        <div className="text-center mt-10">
          <Link href="/">
            <button className="bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors">
              العودة للمتجر
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
