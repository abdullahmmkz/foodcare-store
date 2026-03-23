import { useState } from "react";
import { ShoppingCart, Eye, TrendingUp, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface ProductItem {
  id: number;
  name: string;
  image: string;
  link: string;
  diseaseId: number;
  price?: string | null;
  description?: string | null;
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
      className="product-card rounded-2xl overflow-hidden cursor-pointer group fade-in-up"
      style={{
        animationDelay: `${index * 0.05}s`,
        backgroundColor: '#ffffff',
        border: '1px solid #e8e6dc',
      }}
      onClick={handleQuickView}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden aspect-square" style={{ backgroundColor: '#f5f4f0' }}>
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#e8e6dc' }}>
            <Package size={32} style={{ color: '#b0aea5' }} />
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
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center" style={{ backgroundColor: 'rgba(20,20,19,0.5)' }}>
          <button
            onClick={handleQuickView}
            className="rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
            style={{ backgroundColor: '#faf9f5', color: '#141413' }}
          >
            <Eye size={16} />
            عرض سريع
          </button>
        </div>

        {/* Featured Badge */}
        {product.featured === 1 && (
          <div className="absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: '#d97757', color: '#faf9f5' }}>
            <TrendingUp size={10} />
            الأكثر مبيعاً
          </div>
        )}

        {/* Disease Tag */}
        {product.diseaseName && (
          <div className="absolute top-2 left-2 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm" style={{ backgroundColor: 'rgba(20,20,19,0.85)', color: '#faf9f5' }}>
            {product.diseaseIcon && <span className="ml-1">{product.diseaseIcon}</span>}
            {product.diseaseName}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 mb-3 min-h-[2.5rem]" style={{ color: '#141413' }}>
          {product.name}
        </h3>

        <div className="flex items-center justify-between gap-2">
          {product.price && (
            <span className="font-bold text-sm" style={{ color: '#788c5d' }}>{product.price}</span>
          )}
          <button
            onClick={handleBuy}
            className="flex-1 text-sm font-bold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95"
            style={{ backgroundColor: '#141413', color: '#faf9f5' }}
          >
            <ShoppingCart size={15} />
            عرض المنتج
          </button>
        </div>
      </div>
    </div>
  );
}
