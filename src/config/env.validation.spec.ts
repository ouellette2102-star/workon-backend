/**
 * Tests unitaires pour la validation des variables d'environnement.
 * 
 * Focus: isPresent() - la fonction helper critique qui valide la présence des variables.
 * Ces tests couvrent tous les edge cases possibles sur Railway.
 */

import { isPresent } from './env.validation';

describe('env.validation - isPresent()', () => {
  // ========================================
  // Cas FALSY: retourne false (variable considérée absente)
  // ========================================
  describe('should return FALSE (variable absente/vide)', () => {
    it('undefined', () => {
      expect(isPresent(undefined)).toBe(false);
    });

    it('null', () => {
      expect(isPresent(null)).toBe(false);
    });

    it('empty string ""', () => {
      expect(isPresent('')).toBe(false);
    });

    it('string with only spaces "   "', () => {
      expect(isPresent('   ')).toBe(false);
    });

    it('string with single space " "', () => {
      expect(isPresent(' ')).toBe(false);
    });

    it('string with tabs "\\t\\t"', () => {
      expect(isPresent('\t\t')).toBe(false);
    });

    it('string with newlines "\\n\\n"', () => {
      expect(isPresent('\n\n')).toBe(false);
    });

    it('string with mixed whitespace "\\t\\n  \\r"', () => {
      expect(isPresent('\t\n  \r')).toBe(false);
    });

    it('string with unicode non-breaking space', () => {
      // Unicode non-breaking space (U+00A0)
      expect(isPresent('\u00A0')).toBe(false);
    });

    it('string with multiple unicode whitespaces', () => {
      // Mix of regular space, NBSP, and tab
      expect(isPresent(' \u00A0\t')).toBe(false);
    });
  });

  // ========================================
  // Cas TRUTHY: retourne true (variable présente et valide)
  // ========================================
  describe('should return TRUE (variable présente)', () => {
    it('non-empty string "value"', () => {
      expect(isPresent('value')).toBe(true);
    });

    it('string with leading spaces "  value"', () => {
      expect(isPresent('  value')).toBe(true);
    });

    it('string with trailing spaces "value  "', () => {
      expect(isPresent('value  ')).toBe(true);
    });

    it('string with leading and trailing spaces "  value  "', () => {
      expect(isPresent('  value  ')).toBe(true);
    });

    it('single character "x"', () => {
      expect(isPresent('x')).toBe(true);
    });

    it('number 123', () => {
      expect(isPresent(123)).toBe(true);
    });

    it('number 0 (falsy number but valid value)', () => {
      expect(isPresent(0)).toBe(true);
    });

    it('boolean true', () => {
      expect(isPresent(true)).toBe(true);
    });

    it('boolean false (falsy boolean but valid value)', () => {
      expect(isPresent(false)).toBe(true);
    });

    it('empty object {}', () => {
      expect(isPresent({})).toBe(true);
    });

    it('empty array []', () => {
      expect(isPresent([])).toBe(true);
    });

    it('string "0" (string zero)', () => {
      expect(isPresent('0')).toBe(true);
    });

    it('string "false" (string false)', () => {
      expect(isPresent('false')).toBe(true);
    });
  });

  // ========================================
  // Cas EDGE: Valeurs avec guillemets (erreur courante Railway)
  // ========================================
  describe('should handle quoted values (Railway edge case)', () => {
    it('value with embedded double quotes "\\"value\\""', () => {
      // Si Railway ajoute des guillemets à la valeur
      expect(isPresent('"value"')).toBe(true);
    });

    it('value with embedded single quotes "\'value\'"', () => {
      expect(isPresent("'value'")).toBe(true);
    });

    it('only double quotes "\\"\\"" (empty quoted)', () => {
      // Cas problématique: "" comme valeur littérale
      expect(isPresent('""')).toBe(true); // Contains quotes, so length > 0
    });

    it('only single quotes "\'\'" (empty quoted)', () => {
      expect(isPresent("''")).toBe(true); // Contains quotes, so length > 0
    });

    it('quoted whitespace "\\" \\""', () => {
      // Guillemets avec espace au milieu
      expect(isPresent('" "')).toBe(true); // Contains quote characters
    });

    it('value with surrounding quotes and spaces "  \\"value\\"  "', () => {
      expect(isPresent('  "value"  ')).toBe(true);
    });
  });

  // ========================================
  // Cas RAILWAY: Simulation de problèmes réels
  // ========================================
  describe('Railway production scenarios', () => {
    it('SIGNED_URL_SECRET="" (empty in Railway dashboard)', () => {
      expect(isPresent('')).toBe(false);
    });

    it('SIGNED_URL_SECRET="   " (spaces in Railway dashboard)', () => {
      expect(isPresent('   ')).toBe(false);
    });

    it('SIGNED_URL_SECRET=my-secret (normal value)', () => {
      expect(isPresent('my-secret')).toBe(true);
    });

    it('SIGNED_URL_SECRET with UUID-like value', () => {
      expect(isPresent('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
    });

    it('SIGNED_URL_SECRET with base64-like value', () => {
      expect(isPresent('YWJjZGVmZ2hpamtsbW5vcA==')).toBe(true);
    });

    it('Value copied with extra newline from clipboard', () => {
      // Common issue: copy-paste adds newline
      expect(isPresent('secret-value\n')).toBe(true);
    });

    it('Value with Windows line ending', () => {
      expect(isPresent('secret-value\r\n')).toBe(true);
    });
  });

  // ========================================
  // Tests de valeurs courtes
  // ========================================
  describe('short values', () => {
    it('single char "a"', () => {
      expect(isPresent('a')).toBe(true);
    });

    it('two chars "ab"', () => {
      expect(isPresent('ab')).toBe(true);
    });

    it('three chars "abc"', () => {
      expect(isPresent('abc')).toBe(true);
    });

    it('dot "."', () => {
      expect(isPresent('.')).toBe(true);
    });

    it('hyphen "-"', () => {
      expect(isPresent('-')).toBe(true);
    });
  });

  // ========================================
  // Tests de régression
  // ========================================
  describe('regression tests', () => {
    it('should not treat "undefined" string as undefined', () => {
      expect(isPresent('undefined')).toBe(true);
    });

    it('should not treat "null" string as null', () => {
      expect(isPresent('null')).toBe(true);
    });

    it('should handle very long strings', () => {
      expect(isPresent('a'.repeat(10000))).toBe(true);
    });

    it('should handle string with only zero-width chars', () => {
      // Zero-width space (U+200B)
      expect(isPresent('\u200B')).toBe(true); // Note: zero-width is not whitespace
    });
  });
});

