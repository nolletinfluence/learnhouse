(function () {
  var RTL = {
    ar: 1, fa: 1, he: 1, iw: 1, ur: 1, ps: 1,
    sd: 1, ug: 1, yi: 1, dv: 1, ckb: 1,
  };
  var SUPPORTED = { en: 1, ru: 1 };

  function normalize(value) {
    var code = typeof value === 'string'
      ? value.trim().toLowerCase().replace('_', '-').split('-')[0]
      : '';
    return SUPPORTED[code] ? code : null;
  }

  function detect() {
    var stored;
    try {
      stored = localStorage.getItem('i18nextLng');
    } catch {
      stored = null;
    }
    if (normalize(stored)) return stored;

    var cookie = document.cookie.match(/(?:^|;\s*)i18next=([^;]*)/);
    if (cookie) {
      try {
        var value = decodeURIComponent(cookie[1]);
        if (normalize(value)) return value;
      } catch { cookie = null; }
    }

    var qs = new URLSearchParams(location.search).get('lng');
    if (normalize(qs)) return qs;

    return normalize(document.documentElement.getAttribute('data-default-locale')) || 'ru';
  }

  var code = normalize(detect());
  var dir = RTL[code] ? 'rtl' : 'ltr';

  var el = document.documentElement;
  el.setAttribute('lang', code);
  el.setAttribute('dir', dir);
  el.style.setProperty('--dir', dir === 'rtl' ? '-1' : '1');
})();
