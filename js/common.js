/* Shared page code: the run manifest (data/manifest.json), loaded once and shared with
   the map script. Elements with a data-m attribute are filled from it, so a number
   written in the HTML always matches the run that produced the data. */
(function () {
  'use strict';

  function pick(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  function fmtNum(v, digits) {
    return Number(v).toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  }

  function format(v, fmt) {
    if (v == null) return '';
    switch (fmt || 'text') {
      case 'int': return fmtNum(Math.round(Number(v)), 0);
      case 'f1': return fmtNum(v, 1);
      case 'f2': return fmtNum(v, 2);
      case 'stamp': {
        var m = String(v).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
        return m ? m[1] + ' ' + m[2] + ' UTC' : String(v);
      }
      default: return String(v);
    }
  }

  var manifestPromise = null;
  function manifest() {
    if (!manifestPromise) {
      manifestPromise = fetch('data/manifest.json').then(function (r) {
        if (!r.ok) throw new Error('manifest.json: HTTP ' + r.status);
        return r.json();
      });
    }
    return manifestPromise;
  }

  function fill(root) {
    var els = (root || document).querySelectorAll('[data-m]');
    if (!els.length) return Promise.resolve(null);
    return manifest().then(function (m) {
      els.forEach(function (el) {
        var v = pick(m, el.getAttribute('data-m'));
        if (v === undefined) { console.warn('manifest has no value for', el.getAttribute('data-m')); return; }
        var text = format(v, el.getAttribute('data-fmt'));
        if (el.textContent !== text) el.textContent = text;
      });
      return m;
    }).catch(function (err) {
      console.error('Could not read the run manifest:', err);
    });
  }

  window.Site = {manifest: manifest, fill: fill, format: format, fmtNum: fmtNum, pick: pick};

  document.addEventListener('DOMContentLoaded', function () { fill(document); });
})();
