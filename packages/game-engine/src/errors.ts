// Refusal codes the engine can return, all from docs/13-error-catalog.md "Turn and play" (plus the
// two match-level codes it uses). The catalog owns the user-facing copy; the engine returns codes.

export type EngineErrorCode =
  | "E_MATCH_NOT_LIVE"
  | "E_NOT_IN_MATCH"
  | "E_NOT_YOUR_TURN"
  | "E_FORBIDDEN_ACTOR"
  | "E_ACTION_ILLEGAL"
  | "E_DEBT_BLOCKING"
  | "E_INSUFFICIENT_CASH"
  | "E_TILE_OWNED"
  | "E_TILE_MORTGAGED"
  | "E_BUILD_NEEDS_SET"
  | "E_BUILD_UNEVEN"
  | "E_BUILD_HOUSE_LIMIT"
  | "E_SUPPLY_EXHAUSTED"
  | "E_MORTGAGE_HAS_BUILDINGS"
  | "E_REDEEM_INSUFFICIENT"
  | "E_BID_TOO_LOW"
  | "E_BID_OVER_CASH"
  | "E_AUCTION_PASSED"
  | "E_AUCTION_OVER"
  | "E_OFFER_EXPIRED"
  | "E_TRADE_INVALID"
  | "E_TRADE_SELF"
  | "E_CARD_NOT_HELD"
  | "E_JAIL_BLOCKED"
  | "E_BAIL_INSUFFICIENT";

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: EngineErrorCode; /** Names the guard, for `details.reason` in the catalog. */ reason: string };

export const OK: ValidationResult = { ok: true };

export function refuse(code: EngineErrorCode, reason: string): ValidationResult {
  return { ok: false, code, reason };
}
