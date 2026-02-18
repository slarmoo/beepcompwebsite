import { DirectiveBinding } from 'vue';
import twemoji from 'twemoji';

export default {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    el = twemoji.parse(el, {
      folder: 'svg',
      ext: '.svg',
      // ...binding.value,
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
    })
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    el = twemoji.parse(el, {
      folder: 'svg',
      ext: '.svg',
      // ...binding.value,
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
    });
  },
};