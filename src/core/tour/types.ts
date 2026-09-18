export interface TourStep {
  id: string;
  module?: string;
  title: string;
  subtitle?: string;
  description: string;
  targetSelector?: string | null;
  placement?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  icon?: string;
  highlights?: string[];
}

export interface TourConfig {
  version: string;
  tourId: string;
  defaultLocale?: string;
  steps: TourStep[];
}
