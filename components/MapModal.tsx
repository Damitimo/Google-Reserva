'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Phone, Globe, Star, DollarSign } from 'lucide-react';

export default function MapModal() {
  const { showMapModal, mapModalRestaurant, closeMapModal, openBookingModal } = useAppStore();

  if (!showMapModal || !mapModalRestaurant) return null;

  const restaurant = mapModalRestaurant;

  // Generate Google Maps URL
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.id}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.location.lat},${restaurant.location.lng}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && closeMapModal()}
      >
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Map Preview */}
          <div className="relative h-36 md:h-48 bg-gray-100">
            <img
              src={`https://maps.googleapis.com/maps/api/staticmap?center=${restaurant.location.lat},${restaurant.location.lng}&zoom=15&size=400x200&scale=2&markers=color:red%7C${restaurant.location.lat},${restaurant.location.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
              alt="Map"
              className="w-full h-full object-cover"
            />
            <button
              onClick={closeMapModal}
              className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Restaurant Info */}
          <div className="p-3 md:p-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">{restaurant.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <span>{restaurant.cuisine}</span>
              <span>•</span>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-google-yellow fill-google-yellow" />
                <span className="ml-0.5">{restaurant.rating}</span>
              </div>
              <span>•</span>
              <div className="flex">
                {Array.from({ length: 4 }).map((_, i) => (
                  <DollarSign
                    key={i}
                    className={`w-3 h-3 ${i < restaurant.priceLevel ? 'text-google-green' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 mt-3 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{restaurant.address}</span>
            </div>

            {restaurant.phone && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${restaurant.phone}`} className="text-google-blue hover:underline">
                  {restaurant.phone}
                </a>
              </div>
            )}

            {restaurant.website && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <Globe className="w-4 h-4 text-gray-400" />
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-google-blue hover:underline truncate">
                  {restaurant.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-3 md:p-4 pt-0 flex gap-2 md:gap-3">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 md:py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Directions
            </a>
            <button
              onClick={() => {
                closeMapModal();
                openBookingModal(restaurant);
              }}
              className="flex-1 py-2.5 md:py-3 bg-google-blue text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Reserve
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
