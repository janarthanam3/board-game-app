// 1c · the play HUD (task E1). One import for the route and for the screens that reuse its parts.
export { MatchHud, MENU_LABEL, type MatchHudProps } from "./MatchHud";
export { Holdings, LIST_NOTE, NO_PROPERTIES, type HoldingsProps, type HoldingsView } from "./Holdings";
export { PropertyCard, type PropertyCardProps } from "./PropertyCard";
export { PlayerStrip, type PlayerStripProps } from "./PlayerStrip";
export { CashRow, type CashRowProps } from "./CashRow";
export {
  LEAVE_DIALOG_LOCAL,
  LEAVE_DIALOG_ONLINE,
  LEAVE_DIALOG_TITLE,
  NO_TURN_TIMER,
  PAUSE_MOTION,
  PauseSheet,
  PAUSE_TITLE,
  ROW_APPEARANCE,
  RUNNING_OUT_SECONDS,
  SHEET_APPEARANCE,
  statusLine,
  TOGGLE_APPEARANCE,
  type PauseSheetProps,
} from "./PauseSheet";
export {
  CARD_GRID_KEYS,
  HOLDINGS_SORTS,
  holdings,
  hudHeader,
  nextSort,
  playerChips,
  primaryAction,
  turnLine,
  waitingHint,
  type HoldingCell,
  type HoldingModel,
  type HoldingsSort,
  type HudHeader,
  type PlayerChipModel,
  type PrimaryActionModel,
  type PrimaryIntent,
} from "./hudModel";
export { BOARD_MIN_SIZE, boardShape, boardViewport, playerTokens, SPLIT_BOARD_FRACTION } from "./boardShape";
