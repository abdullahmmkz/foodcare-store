import { useState } from "react";
import { X, ShoppingCart, TrendingUp, Tag, ExternalLink, Package } from "lucide-react";
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
      <div className="absolute inset-0 backdrop-blur-sm" style={{ backgroundColor: 'rgba(20,20,19,0.7)' }} />

      {/* Modal */}
      <div
        className="relative rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in-up"
        style={{ backgroundColor: '#faf9f5', border: '1px solid #e8e6dc' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 rounded-full p-2 shadow-md transition-all hover:scale-110"
          style={{ backgroundColor: '#ffffff', color: '#141413' }}
        >
          <X size={18} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative rounded-t-3xl md:rounded-r-3xl md:rounded-tl-none overflow-hidden aspect-square md:aspect-auto md:min-h-[320px]" style={{ backgroundColor: '#e8e6dc' }}>
            {imgError ? (
              <div className="w-full h-full flex items-center justify-center min-h-[280px]" style={{ backgroundColor: '#e8e6dc' }}>
                <Package size={48} style={{ color: '#b0aea5' }} />
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
              <div className="absolute top-3 right-3 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ backgroundColor: '#d97757', color: '#faf9f5' }}>
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
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-4" style={{ backgroundColor: 'rgba(120,140,93,0.12)', color: '#788c5d' }}>
                  <Tag size={12} />
                  {product.diseaseIcon && <span>{product.diseaseIcon}</span>}
                  {product.diseaseName}
                </div>
              )}

              {/* Name */}
              <h2 className="font-heading text-xl font-bold leading-snug mb-4" style={{ color: '#141413' }}>
                {product.name}
              </h2>

              {/* Price */}
              {product.price && (
                <div className="text-2xl font-bold mb-4" style={{ color: '#788c5d' }}>
                  {product.price}
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div className="text-sm leading-relaxed mb-5 rounded-xl p-4" style={{ color: '#141413', backgroundColor: '#e8e6dc', border: '1px solid #d4d2c8' }}>
                  {product.description}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm mb-6" style={{ color: '#b0aea5' }}>
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
                className="w-full font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 text-base"
                style={{ backgroundColor: '#141413', color: '#faf9f5' }}
              >
                <ShoppingCart size={18} />
                عرض المنتج
              </button>
              <button
                onClick={handleBuy}
                className="w-full font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                style={{ border: '1px solid #e8e6dc', color: '#141413', backgroundColor: 'transparent' }}
              >
                <ExternalLink size={15} />
                فتح صفحة المنتج
              </button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="p-6" style={{ borderTop: '1px solid #e8e6dc' }}>
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
