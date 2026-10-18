/* Driftwood — shared namespace.
 * The game runs straight from file://, where ES modules are blocked, so the
 * scripts are plain <script> tags that share one global namespace, `DW`.
 * This file must load first. */
(function () {
  'use strict';

  const DW = (window.DW = window.DW || {});

  /**
   * Thin wrappers around localStorage. Storage can be missing or throw
   * (private windows, blocked site data), so every call is guarded and
   * failures fall back to "nothing stored".
   */
  DW.storage = {
    /** Returns the raw string stored under `key`, or null. */
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },

    /** Stores a string under `key`, silently ignoring failures. */
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        /* storage unavailable */
      }
    },

    /** Removes `key`, silently ignoring failures. */
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        /* storage unavailable */
      }
    },

    /** Returns the JSON value stored under `key`, or `fallback` if absent or corrupt. */
    getJSON(key, fallback) {
      try {
        const raw = DW.storage.get(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },

    /** Stores `value` as JSON under `key`. */
    setJSON(key, value) {
      DW.storage.set(key, JSON.stringify(value));
    },
  };
})();
