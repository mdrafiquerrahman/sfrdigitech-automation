import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight, Play, Music, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScheduledPost } from "../types";

interface InstagramPreviewProps {
  post: {
    type?: "photo" | "carousel" | "reel";
    caption?: string;
    media?: string[];
    mediaUrls?: string[];
  };
  username?: string;
}

export default function InstagramPreview({ post, username = "instagram_creator" }: InstagramPreviewProps) {
  const { type = "photo", caption = "", media = [], mediaUrls = [] } = post;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  const mockImages = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1618005198143-d3668b3f4185?w=800&auto=format&fit=crop&q=80"
  ];

  const activeMedia = media.length > 0 ? media : (mediaUrls.length > 0 ? mediaUrls : mockImages);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % activeMedia.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + activeMedia.length) % activeMedia.length);
  };

  const formattedCaption = caption || "Your caption will appear here. Use the AI Copilot to generate high-converting, hashtag-rich social media text! ✨";

  // Render standard Feed post (Photo or Carousel)
  const renderFeedPost = () => (
    <div className="bg-white text-gray-900 border border-gray-100 rounded-2xl overflow-hidden shadow-sm max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
              <img
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold hover:underline cursor-pointer">{username}</div>
            <div className="text-[10px] text-gray-400">Sponsored / Original</div>
          </div>
        </div>
        <button className="text-gray-500 hover:text-black transition">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Main Media Block */}
      <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden group">
        <AnimatePresence mode="wait">
          {(() => {
            const mediaUrl = activeMedia[currentSlide] || "";
            const isVideo = mediaUrl.startsWith("data:video/") || mediaUrl.endsWith(".mp4") || type === "reel";
            if (isVideo) {
              return (
                <motion.video
                  key={currentSlide}
                  src={mediaUrl}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full object-cover animate-fade-in"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              );
            }
            return (
              <motion.img
                key={currentSlide}
                src={mediaUrl}
                alt={`Post content ${currentSlide + 1}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
                }}
              />
            );
          })()}
        </AnimatePresence>

        {/* Carousel Slide Indicators */}
        {type === "carousel" && activeMedia.length > 1 && (
          <>
            <button
              onClick={handlePrevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md text-gray-800 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md text-gray-800 transition"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute top-3 right-3 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
              {currentSlide + 1}/{activeMedia.length}
            </div>
          </>
        )}
      </div>

      {/* Actions Row */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex space-x-4">
            <button onClick={() => setIsLiked(!isLiked)} className="transition hover:scale-110">
              <Heart
                size={22}
                className={isLiked ? "text-red-500 fill-red-500 animate-ping-once" : "text-gray-700 hover:text-red-500"}
              />
            </button>
            <button className="text-gray-700 hover:text-black transition hover:scale-110">
              <MessageCircle size={22} />
            </button>
            <button className="text-gray-700 hover:text-black transition hover:scale-110">
              <Send size={22} />
            </button>
          </div>
          <button className="text-gray-700 hover:text-black transition hover:scale-110">
            <Bookmark size={22} />
          </button>
        </div>

        {/* Likes */}
        <div className="text-xs font-semibold mb-1 text-gray-900">
          {isLiked ? "1,241 likes" : "1,240 likes"}
        </div>

        {/* Caption */}
        <div className="text-xs text-gray-800 leading-relaxed">
          <span className="font-semibold mr-1.5">{username}</span>
          <span className="whitespace-pre-line">{formattedCaption}</span>
        </div>

        {/* Carousel indicators (Dots) */}
        {type === "carousel" && activeMedia.length > 1 && (
          <div className="flex justify-center space-x-1 mt-3">
            {activeMedia.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? "w-3 bg-blue-500" : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>
        )}

        <div className="text-[9px] text-gray-400 mt-2 uppercase tracking-wider">
          Just now
        </div>
      </div>
    </div>
  );

  // Render Reel Post
  const renderReelPost = () => (
    <div className="relative bg-black text-white border border-gray-900 rounded-2xl overflow-hidden shadow-xl max-w-sm mx-auto aspect-[9/16] flex flex-col justify-between">
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {(() => {
          const mediaUrl = activeMedia[0] || "";
          const isVideo = mediaUrl.startsWith("data:video/") || mediaUrl.endsWith(".mp4");
          if (isVideo) {
            return (
              <video 
                src={mediaUrl} 
                className="w-full h-full object-cover brightness-[0.75]"
                autoPlay
                muted
                loop
                playsInline
              />
            );
          }
          return (
            <img
              src={mediaUrl}
              alt="Reel content"
              className="w-full h-full object-cover brightness-[0.75]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
              }}
            />
          );
        })()}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between p-4 mt-1">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold tracking-tight">Reels</span>
        </div>
        <div className="flex items-center space-x-3">
          <Volume2 size={18} className="text-white hover:opacity-80 cursor-pointer" />
        </div>
      </div>

      {/* Play Overlay Button */}
      <div
        className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {!isPlaying && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"
          >
            <Play size={24} className="text-white fill-white ml-1" />
          </motion.div>
        )}
      </div>

      {/* Sidebar Utilities */}
      <div className="absolute right-4 bottom-28 z-10 flex flex-col items-center space-y-5 text-center">
        <div className="flex flex-col items-center group cursor-pointer" onClick={() => setIsLiked(!isLiked)}>
          <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition mb-1">
            <Heart size={20} className={isLiked ? "text-red-500 fill-red-500" : "text-white"} />
          </div>
          <span className="text-[10px] text-gray-200">92.4K</span>
        </div>

        <div className="flex flex-col items-center cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition mb-1">
            <MessageCircle size={20} className="text-white" />
          </div>
          <span className="text-[10px] text-gray-200">1.8K</span>
        </div>

        <div className="flex flex-col items-center cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition mb-1">
            <Send size={18} className="text-white" />
          </div>
          <span className="text-[10px] text-gray-200">Share</span>
        </div>

        <div className="flex flex-col items-center cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition mb-1">
            <Bookmark size={20} className="text-white" />
          </div>
          <span className="text-[10px] text-gray-200">Save</span>
        </div>
      </div>

      {/* Bottom Content overlay */}
      <div className="relative z-10 p-4 mt-auto">
        {/* Creator Info */}
        <div className="flex items-center space-x-3 mb-3">
          <img
            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
            alt="Avatar"
            className="w-8 h-8 rounded-full border border-white/20"
          />
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold">{username}</span>
            <span className="px-1.5 py-0.5 text-[8px] bg-white/20 rounded font-medium border border-white/10">
              Follow
            </span>
          </div>
        </div>

        {/* Caption */}
        <p className="text-xs text-gray-100 line-clamp-2 leading-relaxed mb-3 pr-12">
          {formattedCaption}
        </p>

        {/* Music Track audio indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 bg-black/40 px-2 py-1 rounded-full border border-white/10 text-[10px] max-w-[180px]">
            <Music size={12} className="animate-spin-slow" />
            <span className="truncate">{username} • Original Audio</span>
          </div>
          {/* Audio Disc graphic */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-800 to-gray-600 border border-white/20 p-1 flex items-center justify-center animate-spin-slow">
            <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div id="ig-preview-container" className="flex flex-col items-center">
      <div className="text-xs text-gray-400 font-mono mb-2 flex items-center space-x-1">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>Instagram App Simulator</span>
      </div>
      <div className="w-full max-w-[340px] select-none">
        {type === "reel" ? renderReelPost() : renderFeedPost()}
      </div>
    </div>
  );
}
