'use client';

import dynamic from 'next/dynamic';
import Chat from '@/components/Chat';
import BookingModal from '@/components/BookingModal';
import ReviewsModal from '@/components/ReviewsModal';
import MapModal from '@/components/MapModal';
import MerchantNotification from '@/components/MerchantNotification';
import ChromeFrame from '@/components/ChromeFrame';

// Dynamically import Map to avoid SSR issues with Google Maps
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="animate-pulse text-gray-400">Loading map...</div>
    </div>
  ),
});

function AppContent() {
  return (
    <main className="h-full w-full overflow-hidden bg-gray-100 overflow-x-hidden">
      {/* Desktop/Tablet Layout - Map + Chat side by side */}
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

      {/* Mobile Layout - Chat only, full screen */}
      <div className="md:hidden h-full">
        <Chat />
      </div>

      {/* Booking Modal */}
      <BookingModal />

      {/* Reviews Modal */}
      <ReviewsModal />

      {/* Map Modal (mobile) */}
      <MapModal />

      {/* Merchant Notification (unhappy flow) */}
      <MerchantNotification />
    </main>
  );
}

export default function Home() {
  return (
    <>
      {/* Desktop: Wrap in Chrome frame */}
      <div className="hidden md:block h-screen w-screen">
        <ChromeFrame>
          <AppContent />
        </ChromeFrame>
      </div>

      {/* Mobile: No Chrome frame */}
      <div className="md:hidden h-screen w-screen">
        <AppContent />
      </div>
    </>
  );
}
