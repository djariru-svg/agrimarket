import { defineStore } from 'pinia';
import { useI18n } from 'vue-i18n';

export const useI18nStore = defineStore('i18n', {
  state: () => ({
    locale: localStorage.getItem('locale') || 'rw'
  }),

  actions: {
    setLocale(locale) {
      this.locale = locale;
      localStorage.setItem('locale', locale);
      const i18n = useI18n();
      i18n.locale.value = locale;
    }
  }
});
