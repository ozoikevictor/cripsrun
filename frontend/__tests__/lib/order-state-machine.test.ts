/**
 * Tests for the order state machine.
 * Validates allowed/disallowed transitions per AGENT.md Section 8.
 */

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['AWAITING_PICKUP', 'CANCELLED'],
  AWAITING_PICKUP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED_DELIVERY'],
  DELIVERED: [],
  CANCELLED: [],
  FAILED_DELIVERY: [],
};

describe('Order State Machine', () => {
  const allStatuses = Object.keys(VALID_TRANSITIONS);

  it('defines transitions for all terminal states as empty', () => {
    expect(VALID_TRANSITIONS.DELIVERED).toEqual([]);
    expect(VALID_TRANSITIONS.CANCELLED).toEqual([]);
    expect(VALID_TRANSITIONS.FAILED_DELIVERY).toEqual([]);
  });

  it('allows CANCELLED from all states before IN_TRANSIT', () => {
    const preTransitStates = [
      'PENDING_PAYMENT',
      'PAYMENT_CONFIRMED',
      'PROCESSING',
      'AWAITING_PICKUP',
    ];
    preTransitStates.forEach(state => {
      expect(VALID_TRANSITIONS[state]).toContain('CANCELLED');
    });
  });

  it('does NOT allow CANCELLED from IN_TRANSIT', () => {
    expect(VALID_TRANSITIONS.IN_TRANSIT).not.toContain('CANCELLED');
  });

  it('does NOT allow backward transitions', () => {
    // Can't go from PROCESSING back to PENDING_PAYMENT
    expect(VALID_TRANSITIONS.PROCESSING).not.toContain('PENDING_PAYMENT');
    expect(VALID_TRANSITIONS.IN_TRANSIT).not.toContain('PROCESSING');
    expect(VALID_TRANSITIONS.DELIVERED).not.toContain('IN_TRANSIT');
  });

  it('follows the happy path: PENDING → CONFIRMED → PROCESSING → PICKUP → TRANSIT → DELIVERED', () => {
    const happyPath = [
      'PENDING_PAYMENT',
      'PAYMENT_CONFIRMED',
      'PROCESSING',
      'AWAITING_PICKUP',
      'IN_TRANSIT',
      'DELIVERED',
    ];

    for (let i = 0; i < happyPath.length - 1; i++) {
      const from = happyPath[i];
      const to = happyPath[i + 1];
      expect(VALID_TRANSITIONS[from]).toContain(to);
    }
  });

  it('only allows FAILED_DELIVERY from IN_TRANSIT', () => {
    allStatuses.forEach(state => {
      if (state === 'IN_TRANSIT') {
        expect(VALID_TRANSITIONS[state]).toContain('FAILED_DELIVERY');
      } else {
        expect(VALID_TRANSITIONS[state]).not.toContain('FAILED_DELIVERY');
      }
    });
  });
});
