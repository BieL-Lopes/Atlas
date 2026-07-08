import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface Props {
  onScan: (rawText: string) => void;
  onClose: () => void;
}

const READER_ID = 'titulo-qr-reader';

export function QrScannerModal({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const scannedRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);

  const handleClose = () => {
    if (scannerRef.current && isRunningRef.current) {
      isRunningRef.current = false;
      scannerRef.current.stop().catch(() => {}).finally(() => onClose());
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const qr = new Html5Qrcode(READER_ID);
    scannerRef.current = qr;

    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText: string) => {
        if (scannedRef.current) return;
        scannedRef.current = true;
        isRunningRef.current = false;
        qr.stop().catch(() => {}).finally(() => onScan(decodedText));
      },
      () => {}
    ).then(() => {
      isRunningRef.current = true;
      setCameraReady(true);
    }).catch(() => {
      isRunningRef.current = false;
      onClose();
    });

    return () => {
      if (scannerRef.current && isRunningRef.current) {
        isRunningRef.current = false;
        scannerRef.current.stop().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gold-deep" />
            <h2 className="font-bold text-gray-900">Escanear Título de Eleitor</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div id={READER_ID} className="w-full" />

        {!cameraReady && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm gap-2">
            <Camera className="w-4 h-4 animate-pulse" />
            Iniciando câmera...
          </div>
        )}

        <p className="text-center text-sm text-gray-500 px-4 pb-4 pt-2">
          Aponte a câmera para o QR Code do título de eleitor
        </p>
      </div>
    </div>
  );
}
