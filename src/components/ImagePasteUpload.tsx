import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Image, Upload, X, Loader2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  label?: string;
};

const ImagePasteUpload = ({ value, onChange, placeholder = "Dán ảnh hoặc nhập link...", label = "Ảnh" }: Props) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("images").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
      onChange(urlData.publicUrl);
    } catch (e: Error | unknown) {
      if (e instanceof Error) {
        console.error("Upload error:", e.message);
      } else {
        console.error("Upload error:", e);
      }
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await uploadFile(file);
        return;
      }
    }
  }, [uploadFile]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    e.target.value = "";
  }, [uploadFile]);

  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1.5">
          <Image className="w-4 h-4 text-muted-foreground" /> {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 pr-10 text-foreground focus:outline-none focus:border-primary transition-all text-sm"
          />
          {uploading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="p-2.5 bg-muted border border-border rounded-lg hover:bg-accent transition-colors shrink-0"
          title="Tải ảnh lên"
        >
          <Upload className="w-4 h-4 text-muted-foreground" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        {value && (
          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted shrink-0 group">
            <img src={value} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagePasteUpload;
