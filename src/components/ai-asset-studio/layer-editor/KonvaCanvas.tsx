"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Stage,
  Layer as KonvaLayer,
  Rect,
  Circle,
  Text,
  Image as KonvaImage,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import type { Layer, ImageLayer, TextLayer, ShapeLayer } from "./types";

interface KonvaCanvasProps {
  layers: Layer[];
  selectedLayerId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  canvasBg: string;
  onSelect: (id: string | null) => void;
  onTransform: (id: string, attrs: Partial<Layer>) => void;
  onDeleteSelected: () => void;
}

// Bild-Cache
const imageCache = new Map<string, HTMLImageElement>();

function useImage(src: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(() => imageCache.get(src) ?? null);
  useEffect(() => {
    if (imageCache.has(src)) { setImg(imageCache.get(src)!); return; }
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.onload = () => { imageCache.set(src, el); setImg(el); };
    el.src = src;
  }, [src]);
  return img;
}

// ---------- Image Layer ----------

function ImageLayerNode({ layer, onSelect, onTransform }: {
  layer: ImageLayer;
  onSelect: () => void;
  onTransform: (attrs: Partial<Layer>) => void;
}) {
  const img = useImage(layer.src);
  const ref = useRef<Konva.Image>(null);
  if (!img) return null;

  return (
    <KonvaImage
      ref={ref}
      id={layer.id}
      image={img}
      x={layer.x} y={layer.y}
      width={layer.width} height={layer.height}
      rotation={layer.rotation}
      opacity={layer.opacity}
      visible={layer.visible}
      draggable={!layer.locked}
      onClick={onSelect} onTap={onSelect}
      onDragEnd={(e) => onTransform({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={() => {
        const n = ref.current;
        if (!n) return;
        const sx = n.scaleX(), sy = n.scaleY();
        n.scaleX(1); n.scaleY(1);
        onTransform({
          x: n.x(), y: n.y(),
          width: Math.max(10, n.width() * sx),
          height: Math.max(10, n.height() * sy),
          rotation: n.rotation(),
        });
      }}
    />
  );
}

// ---------- Text Layer ----------

function TextLayerNode({ layer, isSelected, onSelect, onTransform }: {
  layer: TextLayer;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (attrs: Partial<Layer>) => void;
}) {
  const ref = useRef<Konva.Text>(null);
  const PAD = 6;

  return (
    <>
      {/* Sichtbarer Greifbereich — nur wenn selektiert */}
      {isSelected && layer.visible && (
        <Rect
          x={layer.x - PAD}
          y={layer.y - PAD}
          width={layer.width + PAD * 2}
          height={(layer.fontSize * 1.3) + PAD * 2}
          rotation={layer.rotation}
          fill="rgba(201,168,76,0.06)"
          stroke="rgba(201,168,76,0.2)"
          strokeWidth={1}
          cornerRadius={4}
          listening={false}
        />
      )}
      <Text
        ref={ref}
        id={layer.id}
        text={layer.text}
        x={layer.x} y={layer.y}
        fontSize={layer.fontSize}
        fontFamily={layer.fontFamily}
        fontStyle={layer.fontStyle}
        fill={layer.fill}
        align={layer.align}
        width={layer.width}
        rotation={layer.rotation}
        opacity={layer.opacity}
        visible={layer.visible}
        draggable={!layer.locked}
        onClick={onSelect} onTap={onSelect}
        onDragEnd={(e) => onTransform({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const n = ref.current;
          if (!n) return;
          const sx = n.scaleX();
          n.scaleX(1); n.scaleY(1);
          onTransform({
            x: n.x(), y: n.y(),
            width: Math.max(20, n.width() * sx),
            fontSize: Math.max(8, Math.round(layer.fontSize * sx)),
            rotation: n.rotation(),
          });
        }}
      />
    </>
  );
}

// ---------- Shape Layer ----------

function ShapeLayerNode({ layer, onSelect, onTransform }: {
  layer: ShapeLayer;
  onSelect: () => void;
  onTransform: (attrs: Partial<Layer>) => void;
}) {
  const ref = useRef<Konva.Rect | Konva.Circle>(null);

  const common = {
    id: layer.id,
    x: layer.x, y: layer.y,
    rotation: layer.rotation,
    opacity: layer.opacity,
    visible: layer.visible,
    draggable: !layer.locked,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onTransform({ x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: () => {
      const n = ref.current;
      if (!n) return;
      const sx = n.scaleX(), sy = n.scaleY();
      n.scaleX(1); n.scaleY(1);
      onTransform({
        x: n.x(), y: n.y(),
        width: Math.max(10, n.width() * sx),
        height: Math.max(10, n.height() * sy),
        rotation: n.rotation(),
      });
    },
  };

  if (layer.shapeKind === "circle") {
    return (
      <Circle ref={ref as React.RefObject<Konva.Circle>} {...common}
        radius={Math.min(layer.width, layer.height) / 2}
        fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth} />
    );
  }

  return (
    <Rect ref={ref as React.RefObject<Konva.Rect>} {...common}
      width={layer.width} height={layer.height}
      fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth}
      cornerRadius={layer.cornerRadius} />
  );
}

// ---------- Haupt-Canvas ----------

export default function KonvaCanvas({
  layers,
  selectedLayerId,
  canvasWidth,
  canvasHeight,
  canvasBg,
  onSelect,
  onTransform,
  onDeleteSelected,
}: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Transformer an selektiertes Element binden
  // layers in Deps behalten: nach addLayer muss Transformer den neuen Node finden
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (!selectedLayerId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      prevSelectedRef.current = null;
      return;
    }

    const node = stage.findOne(`#${selectedLayerId}`);
    if (node) {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
    prevSelectedRef.current = selectedLayerId;
  }, [selectedLayerId, layers]);

  // Keyboard: Delete/Backspace loescht selektierten Layer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Nicht loeschen wenn Fokus in einem Input/Textarea ist
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedLayerId) {
        e.preventDefault();
        onDeleteSelected();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLayerId, onDeleteSelected]);

  // Klick auf leere Flaeche = Deselect
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) onSelect(null);
  }, [onSelect]);

  // Export
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__exportCanvas = () => {
      const stage = stageRef.current;
      if (!stage) return null;
      const tr = transformerRef.current;
      tr?.nodes([]);
      tr?.getLayer()?.batchDraw();
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      return dataUrl;
    };
  }, []);

  const visibleLayers = layers.filter((l) => l.visible);

  return (
    <Stage
      ref={stageRef}
      width={canvasWidth}
      height={canvasHeight}
      onClick={handleStageClick}
      onTap={handleStageClick}
      style={{ background: canvasBg, borderRadius: "8px", cursor: "default" }}
    >
      <KonvaLayer>
        <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill={canvasBg} listening={false} />

        {visibleLayers.map((layer) => {
          const select = () => onSelect(layer.id);
          const transform = (a: Partial<Layer>) => onTransform(layer.id, a);

          switch (layer.type) {
            case "image":
              return <ImageLayerNode key={layer.id} layer={layer} onSelect={select} onTransform={transform} />;
            case "text":
              return <TextLayerNode key={layer.id} layer={layer} isSelected={layer.id === selectedLayerId} onSelect={select} onTransform={transform} />;
            case "shape":
              return <ShapeLayerNode key={layer.id} layer={layer} onSelect={select} onTransform={transform} />;
          }
        })}

        {/* Transformer — grosse goldene Handles mit Glow */}
        <Transformer
          ref={transformerRef}
          borderStroke="#c9a84c"
          borderStrokeWidth={2.5}
          borderDash={[]}
          anchorStroke="#c9a84c"
          anchorFill="#0e0e1a"
          anchorSize={13}
          anchorCornerRadius={3}
          anchorStrokeWidth={2}
          rotateAnchorOffset={28}
          rotateAnchorCursor="grab"
          rotateEnabled={true}
          keepRatio={true}
          padding={4}
          enabledAnchors={[
            "top-left", "top-right", "bottom-left", "bottom-right",
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) return oldBox;
            return newBox;
          }}
        />
      </KonvaLayer>
    </Stage>
  );
}
