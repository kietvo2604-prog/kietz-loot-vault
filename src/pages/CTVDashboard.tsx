import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Plus, Package, Loader2, AlertCircle, ChevronDown, ChevronUp, Trash2, Eye, EyeOff, Search, Upload } from "lucide-react";
import ImagePasteUpload from "@/components/ImagePasteUpload";
import { useToast } from "@/hooks/use-toast";

type CTVAssignment = {
  id: string;
  email: string;
  assigned_categories: string[];
  is_active: boolean;
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
};

type ProductAccount = {
  id: string;
  product_id: string;
  account_info: string;
  is_sold: boolean;
};

const CTVDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<CTVAssignment | null>(null);
  const [checking, setChecking] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Record<string, ProductAccount[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: 0, category: "", image_url: "" });
  const [accountLines, setAccountLines] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [addAccountsProductId, setAddAccountsProductId] = useState<string | null>(null);
  const [newAccountLines, setNewAccountLines] = useState("");
  const [addingAccounts, setAddingAccounts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/dang-nhap"); return; }

    supabase
      .from("ctv_assignments")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => {
        const match = data?.find(
          (d: any) => d.email?.toLowerCase() === user.email?.toLowerCase()
        );
        if (match) {
          setAssignment(match as CTVAssignment);
          setForm(f => ({ ...f, category: (match as CTVAssignment).assigned_categories[0] || "" }));
        }
        setChecking(false);
      });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!assignment) return;
    fetchProducts();
  }, [assignment]);

  const fetchProducts = async () => {
    if (!assignment) return;
    const { data } = await supabase
      .from("products")
      .select("*")
      .in("category", assignment.assigned_categories)
      .order("created_at", { ascending: false });
    setProducts((data as Product[]) || []);
  };

  const fetchAccounts = async (productId: string) => {
    const { data } = await supabase
      .from("product_accounts")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    setAccounts(prev => ({ ...prev, [productId]: (data as ProductAccount[]) || [] }));
  };

  const toggleExpand = (productId: string) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(productId);
      if (!accounts[productId]) fetchAccounts(productId);
    }
  };

  const maskPassword = (info: string) => {
    const parts = info.split(":");
    if (parts.length >= 2) {
      return parts[0] + ":" + "••••••••";
    }
    return info;
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !user) return;
    setSaving(true);

    const { data: newProduct, error } = await supabase.from("products").insert({
      name: form.name,
      description: form.description || null,
      price: form.price,
      category: form.category,
      image_url: form.image_url || null,
      status: "active",
      stock: 0,
    }).select().single();

    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    if (newProduct && accountLines.trim()) {
      const lines = accountLines.split("\n").filter(l => l.trim());
      if (lines.length > 0) {
        await supabase.from("product_accounts").insert(
          lines.map(line => ({ product_id: newProduct.id, account_info: line.trim() })) as any
        );
        await supabase.from("products").update({ stock: lines.length }).eq("id", newProduct.id);
      }
    }

    toast({ title: "✅ Đã thêm sản phẩm!" });
    setForm({ name: "", description: "", price: 0, category: assignment?.assigned_categories[0] || "", image_url: "" });
    setAccountLines("");
    setShowForm(false);
    setSaving(false);
    fetchProducts();
  };

  const handleAddAccounts = async (productId: string) => {
    if (!newAccountLines.trim()) return;
    setAddingAccounts(true);
    const lines = newAccountLines.split("\n").filter(l => l.trim());
    await supabase.from("product_accounts").insert(
      lines.map(line => ({ product_id: productId, account_info: line.trim() })) as any
    );
    const { count } = await supabase
      .from("product_accounts")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId)
      .eq("is_sold", false);
    await supabase.from("products").update({ stock: count || 0 }).eq("id", productId);

    toast({ title: `✅ Đã thêm ${lines.length} tài khoản!` });
    setNewAccountLines("");
    setAddAccountsProductId(null);
    setAddingAccounts(false);
    fetchAccounts(productId);
    fetchProducts();
  };

  const handleDeleteAccount = async (accountId: string, productId: string) => {
    if (!confirm("Xoá tài khoản này?")) return;
    await supabase.from("product_accounts").delete().eq("id", accountId);
    const { count } = await supabase
      .from("product_accounts")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId)
      .eq("is_sold", false);
    await supabase.from("products").update({ stock: count || 0 }).eq("id", productId);
    fetchAccounts(productId);
    fetchProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Xoá sản phẩm này?")) return;
    await supabase.from("product_accounts").delete().eq("product_id", productId);
    await supabase.from("products").delete().eq("id", productId);
    toast({ title: "✅ Đã xoá sản phẩm!" });
    fetchProducts();
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  if (authLoading || checking) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar /><Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Không có quyền truy cập</h2>
          <p className="text-muted-foreground mb-6">Bạn chưa được cấp quyền CTV. Liên hệ admin để được phân quyền.</p>
          <button onClick={() => navigate("/")} className="px-6 py-2.5 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold">
            Về trang chủ
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar /><Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-primary">QUẢN LÝ CTV</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Xin chào <span className="text-primary font-semibold">{user?.email}</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {assignment.assigned_categories.map(cat => (
                  <span key={cat} className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/30">{cat}</span>
                ))}
              </div>
            </div>
            <button onClick={() => { setShowForm(!showForm); }}
              className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity self-start">
              <Plus className="w-4 h-4" /> Thêm sản phẩm
            </button>
          </div>
        </div>

        {/* Add product form */}
        {showForm && (
          <div className="bg-card border border-border rounded-xl p-6 animate-slide-up space-y-4">
            <h2 className="font-bold text-foreground text-lg">Thêm sản phẩm mới</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Tên sản phẩm *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Acc Blox Fruits Max Level"
                  className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Danh mục *</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm">
                  {assignment.assigned_categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Giá (VNĐ) *</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
              </div>
              <div>
                <ImagePasteUpload
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                  label="Ảnh sản phẩm"
                  placeholder="Dán ảnh hoặc nhập link..."
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Mô tả</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                <Package className="w-4 h-4 inline mr-1" /> Tài khoản (mỗi dòng = 1 acc)
              </label>
              <textarea value={accountLines} onChange={e => setAccountLines(e.target.value)} rows={5}
                placeholder={"user1:pass1\nuser2:pass2"}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm resize-none font-mono" />
              <p className="text-xs text-muted-foreground mt-1">{accountLines.split("\n").filter(l => l.trim()).length} tài khoản</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.name || !form.category}
                className="px-6 py-2.5 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? "Đang thêm..." : "Thêm sản phẩm"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-semibold hover:bg-border transition-colors">Huỷ</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full bg-card border border-border rounded-lg py-2.5 pl-10 pr-4 text-foreground text-sm focus:outline-none focus:border-primary transition-all" />
          </div>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
            className="bg-card border border-border rounded-lg py-2.5 px-4 text-foreground text-sm focus:outline-none focus:border-primary">
            <option value="all">Tất cả danh mục</option>
            {assignment.assigned_categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Product list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-foreground w-8"></th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Sản phẩm</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Danh mục</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">Giá</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground">Kho</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">
                    {products.length === 0 ? "Chưa có sản phẩm. Bấm 'Thêm sản phẩm' để bắt đầu." : "Không tìm thấy sản phẩm."}
                  </td></tr>
                ) : filteredProducts.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    isExpanded={expandedProduct === product.id}
                    onToggle={() => toggleExpand(product.id)}
                    accounts={accounts[product.id] || []}
                    showPasswords={showPasswords}
                    onTogglePassword={(id) => setShowPasswords(p => ({ ...p, [id]: !p[id] }))}
                    onDeleteAccount={(accId) => handleDeleteAccount(accId, product.id)}
                    onDeleteProduct={() => handleDeleteProduct(product.id)}
                    maskPassword={maskPassword}
                    addAccountsProductId={addAccountsProductId}
                    onShowAddAccounts={() => { setAddAccountsProductId(product.id); setNewAccountLines(""); }}
                    newAccountLines={newAccountLines}
                    onNewAccountLinesChange={setNewAccountLines}
                    onAddAccounts={() => handleAddAccounts(product.id)}
                    addingAccounts={addingAccounts}
                    onCancelAddAccounts={() => setAddAccountsProductId(null)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

type ProductRowProps = {
  product: Product;
  isExpanded: boolean;
  onToggle: () => void;
  accounts: ProductAccount[];
  showPasswords: Record<string, boolean>;
  onTogglePassword: (id: string) => void;
  onDeleteAccount: (id: string) => void;
  maskPassword: (info: string) => string;
  addAccountsProductId: string | null;
  onShowAddAccounts: () => void;
  newAccountLines: string;
  onNewAccountLinesChange: (v: string) => void;
  onAddAccounts: () => void;
  addingAccounts: boolean;
  onCancelAddAccounts: () => void;
};

const ProductRow = ({
  product, isExpanded, onToggle, accounts, showPasswords,
  onTogglePassword, onDeleteAccount, maskPassword,
  addAccountsProductId, onShowAddAccounts, newAccountLines,
  onNewAccountLinesChange, onAddAccounts, addingAccounts, onCancelAddAccounts
}: ProductRowProps) => {
  const unsold = accounts.filter(a => !a.is_sold);
  const sold = accounts.filter(a => a.is_sold);

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {product.image_url && <img src={product.image_url} alt="" className="w-8 h-8 rounded object-contain bg-muted" />}
            <span className="font-medium text-foreground">{product.name}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/30">{product.category}</span>
        </td>
        <td className="px-4 py-3 text-right font-semibold text-foreground">{product.price.toLocaleString("vi-VN")}đ</td>
        <td className="px-4 py-3 text-center">
          <span className={`font-bold ${product.stock > 0 ? "text-primary" : "text-destructive"}`}>{product.stock}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${product.status === "active" ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}>
            {product.status === "active" ? "Đang bán" : "Ẩn"}
          </span>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-muted/20">
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); onShowAddAccounts(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 gradient-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90">
                  <Upload className="w-3.5 h-3.5" /> Thêm tài khoản
                </button>
                <span className="text-xs text-muted-foreground">
                  Còn {unsold.length} chưa bán • {sold.length} đã bán
                </span>
              </div>

              {/* Add accounts inline */}
              {addAccountsProductId === product.id && (
                <div className="bg-card border border-border rounded-lg p-4 space-y-3" onClick={e => e.stopPropagation()}>
                  <textarea value={newAccountLines} onChange={e => onNewAccountLinesChange(e.target.value)}
                    rows={4} placeholder="user1:pass1&#10;user2:pass2"
                    className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground text-sm resize-none font-mono focus:outline-none focus:border-primary" />
                  <div className="flex gap-2">
                    <button onClick={onAddAccounts} disabled={addingAccounts || !newAccountLines.trim()}
                      className="px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">
                      {addingAccounts ? "Đang thêm..." : `Thêm ${newAccountLines.split("\n").filter(l => l.trim()).length} acc`}
                    </button>
                    <button onClick={onCancelAddAccounts}
                      className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-semibold hover:bg-border">Huỷ</button>
                  </div>
                </div>
              )}

              {/* Account list */}
              {unsold.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground mb-2">Tài khoản chưa bán ({unsold.length})</p>
                  {unsold.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2 text-xs group">
                      <span className="font-mono text-foreground">
                        {showPasswords[acc.id] ? acc.account_info : maskPassword(acc.account_info)}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onTogglePassword(acc.id); }}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                          {showPasswords[acc.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteAccount(acc.id); }}
                          className="p-1.5 rounded hover:bg-muted text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sold.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Đã bán ({sold.length})</p>
                  {sold.slice(0, 5).map(acc => (
                    <div key={acc.id} className="flex items-center bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground line-through font-mono">
                      {maskPassword(acc.account_info)}
                    </div>
                  ))}
                  {sold.length > 5 && <p className="text-xs text-muted-foreground">... và {sold.length - 5} tài khoản khác</p>}
                </div>
              )}

              {accounts.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Chưa có tài khoản nào. Bấm "Thêm tài khoản" để bắt đầu.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default CTVDashboard;
