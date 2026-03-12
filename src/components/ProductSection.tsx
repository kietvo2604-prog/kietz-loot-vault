import { Swords } from "lucide-react";
import ProductCard from "./ProductCard";

interface Product {
  id?: string;
  name: string;
  price: string;
  numericPrice?: number;
  stock: number;
  description: string;
  category: string;
  imageUrl?: string;
}

interface ProductSectionProps {
  title: string;
  products: Product[];
}

const ProductSection = ({ title, products }: ProductSectionProps) => {
  return (
    <div>
      <div className="gradient-primary rounded-xl px-5 py-3 flex items-center gap-3 mb-4">
        <Swords className="w-5 h-5 text-primary-foreground" />
        <h2 className="font-display text-lg font-bold text-primary-foreground tracking-wide">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product, i) => (
          <ProductCard key={product.id || i} {...product} />
        ))}
      </div>
    </div>
  );
};

export default ProductSection;
