import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Package, Eye, EyeOff, ChevronDown, ChevronUp, Search } from "lucide-react";
import ImagePasteUpload from "@/components/ImagePasteUpload";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string;
  status: string;
  image_url?: string | null;
};

type ProductAccount = {
  id: string;
  account_info: string;
  is_sold: boolean;
  created_at: string;
};

type Category = { id: string; name: string; slug: string };

const maskPassword = (info: string) => {
  // Format: user:pass or user:pass:extra
  const parts = info.split(":");
  if (parts.length >= 2) {
    return parts[0] + ":" + "••••••••" + (parts.length > 2 ? ":" + parts.slice(2).map(() => "••••").join(":") : "");
  }
  return info;
};

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: 0, category: "Blox Fruits", status: "active", image_url: "" });
  const [accountLines, setAccountLines] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [productAccounts, setProductAccounts] = useState<ProductAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      supabase.from("products").select("*").order("name", { ascending: true }),
      supabase.from("categories").select("*").order("name", { ascending: true }),
    ]);
    setProducts(prodRes.data || []);
    setCategories((catRes.data as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchAccounts = async (productId: string) => {
    setLoadingAccounts(true);
    const { data } = await supabase.from("product_accounts").select("*").eq("product_id", productId).order("created_at", { ascending: false });
    setProductAccounts((data as ProductAccount[]) || []);
    setLoadingAccounts(false);
  };

  const toggleExpand = async (productId: string) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      setProductAccounts([]);
    } else {
      setExpandedProduct(productId);
      await fetchAccounts(productId);
    }
  };

  const handleDeleteAccount = async (accountId: string, productId: string) => {
    if (!confirm("Xoá tài khoản này khỏi kho?")) return;
    await supabase.from("product_accounts").delete().eq("id", accountId);
    // Update stock
    const { count } = await supabase.from("product_accounts")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId).eq("is_sold", false);
    await supabase.from("products").update({ stock: count || 0 }).eq("id", productId);
    await fetchAccounts(productId);
    fetchData();
  };

  const resetForm = () => {
    setForm({ name: "", description: "", price: 0, category: categories[0]?.name || "Blox Fruits", status: "active", image_url: "" });
    setAccountLines("");
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name) return;
    if (editing) {
      await supabase.from("products").update({
        name: form.name, description: form.description, price: form.price,
        category: form.category, status: form.status, image_url: form.image_url || null,
      }).eq("id", editing.id);

      if (accountLines.trim()) {
        const lines = accountLines.split("\n").filter(l => l.trim());
        if (lines.length > 0) {
          await supabase.from("product_accounts").insert(
            lines.map(line => ({ product_id: editing.id, account_info: line.trim() }))
          );
          const { count } = await supabase.from("product_accounts")
            .select("*", { count: "exact", head: true })
            .eq("product_id", editing.id).eq("is_sold", false);
          await supabase.from("products").update({ stock: count || 0 }).eq("id", editing.id);
        }
      }
    } else {
      const { data: newProduct } = await supabase.from("products").insert({
        name: form.name, description: form.description, price: form.price,
        category: form.category, status: form.status, stock: 0, image_url: form.image_url || null,
      }).select().single();

      if (newProduct && accountLines.trim()) {
        const lines = accountLines.split("\n").filter(l => l.trim());
        if (lines.length > 0) {
          await supabase.from("product_accounts").insert(
            lines.map(line => ({ product_id: newProduct.id, account_info: line.trim() }))
          );
          await supabase.from("products").update({ stock: lines.length }).eq("id", newProduct.id);
        }
      }
    }
    resetForm();
    fetchData();
  };

  const handleEdit = (p: Product) => {
    setForm({ name: p.name, description: p.description || "", price: p.price, category: p.category, status: p.status, image_url: p.image_url || "" });
    setAccountLines("");
    setEditing(p);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá sản phẩm này?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchData();
  };

  const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-primary neon-text">QUẢN LÝ SẢN PHẨM</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Thêm sản phẩm
        </button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm tên sản phẩm..."
          className="w-full bg-muted border border-border rounded-lg py-2 pl-9 pr-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 neon-card animate-slide-up space-y-4">
          <h2 className="font-bold text-foreground">{editing ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tên sản phẩm</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Danh mục</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm">
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Giá (VNĐ)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Trạng thái</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm">
                <option value="active">Đang bán</option>
                <option value="inactive">Ẩn</option>
              </select>
            </div>
          </div>
          <ImagePasteUpload
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
            label="Ảnh sản phẩm"
            placeholder="Dán ảnh hoặc nhập link..."
          />
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Mô tả (mỗi dòng = 1 dòng mô tả)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6}
              placeholder="Dòng 1&#10;Dòng 2&#10;Dòng 3"
              className="w-full bg-muted border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-base leading-relaxed resize-y" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              <Package className="w-4 h-4 inline mr-1" /> Thêm tài khoản (mỗi dòng = 1 tài khoản riêng)
            </label>
            <textarea value={accountLines} onChange={(e) => setAccountLines(e.target.value)} rows={5}
              placeholder={"VD:\nuser1:pass1\nuser2:pass2\nuser3:pass3"}
              className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm resize-none font-mono" />
            <p className="text-xs text-muted-foreground mt-1">{accountLines.split("\n").filter(l => l.trim()).length} tài khoản sẽ được thêm vào kho</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-6 py-2.5 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              {editing ? "Cập nhật" : "Thêm"}
            </button>
            <button onClick={resetForm} className="px-6 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-semibold hover:bg-border transition-colors">Huỷ</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden neon-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Tên</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Danh mục</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Giá</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Kho</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
              ) : (() => {
                const filtered = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
                return filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{searchQuery ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm"}</td></tr>
              ) : filtered.map((p) => (
                <>
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium max-w-[250px] truncate">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3 text-primary font-mono font-bold">{formatVND(p.price)}</td>
                    <td className="px-4 py-3 text-foreground">
                      <span className={p.stock === 0 ? "text-destructive font-bold" : ""}>{p.stock === 0 ? "Hết hàng" : p.stock}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleExpand(p.id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Xem tài khoản">
                          {expandedProduct === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedProduct === p.id && (
                    <tr key={`${p.id}-accounts`}>
                      <td colSpan={5} className="bg-muted/20 px-4 py-3">
                        <div className="space-y-2">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" /> Danh sách tài khoản ({productAccounts.length})
                          </h4>
                          {loadingAccounts ? (
                            <p className="text-xs text-muted-foreground">Đang tải...</p>
                          ) : productAccounts.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Chưa có tài khoản nào.</p>
                          ) : (
                            <div className="max-h-60 overflow-y-auto space-y-1">
                              {productAccounts.map(acc => (
                                <div key={acc.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${acc.is_sold ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                                      {acc.is_sold ? "Đã bán" : "Còn"}
                                    </span>
                                    <span className="text-xs font-mono text-foreground truncate">
                                      {showPasswords[acc.id] ? acc.account_info : maskPassword(acc.account_info)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => setShowPasswords(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground" title="Hiện/ẩn mật khẩu">
                                      {showPasswords[acc.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    {!acc.is_sold && (
                                      <button onClick={() => handleDeleteAccount(acc.id, p.id)}
                                        className="p-1 rounded hover:bg-muted transition-colors text-destructive" title="Xoá">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
