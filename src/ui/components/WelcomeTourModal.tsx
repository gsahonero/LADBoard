/**
 * WelcomeTourModal — Modular JSON-Driven Guided Product Walkthrough
 * Explains LAD concepts, spotlights focused areas, and navigates step-by-step.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../core/i18n/i18n-context';
import { TourConfig, TourStep } from '../../core/tour/types';
import defaultTourData from '../../core/tour/welcome-tour.json';
import {
  Sparkles,
  Layers,
  Users,
  Cloud,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Compass,
} from 'lucide-react';

interface WelcomeTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourData?: TourConfig;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Sparkles,
  Layers,
  Users,
  Cloud,
  Compass,
};

export const WelcomeTourModal: React.FC<WelcomeTourModalProps> = ({
  isOpen,
  onClose,
  tourData = defaultTourData as unknown as TourConfig,
}) => {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = tourData.steps || [];
  const currentStep: TourStep | undefined = steps[currentIndex];

  // Measure target bounding rect
  const updateTargetRect = useCallback(() => {
    if (!currentStep?.targetSelector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setTargetRect(null);
    }
  }, [currentStep?.targetSelector]);

  // Track window resize and step changes
  useEffect(() => {
    if (!isOpen) return;
    updateTargetRect();
    const handleResize = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, currentIndex, updateTargetRect]);

  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem('lad_welcome_tour_completed', 'true');
    } catch {
      // Ignore storage errors
    }
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentIndex, steps.length, handleComplete]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleComplete();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleComplete]);

  if (!isOpen || !currentStep) return null;

  const IconComponent = (currentStep.icon && ICON_MAP[currentStep.icon]) || Sparkles;
  const isLastStep = currentIndex === steps.length - 1;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 overflow-hidden select-none"
        data-testid="welcome-tour-modal"
      >
        {/* Backdrop Spotlight Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-colors"
          onClick={handleComplete}
        />

        {/* Highlight Ring around focused area if element exists */}
        {targetRect && (
          <div
            className="fixed pointer-events-none rounded-2xl border-2 border-indigo-400 dark:border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all duration-300 z-50"
            style={{
              top: Math.max(0, targetRect.top - 6),
              left: Math.max(0, targetRect.left - 6),
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
          />
        )}

        {/* Modal Card Content */}
        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none z-50">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden pointer-events-auto flex flex-col"
            data-testid={`welcome-tour-step-${currentStep.id}`}
          >
            {/* Header Banner */}
            <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5"
                    data-testid="welcome-tour-step-counter"
                  >
                    {t('welcomeTour.stepCounter', {
                      current: currentIndex + 1,
                      total: steps.length,
                    }) || `Step ${currentIndex + 1} of ${steps.length}`}
                  </span>
                  <h2
                    className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight"
                    data-testid="welcome-tour-step-title"
                  >
                    {currentStep.title}
                  </h2>
                  {currentStep.subtitle && (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {currentStep.subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleComplete}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Close Tour"
                data-testid="welcome-tour-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {currentStep.description}
              </p>

              {/* Highlights List */}
              {currentStep.highlights && currentStep.highlights.length > 0 && (
                <div className="space-y-2 pt-1">
                  {currentStep.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {h}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Navigation Controls */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleComplete}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                data-testid="welcome-tour-skip-btn"
              >
                {t('welcomeTour.skip') || 'Skip Tour'}
              </button>

              {/* Step Dots Indicator */}
              <div className="flex items-center gap-1.5">
                {steps.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentIndex
                        ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                        : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                    }`}
                    title={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {currentIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                    data-testid="welcome-tour-prev-btn"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{t('welcomeTour.back') || 'Back'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  data-testid="welcome-tour-next-btn"
                >
                  <span>
                    {isLastStep
                      ? t('welcomeTour.finish') || 'Get Started'
                      : t('welcomeTour.next') || 'Next'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
