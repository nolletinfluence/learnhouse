(function () {
  var RTL = {
    ar: 1, fa: 1, he: 1, iw: 1, ur: 1, ps: 1,
    sd: 1, ug: 1, yi: 1, dv: 1, ckb: 1,
  };
  var SUPPORTED = {
    en: 1, fr: 1, de: 1, es: 1, ar: 1, ja: 1, pt: 1, ru: 1, zh: 1,
    hi: 1, ko: 1, it: 1, tr: 1, vi: 1, id: 1, pl: 1, uk: 1, nl: 1,
    th: 1, bn: 1, fa: 1, sk: 1,
  };

  function normalize(value) {
    var code = typeof value === 'string'
      ? value.trim().toLowerCase().replace('_', '-').split('-')[0]
      : '';
    return SUPPORTED[code] ? code : 'en';
  }

  function detect() {
    var stored;
    try {
      stored = localStorage.getItem('i18nextLng');
    } catch {
      stored = null;
    }
    if (stored) return stored;

    var cookie = document.cookie.match(/(?:^|;\s*)i18next=([^;]*)/);
    if (cookie) {
      try { return decodeURIComponent(cookie[1]) } catch { return 'en'; }
    }

    try {
      var qs = new URLSearchParams(location.search).get('lng');
      if (qs) return qs;
    } catch { return 'en'; }

    return (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  }

  var code = normalize(detect());
  var dir = RTL[code] ? 'rtl' : 'ltr';

  var el = document.documentElement;
  el.setAttribute('lang', code);
  el.setAttribute('dir', dir);
  el.style.setProperty('--dir', dir === 'rtl' ? '-1' : '1');
})();
