import React, { useState, useEffect } from "react";
import { 
  Instagram, 
  Sparkles, 
  Layers, 
  Image as ImageIcon, 
  PlayCircle, 
  Calendar, 
  Clock, 
  Globe, 
  Plus, 
  Trash2, 
  UploadCloud,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckCircle
} from "lucide-react";
import { InstagramAccount, MediaAsset } from "../types";
import InstagramPreview from "./InstagramPreview";

interface PostComposerProps {
  accounts: InstagramAccount[];
  mediaLibrary: MediaAsset[];
  prefilledDate?: string;
  onPostScheduled: () => void;
  onDeleteAsset?: () => void;
}

export default function PostComposer({ accounts, mediaLibrary, prefilledDate, onPostScheduled, onDeleteAsset }: PostComposerProps) {
  // Post Details State
  const [selectedAccount, setSelectedAccount] = useState("");
  const [postType, setPostType] = useState<"photo" | "carousel" | "reel">("photo");
  const [caption, setCaption] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaAssetIds, setMediaAssetIds] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Date/Time State
  const [scheduleDate, setScheduleDate] = useState(prefilledDate || "2026-07-04");
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [selectedTimezone, setSelectedTimezone] = useState("UTC");

  // Gemini Caption Copilot States
  const [aiDescription, setAiDescription] = useState("");
  const [aiTone, setAiTone] = useState("creative");
  const [aiResults, setAiResults] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // System states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  useEffect(() => {
    if (prefilledDate) {
      setScheduleDate(prefilledDate);
    }
  }, [prefilledDate]);

  // Media selection helper from our saved library
  const handleSelectFromLibrary = (asset: MediaAsset) => {
    if (postType === "photo" || postType === "reel") {
      // Photo or Reel supports exactly 1 media asset
      setMediaUrls([asset.url]);
      setMediaAssetIds([asset.id]);
    } else {
      // Carousel supports up to 10
      if (mediaUrls.includes(asset.url)) return;
      if (mediaUrls.length >= 10) {
        setStatusMessage({ type: "error", text: "Carousel can hold a maximum of 10 images." });
        return;
      }
      setMediaUrls([...mediaUrls, asset.url]);
      setMediaAssetIds([...mediaAssetIds, asset.id]);
    }
  };

  const handleRemoveMedia = (idx: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== idx));
    setMediaAssetIds(mediaAssetIds.filter((_, i) => i !== idx));
  };

  // Base64 ingestion file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";

      try {
        // Post base64 payload to Server media-library endpoint
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
          const newAsset = await res.json();
          handleSelectFromLibrary(newAsset);
          setStatusMessage({ type: "success", text: `Successfully uploaded ${file.name} to SaaS media library!` });
        } else {
          setStatusMessage({ type: "error", text: "Failed to persist media asset on backend." });
        }
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Gemini Caption Assistant API
  const handleGenerateCaption = async () => {
    if (!aiDescription.trim()) {
      setAiError("Please type a short description or keyword topic first.");
      return;
    }
    setIsAiLoading(true);
    setAiError("");
    setAiResults(null);
    try {
      const res = await fetch("/api/gemini/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: aiDescription,
          tone: aiTone,
          type: postType
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiResults(data);
      } else {
        setAiError("Gemini is offline or API Key is missing from secrets configuration.");
      }
    } catch (err) {
      setAiError("Failed to fetch caption: Network error.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Submit Post Scheduing configuration
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!selectedAccount) {
      setStatusMessage({ type: "error", text: "Please select a connected Instagram Account." });
      return;
    }

    if (mediaUrls.length === 0) {
      setStatusMessage({ type: "error", text: "Please select or upload at least 1 media asset." });
      return;
    }

    if (!caption.trim()) {
      setStatusMessage({ type: "error", text: "Please fill in an engaging caption for the post." });
      return;
    }

    setIsSubmitting(true);

    const isoDateTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: postType,
          caption,
          mediaAssetIds,
          mediaUrls,
          scheduledFor: isoDateTime,
          instagramAccountId: selectedAccount,
          timezone: selectedTimezone
        })
      });

      if (res.ok) {
        setStatusMessage({ type: "success", text: "Post successfully integrated in Prisma scheduled_posts database!" });
        // Reset composer form state
        setCaption("");
        setMediaUrls([]);
        setMediaAssetIds([]);
        setAiDescription("");
        setAiResults(null);
        onPostScheduled();
      } else {
        const errData = await res.json();
        setStatusMessage({ type: "error", text: errData.error || "Post scheduling failed." });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to schedule: connection error." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUsername = accounts.find((a) => a.id === selectedAccount)?.username || "travel_escapes";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* Left Col: Composer form (Col-span 7) */}
      <div className="xl:col-span-7 bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-b border-[#27272a] pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Create Schedule</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Single, Carousel, and Reels Graph API automation publisher.</p>
          </div>
          <div className="flex items-center space-x-1.5 bg-blue-950/40 border border-[#1877F2]/40 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2] animate-pulse" />
            <span className="text-[8px] font-mono uppercase tracking-widest text-[#1877F2] font-black">API Simulator Mode</span>
          </div>
        </div>

        <div className="p-3.5 bg-blue-950/20 border border-[#1877F2]/20 text-zinc-300 rounded-xl space-y-1.5 text-[11px] leading-relaxed">
          <p className="text-blue-400 font-bold uppercase tracking-wider font-mono text-[10px] flex items-center space-x-1.5">
            <span>ℹ️ HIGH-FIDELITY SANDBOX SIMULATOR</span>
          </p>
          <p>
            This composer runs inside a <strong>local Sandbox Simulator</strong>. To protect privacy and bypass complex production Facebook/Instagram developer partner registration, <strong>no assets are published to real live Instagram profiles</strong>. When the scheduled release time arrives, the background scheduler daemon simulates the entire Graph API handshaking loop, media container builds, and posts logs locally.
          </p>
        </div>

        {statusMessage && (
          <div className={`p-4 rounded-xl flex items-start space-x-3 text-xs leading-relaxed ${
            statusMessage.type === "success" 
              ? "bg-emerald-950/20 border border-emerald-900/30 text-emerald-400" 
              : "bg-rose-950/20 border border-rose-900/30 text-rose-400"
          }`}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleScheduleSubmit} className="space-y-6">
          {/* 1. Account Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">1. Select Target Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] text-xs font-mono text-white rounded-xl p-3 focus:outline-none focus:border-[#E1306C] transition cursor-pointer"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  @{a.username} ({a.displayName})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Format Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">2. Select Post Format</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "photo", label: "Single Image", icon: ImageIcon },
                { id: "carousel", label: "Carousel Slider", icon: Layers },
                { id: "reel", label: "Instagram Reel", icon: PlayCircle }
              ].map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = postType === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      setPostType(fmt.id as any);
                      // Clear media arrays to enforce format boundaries on toggle
                      setMediaUrls([]);
                      setMediaAssetIds([]);
                    }}
                    className={`py-3 px-4 border rounded-xl flex flex-col items-center justify-center space-y-1.5 transition text-center cursor-pointer ${
                      isSelected
                        ? "border-[#E1306C] bg-[#E1306C]/5 text-white"
                        : "border-[#27272a] bg-[#09090b]/40 text-zinc-400 hover:border-[#3f3f46] hover:text-zinc-200"
                    }`}
                  >
                    <Icon size={16} className={isSelected ? "text-[#E1306C]" : ""} />
                    <span className="text-[9px] uppercase tracking-wider font-mono">{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Media Upload & Gallery picker */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">3. Select Media Files ({mediaUrls.length}/10)</label>
            
            {/* File Drag n drop */}
            <div className="relative border border-dashed border-[#27272a] bg-[#09090b]/20 hover:bg-[#09090b]/40 hover:border-zinc-700 transition rounded-xl p-5 text-center cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="mx-auto text-zinc-500 mb-2" size={28} />
              <div className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">Drag & Drop Media File</div>
              <p className="text-[9px] text-zinc-500 mt-1 uppercase font-mono">Support JPEG, PNG, MP4 up to 50MB &bull; click to browse</p>
            </div>

            {/* Selected items strip */}
            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-5 gap-2 pt-1">
                {mediaUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-[#27272a] group bg-black/50">
                    <img src={url} alt={`Selection ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleRemoveMedia(index);
                      }}
                      className="absolute top-1 right-1 p-1.5 bg-black/80 hover:bg-rose-600 text-rose-450 rounded-md transition cursor-pointer z-10"
                      title="Remove media"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] font-mono text-center text-zinc-300 py-0.5">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick-Pick saved library assets */}
            <div className="bg-[#09090b]/40 border border-[#27272a] rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-[9px] uppercase tracking-widest font-mono font-bold text-zinc-500">
                <span>Select from SaaS library:</span>
                <span className="text-[8px] opacity-85">Click to append / Hover to delete</span>
              </div>
              <div className="flex space-x-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {mediaLibrary.map((asset) => (
                  <div key={asset.id} className="relative group shrink-0 w-12 h-12">
                    <img
                      src={asset.url}
                      alt={asset.name}
                      onClick={() => handleSelectFromLibrary(asset)}
                      className="w-full h-full rounded-lg object-cover border border-[#27272a] hover:border-[#E1306C] cursor-pointer transition"
                      title={asset.name}
                    />
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (deleteConfirmId !== asset.id) {
                          setDeleteConfirmId(asset.id);
                          setTimeout(() => setDeleteConfirmId(prev => prev === asset.id ? null : prev), 3000);
                        } else {
                          try {
                            const res = await fetch(`/api/media-library/${asset.id}`, { method: "DELETE" });
                            if (res.ok) {
                              setDeleteConfirmId(null);
                              if (onDeleteAsset) {
                                onDeleteAsset();
                              }
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className={`absolute -top-1 -right-1 p-1 border rounded-md transition duration-150 cursor-pointer z-10 ${
                        deleteConfirmId === asset.id
                          ? "bg-rose-600 border-rose-500 text-white animate-pulse scale-105"
                          : "bg-black border-[#27272a] text-rose-500 hover:text-rose-450 hover:bg-zinc-900 opacity-0 group-hover:opacity-100"
                      }`}
                      title={deleteConfirmId === asset.id ? "Click again to confirm delete!" : "Delete from SaaS library permanently"}
                    >
                      {deleteConfirmId === asset.id ? <CheckCircle size={10} /> : <Trash2 size={10} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Caption Area */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">4. Write Caption</label>
              <span className="text-[9px] text-zinc-500 font-mono">{caption.length}/2200 limit</span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="Inject storytelling here... #YourHashtags #Launch"
              className="w-full bg-[#09090b] border border-[#27272a] text-xs font-mono text-white rounded-xl p-3.5 focus:outline-none focus:border-[#E1306C] transition resize-none"
            />
          </div>

          {/* 5. Date and Time Release Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Release Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] text-xs font-mono text-white rounded-xl p-3 focus:outline-none focus:border-[#E1306C]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Release Time</label>
              <div className="relative">
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] text-xs font-mono text-white rounded-xl p-3 focus:outline-none focus:border-[#E1306C]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Time Zone</label>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] text-xs font-mono text-white rounded-xl p-3 focus:outline-none focus:border-[#E1306C] cursor-pointer"
              >
                <option value="UTC">UTC (GMT+00:00)</option>
                <option value="Asia/Kolkata">IST / India (GMT+05:30)</option>
                <option value="America/New_York">EST / New York (GMT-05:00)</option>
                <option value="Europe/London">GMT / London (GMT+00:00)</option>
                <option value="Asia/Tokyo">JST / Tokyo (GMT+09:00)</option>
                <option value="Europe/Paris">CET / Paris (GMT+01:00)</option>
                <option value="America/Los_Angeles">PST / Los Angeles (GMT-08:00)</option>
                <option value="Asia/Singapore">SGT / Singapore (GMT+08:00)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#E1306C] hover:bg-opacity-95 text-white text-xs uppercase font-black tracking-widest rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Synchronising with database...</span>
              </>
            ) : (
              <>
                <Calendar size={15} />
                <span>Confirm Scheduled Release</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Col: Gemini Copilot & Live IG Simulator (Col-span 5) */}
      <div className="xl:col-span-5 space-y-6">
        
        {/* Gemini Copywrite Panel */}
        <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Gemini AI Copywriter</h3>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Generates 3 rich options, tags & virus-tips</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <textarea
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="What is your post about? (e.g. 5 productivity secrets for creators, launching a minimal travel setup)"
              className="w-full bg-[#09090b] border border-[#27272a] text-[11px] font-mono text-white rounded-lg p-3 focus:outline-none focus:border-violet-500 transition resize-none"
              rows={2}
            />

            <div className="flex items-center justify-between space-x-3">
              <div className="flex-1">
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] text-[10px] font-mono text-zinc-300 rounded-lg p-2 focus:outline-none cursor-pointer"
                >
                  <option value="creative">Creative storytelling</option>
                  <option value="professional">Professional B2B SaaS</option>
                  <option value="funny">Humorous & witty</option>
                  <option value="promotional">Launch Promo CTA</option>
                  <option value="educational">Informational Tutorial</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateCaption}
                disabled={isAiLoading}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 disabled:opacity-40 text-white font-bold text-[10px] uppercase tracking-wider font-mono rounded-lg transition shrink-0 cursor-pointer flex items-center space-x-1.5"
              >
                {isAiLoading ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>Generate</span>
              </button>
            </div>

            {aiError && (
              <p className="text-[10px] text-rose-450 font-mono mt-2 bg-rose-950/15 p-2 rounded-lg border border-rose-950/30">
                ⚠️ {aiError}
              </p>
            )}

            {/* AI Results variations Display */}
            {aiResults && (
              <div className="border-t border-[#27272a] pt-4 space-y-4 max-h-[350px] overflow-y-auto pr-1">
                <div className="space-y-3">
                  <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Choose caption option:</span>
                  
                  {aiResults.variations?.map((captionOpt: string, idx: number) => (
                    <div key={idx} className="p-3 bg-[#09090b]/50 border border-[#27272a] rounded-xl relative group">
                      <p className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">{captionOpt}</p>
                      <button
                        type="button"
                        onClick={() => setCaption(captionOpt)}
                        className="mt-2.5 text-[9px] text-violet-400 hover:text-white font-bold uppercase tracking-widest font-mono flex items-center space-x-1 cursor-pointer"
                      >
                        <FileText size={11} />
                        <span>Apply Caption</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Hashtags Strip */}
                {aiResults.hashtags && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Popular Hashtags:</span>
                    <div className="flex flex-wrap gap-1">
                      {aiResults.hashtags.map((tag: string, i: number) => (
                        <span
                          key={i}
                          onClick={() => setCaption(prev => prev.includes(tag) ? prev : prev + " " + tag)}
                          className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] font-mono rounded hover:bg-violet-950/20 hover:text-violet-300 cursor-pointer transition border border-transparent hover:border-violet-900/40"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optimal Time details */}
                {aiResults.optimalTime && (
                  <div className="p-3 bg-indigo-950/10 border border-indigo-900/30 rounded-xl">
                    <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">💡 Target Timing Suggestion:</span>
                    <p className="text-[10px] font-mono text-zinc-300 mt-1 leading-normal">{aiResults.optimalTime}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Instagram Preview Feed */}
        <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl">
          <InstagramPreview
            post={{
              type: postType,
              caption: caption,
              media: mediaUrls
            }}
            username={selectedUsername}
          />
        </div>

      </div>
    </div>
  );
}
