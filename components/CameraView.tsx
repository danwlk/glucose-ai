
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { translations, Language } from '../translations';

interface CameraViewProps {
  onCapture: (image: string) => void;
  isLoading: boolean;
  lang?: Language;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, isLoading, lang = 'en' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1080 },
          height: { ideal: 1440 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError(t.cameraError);
      console.error(err);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.85);
    onCapture(imageData);
  }, [onCapture]);

  return (
    <div className="relative w-full aspect-[3/4] bg-black rounded-[2.2rem] overflow-hidden shadow-2xl">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center bg-gray-900">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-2xl mb-4">🚫</div>
          <p className="font-bold text-sm leading-relaxed">{error}</p>
        </div>
      ) : (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
      )}
      
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-64 h-64 border-2 border-white/30 border-dashed rounded-3xl animate-pulse"></div>
      </div>

      <div className="absolute top-6 inset-x-0 flex justify-center">
        <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
          <p className="text-[10px] font-black text-white uppercase tracking-widest">{t.alignFood}</p>
        </div>
      </div>

      <div className="absolute bottom-10 inset-x-0 flex justify-center items-center gap-8">
        <button
          onClick={captureFrame}
          disabled={isLoading || !!error}
          className={`relative group w-20 h-20 flex items-center justify-center transition-all duration-300 ${isLoading ? 'opacity-0 scale-50' : 'opacity-100 scale-100 active:scale-90'}`}
        >
          <div className="absolute inset-0 rounded-full border-4 border-white/40 group-active:border-white"></div>
          <div className="w-16 h-16 rounded-full bg-white shadow-xl shadow-white/20"></div>
          <div className="absolute w-12 h-12 rounded-full border-2 border-gray-200"></div>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraView;
