"use client";

/**
 * Testimonials are not shown on the marketing site until we have real,
 * permissioned quotes. This module stays empty so nothing invented ships.
 */
export interface Quote {
  text: string;
  name: string;
  role: string;
}

export function Testimonials(_props?: { quotes?: Quote[] }) {
  return null;
}
