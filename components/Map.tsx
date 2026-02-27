'use client';

import { useEffect, useState } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { useAppStore } from '@/lib/store';
import { Restaurant } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, DollarSign } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

function RestaurantMarker({
  restaurant,
  index,
  isSelected,
  onClick
}: {
  restaurant: Restaurant;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <AdvancedMarker
      position={restaurant.location}
      onClick={onClick}
    >
      <motion.div
        initial={{ scale: 0, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
          delay: index * 0.15
        }}
        className={`relative cursor-pointer ${isSelected ? 'z-50' : 'z-10'}`}
      >
        {/* Pin */}
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            shadow-lg transition-all duration-200
            ${isSelected
              ? 'bg-google-red scale-125'
              : 'bg-white border-2 border-google-red hover:scale-110'
            }
          `}
        >
          <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-google-red'}`}>
            {index + 1}
          </span>
        </div>

        {/* Pulse effect for selected */}
        {isSelected && (
          <div className="absolute inset-0 rounded-full bg-google-red/30 animate-ping" />
        )}

        {/* Info popup on hover/select */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56"
            >
              <div className="bg-white rounded-xl shadow-xl p-3 border border-gray-100">
                <h3 className="font-semibold text-gray-900 truncate">{restaurant.name}</h3>
                <p className="text-sm text-gray-500">{restaurant.cuisine}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-google-yellow fill-google-yellow" />
                    <span className="text-sm font-medium ml-0.5">{restaurant.rating}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="flex">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <DollarSign
                        key={i}
                        className={`w-3 h-3 ${i < restaurant.priceLevel ? 'text-google-green' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  {restaurant.walkingTime && (
                    <>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center text-gray-500">
                        <Clock className="w-3 h-3 mr-0.5" />
                        <span className="text-xs">{restaurant.walkingTime}m</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* Arrow */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-white rotate-45 border-r border-b border-gray-100" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AdvancedMarker>
  );
}

function SearchRadiusCircle() {
  const map = useMap();
  const radiusCenter = useAppStore((state) => state.mapState.radiusCenter);
  const searchRadius = useAppStore((state) => state.mapState.searchRadius);

  useEffect(() => {
    if (!map || !radiusCenter || !searchRadius) return;

    const circle = new google.maps.Circle({
      map,
      center: radiusCenter,
      radius: searchRadius,
      fillColor: '#4285F4',
      fillOpacity: 0.1,
      strokeColor: '#4285F4',
      strokeOpacity: 0.3,
      strokeWeight: 2,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, radiusCenter, searchRadius]);

  return null;
}

function MapController() {
  const map = useMap();
  const markers = useAppStore((state) => state.mapState.markers);
  const radiusCenter = useAppStore((state) => state.mapState.radiusCenter);
  const selectedRestaurant = useAppStore((state) => state.mapState.selectedRestaurant);

  // Pan to selected restaurant with smooth animation
  useEffect(() => {
    if (!map || !selectedRestaurant) return;

    const currentZoom = map.getZoom() || 12;

    // Slow zoom out, pan, then zoom in
    if (currentZoom > 13) {
      map.setZoom(12);
      setTimeout(() => {
        map.panTo(selectedRestaurant.location);
        setTimeout(() => {
          map.setZoom(16);
        }, 600);
      }, 800);
    } else {
      map.panTo(selectedRestaurant.location);
      setTimeout(() => {
        map.setZoom(16);
      }, 700);
    }
  }, [map, selectedRestaurant]);

  // Fit bounds when markers change (but not when just selecting)
  useEffect(() => {
    if (!map || markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((marker) => {
      bounds.extend(marker.location);
    });

    if (radiusCenter) {
      bounds.extend(radiusCenter);
    }

    map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
  }, [map, markers, radiusCenter]);

  return null;
}

export default function Map() {
  const mapState = useAppStore((state) => state.mapState);
  const selectRestaurant = useAppStore((state) => state.selectRestaurant);
  const [mapId, setMapId] = useState<string>('');

  useEffect(() => {
    // Generate a unique map ID or use a preset one
    setMapId('reserva-map');
  }, []);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Map Not Configured</h3>
          <p className="text-gray-500 max-w-sm">
            Add your Google Maps API key to <code className="bg-gray-200 px-2 py-0.5 rounded text-sm">.env.local</code>
          </p>
          <code className="block mt-4 bg-gray-200 p-3 rounded text-sm text-left">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
          </code>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="w-full h-full relative">
        <GoogleMap
          defaultCenter={mapState.center}
          defaultZoom={mapState.zoom}
          mapId={mapId}
          gestureHandling="greedy"
          disableDefaultUI={true}
          className="w-full h-full"
        >
          <MapController />
          <SearchRadiusCircle />

          {mapState.markers.map((restaurant, index) => (
            <RestaurantMarker
              key={restaurant.id}
              restaurant={restaurant}
              index={index}
              isSelected={mapState.selectedRestaurant?.id === restaurant.id}
              onClick={() => selectRestaurant(
                mapState.selectedRestaurant?.id === restaurant.id ? null : restaurant
              )}
            />
          ))}
        </GoogleMap>

        {/* Map overlay - branding */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="flex">
              <span className="text-google-blue font-bold">D</span>
              <span className="text-google-red font-bold">o</span>
              <span className="text-google-yellow font-bold">n</span>
              <span className="text-google-blue font-bold">n</span>
              <span className="text-google-green font-bold">a</span>
            </div>
            <span className="text-xs text-gray-400">by Google Maps</span>
          </div>
        </div>

        {/* Legend */}
        {mapState.markers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg"
          >
            <p className="text-xs text-gray-500 mb-2">Click a pin for details</p>
            <div className="flex items-center gap-1 text-xs">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600">= walking time</span>
            </div>
          </motion.div>
        )}
      </div>
    </APIProvider>
  );
}
