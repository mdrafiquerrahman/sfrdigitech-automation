import React, { useState } from "react";
import { 
  FileImage, 
  Trash2, 
  UploadCloud, 
  Plus, 
  FileVideo, 
  Info,
  Layers,
  Sparkles,
  CheckCircle
} from "lucide-react";
import { MediaAsset } from "../types";

interface MediaLibraryProps {
  media: MediaAsset[];
  onUploadSuccess: () => void;
}

export default function MediaLibrary({ media, onUploadSuccess }: MediaLibraryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMessage("");

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";

      try {
        const res = await fetch("/api/upload-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            url: dataUrl,
            type: file.type.startsWith("video") ? "video" : "image",
            size: sizeStr
          })
        });

        if (res.ok) {
          onUploadSuccess();
        } else {
          setErrorMessage("Failed to upload file to backend.");
        }
      } catch (err) {
        setErrorMessage("Network error uploading file.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAsset = async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
      return;
    }
    try {
      const res = await fetch(`/api/media-library/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirmId(null);
        onUploadSuccess();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Title */}
      <div className="border-b border-[#27272a] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Cloud Media Library</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Upload, monitor, and choose stored stock assets securely.</p>
        </div>

        {/* Upload Button */}
        <div className="relative">
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            disabled={isUploading}
          />
          <button
            type="button"
            className="px-4 py-2 bg-gradient-to-tr from-[#833AB4] via-[#E1306C] to-[#F77737] hover:opacity-95 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud size={14} />
                <span>Upload Asset</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-950/20 border border-rose-900/30 rounded-xl text-rose-450 text-[11px] font-mono">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Grid view of media items */}
      {media.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#27272a] rounded-xl bg-[#09090b]/10">
          <FileImage className="mx-auto text-zinc-650 mb-3" size={32} />
          <span className="text-xs text-zinc-500 font-mono block">No assets uploaded yet in your SaaS workspace.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((asset) => {
            const IsVideo = asset.type === "video" || (asset.url && (asset.url.startsWith("data:video/") || asset.url.endsWith(".mp4")));
            return (
              <div
                key={asset.id}
                className="group relative aspect-square bg-[#09090b] border border-[#27272a] hover:border-zinc-700 rounded-xl overflow-hidden shadow-sm transition flex flex-col justify-end"
              >
                {/* Media representation */}
                {IsVideo ? (
                  <video 
                    src={asset.url} 
                    className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    muted
                    playsInline
                  />
                ) : (
                  <img 
                    src={asset.url} 
                    alt={asset.name} 
                    className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60";
                    }}
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition" />

                {/* Badges top strip */}
                <div className="absolute top-2 inset-x-2 flex justify-between items-center transition z-10">
                  <span className="px-1.5 py-0.5 bg-black/75 border border-zinc-800 text-[8px] font-mono text-zinc-300 rounded font-bold uppercase">
                    {asset.type}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteAsset(asset.id);
                    }}
                    className={`p-1.5 rounded-md border transition cursor-pointer ${
                      deleteConfirmId === asset.id
                        ? "bg-rose-600 text-white border-rose-500 animate-pulse scale-105"
                        : "bg-black/85 hover:bg-rose-600 text-rose-450 border-zinc-800"
                    }`}
                    title={deleteConfirmId === asset.id ? "Click again to confirm delete!" : "Delete permanently"}
                  >
                    {deleteConfirmId === asset.id ? <CheckCircle size={13} /> : <Trash2 size={13} />}
                  </button>
                </div>

                {/* Metadata overlay footer */}
                <div className="relative z-10 p-3 text-[9px] font-mono text-zinc-400 space-y-0.5">
                  <p className="text-white font-bold truncate text-[10px] uppercase tracking-wide pr-4" title={asset.name}>
                    {asset.name}
                  </p>
                  <div className="flex justify-between items-center text-[8px] opacity-80">
                    <span>{asset.size}</span>
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Cloud Storage specification advice */}
      <div className="p-4 bg-[#09090b]/50 border border-[#27272a] rounded-xl flex items-start space-x-3">
        <Info className="text-zinc-500 shrink-0 mt-0.5" size={15} />
        <div className="text-[10px] font-mono text-zinc-400 leading-normal">
          <strong className="text-zinc-300 block uppercase mb-1">📦 Storage Infrastructure Specs:</strong>
          In this local development sandbox environment, files are ingested as Base64 data URLs for seamless instant storage. In your deployed production environment, the Next.js router stores media streams inside a secure PostgreSQL BLOB or provisions secure AWS S3 buckets automatically.
        </div>
      </div>

    </div>
  );
}
