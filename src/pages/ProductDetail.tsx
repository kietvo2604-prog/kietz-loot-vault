import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Package, ShoppingCart, Loader2, AlertCircle, Clock, Pencil, Save, X, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PurchaseConfirmDialog from "@/components/PurchaseConfirmDialog";

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const IMAGE_URL_REGEX = /https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?/gi;

const DescriptionWithImages = ({ text }: { text: string }) => {
  const parts = text.split(IMAGE_URL_REGEX);
  const images = text.match(IMAGE_URL_REGEX) || [];
  
  return (
    <div className="text-sm text-foreground space-y-2">
      {parts.map((part, i) => (
        <span key={i}>
          {part.split('\n').map((line, j) => (
            <span key={j}>{j > 0 && <br />}{line}</span>
          ))}
          {images[i] && (
            <a href={images[i]} target="_blank" rel="noopener noreferrer" className="block my-2">
              <img src={images[i]} alt="Ảnh sản phẩm" className="max-w-full rounded-lg border border-border max-h-64 object-contain" />
            </a>
          )}
        </span>
      ))}
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const { data } = await supabase.from("products").select("*").eq("id", id!).single();
      setProduct(data);
      if (data) setEditForm(data);
      setLoading(false);
    };
    if (id) fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin")
      .then(({ data }) => { if (data && data.length > 0) setIsAdmin(true); });
  }, [user]);

  const handleSaveEdit = async () => {
    setSaving(true);
    const { error } = await supabase.from("products").update({
      name: editForm.name,
      description: editForm.description,
      price: editForm.price,
      stock: editForm.stock,
      category: editForm.category,
      account_info: editForm.account_info,
    }).eq("id", product.id);
    setSaving(false);
    if (error) {
      toast({ title: "Lỗi", description: "Không thể cập nhật sản phẩm.", variant: "destructive" });
    } else {
      setProduct({ ...product, ...editForm });
      setEditing(false);
      toast({ title: "✅ Đã cập nhật sản phẩm!" });
    }
  };

  const handleBuy = async (quantity: number = 1, discountCode?: string) => {
    if (!user) {
      toast({ title: "Vui lòng đăng nhập", variant: "destructive" });
      return;
    }
    setBuying(true);

    const { data, error } = await supabase.rpc("purchase_product_batch", {
      p_user_id: user.id,
      p_product_id: product.id,
      p_quantity: quantity,
      p_discount_code: discountCode || null,
    } as any);

    if (error) {
      setBuying(false);
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
      return;
    }

    const result = data as any;
    if (!result.success) {
      setBuying(false);
      toast({ title: "❌ " + result.error, variant: "destructive" });
      return;
    }

    setBuying(false);
    toast({ title: "✅ Mua hàng thành công!", description: `Mã đơn: ${result.order_code}` });
    window.location.href = `/don-hang/${result.order_id}`;
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar /><Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Không tìm thấy sản phẩm.</p>
          <Link to="/" className="inline-block px-6 py-3 gradient-primary text-primary-foreground font-semibold rounded-lg text-sm">Về trang chủ</Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar /><Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại cửa hàng
        </Link>

        <div className="bg-card border border-primary/20 rounded-xl overflow-hidden neon-card animate-slide-up">
          {/* Header */}
          <div className="gradient-primary px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-primary-foreground" />
              <span className="text-sm font-bold text-primary-foreground uppercase tracking-wider">{editing ? editForm.category : product.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary-foreground">Kho: {editing ? editForm.stock : product.stock}</span>
              {isAdmin && !editing && (
                <button onClick={() => setEditing(true)} className="ml-2 p-1.5 rounded-lg bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors">
                  <Pencil className="w-4 h-4 text-primary-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tên sản phẩm</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground text-sm focus:outline-none focus:border-primary transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Giá (VNĐ)</label>
                    <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                      className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground text-sm focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Kho hàng</label>
                    <input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                      className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground text-sm focus:outline-none focus:border-primary transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Danh mục</label>
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground text-sm focus:outline-none focus:border-primary transition-all">
                    {["Blox Fruits", "Random", "Robux", "Gamepass", "Khác"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Mô tả</label>
                  <textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (text && IMAGE_URL_REGEX.test(text)) {
                        e.preventDefault();
                        const textarea = e.target as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const current = editForm.description || "";
                        const newVal = current.substring(0, start) + text + current.substring(end);
                        setEditForm({ ...editForm, description: newVal });
                      }
                    }}
                    rows={3} className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground text-sm focus:outline-none focus:border-primary transition-all resize-none" />
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Nhập link ảnh (URL):");
                        if (url && url.trim()) {
                          const current = editForm.description || "";
                          setEditForm({ ...editForm, description: current + (current ? "\n" : "") + url.trim() });
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <ImagePlus className="w-3 h-3" /> Chèn link ảnh
                    </button>
                    <span className="text-xs text-muted-foreground">Paste link ảnh trực tiếp vào mô tả</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Thông tin tài khoản (Tk:Mk)</label>
                  <textarea value={editForm.account_info || ""} onChange={(e) => setEditForm({ ...editForm, account_info: e.target.value })}
                    rows={3} placeholder="VD: username:password" className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground text-sm font-mono focus:outline-none focus:border-primary transition-all resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                  <button onClick={() => { setEditing(false); setEditForm(product); }} className="px-5 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-semibold hover:bg-border transition-colors">
                    <X className="w-4 h-4 inline mr-1" /> Huỷ
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-xl font-bold text-foreground">{product.name}</h1>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Danh mục</span>
                    <span className="px-3 py-1 bg-muted rounded-lg text-xs font-semibold text-foreground">{product.category}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Giá</span>
                    <span className="font-display text-2xl font-bold text-neon-orange">{formatVND(product.price)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Tồn kho</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-muted-foreground" /> {product.stock} sản phẩm
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Trạng thái</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.stock > 0 ? "bg-primary/10 text-primary border border-primary/30" : "bg-destructive/10 text-destructive border border-destructive/30"}`}>
                      {product.stock > 0 ? "Còn hàng" : "Hết hàng"}
                    </span>
                  </div>
                  {product.created_at && (
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Ngày đăng</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(product.created_at).toLocaleString("vi-VN")}</span>
                    </div>
                  )}
                </div>

                {product.description && (
                  <div className="bg-muted border border-border rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Mô tả:</p>
                    <DescriptionWithImages text={product.description} />
                  </div>
                )}

                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={buying || product.stock <= 0}
                  className="w-full py-3 gradient-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.stock <= 0 ? "Hết hàng" : "Mua ngay"}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />

      <PurchaseConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        productName={product.name}
        price={formatVND(product.price)}
        numericPrice={product.price}
        stock={product.stock}
        onConfirm={(qty, code) => handleBuy(qty, code)}
        buying={buying}
      />
    </div>
  );
};

export default ProductDetail;
