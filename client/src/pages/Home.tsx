import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, ChevronLeft, ChevronRight, Leaf, ShoppingBag, TrendingUp, Clock, DollarSign, Menu, LogIn, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import ProductCard, { type ProductItem } from "@/components/ProductCard";
import QuickViewModal from "@/components/QuickViewModal";
import { Link } from "wouter";

type SortType = "newest" | "popular" | "cheapest";

const LIMIT = 12;

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState<SortType>("newest");
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const categoriesRef = useRef<HTMLDivElement | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset on filter change
  useEffect(() => {
    setAllProducts([]);
    setOffset(0);
    setHasMore(true);
  }, [debouncedSearch, selectedDiseaseId, sort]);

  const { data: diseases } = trpc.diseases.list.useQuery();

  const queryInput = useMemo(() => ({
    diseaseId: selectedDiseaseId,
    search: debouncedSearch || undefined,
    sort,
    limit: LIMIT,
    offset,
  }), [selectedDiseaseId, debouncedSearch, sort, offset]);

  const { data: productsData, isFetching } = trpc.products.list.useQuery(queryInput, {
    staleTime: 30_000,
  });

  // Append new products
  useEffect(() => {
    if (!productsData) return;
    const newItems = productsData.items as ProductItem[];
    if (offset === 0) {
      setAllProducts(newItems);
    } else {
      setAllProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const unique = newItems.filter(p => !existingIds.has(p.id));
        return [...prev, ...unique];
      });
    }
    setHasMore(newItems.length === LIMIT);
    setIsLoadingMore(false);
  }, [productsData, offset]);

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !isFetching && !isLoadingMore) {
      setIsLoadingMore(true);
      setOffset(prev => prev + LIMIT);
    }
  }, [hasMore, isFetching, isLoadingMore]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [handleObserver]);

  const scrollCategories = (dir: "left" | "right") => {
    if (!categoriesRef.current) return;
    categoriesRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  const sortOptions: { value: SortType; label: string; icon: React.ReactNode }[] = [
    { value: "newest", label: "الأحدث", icon: <Clock size={14} /> },
    { value: "popular", label: "الأكثر مبيعاً", icon: <TrendingUp size={14} /> },
    { value: "cheapest", label: "الأرخص", icon: <DollarSign size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sticky Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container">
          <div className="flex items-center gap-3 h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                <Leaf size={20} className="text-primary-foreground" />
              </div>
              <span className="font-black text-lg text-foreground hidden sm:block">
                صحتي <span className="text-primary">ستور</span>
              </span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن منتج أو مرض..."
                className="w-full bg-muted border border-border rounded-xl py-2.5 pr-9 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Auth / Admin */}
            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticated ? (
                <>
                  {user?.role === "admin" && (
                    <Link href="/admin">
                      <button className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-2 rounded-xl hover:bg-primary/90 transition-colors">
                        <Shield size={15} />
                        <span className="hidden sm:inline">الأدمن</span>
                      </button>
                    </Link>
                  )}
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    {user?.name?.[0] || "م"}
                  </div>
                </>
              ) : (
                <a href={getLoginUrl()}>
                  <button className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3 py-2 rounded-xl hover:bg-primary/90 transition-colors">
                    <LogIn size={15} />
                    <span className="hidden sm:inline">دخول</span>
                  </button>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero Banner ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-l from-primary/5 via-accent/30 to-primary/10 border-b border-border">
        <div className="container py-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <ShoppingBag size={12} />
            أفضل المنتجات الصحية
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
            منتجات صحية مختارة بعناية
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            اكتشف أفضل المكملات الغذائية والمنتجات الصحية المصنفة حسب احتياجك
          </p>
        </div>
      </div>

      {/* ─── Categories Bar ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-border sticky top-16 z-30 shadow-sm">
        <div className="container py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollCategories("right")}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
            >
              <ChevronRight size={16} />
            </button>

            <div
              ref={categoriesRef}
              className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1"
            >
              {/* All */}
              <button
                onClick={() => setSelectedDiseaseId(undefined)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  selectedDiseaseId === undefined
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                🌿 الكل
              </button>

              {diseases?.map(disease => (
                <button
                  key={disease.id}
                  onClick={() => setSelectedDiseaseId(disease.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    selectedDiseaseId === disease.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {disease.icon && <span>{disease.icon}</span>}
                  {disease.nameAr}
                </button>
              ))}
            </div>

            <button
              onClick={() => scrollCategories("left")}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content ──────────────────────────────────────────────────── */}
      <main className="container py-6">
        {/* Sort & Stats Bar */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="text-sm text-muted-foreground">
            {productsData ? (
              <span>
                <strong className="text-foreground">{productsData.total.toLocaleString()}</strong> منتج
                {debouncedSearch && <span> لـ "<strong className="text-primary">{debouncedSearch}</strong>"</span>}
              </span>
            ) : (
              <span className="skeleton h-4 w-24 inline-block" />
            )}
          </div>

          {/* Sort Filters */}
          <div className="flex items-center gap-2">
            {sortOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  sort === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {allProducts.length === 0 && !isFetching ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-foreground mb-2">لا توجد منتجات</h3>
            <p className="text-muted-foreground text-sm">جرب البحث بكلمة أخرى أو اختر تصنيفاً مختلفاً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {allProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={setQuickViewProduct}
                index={index % LIMIT}
              />
            ))}

            {/* Skeleton loaders */}
            {(isFetching || isLoadingMore) &&
              [...Array(LIMIT)].map((_, i) => (
                <div key={`sk-${i}`} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="skeleton aspect-square" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-9 w-full mt-3" />
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        <div ref={loadMoreRef} className="h-10 mt-4" />

        {/* End of results */}
        {!hasMore && allProducts.length > 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <div className="w-12 h-0.5 bg-border mx-auto mb-3" />
            تم عرض جميع المنتجات ({allProducts.length})
          </div>
        )}
      </main>

      {/* ─── Quick View Modal ──────────────────────────────────────────────── */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-border mt-12">
        <div className="container py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                <Leaf size={16} className="text-primary-foreground" />
              </div>
              <span className="font-black text-foreground">صحتي ستور</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              منتجات صحية مختارة من Amazon وNoon • جميع الروابط روابط Affiliate
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
