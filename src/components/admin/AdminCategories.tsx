import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, GripVertical, Search, ChevronDown, ChevronUp, Package } from "lucide-react";
import ImagePasteUpload from "@/components/ImagePasteUpload";

type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  image_url: string | null;
};

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryProducts, setCategoryProducts] = useState<Record<string, any[]>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("name", { ascending: true });
    setCategories((data as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const slug = newSlug.trim() || generateSlug(newName);
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;
    await supabase.from("categories").insert({
      name: newName.trim(),
      slug,
      sort_order: maxOrder + 1,
      image_url: newImageUrl.trim() || null,
    } as any);
    setNewName("");
    setNewSlug("");
    setNewImageUrl("");
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá danh mục này?")) return;
    await supabase.from("categories").delete().eq("id", id);
    fetchCategories();
  };

  const startEdit = (cat: Category) => {
    setEditing(cat);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditImageUrl(cat.image_url || "");
  };

  const handleUpdate = async () => {
    if (!editing || !editName.trim()) return;
    await supabase.from("categories").update({
      name: editName.trim(),
      slug: editSlug.trim() || generateSlug(editName),
      image_url: editImageUrl.trim() || null,
    }).eq("id", editing.id);
    setEditing(null);
    fetchCategories();
  };

  const toggleCategoryProducts = async (categoryName: string) => {
    if (expandedCategory === categoryName) {
      setExpandedCategory(null);
      return;
    }
    setExpandedCategory(categoryName);
    if (!categoryProducts[categoryName]) {
      setLoadingProducts(true);
      const { data } = await supabase.from("products").select("id, name, price, stock, status").eq("category", categoryName).order("created_at", { ascending: false });
      setCategoryProducts(prev => ({ ...prev, [categoryName]: data || [] }));
      setLoadingProducts(false);
    }
  };

  const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-primary neon-text">QUẢN LÝ DANH MỤC</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm tên danh mục..."
          className="w-full bg-muted border border-border rounded-lg py-2 pl-9 pr-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
      </div>

      {/* Add form */}
      <div className="bg-card border border-border rounded-xl p-4 neon-card space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground mb-1 block">Tên danh mục</label>
            <input
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNewSlug(generateSlug(e.target.value)); }}
              placeholder="VD: Max Level"
              className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm"
            />
          </div>
          <div className="w-40">
            <label className="text-sm font-medium text-foreground mb-1 block">Slug</label>
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="maxlevel"
              className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm font-mono"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <ImagePasteUpload
              value={newImageUrl}
              onChange={setNewImageUrl}
              label="Ảnh danh mục"
              placeholder="Dán ảnh hoặc nhập link..."
            />
          </div>
          <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Thêm
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden neon-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-foreground">Thứ tự</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Ảnh</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Tên</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Slug</th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">Sản phẩm</th>
              <th className="text-right px-4 py-3 font-semibold text-foreground">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
            ) : filteredCategories.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">{searchQuery ? "Không tìm thấy danh mục" : "Chưa có danh mục"}</td></tr>
            ) : filteredCategories.map((c) => (
              <React.Fragment key={c.id}>
                <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4" />
                      {c.sort_order}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editing?.id === c.id ? (
                      <div className="min-w-[220px]">
                        <ImagePasteUpload
                          value={editImageUrl}
                          onChange={setEditImageUrl}
                          placeholder="Dán ảnh hoặc nhập link..."
                        />
                      </div>
                    ) : c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">
                    {editing?.id === c.id ? (
                      <input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="bg-muted border border-border rounded px-2 py-1 text-sm w-full" />
                    ) : c.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {editing?.id === c.id ? (
                      <input value={editSlug} onChange={(e) => setEditSlug(e.target.value)}
                        className="bg-muted border border-border rounded px-2 py-1 text-sm w-full font-mono" />
                    ) : c.slug}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleCategoryProducts(c.name)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Package className="w-3.5 h-3.5" />
                      <span>Xem SP</span>
                      {expandedCategory === c.name ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing?.id === c.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={handleUpdate} className="px-3 py-1.5 gradient-primary text-primary-foreground rounded text-xs font-semibold">Lưu</button>
                        <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-muted text-muted-foreground rounded text-xs">Huỷ</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(c)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {expandedCategory === c.name && (
                  <tr>
                    <td colSpan={6} className="bg-muted/20 px-4 py-3">
                      {loadingProducts ? (
                        <p className="text-xs text-muted-foreground">Đang tải sản phẩm...</p>
                      ) : !categoryProducts[c.name] || categoryProducts[c.name].length === 0 ? (
                        <p className="text-xs text-muted-foreground">Chưa có sản phẩm nào trong danh mục này.</p>
                      ) : (
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          <p className="text-xs font-bold text-foreground mb-2">
                            <Package className="w-3.5 h-3.5 inline mr-1 text-primary" />
                            {categoryProducts[c.name].length} sản phẩm
                          </p>
                          {categoryProducts[c.name].map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                              <span className="text-sm text-foreground font-medium truncate">{p.name}</span>
                              <div className="flex items-center gap-3 shrink-0 text-xs">
                                <span className="font-mono text-primary font-bold">{formatVND(p.price)}</span>
                                <span className={p.stock === 0 ? "text-destructive font-bold" : "text-muted-foreground"}>
                                  {p.stock === 0 ? "Hết hàng" : `Kho: ${p.stock}`}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${p.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                  {p.status === 'active' ? 'Đang bán' : 'Ẩn'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCategories;
