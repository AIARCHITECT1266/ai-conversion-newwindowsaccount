// ============================================================
// Layer Editor – Typen
// ============================================================

export type LayerType = "image" | "text" | "shape";
export type ShapeKind = "rect" | "circle" | "line";
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten";

export interface LayerBase {
  id: string;
  name: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
}

export interface ImageLayer extends LayerBase {
  type: "image";
  src: string; // data URI oder URL
}

export interface TextLayer extends LayerBase {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle: "" | "bold" | "italic" | "bold italic";
  align: "left" | "center" | "right";
}

export interface ShapeLayer extends LayerBase {
  type: "shape";
  shapeKind: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export type Layer = ImageLayer | TextLayer | ShapeLayer;

export interface EditorState {
  layers: Layer[];
  selectedLayerId: string | null;
  canvasWidth: number;
  canvasHeight: number;
}

// Hilfsfunktion: Eindeutige ID
let _counter = 0;
export function generateId(): string {
  return `layer_${Date.now()}_${++_counter}`;
}
