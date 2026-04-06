import { Injectable, Logger } from '@nestjs/common';

/**
 * Contact Information Filter (Anti-Disintermediation)
 *
 * Detects and redacts personal contact information in messages
 * to prevent users from bypassing the platform.
 *
 * Detects: phone numbers, email addresses, social media handles,
 * URLs, and common evasion patterns.
 */
@Injectable()
export class ContactFilterService {
  private readonly logger = new Logger(ContactFilterService.name);

  // Phone patterns: 514-555-1234, (514) 555-1234, 5145551234, +1 514 555 1234
  private readonly phonePatterns = [
    /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g,
    /\d{10,11}/g,
  ];

  // Email patterns
  private readonly emailPattern =
    /[a-zA-Z0-9._%+-]+\s*[@＠at]\s*[a-zA-Z0-9.-]+\s*[.．dot]\s*[a-zA-Z]{2,}/gi;

  // URL patterns
  private readonly urlPattern =
    /(?:https?:\/\/|www\.)[^\s]+/gi;

  // Social media handles
  private readonly socialPatterns = [
    /(?:instagram|insta|ig)\s*[:.]?\s*@?\s*[a-zA-Z0-9._]+/gi,
    /(?:facebook|fb)\s*[:.]?\s*[a-zA-Z0-9._/]+/gi,
    /(?:snapchat|snap)\s*[:.]?\s*@?\s*[a-zA-Z0-9._]+/gi,
    /(?:whatsapp|wa)\s*[:.]?\s*\+?\d+/gi,
    /(?:telegram|tg)\s*[:.]?\s*@?\s*[a-zA-Z0-9._]+/gi,
  ];

  // Evasion patterns: "cinq un quatre" etc
  private readonly frenchDigits: Record<string, string> = {
    'zero': '0', 'zéro': '0', 'un': '1', 'deux': '2', 'trois': '3',
    'quatre': '4', 'cinq': '5', 'six': '6', 'sept': '7', 'huit': '8', 'neuf': '9',
  };

  private readonly REDACTED = '[coordonnées masquées — utilisez le chat WorkOn]';

  /**
   * Check if a message contains contact information.
   * Returns the filtered message and whether it was modified.
   */
  filterMessage(content: string): { filtered: string; wasFiltered: boolean; detectedTypes: string[] } {
    let filtered = content;
    const detectedTypes: string[] = [];

    // Check phone numbers
    for (const pattern of this.phonePatterns) {
      const match = filtered.match(pattern);
      if (match) {
        // Only flag sequences that look like real phone numbers (not prices, dates etc.)
        for (const m of match) {
          const digitsOnly = m.replace(/\D/g, '');
          if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
            filtered = filtered.replace(m, this.REDACTED);
            if (!detectedTypes.includes('phone')) detectedTypes.push('phone');
          }
        }
      }
    }

    // Check emails
    if (this.emailPattern.test(filtered)) {
      filtered = filtered.replace(this.emailPattern, this.REDACTED);
      detectedTypes.push('email');
    }

    // Check URLs
    if (this.urlPattern.test(filtered)) {
      filtered = filtered.replace(this.urlPattern, this.REDACTED);
      detectedTypes.push('url');
    }

    // Check social media
    for (const pattern of this.socialPatterns) {
      if (pattern.test(filtered)) {
        filtered = filtered.replace(pattern, this.REDACTED);
        if (!detectedTypes.includes('social')) detectedTypes.push('social');
      }
    }

    // Check French digit evasion (e.g. "cinq un quatre trois deux un zéro neuf huit sept")
    const frenchDigitSequence = this.detectFrenchDigitSequence(filtered);
    if (frenchDigitSequence) {
      filtered = filtered.replace(frenchDigitSequence, this.REDACTED);
      detectedTypes.push('phone_evasion');
    }

    const wasFiltered = detectedTypes.length > 0;

    if (wasFiltered) {
      this.logger.warn(`Contact info detected in message: [${detectedTypes.join(', ')}]`);
    }

    return { filtered, wasFiltered, detectedTypes };
  }

  /**
   * Detect phone numbers written as French words.
   */
  private detectFrenchDigitSequence(text: string): string | null {
    const words = text.toLowerCase().split(/\s+/);
    const digitWords = Object.keys(this.frenchDigits);

    let consecutiveCount = 0;
    let startIdx = -1;
    let endIdx = -1;

    for (let i = 0; i < words.length; i++) {
      if (digitWords.includes(words[i])) {
        if (consecutiveCount === 0) startIdx = i;
        consecutiveCount++;
        endIdx = i;
      } else {
        if (consecutiveCount >= 7) {
          // 7+ consecutive digit words = likely phone number
          return words.slice(startIdx, endIdx + 1).join(' ');
        }
        consecutiveCount = 0;
      }
    }

    if (consecutiveCount >= 7) {
      return words.slice(startIdx, endIdx + 1).join(' ');
    }

    return null;
  }
}
