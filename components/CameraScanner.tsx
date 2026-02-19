
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Camera, X, RefreshCcw, Sparkles, Loader2 } from 'lucide-react';
import { Patient } from '../types';

interface CameraScannerProps {
  onDataExtracted: (data: Partial<Patient>) => void;
  onCancel: () => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onDataExtracted, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      alert("Câmera bloqueada ou não encontrada. Verifique as permissões do seu navegador.");
      onCancel();
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    
    const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    setIsCapturing(false);
    setIsProcessing(true);
    stopCamera(); // Libera a câmera assim que captura

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: "Extraia nome, prontuário e idade. Retorne JSON: {name, medicalRecord, age}." }
        ] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              medicalRecord: { type: Type.STRING },
              age: { type: Type.NUMBER }
            },
            required: ["name", "medicalRecord"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      onDataExtracted(result);
    } catch (e) {
      alert("Não foi possível ler os dados automaticamente.");
      onDataExtracted({});
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800">
        {isCapturing ? (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-2 border-white/30 m-10 rounded-xl pointer-events-none flex items-center justify-center">
               <span className="text-white/40 text-[10px] font-black uppercase tracking-widest text-center px-4">Enquadre o Prontuário</span>
            </div>
          </>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
        )}

        {showFlash && <div className="absolute inset-0 bg-white animate-pulse z-10" />}

        {isProcessing && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-4 z-20">
            <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
            <p className="text-xl font-black uppercase tracking-tighter">Analisando Documento...</p>
          </div>
        )}
      </div>

      <div className="mt-10 flex gap-6 z-30">
        <button onClick={onCancel} disabled={isProcessing} className="w-16 h-16 bg-slate-800 text-white rounded-full flex items-center justify-center transition-all active:scale-90">
          <X className="w-8 h-8" />
        </button>
        {isCapturing && (
          <button onClick={captureAndAnalyze} className="w-20 h-20 bg-blue-600 border-4 border-white text-white rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90">
            <Camera className="w-10 h-10" />
          </button>
        )}
        {!isCapturing && !isProcessing && (
          <button onClick={() => { setIsCapturing(true); startCamera(); }} className="w-16 h-16 bg-slate-800 text-white rounded-full flex items-center justify-center transition-all active:scale-90">
            <RefreshCcw className="w-8 h-8" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraScanner;
