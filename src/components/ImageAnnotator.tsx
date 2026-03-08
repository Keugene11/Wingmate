"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";

interface ImageAnnotatorProps {
  imageData: string;
  onConfirm: () => void;
  onBack: () => void;
}

interface Point { x: number; y: number; }

export default function ImageAnnotator({ imageData, onConfirm, onBack }: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageObj(img);
      const container = containerRef.current;
      if (container) {
        const maxWidth = container.clientWidth;
        const scale = maxWidth / img.width;
        setCanvasSize({ width: maxWidth, height: img.height * scale });
      }
    };
    img.src = imageData;
  }, [imageData]);

  const drawCanvas = useCallback(
    (points?: Point[]) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !imageObj) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
      const fp = points !== undefined ? points : freehandPoints;
      if (fp && fp.length > 1) {
        ctx.strokeStyle = "#7cb8a5";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(fp[0].x, fp[0].y);
        for (let i = 1; i < fp.length; i++) ctx.lineTo(fp[i].x, fp[i].y);
        ctx.stroke();
      }
    },
    [imageObj, freehandPoints]
  );

  useEffect(() => { drawCanvas(); }, [drawCanvas, canvasSize]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setFreehandPoints([getPos(e)]);
    setIsDrawing(true);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    setFreehandPoints((prev) => { const next = [...prev, pos]; drawCanvas(next); return next; });
  };

  const handleEnd = () => {
    if (freehandPoints.length > 1) setHasDrawn(true);
    setIsDrawing(false);
  };

  const resetDrawing = () => {
    setFreehandPoints([]); setHasDrawn(false);
    drawCanvas([]);
  };

  return (
    <div className="w-full max-w-lg mx-auto" ref={containerRef}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-[14px] text-text-muted mb-5 active:opacity-60">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="rounded-3xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] text-text-muted">
            Mark who caught your eye, or skip ahead.
          </p>
          {hasDrawn && (
            <button onClick={resetDrawing} className="text-text-muted p-1.5 active:opacity-60">
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden">
          <canvas
            ref={canvasRef} width={canvasSize.width} height={canvasSize.height}
            className="w-full drawing-cursor touch-none"
            onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
            onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
          />
        </div>
      </div>

      <button
        onClick={onConfirm}
        className="flex items-center justify-center gap-2 w-full bg-accent hover:bg-accent-dark text-white py-4 rounded-full mt-5 font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-sm"
      >
        {hasDrawn ? "Continue" : "Skip marking"}
        <ArrowRight size={17} />
      </button>
    </div>
  );
}
