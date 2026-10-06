import { formatCurrency, formatKg, calcLineTotal } from '@/lib/utils/format';

describe('formatCurrency', () => {
  it('formats kobo to Naira correctly', () => {
    expect(formatCurrency(250000)).toContain('2,500');
    expect(formatCurrency(100)).toContain('1');
    expect(formatCurrency(0)).toContain('0');
  });

  it('never returns floating point for integer kobo', () => {
    const result = formatCurrency(150000);
    // ₦1,500 — no decimals for whole Naira amounts
    expect(result).not.toContain('.50');
  });
});

describe('formatKg', () => {
  it('formats whole numbers without decimal', () => {
    expect(formatKg(2)).toBe('2 kg');
  });

  it('formats decimal kg correctly', () => {
    expect(formatKg(1.5)).toBe('1.5 kg');
    expect(formatKg(0.5)).toBe('0.5 kg');
  });
});

describe('calcLineTotal', () => {
  it('multiplies kg by price_per_kg and rounds to integer kobo', () => {
    // ₦2,500/kg × 1.5kg = ₦3,750 = 375,000 kobo
    expect(calcLineTotal(2500, 1.5)).toBe(375000);
    // ₦1,000/kg × 0.5kg = ₦500 = 50,000 kobo
    expect(calcLineTotal(1000, 0.5)).toBe(50000);
  });

  it('always returns integer (never float)', () => {
    const result = calcLineTotal(1000, 1.3);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('handles zero correctly', () => {
    expect(calcLineTotal(1000, 0)).toBe(0);
    expect(calcLineTotal(0, 1.5)).toBe(0);
  });
});
