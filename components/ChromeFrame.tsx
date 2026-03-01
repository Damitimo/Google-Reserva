'use client';

import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, Home, Star, MoreVertical, X, Cast } from 'lucide-react';
import { useAppStore } from '@/lib/store';

// Official Gemini icon SVG
export function GeminiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none">
      <path
        d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z"
        fill="url(#gemini-gradient)"
      />
      <defs>
        <linearGradient id="gemini-gradient" x1="0" y1="14" x2="28" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="0.5" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#D96570" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface ChromeFrameProps {
  children: ReactNode;
}

export default function ChromeFrame({ children }: ChromeFrameProps) {
  const { merchantNotification } = useAppStore();
  const hasNotification = !!merchantNotification;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#202124] overflow-hidden">
      {/* Title bar / Window controls */}
      <div className="h-9 bg-[#35363a] flex items-center px-2 gap-2 flex-shrink-0">
        {/* Window controls (macOS style) */}
        <div className="flex items-center gap-1.5 pl-1">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 cursor-pointer" />
        </div>

        {/* Tab bar */}
        <div className="flex items-center flex-1 ml-16">
          {/* Active tab */}
          <div className="flex items-center gap-2 bg-[#202124] px-4 py-1.5 rounded-t-lg min-w-[200px] max-w-[240px]">
            {/* Donna favicon */}
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-google-blue to-google-green flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-bold text-white">D</span>
            </div>
            <span className="text-sm text-gray-200 truncate flex-1">Donna - AI Assistant</span>
            <X className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300 cursor-pointer flex-shrink-0" />
          </div>

          {/* New tab button */}
          <button className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-[#3c3c3c] rounded ml-1">
            <span className="text-lg leading-none">+</span>
          </button>
        </div>
      </div>

      {/* URL bar */}
      <div className="h-10 bg-[#35363a] flex items-center px-2 gap-1 flex-shrink-0 border-t border-[#202124]">
        {/* Navigation buttons */}
        <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-[#4a4a4a] rounded-full">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-[#4a4a4a] rounded-full">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-[#4a4a4a] rounded-full">
          <RotateCw className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-[#4a4a4a] rounded-full">
          <Home className="w-4 h-4" />
        </button>

        {/* URL input */}
        <div className="flex-1 h-8 bg-[#202124] rounded-full flex items-center px-4 mx-2">
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-sm text-gray-300">donna.google.com</span>
          </div>
          <Star className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-300" />
        </div>

        {/* Extensions area */}
        <div className="flex items-center gap-1">
          {/* Gemini extension icon - highlighted */}
          <button className="w-8 h-8 flex items-center justify-center hover:bg-[#4a4a4a] rounded-full relative group">
            <GeminiIcon className="w-5 h-5" />
            {/* Notification indicator dot - only show when there's a notification */}
            {hasNotification && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            )}
            {/* Tooltip */}
            <div className="absolute top-full mt-2 px-2 py-1 bg-[#202124] text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {hasNotification ? 'Gemini - 1 notification' : 'Gemini'}
            </div>
          </button>

          {/* Cast extension */}
          <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-[#4a4a4a] rounded-full">
            <Cast className="w-4 h-4" />
          </button>
        </div>

        {/* Profile & Menu */}
        <div className="flex items-center gap-1 ml-1">
          <button className="w-8 h-8 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xs font-medium text-white">S</span>
            </div>
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-[#4a4a4a] rounded-full">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
