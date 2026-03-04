import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { ProductItem } from "./ProductCard";

interface RelatedProductsProps {
  diseaseId: number;
  excludeId: number;
  onQuickView: (product: ProductItem) => void;
}

export default function RelatedProducts({ diseaseId, excludeId, onQuickView }: RelatedProductsProps) {
  const { data: related, isLoading } = trpc.products.related.useQuery(
    { diseaseId, excludeId, limit: 4 },
    { enabled: !!diseaseId }
  );
  const trackClick = trpc.products.trackClick.useMutation();

  if (isLoading) {
    return (
      <div>
        <h3 className="font-bold text-foreground mb-4">منتجات مشابهة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!related || related.length === 0) return null;

  return (
    <div>
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-primary rounded-full inline-block" />
        منتجات مشابهة
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {related.map((product) => {
          const p = product as ProductItem;
          return (
            <div
              key={p.id}
              className="bg-muted rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onQuickView(p)}
            >
              <div className="aspect-square bg-accent overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-foreground line-clamp-2 mb-2">{p.name}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    trackClick.mutate({ id: p.id });
                    window.open(p.link, "_blank", "noopener,noreferrer");
                  }}
                  className="w-full bg-primary text-primary-foreground text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors"
                >
                  <ShoppingCart size={11} />
                  عرض المنتج
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
