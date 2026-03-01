'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { GeminiIcon } from './ChromeFrame';

export default function MerchantNotification() {
  const { merchantNotification, dismissMerchantNotification, handleNotificationClick } = useAppStore();

  if (!merchantNotification) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-[72px] right-[114px] z-[100] w-[260px] hidden md:block"
      >
        {/* Arrow pointing to Gemini icon */}
        <div className="absolute -top-[6px] right-4 w-3 h-3 bg-white rotate-45 border-l border-t border-gray-200" />

        <div
          onClick={handleNotificationClick}
          className="bg-white rounded-xl shadow-xl cursor-pointer overflow-hidden border border-gray-200"
        >
          {/* Compact header with alert tag */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
            <GeminiIcon className="w-4 h-4" />
            <span className="text-xs font-medium text-gray-700">Donna</span>
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">Action needed</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissMerchantNotification();
              }}
              className="ml-auto w-5 h-5 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>

          {/* Notification content */}
          <div className="p-3">
            <p className="text-gray-800 text-sm leading-relaxed">
              I just heard from <span className="font-medium">{merchantNotification.restaurantName}</span> — unfortunately they had to cancel your reservation.
            </p>

            {/* Action hint */}
            <div className="mt-2 flex items-center justify-end">
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-google-blue text-xs font-medium"
              >
                What should I do? →
              </motion.span>
            </div>
          </div>

          {/* Progress bar */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 15, ease: 'linear' }}
            className="h-0.5 bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570] origin-left"
          />
        </div>
      </motion.div>

      {/* Mobile version - centered at top */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 left-4 right-4 z-[100] md:hidden"
      >
        <div
          onClick={handleNotificationClick}
          className="bg-white rounded-2xl shadow-2xl cursor-pointer overflow-hidden border border-gray-200"
        >
          <div className="bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570] p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <GeminiIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm">Gemini • Donna</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissMerchantNotification();
              }}
              className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="p-3">
            <p className="text-gray-800 text-sm font-medium">{merchantNotification.title}</p>
            <p className="text-gray-500 text-xs mt-1">{merchantNotification.message}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
