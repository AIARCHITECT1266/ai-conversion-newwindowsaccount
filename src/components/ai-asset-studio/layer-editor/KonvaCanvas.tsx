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
  Line,
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
}

// Bild-Cache fuer ImageLayer (verhindert Neuladen bei jedem Render)
const imageCache = new Map<string, HTMLImageElement>();

function useImage(src: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(() => imageCache.get(src) ?? null);

  useEffect(() => {
    if (imageCache.has(src)) {
      setImg(imageCache.get(src)!);
      return;
    }
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.onload = () => {
      imageCache.set(src, el);
      setImg(el);
    };
    el.src = src;
  }, [src]);

  return img;
}

// ---------- Einzelne Layer-Renderer ----------

function ImageLayerNode({ layer, isSelected, onSelect, onTransform }: {
  layer: ImageLayer;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (attrs: Partial<Layer>) => void;
}) {
  const img = useImage(layer.src);
  const shapeRef = useRef<Konva.Image>(null);

  if (!img) return null;

  return (
    <KonvaImage
      ref={shapeRef}
      image={img}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      opacity={layer.opacity}
      visible={layer.visible}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onTransform({ x: e.target.x(), y: e.target.y() });
      }}
      onTransformEnd={() => {
        const node = shapeRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onTransform({
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function TextLayerNode({ layer, onSelect, onTransform }: {
  layer: TextLayer;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (attrs: Partial<Layer>) => void;
}) {
  const shapeRef = useRef<Konva.Text>(null);

  return (
    <Text
      ref={shapeRef}
      text={layer.text}
      x={layer.x}
      y={layer.y}
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
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onTransform({ x: e.target.x(), y: e.target.y() });
      }}
      onTransformEnd={() => {
        const node = shapeRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        onTransform({
          x: node.x(),
          y: node.y(),
          width: Math.max(20, node.width() * scaleX),
          fontSize: Math.max(8, layer.fontSize * scaleX),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function ShapeLayerNode({ layer, onSelect, onTransform }: {
  layer: ShapeLayer;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (attrs: Partial<Layer>) => void;
}) {
  const shapeRef = useRef<Konva.Rect | Konva.Circle>(null);

  const commonProps = {
    x: layer.x,
    y: layer.y,
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
      const node = shapeRef.current;
      if (!node) return;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onTransform({
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation(),
      });
    },
  };

  if (layer.shapeKind === "circle") {
    return (
      <Circle
        ref={shapeRef as React.RefObject<Konva.Circle>}
        {...commonProps}
        radius={Math.min(layer.width, layer.height) / 2}
        fill={layer.fill}
        stroke={layer.stroke}
        strokeWidth={layer.strokeWidth}
      />
    );
  }

  return (
    <Rect
      ref={shapeRef as React.RefObject<Konva.Rect>}
      {...commonProps}
      width={layer.width}
      height={layer.height}
      fill={layer.fill}
      stroke={layer.stroke}
      strokeWidth={layer.strokeWidth}
      cornerRadius={layer.cornerRadius}
    />
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
}: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Transformer an ausgewaehltes Element binden
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (!selectedLayerId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const selectedNode = stage.findOne(`#${selectedLayerId}`);
    if (selectedNode) {
      tr.nodes([selectedNode]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedLayerId, layers]);

  // Klick auf leere Flaeche = Deselect
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      onSelect(null);
    }
  }, [onSelect]);

  // Export-Methode (wird ueber ref vom Parent aufgerufen)
  // Stattdessen nutzen wir eine globale Funktion
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__exportCanvas = () => {
      const stage = stageRef.current;
      if (!stage) return null;
      // Transformer verstecken fuer Export
      const tr = transformerRef.current;
      tr?.nodes([]);
      tr?.getLayer()?.batchDraw();
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      return dataUrl;
    };
  }, []);

  // Sichtbare Layer (von unten nach oben)
  const visibleLayers = layers.filter((l) => l.visible);

  return (
    <Stage
      ref={stageRef}
      width={canvasWidth}
      height={canvasHeight}
      onClick={handleStageClick}
      onTap={handleStageClick}
      style={{ background: canvasBg, borderRadius: "8px" }}
    >
      <KonvaLayer>
        <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill={canvasBg} listening={false} />

        {visibleLayers.map((layer) => {
          const isSelected = layer.id === selectedLayerId;
          const selectThis = () => onSelect(layer.id);
          const transformThis = (attrs: Partial<Layer>) => onTransform(layer.id, attrs);

          // Jedes Element bekommt id={layer.id} fuer Transformer-Lookup
          const wrapperProps = { key: layer.id };

          switch (layer.type) {
            case "image":
              return (
                <ImageLayerNode
                  {...wrapperProps}
                  layer={layer}
                  isSelected={isSelected}
                  onSelect={selectThis}
                  onTransform={transformThis}
                />
              );
            case "text":
              return (
                <TextLayerNode
                  {...wrapperProps}
                  layer={layer}
                  isSelected={isSelected}
                  onSelect={selectThis}
                  onTransform={transformThis}
                />
              );
            case "shape":
              return (
                <ShapeLayerNode
                  {...wrapperProps}
                  layer={layer}
                  isSelected={isSelected}
                  onSelect={selectThis}
                  onTransform={transformThis}
                />
              );
          }
        })}

        {/* Transformer (Resize/Rotate Handles) */}
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
          rotateEnabled={true}
          enabledAnchors={[
            "top-left", "top-right", "bottom-left", "bottom-right",
            "middle-left", "middle-right", "top-center", "bottom-center",
          ]}
        />
      </KonvaLayer>
    </Stage>
  );
}
