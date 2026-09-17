import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { t } = useI18n();
  const { userRegistry, updateProfile, createSpace, spaces } = useLAD();

  const [name, setName] = useState(
    userRegistry?.identities[0]?.display_name && userRegistry.identities[0].display_name !== 'LAD User'
      ? userRegistry.identities[0].display_name
      : ''
  );
  const [email, setEmail] = useState(
    userRegistry?.identities[0]?.email && !userRegistry.identities[0].email.endsWith('@ladboard.local')
      ? userRegistry.identities[0].email
      : ''
  );
  const [selectedSpaceType, setSelectedSpaceType] = useState<'personal' | 'family' | 'work'>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalName = name.trim() || 'Alex';
      await updateProfile(finalName, email.trim() || undefined);

      // Create initial space if none exist or if user chose a specific preset
      const spaceNames: Record<'personal' | 'family' | 'work', string> = {
        personal: 'Personal',
        family: 'Family',
        work: 'Work & Projects',
      };
      const chosenSpaceName = spaceNames[selectedSpaceType];

      // If existing space is default "Personal", we can keep it or create the chosen one
      const existing = spaces.find((s) => s.space_name === chosenSpaceName);
      if (!existing && spaces.length <= 1) {
        await createSpace(chosenSpaceName, `My ${chosenSpaceName} Space in LAD Board`);
      }

      localStorage.setItem('lad_onboarded', 'true');
      onComplete();
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 dark:border-slate-700 overflow-hidden z-10"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
              <div className="text-4xl mb-2 animate-calm-float">👋</div>
              <h2 className="text-2xl font-bold">{t('onboarding.title')}</h2>
              <p className="text-blue-100 text-sm mt-1">{t('onboarding.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('onboarding.nameLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('onboarding.namePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('onboarding.emailLabel')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('onboarding.emailPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('onboarding.spaceLabel')}
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSpaceType('personal')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      selectedSpaceType === 'personal'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-medium text-sm">{t('onboarding.spacePersonal')}</span>
                    {selectedSpaceType === 'personal' && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSpaceType('family')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      selectedSpaceType === 'family'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-medium text-sm">{t('onboarding.spaceFamily')}</span>
                    {selectedSpaceType === 'family' && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSpaceType('work')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      selectedSpaceType === 'work'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-medium text-sm">{t('onboarding.spaceWork')}</span>
                    {selectedSpaceType === 'work' && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                  </motion.button>
                </div>
              </div>

              <div className="pt-2">
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? t('common.loading') : t('onboarding.getStarted')}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
