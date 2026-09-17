import React, { useEffect, useState } from 'react';
import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, Moon, MapPin, Sparkles } from 'lucide-react';
import { fetchCurrentWeather, WeatherData } from '../../core/weather/weather-service';
import { useI18n } from '../../core/i18n/i18n-context';

export const WeatherPill: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const { locale } = useI18n();

  useEffect(() => {
    let mounted = true;
    fetchCurrentWeather().then((data) => {
      if (mounted) {
        setWeather(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const renderIcon = (type: WeatherData['iconType']) => {
    switch (type) {
      case 'sun':
        return <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />;
      case 'cloud-sun':
        return <CloudSun className="w-3.5 h-3.5 text-amber-400" />;
      case 'cloud':
        return <Cloud className="w-3.5 h-3.5 text-slate-400" />;
      case 'cloud-rain':
        return <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
      case 'cloud-snow':
        return <CloudSnow className="w-3.5 h-3.5 text-cyan-400" />;
      case 'cloud-lightning':
        return <CloudLightning className="w-3.5 h-3.5 text-amber-500" />;
      case 'moon':
        return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  if (loading && !weather) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 animate-pulse">
        <Sparkles className="w-3.5 h-3.5 text-slate-400" />
        <span>...</span>
      </div>
    );
  }

  if (!weather) {
    // Graceful offline fallback: show today's date formatted
    const now = new Date();
    const dateFormatted = now.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
        <Sparkles className="w-3.5 h-3.5 text-lad-500" />
        <span>{dateFormatted}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/85 dark:bg-slate-800/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
      {renderIcon(weather.iconType)}
      <span className="font-bold">{weather.tempC}°C</span>
      <span className="text-slate-300 dark:text-slate-600">•</span>
      <span className="text-slate-500 dark:text-slate-400 capitalize">{weather.conditionText}</span>
      {weather.cityName && (
        <>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1 text-[11px] font-medium">
            <MapPin className="w-3 h-3 text-slate-400" />
            {weather.cityName}
          </span>
        </>
      )}
    </div>
  );
};
