/**
 * AccessibleTooltip — WAI-ARIA Compliant, Sensory-Friendly Tooltip
 * Supports mouse hover, keyboard focus, ESC dismiss, and screen-reader announcements.
 */

import React, { useState, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AccessibleTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
  className?: string;
  hintKey?: string;
}

export const AccessibleTooltip: React.FC<AccessibleTooltipProps> = ({
  content,
  children,
  position = 'top',
  delayMs = 200,
  className = '',
  hintKey,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = useId();

  const handleShow = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const handleHide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isVisible) {
      e.stopPropagation();
      handleHide();
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-1.5';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-1.5';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-1.5';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-1.5';
    }
  };

  // Clone child to inject accessibility props and focus listeners
  const trigger = React.cloneElement(children, {
    'aria-describedby': isVisible ? tooltipId : undefined,
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
      handleShow();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
      handleHide();
    },
    onFocus: (e: React.FocusEvent) => {
      children.props.onFocus?.(e);
      handleShow();
    },
    onBlur: (e: React.FocusEvent) => {
      children.props.onBlur?.(e);
      handleHide();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      children.props.onKeyDown?.(e);
      handleKeyDown(e);
    },
  });

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {trigger}
      <AnimatePresence>
        {isVisible && content && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 2 : -2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-50 pointer-events-none px-2.5 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-[11px] font-medium leading-snug shadow-xl backdrop-blur-xs max-w-xs whitespace-normal text-center select-none ${getPositionClasses()}`}
          >
            {content}
            {hintKey && (
              <span className="block text-[9px] text-slate-300 dark:text-slate-600 font-mono mt-0.5">
                {hintKey}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
