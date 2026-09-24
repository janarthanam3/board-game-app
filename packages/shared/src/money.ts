// Money formatting (CLAUDE.md "Currency": integer rupees, ₹ symbol, Indian digit grouping;
// docs/12 "Money is announced as words … a formatter in packages/shared/src/money.ts provides
// both strings"). Pure string work — no platform, no locale API, so both sides agree exactly.

/** Indian digit grouping: the last three digits, then pairs. ₹10,000 · ₹1,20,000. */
export function formatRupees(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new Error(`formatRupees: money is an integer number of rupees, got ${amount}`);
  }
  const sign = amount < 0 ? "-" : "";
  const digits = String(Math.abs(amount));
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest === "" ? last3 : `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`;
  return `₹${sign}${grouped}`;
}

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/**
 * The spoken form a screen reader announces: "one thousand two hundred rupees" (docs/12).
 * Indian scale, so 1,20,000 is "one lakh twenty thousand rupees".
 */
export function rupeesInWords(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new Error(`rupeesInWords: money is an integer number of rupees, got ${amount}`);
  }
  if (amount === 0) {
    return "zero rupees";
  }
  const sign = amount < 0 ? "minus " : "";
  return `${sign}${scale(Math.abs(amount)).join(" ")} rupees`;
}

function scale(amount: number): string[] {
  const parts: string[] = [];
  const crore = Math.floor(amount / 10_000_000);
  const lakh = Math.floor((amount % 10_000_000) / 100_000);
  const thousand = Math.floor((amount % 100_000) / 1_000);
  const rest = amount % 1_000;
  if (crore > 0) parts.push(...underThousand(crore), "crore");
  if (lakh > 0) parts.push(...underThousand(lakh), "lakh");
  if (thousand > 0) parts.push(...underThousand(thousand), "thousand");
  if (rest > 0) parts.push(...underThousand(rest));
  return parts;
}

function underThousand(value: number): string[] {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  if (hundreds > 0) {
    parts.push(ONES[hundreds]!, "hundred");
  }
  if (rest === 0) {
    return parts;
  }
  if (rest < 20) {
    parts.push(ONES[rest]!);
    return parts;
  }
  const tens = Math.floor(rest / 10);
  const ones = rest % 10;
  parts.push(ones === 0 ? TENS[tens]! : `${TENS[tens]}-${ONES[ones]}`);
  return parts;
}
