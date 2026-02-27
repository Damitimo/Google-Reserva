'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Sparkles } from 'lucide-react';

export default function ReviewsModal() {
  const {
    showReviewsModal,
    reviewsRestaurant,
    reviewsSummary,
    closeReviewsModal,
    setReviewsSummary
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('best');
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Generate AI summary when modal opens
  useEffect(() => {
    if (showReviewsModal && reviewsRestaurant && !reviewsSummary) {
      generateSummary();
    }
  }, [showReviewsModal, reviewsRestaurant]);

  // Reset tab and summary when modal opens
  useEffect(() => {
    if (showReviewsModal) {
      setActiveTab('best');
      setSummaryExpanded(false);
    }
  }, [showReviewsModal]);

  const generateSummary = async () => {
    if (!reviewsRestaurant) return;

    try {
      const response = await fetch('/api/summarize-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: reviewsRestaurant.name,
          cuisine: reviewsRestaurant.cuisine,
          rating: reviewsRestaurant.rating,
          reviews: reviewsRestaurant.reviews || [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReviewsSummary(data.summary);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      // Fallback summary
      setReviewsSummary(`${reviewsRestaurant.name} is a popular ${reviewsRestaurant.cuisine} restaurant with a ${reviewsRestaurant.rating} rating. Guests appreciate the quality food and atmosphere.`);
    }
  };

  if (!showReviewsModal || !reviewsRestaurant) return null;

  const reviews = reviewsRestaurant.reviews || [];

  // Generate consistent avatar URL based on author name
  const getAvatarUrl = (name: string, index: number) => {
    const id = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 70;
    return `https://i.pravatar.cc/150?img=${id}`;
  };

  // Get best, average, and worst reviews
  const sortedReviews = [...reviews].sort((a, b) => b.rating - a.rating);
  const bestReview = sortedReviews.find(r => r.rating >= 4);
  const worstReview = sortedReviews.reverse().find(r => r.rating <= 3);
  const avgReview = reviews.find(r => r.rating === 4 || r.rating === 3) || reviews[Math.floor(reviews.length / 2)];

  // Build curated list: best, typical, critical
  const tabs = [
    { key: 'best', label: 'Best', review: bestReview, textColor: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-green-300', activeBg: 'bg-green-50' },
    { key: 'typical', label: 'Typical', review: avgReview && avgReview !== bestReview && avgReview !== worstReview ? avgReview : null, textColor: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-300', activeBg: 'bg-blue-50' },
    { key: 'critical', label: 'Critical', review: worstReview && worstReview !== bestReview ? worstReview : null, textColor: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-300', activeBg: 'bg-red-50' },
  ].filter(tab => tab.review !== null);

  const activeTabData = tabs.find(t => t.key === activeTab) || tabs[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4"
        onClick={(e) => e.target === e.currentTarget && closeReviewsModal()}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="relative p-5 border-b border-gray-100 flex-shrink-0">
            <button
              onClick={closeReviewsModal}
              className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 pr-8">
              {reviewsRestaurant.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-google-yellow fill-google-yellow" />
                <span className="font-semibold">{reviewsRestaurant.rating}</span>
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{reviewsRestaurant.reviewCount.toLocaleString()} reviews</span>
            </div>
          </div>

          {/* AI Summary - Fixed */}
          <div className="p-5 pb-0 flex-shrink-0">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-google-blue to-google-green flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">AI Summary</span>
              </div>
              {reviewsSummary ? (
                <div>
                  <p className={`text-sm text-gray-600 leading-relaxed ${!summaryExpanded ? 'line-clamp-[7]' : ''}`}>
                    {reviewsSummary}
                  </p>
                  {reviewsSummary.length > 200 && (
                    <button
                      onClick={() => setSummaryExpanded(!summaryExpanded)}
                      className="text-sm text-google-blue font-medium mt-1 hover:underline"
                    >
                      {summaryExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-google-blue border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Analyzing reviews...</span>
                </div>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="flex-1 flex flex-col min-h-0 p-5 pt-4">
            {/* Curated Reviews: Tabs */}
            {tabs.length > 0 ? (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Tab Bar - Fixed */}
                <div className="flex gap-2 mb-3 flex-shrink-0">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${tab.activeBg} ${
                        activeTab === tab.key
                          ? `${tab.textColor} ${tab.borderColor}`
                          : `text-gray-500 border-transparent`
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Active Review */}
                <AnimatePresence mode="wait">
                  {activeTabData?.review && (
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-xl border border-gray-200 flex flex-col flex-1 min-h-0"
                    >
                      {/* Header: Avatar, Name, Stars - Fixed */}
                      <div className="flex items-center gap-3 p-4 pb-3 flex-shrink-0 border-b border-gray-100">
                        <img
                          src={getAvatarUrl(activeTabData.review.authorName, tabs.indexOf(activeTabData))}
                          alt={activeTabData.review.authorName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-800 block">{activeTabData.review.authorName}</span>
                          <span className="text-xs text-gray-400">{activeTabData.review.relativeTime}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < activeTabData.review!.rating
                                  ? 'text-google-yellow fill-google-yellow'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {/* Review Text - Scrollable */}
                      <div className="flex-1 overflow-y-auto p-4 pt-3" style={{ scrollbarGutter: 'stable' }}>
                        <p className="text-sm text-gray-700 leading-relaxed">"{activeTabData.review.text}"</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No reviews available yet.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <button
              onClick={closeReviewsModal}
              className="w-full btn-primary py-3 text-base"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
