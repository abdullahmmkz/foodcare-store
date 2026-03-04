import { useState } from "react";
import { X, ShoppingCart, TrendingUp, Tag, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { ProductItem } from "./ProductCard";
import RelatedProducts from "./RelatedProducts";

interface QuickViewModalProps {
  product: ProductItem | null;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const [imgError, setImgError] = useState(false);
  const trackClick = trpc.products.trackClick.useMutation();

  if (!product) return null;

  const handleBuy = () => {
    trackClick.mutate({ id: product.id });
    window.open(product.link, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all hover:scale-110"
        >
          <X size={18} className="text-foreground" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative bg-muted rounded-t-3xl md:rounded-r-3xl md:rounded-tl-none overflow-hidden aspect-square md:aspect-auto md:min-h-[320px]">
            {imgError ? (
              <div className="w-full h-full flex items-center justify-center bg-accent min-h-[280px]">
                <span className="text-6xl">{product.diseaseIcon || "💊"}</span>
              </div>
            ) : (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            )}
            {product.featured === 1 && (
              <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <TrendingUp size={12} />
                الأكثر مبيعاً
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-6 flex flex-col justify-between">
            <div>
              {/* Disease Tag */}
              {product.diseaseName && (
                <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <Tag size={12} />
                  {product.diseaseIcon && <span>{product.diseaseIcon}</span>}
                  {product.diseaseName}
                </div>
              )}

              {/* Name */}
              <h2 className="text-xl font-bold text-foreground leading-snug mb-4">
                {product.name}
              </h2>

              {/* Price */}
              {product.price && (
                <div className="text-2xl font-bold text-primary mb-4">
                  {product.price}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  {product.clicks.toLocaleString()} نقرة
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleBuy}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 text-base"
              >
                <ShoppingCart size={18} />
                عرض المنتج
              </button>
              <button
                onClick={handleBuy}
                className="w-full border border-border hover:bg-muted text-foreground font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <ExternalLink size={15} />
                فتح صفحة المنتج
              </button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="border-t border-border p-6">
          <RelatedProducts
            diseaseId={product.diseaseId}
            excludeId={product.id}
            onQuickView={(_p: ProductItem) => {
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
