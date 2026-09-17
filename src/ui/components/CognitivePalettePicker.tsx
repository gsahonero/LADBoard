import React from 'react';
import { motion } from 'framer-motion';
import { COGNITIVE_PALETTES, PaletteId, PaletteManager } from '../../core/theme/palette-manager';
import { useI18n } from '../../core/i18n/i18n-context';
import { Check } from 'lucide-react';

interface CognitivePalettePickerProps {
  currentPalette: PaletteId;
  onSelectPalette: (paletteId: PaletteId) => void;
}

export const CognitivePalettePicker: React.FC<CognitivePalettePickerProps> = ({
  currentPalette,
  onSelectPalette,
}) => {
  const { t } = useI18n();

  const handleSelect = (id: PaletteId) => {
    PaletteManager.applyPalette(id);
    onSelectPalette(id);
  };

  const palettesList = Object.values(COGNITIVE_PALETTES);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {palettesList.map((palette) => {
          const isSelected = currentPalette === palette.id;
          return (
            <motion.button
              key={palette.id}
              type="button"
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(palette.id)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xl">{palette.icon}</span>
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-sm"
                    >
                      <Check className="w-3 h-3" />
                    </motion.span>
                  )}
                </div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                  {t(palette.nameKey)}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t(palette.descKey)}
                </p>
              </div>

              {/* Swatch Previews */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <span
                  className="w-4 h-4 rounded-full shadow-inner border border-black/10"
                  style={{ backgroundColor: palette.primaryHex }}
                  title="Primary Color"
                />
                <span
                  className="w-4 h-4 rounded-full shadow-inner border border-black/10"
                  style={{ backgroundColor: palette.accentHex }}
                  title="Accent Color"
                />
                <span
                  className="w-4 h-4 rounded-full shadow-inner border border-black/10"
                  style={{ backgroundColor: palette.bgLightHex }}
                  title="Light Surface Tint"
                />
                <span
                  className="w-4 h-4 rounded-full shadow-inner border border-white/20"
                  style={{ backgroundColor: palette.bgDarkHex }}
                  title="Dark Surface Tint"
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
