'use client';

import { useState } from 'react';
import { Restaurant } from '@/types';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Star, Clock, MapPin, DollarSign, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface RestaurantCardProps {
  restaurant: Restaurant;
  index: number;
  compact?: boolean;
}

export default function RestaurantCard({ restaurant, index, compact = false }: RestaurantCardProps) {
  const { selectRestaurant, openBookingModal, openReviewsModal, openMapModal, mapState } = useAppStore();

  // Check if mobile (under md breakpoint)
  const handleMapClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      openMapModal(restaurant);
    } else {
      selectRestaurant(restaurant);
    }
  };
  const isSelected = mapState.selectedRestaurant?.id === restaurant.id;
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos = restaurant.photos || [];
  const hasMultiplePhotos = photos.length > 1;

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        onClick={() => selectRestaurant(restaurant)}
        className={`
          restaurant-card p-3 rounded-xl cursor-pointer border-2 transition-all
          ${isSelected
            ? 'border-google-blue bg-blue-50'
            : 'border-transparent bg-gray-50 hover:bg-gray-100'
          }
        `}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-google-red text-white flex items-center justify-center font-bold text-sm">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">{restaurant.name}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{restaurant.cuisine}</span>
              <span>•</span>
              <div className="flex items-center">
                <Star className="w-3.5 h-3.5 text-google-yellow fill-google-yellow" />
                <span className="ml-0.5">{restaurant.rating}</span>
              </div>
              <span>•</span>
              <div className="flex">
                {Array.from({ length: restaurant.priceLevel }).map((_, i) => (
                  <DollarSign key={i} className="w-3 h-3 text-google-green" />
                ))}
              </div>
            </div>
            {restaurant.walkingTime && (
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                <Clock className="w-3 h-3" />
                <span>{restaurant.walkingTime} min walk</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
      className={`
        restaurant-card bg-white rounded-2xl shadow-sm border-2 flex flex-col h-full
        ${isSelected ? 'border-google-blue' : 'border-gray-100'}
      `}
    >
      {/* Hero Image */}
      <div
        onClick={() => selectRestaurant(restaurant)}
        className="relative h-36 bg-gray-100 w-full cursor-pointer group flex-shrink-0 overflow-hidden"
      >
        {photos.length > 0 ? (
          <img
            src={photos[photoIndex]}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        {/* Rating badge */}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-google-yellow fill-google-yellow" />
          <span className="text-sm font-semibold">{restaurant.rating}</span>
        </div>
        {/* Number badge */}
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-google-red text-white flex items-center justify-center font-bold text-sm shadow-lg">
          {index + 1}
        </div>
        {/* Photo navigation */}
        {hasMultiplePhotos && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10">
            <button
              onClick={prevPhoto}
              className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full">
              {photoIndex + 1}/{photos.length}
            </span>
            <button
              onClick={nextPhoto}
              className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        {/* Name and Reviews */}
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 leading-tight">{restaurant.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{restaurant.cuisine}</span>
            <span>•</span>
            <button
              onClick={() => openReviewsModal(restaurant)}
              className="hover:text-google-blue hover:underline transition-colors"
            >
              {restaurant.reviewCount.toLocaleString()} reviews
            </button>
          </div>
        </div>

        {/* Price, Distance & Highlights */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <DollarSign
                key={i}
                className={`w-3.5 h-3.5 ${i < restaurant.priceLevel ? 'text-google-green' : 'text-gray-200'}`}
              />
            ))}
          </div>
          {restaurant.walkingTime && (
            <div className="flex items-center text-gray-500 text-xs">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>{restaurant.walkingTime} min</span>
            </div>
          )}
          {restaurant.highlights.slice(0, 2).map((highlight, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {highlight}
            </span>
          ))}
          {restaurant.depositPolicy && (
            <>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                {restaurant.depositPolicy.type === 'hold_only'
                  ? 'Card hold req.'
                  : restaurant.depositPolicy.type === 'per_person'
                    ? `Deposit: $${restaurant.depositPolicy.amount}/person`
                    : restaurant.depositPolicy.minPartySize
                      ? `Deposit: $${restaurant.depositPolicy.amount} (${restaurant.depositPolicy.minPartySize}+)`
                      : `Deposit: $${restaurant.depositPolicy.amount}`}
              </span>
              <span className="relative group/info">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-600" />
                <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded w-32 text-center opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-opacity">
                  Free cancellation 24hrs before
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </span>
              </span>
            </>
          )}
        </div>

        {/* Available Times */}
        {restaurant.availableTimes && restaurant.availableTimes.length > 0 && (
          <div className="mt-auto pt-3">
            <p className="text-xs text-gray-400 mb-1.5">Available tonight</p>
            <div className="flex flex-wrap gap-1.5">
              {restaurant.availableTimes.slice(0, 4).map((time, i) => (
                <button
                  key={i}
                  onClick={() => openBookingModal(restaurant)}
                  className="px-2.5 py-1 bg-google-blue/10 text-google-blue text-xs font-medium rounded-lg hover:bg-google-blue/20 transition-colors"
                >
                  {time}
                </button>
              ))}
              {restaurant.availableTimes.length > 4 && (
                <span className="px-2 py-1 text-gray-400 text-xs">
                  +{restaurant.availableTimes.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-100 flex-shrink-0">
        <button
          onClick={handleMapClick}
          className="flex-1 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
        >
          <MapPin className="w-4 h-4" />
          Map
        </button>
        <div className="w-px bg-gray-100" />
        <button
          onClick={() => openBookingModal(restaurant)}
          className="flex-1 py-2.5 text-sm text-google-blue font-medium hover:bg-blue-50 transition-colors"
        >
          Reserve
        </button>
      </div>
    </motion.div>
  );
}
