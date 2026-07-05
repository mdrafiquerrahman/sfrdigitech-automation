import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Image, Layers, PlayCircle, Eye } from "lucide-react";
import { ScheduledPost } from "../types";

interface CalendarViewProps {
  posts: ScheduledPost[];
  onSelectPost: (post: ScheduledPost) => void;
  onSelectDateToCreate: (dateStr: string) => void;
}

export default function CalendarView({ posts, onSelectPost, onSelectDateToCreate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 4)); // Anchored around current local sandbox date July 2026

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = [];
  const days = [];
  const nextMonthDays = [];

  // Padding days from previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Padding days for next month
  const totalCells = prevMonthDays.length + days.length;
  const remainingCells = 42 - totalCells; // 6 rows of 7 days
  for (let i = 1; i <= remainingCells; i++) {
    nextMonthDays.push(i);
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getPostsForDay = (dayNum: number, currentMonth: boolean, offsetMonth: number) => {
    const checkYear = offsetMonth === -1 ? prevYear : offsetMonth === 1 ? (month === 11 ? year + 1 : year) : year;
    const checkMonth = offsetMonth === -1 ? prevMonth : offsetMonth === 1 ? (month === 11 ? 0 : month + 1) : month;
    
    return posts.filter((p) => {
      const pDate = new Date(p.scheduledFor);
      return pDate.getFullYear() === checkYear && 
             pDate.getMonth() === checkMonth && 
             pDate.getDate() === dayNum;
    });
  };

  const handleDayClick = (dayNum: number, offsetMonth: number) => {
    const targetYear = offsetMonth === -1 ? prevYear : offsetMonth === 1 ? (month === 11 ? year + 1 : year) : year;
    const targetMonth = offsetMonth === -1 ? prevMonth : offsetMonth === 1 ? (month === 11 ? 0 : month + 1) : month;
    
    const formattedMonth = String(targetMonth + 1).padStart(2, "0");
    const formattedDay = String(dayNum).padStart(2, "0");
    const dateStr = `${targetYear}-${formattedMonth}-${formattedDay}`;
    onSelectDateToCreate(dateStr);
  };

  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl space-y-6">
      {/* Calendar Header */}
      <div className="flex justify-between items-center border-b border-[#27272a] pb-4">
        <div className="flex items-center space-x-2.5">
          <CalendarIcon size={18} className="text-[#E1306C]" />
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
              {monthNames[month]} {year}
            </h3>
            <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider font-mono">Visual Publication Grid</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 bg-[#1c1c20] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition border border-[#27272a] cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(2026, 6, 4))}
            className="px-3 py-1.5 bg-[#1c1c20] hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[9px] font-mono tracking-widest uppercase transition border border-[#27272a] cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 bg-[#1c1c20] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition border border-[#27272a] cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 bg-[#27272a]/20 p-0.5 rounded-xl border border-[#27272a]/60">
        {/* Render Previous Month Days */}
        {prevMonthDays.map((dayNum, idx) => {
          const dayPosts = getPostsForDay(dayNum, false, -1);
          return (
            <div
              key={`prev-${idx}`}
              onClick={() => handleDayClick(dayNum, -1)}
              className="min-h-[85px] bg-[#121214]/40 p-2 border border-[#27272a]/10 hover:bg-zinc-900/20 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[10px] text-zinc-650 font-mono font-bold">{dayNum}</span>
              <div className="space-y-1 mt-1">
                {dayPosts.slice(0, 2).map((post) => (
                  <div
                    key={post.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPost(post);
                    }}
                    className="p-1 text-[8px] rounded bg-zinc-800/40 border border-zinc-700/30 text-zinc-500 truncate"
                  >
                    @{post.instagramAccountUsername}: {post.caption}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Render Current Month Days */}
        {days.map((dayNum) => {
          const dayPosts = getPostsForDay(dayNum, true, 0);
          const isToday = dayNum === 4 && month === 6 && year === 2026; // Sandbox date July 4, 2026
          
          return (
            <div
              key={`curr-${dayNum}`}
              onClick={() => handleDayClick(dayNum, 0)}
              className={`min-h-[85px] p-2 border border-[#27272a]/30 hover:bg-[#1c1c20]/50 cursor-pointer transition flex flex-col justify-between ${
                isToday 
                  ? "bg-[#E1306C]/5 border-[#E1306C]/40 ring-1 ring-[#E1306C]/20" 
                  : "bg-[#121214]"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-mono font-bold ${isToday ? "text-[#E1306C]" : "text-zinc-400"}`}>
                  {dayNum}
                </span>
                {isToday && (
                  <span className="text-[7px] font-mono font-bold bg-[#E1306C] text-white px-1 rounded uppercase">Today</span>
                )}
              </div>

              {/* Day Posts List */}
              <div className="space-y-1 mt-1 flex-1 overflow-y-auto">
                {dayPosts.map((post) => {
                  const PostIcon = post.type === "photo" ? Image : post.type === "carousel" ? Layers : PlayCircle;
                  return (
                    <div
                      key={post.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPost(post);
                      }}
                      className={`p-1 rounded text-[8px] font-medium flex items-center justify-between border cursor-pointer transition ${
                        post.status === "completed" 
                          ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400 hover:bg-emerald-950/40" 
                          : post.status === "failed"
                          ? "bg-rose-950/20 border-rose-900/30 text-rose-400 hover:bg-rose-950/40"
                          : "bg-amber-950/20 border-amber-900/30 text-amber-400 hover:bg-amber-950/40"
                      }`}
                      title={`@${post.instagramAccountUsername}: ${post.caption}`}
                    >
                      <div className="flex items-center space-x-1 truncate flex-1 pr-1">
                        <PostIcon size={9} className="flex-shrink-0" />
                        <span className="truncate">@{post.instagramAccountUsername}: {post.caption}</span>
                      </div>
                      <span className="text-[7px] font-mono opacity-80 shrink-0">
                        {new Date(post.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Render Next Month Days */}
        {nextMonthDays.map((dayNum, idx) => {
          const dayPosts = getPostsForDay(dayNum, false, 1);
          return (
            <div
              key={`next-${idx}`}
              onClick={() => handleDayClick(dayNum, 1)}
              className="min-h-[85px] bg-[#121214]/40 p-2 border border-[#27272a]/10 hover:bg-zinc-900/20 cursor-pointer transition flex flex-col justify-between"
            >
              <span className="text-[10px] text-zinc-650 font-mono font-bold">{dayNum}</span>
              <div className="space-y-1 mt-1">
                {dayPosts.slice(0, 2).map((post) => (
                  <div
                    key={post.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPost(post);
                    }}
                    className="p-1 text-[8px] rounded bg-zinc-800/40 border border-zinc-700/30 text-zinc-500 truncate"
                  >
                    @{post.instagramAccountUsername}: {post.caption}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guide Info Footer */}
      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase">
        <div className="flex space-x-4">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Pending schedule</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Published live</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Failed release</span>
          </span>
        </div>
        <span>💡 Click empty space to schedule &bull; Click card to preview</span>
      </div>
    </div>
  );
}
