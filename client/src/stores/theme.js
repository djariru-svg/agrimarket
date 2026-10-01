import { defineStore } from 'pinia';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: localStorage.getItem('theme') || 'light',
    color: localStorage.getItem('colorTheme') || 'green'
  }),

  actions: {
    setMode(mode) {
      this.mode = mode;
      localStorage.setItem('theme', mode);
      this.applyTheme();
    },

    setColor(color) {
      this.color = color;
      localStorage.setItem('colorTheme', color);
      this.applyTheme();
    },

    applyTheme() {
      const html = document.documentElement;
      html.setAttribute('data-theme', this.mode);
      html.setAttribute('data-color', this.color);
    }
  }
});
