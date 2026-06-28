import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);
  const startingRef = useRef(false);
  const onScanRef = useRef(onScan);

  const scannerId = useMemo(
    () => `qr-scanner-region-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    []
  );

  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = async () => {
    const scanner = scannerRef.current;

    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {
      // Scanner may already be stopped.
    }

    try {
      await scanner.clear();
    } catch {
      // Scanner may already be cleared.
    }

    scannerRef.current = null;
    startingRef.current = false;
  };

  const startScanner = async () => {
    if (startingRef.current || scannerRef.current) return;

    startingRef.current = true;
    scannedRef.current = false;
    setStarting(true);
    setError('');

    try {
      const scannerElement = document.getElementById(scannerId);

      if (!scannerElement) {
        throw new Error('Scanner region not ready.');
      }

      const scanner = new Html5Qrcode(scannerId, {
        verbose: false,
        formatsToSupport: undefined,
      });

      scannerRef.current = scanner;

      const config = {
        fps: 8,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.floor(minEdge * 0.78);

          return {
            width: boxSize,
            height: boxSize,
          };
        },
        aspectRatio: 1,
        disableFlip: false,
      };

      let started = false;

      try {
        await scanner.start(
          { facingMode: { exact: 'environment' } },
          config,
          handleDecodedText,
          () => {}
        );

        started = true;
      } catch {
        // Some iPhones do not like exact environment mode.
      }

      if (!started) {
        try {
          await scanner.start(
            { facingMode: 'environment' },
            config,
            handleDecodedText,
            () => {}
          );

          started = true;
        } catch {
          // Fall back to camera list below.
        }
      }

      if (!started) {
        const cameras = await Html5Qrcode.getCameras();

        if (!cameras || cameras.length === 0) {
          throw new Error('No camera found.');
        }

        const backCamera =
          cameras.find((camera) =>
            String(camera.label || '').toLowerCase().includes('back')
          ) ||
          cameras.find((camera) =>
            String(camera.label || '').toLowerCase().includes('rear')
          ) ||
          cameras[cameras.length - 1];

        await scanner.start(
          { deviceId: { exact: backCamera.id } },
          config,
          handleDecodedText,
          () => {}
        );
      }

      setStarting(false);
      setError('');
      startingRef.current = false;
    } catch (err) {
      console.error('QR scanner start error:', err);

      await stopScanner();

      setStarting(false);
      setError(
        'Camera could not start. Make sure camera permission is allowed, then close and reopen the scanner.'
      );
    }
  };

  const handleDecodedText = async (decodedText) => {
    const cleanedText = String(decodedText || '').trim();

    if (!cleanedText || scannedRef.current) return;

    scannedRef.current = true;

    await stopScanner();

    setTimeout(() => {
      onScanRef.current(cleanedText);
    }, 100);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [scannerId]);

  const handleClose = async () => {
    await stopScanner();
    scannedRef.current = false;
    onClose();
  };

  const handleRestart = async () => {
    await stopScanner();
    scannedRef.current = false;

    setTimeout(() => {
      startScanner();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center px-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={handleRestart}
          type="button"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={handleClose}
          type="button"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
          <Camera className="w-7 h-7 text-white" />
        </div>

        <p className="text-white font-display font-bold text-lg">
          Scan Customer QR Code
        </p>

        <p className="text-white/60 text-sm mt-1">
          Point the camera at a customer rewards QR or checkout QR.
        </p>
      </div>

      <div className="relative w-[320px] max-w-[90vw] h-[320px] max-h-[90vw] rounded-2xl overflow-hidden bg-zinc-900 border border-white/20">
        <div
          id={scannerId}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />

        {starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-sm">
            Starting camera...
          </div>
        )}

        {!error && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-5 left-5 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-5 right-5 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-5 left-5 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-5 right-5 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-lg" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-5 text-center text-sm gap-4">
            <p>{error}</p>

            <Button
              type="button"
              variant="outline"
              className="bg-white text-black hover:bg-white/90"
              onClick={handleRestart}
            >
              Try Again
            </Button>
          </div>
        )}
      </div>

      <p className="text-white/50 text-xs text-center mt-4 max-w-xs">
        On iPhone, use Safari or Chrome with camera permission enabled.
      </p>
    </div>
  );
}
