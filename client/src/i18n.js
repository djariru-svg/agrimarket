import { createI18n } from 'vue-i18n';
import rwMessages from '@/locales/rw.json';
import enMessages from '@/locales/en.json';
import frMessages from '@/locales/fr.json';

const messages = {
  rw: rwMessages,
  en: enMessages,
  fr: frMessages
};

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'rw',
  fallbackLocale: 'en',
  messages
});

export default i18n;
