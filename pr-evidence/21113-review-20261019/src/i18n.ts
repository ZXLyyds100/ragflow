import en from '@/locales/en';
import zh from '@/locales/zh';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BaselineFeatureTranslations } from './baseline/translations';

const Params = new URLSearchParams(location.search);
export const Version = Params.get('version') === 'baseline' ? 'baseline' : 'current';
export const Language = Params.get('lang') === 'zh' ? 'zh' : 'en';
const resources = structuredClone({ en, zh });
if (Version === 'baseline') {
  Object.assign(resources.en.translation.flow, BaselineFeatureTranslations.en);
  Object.assign(resources.zh.translation.flow, BaselineFeatureTranslations.zh);
}
// Fixture initialization only: no auth storage, language detection, or remote loads.
await i18next.use(initReactI18next).init({
  resources,
  lng: Language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
document.documentElement.lang = Language;
export default i18next;
