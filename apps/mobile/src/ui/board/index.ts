// The board renderer (task E2): a square ring map with zoom, tokens, owner pips and buildings.
export { BoardMap, CENTRE_CAPTIONS, FIT_WARNING, PAN_HINT } from "./BoardMap";
export type { BoardMapProps, BoardShape, BoardTileKind, BoardTileShape, PlayerTokenShape } from "./BoardMap";
export { TileFace, NAME_MIN_WIDTH, PRICE_MIN_WIDTH } from "./TileFace";
export type { TileFaceProps } from "./TileFace";
export {
  boardLayout,
  clampPan,
  clampZoom,
  edgeOf,
  FIT_ZOOM,
  MAX_ZOOM,
  minZoom,
  panToTile,
  stepZoom,
  tileAtPoint,
  tileIsTappable,
  ZOOM_STOPS,
  zoomStops,
} from "./layout";
export type { BoardEdge, BoardLayout, BoardMode, LayoutInput, PanOffset, TileRect } from "./layout";
