import { useState } from "react";
import { ShoppingCart, Eye, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface ProductItem {
  id: number;
  name: string;
  image: string;
  link: string;
  diseaseId: number;
  price?: string | null;
  clicks: number;
  featured: number;
  diseaseName?: string | null;
  diseaseIcon?: string | null;
  createdAt: Date;
}

interface ProductCardProps {
  product: ProductItem;
  onQuickView: (product: ProductItem) => void;
  index?: number;
}

export default function ProductCard({ product, onQuickView, index = 0 }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const trackClick = trpc.products.trackClick.useMutation();

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackClick.mutate({ id: product.id });
    window.open(product.link, "_blank", "noopener,noreferrer");
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView(product);
  };

  return (
    <div
      className="product-card bg-card rounded-2xl border border-border overflow-hidden cursor-pointer group fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={handleQuickView}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-muted aspect-square">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center bg-accent">
            <span className="text-4xl">{product.diseaseIcon || "💊"}</span>
          </div>
        ) : (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}

        {/* Quick View Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={handleQuickView}
            className="bg-white text-foreground rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
          >
            <Eye size={16} />
            عرض سريع
          </button>
        </div>

        {/* Featured Badge */}
        {product.featured === 1 && (
          <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <TrendingUp size={10} />
            الأكثر مبيعاً
          </div>
        )}

        {/* Disease Tag */}
        {product.diseaseName && (
          <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
            {product.diseaseIcon && <span className="ml-1">{product.diseaseIcon}</span>}
            {product.diseaseName}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 mb-3 min-h-[2.5rem]">
          {product.name}
        </h3>

        <div className="flex items-center justify-between gap-2">
          {product.price && (
            <span className="text-primary font-bold text-sm">{product.price}</span>
          )}
          <button
            onClick={handleBuy}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95"
          >
            <ShoppingCart size={15} />
            اشتر الآن
          </button>
        </div>
      </div>
    </div>
  );
}
