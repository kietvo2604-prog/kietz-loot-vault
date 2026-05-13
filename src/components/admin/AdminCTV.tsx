import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, UserPlus } from "lucide-react";

type CTVAssignment = {
  id: string;
  email: string;
  user_id: string | null;
  assigned_categories: string[];
  is_active: boolean;
  created_at: string;
};

type Category = { id: string; name: string; slug: string };

const AdminCTV = () => {
  const [ctvs, setCtvs] = useState<CTVAssignment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CTVAssignment | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formCategories, setFormCategories] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const [ctvRes, catRes] = await Promise.all([
      supabase.from("ctv_assignments").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    setCtvs((ctvRes.data as CTVAssignment[]) || []);
    setCategories((catRes.data as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setFormEmail("");
    setFormCategories([]);
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formEmail.trim() || formCategories.length === 0) return;
    const payload = {
      email: formEmail.trim().toLowerCase(),
      assigned_categories: formCategories,
      is_active: true,
    };
    if (editing) {
      await supabase.from("ctv_assignments").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("ctv_assignments").insert(payload);
    }
    resetForm();
    fetchData();
  };

  const handleEdit = (c: CTVAssignment) => {
    setFormEmail(c.email);
    setFormCategories(c.assigned_categories);
    setEditing(c);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá CTV này?")) return;
    await supabase.from("ctv_assignments").delete().eq("id", id);
    fetchData();
  };

  const toggleCategory = (catName: string) => {
    setFormCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-primary neon-text">CẤP QUYỀN CTV</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
          <UserPlus className="w-4 h-4" /> Thêm CTV
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 neon-card animate-slide-up space-y-4">
          <h2 className="font-bold text-foreground">{editing ? "Sửa CTV" : "Thêm Cộng tác viên"}</h2>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Email CTV</label>
            <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Danh mục được phép đăng sản phẩm</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    formCategories.includes(cat.name)
                      ? "gradient-primary text-primary-foreground border-transparent"
                      : "bg-muted text-muted-foreground border-border hover:border-primary"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {categories.length === 0 && <p className="text-xs text-muted-foreground">Chưa có danh mục. Hãy tạo danh mục trước.</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!formEmail.trim() || formCategories.length === 0}
              className="px-6 py-2.5 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
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
                <th className="text-left px-4 py-3 font-semibold text-foreground">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Danh mục</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Trạng thái</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
              ) : ctvs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Chưa có CTV</td></tr>
              ) : ctvs.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">{c.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.assigned_categories.map(cat => (
                        <span key={cat} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/30">{cat}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.is_active ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}>
                      {c.is_active ? "Hoạt động" : "Tắt"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(c)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCTV;
