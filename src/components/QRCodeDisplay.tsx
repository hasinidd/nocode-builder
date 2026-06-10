import { useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";

export default function QRCodeDisplay({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    setError(false);
    QRCodeLib.toCanvas(canvasRef.current, value, { width: 256, margin: 2 }, (err) => {
      if (err) {
        console.error("QR render error:", err);
        setError(true);
      }
    });
  }, [value]);

  return (
    <div className="bg-white p-4 rounded-lg inline-block">
      {error ? (
        <div className="w-64 h-64 flex items-center justify-center text-sm text-red-500">
          QR Code Error — Please refresh
        </div>
      ) : (
        <canvas ref={canvasRef} />
      )}
    </div>
  );
}
