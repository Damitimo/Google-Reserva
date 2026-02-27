'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Chat from '@/components/Chat';
import BookingModal from '@/components/BookingModal';
import ReviewsModal from '@/components/ReviewsModal';
import { Map as MapIcon, MessageCircle } from 'lucide-react';

// Dynamically import Map to avoid SSR issues with Google Maps
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="animate-pulse text-gray-400">Loading map...</div>
    </div>
  ),
});

export default function Home() {
  const [mobileView, setMobileView] = useState<'chat' | 'map'>('chat');

  return (
    <main className="h-screen w-screen overflow-hidden bg-gray-100">
      {/* Desktop Layout */}
      <div className="hidden md:flex h-full p-4 gap-4">
        {/* Map - Left Side */}
        <div className="flex-1 h-full rounded-2xl overflow-hidden shadow-lg">
          <Map />
        </div>

        {/* Chat - Right Side */}
        <div className="w-[420px] h-full flex-shrink-0 rounded-2xl overflow-hidden shadow-lg">
          <Chat />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden h-full flex flex-col">
        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Map View */}
          <div className={`absolute inset-0 transition-transform duration-300 ${mobileView === 'map' ? 'translate-x-0' : '-translate-x-full'}`}>
            <Map />
          </div>

          {/* Chat View */}
          <div className={`absolute inset-0 transition-transform duration-300 ${mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full'}`}>
            <Chat />
          </div>
        </div>

        {/* Bottom Tab Bar */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
          <div className="flex">
            <button
              onClick={() => setMobileView('map')}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
                mobileView === 'map'
                  ? 'text-google-blue'
                  : 'text-gray-400'
              }`}
            >
              <MapIcon className="w-6 h-6" />
              <span className="text-xs font-medium">Map</span>
            </button>
            <button
              onClick={() => setMobileView('chat')}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
                mobileView === 'chat'
                  ? 'text-google-blue'
                  : 'text-gray-400'
              }`}
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-medium">Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal />

      {/* Reviews Modal */}
      <ReviewsModal />
    </main>
  );
}
