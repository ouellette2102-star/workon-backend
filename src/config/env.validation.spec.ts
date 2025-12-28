/**
 * Tests unitaires pour la validation des variables d'environnement.
 * 
 * Focus: isPresent() - la fonction helper qui valide la présence des variables.
 * Les tests pour validate() nécessiteraient un setup NestJS complet.
 */

import { isPresent } from './env.validation';

describe('env.validation - isPresent()', () => {
  // ========================================
  // Cas où la variable est ABSENTE (retourne false)
  // ========================================
  describe('should return false (variable absente/vide)', () => {
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

    it('string with tabs and newlines', () => {
      expect(isPresent('\t\n  ')).toBe(false);
    });

    it('string with unicode whitespace', () => {
      // Non-breaking space + regular space
      expect(isPresent('\u00A0  ')).toBe(false);
    });
  });

  // ========================================
  // Cas où la variable est PRÉSENTE (retourne true)
  // ========================================
  describe('should return true (variable présente)', () => {
    it('non-empty string "value"', () => {
      expect(isPresent('value')).toBe(true);
    });

    it('string with leading/trailing spaces "  value  "', () => {
      expect(isPresent('  value  ')).toBe(true);
    });

    it('number 123', () => {
      expect(isPresent(123)).toBe(true);
    });

    it('number 0 (falsy but valid value)', () => {
      expect(isPresent(0)).toBe(true);
    });

    it('boolean true', () => {
      expect(isPresent(true)).toBe(true);
    });

    it('boolean false (falsy but valid value)', () => {
      expect(isPresent(false)).toBe(true);
    });

    it('object {}', () => {
      expect(isPresent({})).toBe(true);
    });

    it('array []', () => {
      expect(isPresent([])).toBe(true);
    });
  });

  // ========================================
  // Cas edge: Railway peut définir une variable vide
  // ========================================
  describe('Railway edge cases', () => {
    it('should reject SIGNED_URL_SECRET="" (empty string in Railway)', () => {
      // Simule: SIGNED_URL_SECRET=  (vide dans Railway dashboard)
      expect(isPresent('')).toBe(false);
    });

    it('should reject SIGNED_URL_SECRET="   " (whitespace only)', () => {
      // Simule: quelqu'un qui tape des espaces par erreur
      expect(isPresent('   ')).toBe(false);
    });

    it('should accept SIGNED_URL_SECRET="my-secret-value"', () => {
      expect(isPresent('my-secret-value')).toBe(true);
    });

    it('should accept SIGNED_URL_SECRET with leading/trailing spaces', () => {
      // La valeur a du contenu, les espaces autour sont OK
      expect(isPresent('  my-secret  ')).toBe(true);
    });
  });
});
