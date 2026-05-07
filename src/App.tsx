/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileSpreadsheet, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Table as TableIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractTableData, ExtractedData } from './services/geminiService';
import { downloadAsExcel } from './lib/excel';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setExtractedData(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    multiple: false
  } as any);

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const data = await extractTableData(base64, file.type);
      setExtractedData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error inesperado al procesar el archivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const reset = () => {
    setFile(null);
    setExtractedData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-blue-100">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#0F172A] p-2 rounded-lg text-[#38BDF8] shadow-sm">
              <FileSpreadsheet size={22} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#0F172A]">LogiExtract <span className="text-[#38BDF8]">AI</span></span>
          </div>
          <div className="flex gap-4 items-center">
            <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">
              <span>Smart Logistics</span>
              <div className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>v2.0 Beta</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column: Branding & Steps */}
          <div className="space-y-8">
            <div className="space-y-5">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider border border-blue-100"
              >
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                Solución para Agentes de Carga
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight text-slate-900"
              >
                Digitaliza tus <br />
                <span className="text-blue-600">Bill of Lading.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-slate-500 max-w-md"
              >
                Extrae datos críticos de documentos marítimos y conviértelos en Excel estructurado con precisión milimétrica.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4">
              {[
                { title: 'Subida Segura', desc: 'Soporta PDF de bookings y imágenes de B/L.', icon: <Upload size={18}/> },
                { title: 'Análisis Horizontal', desc: 'Los datos se ordenan listos para tu ERP.', icon: <TableIcon size={18}/> },
              ].map((step, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{step.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Interaction Zone */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {!extractedData && !isProcessing ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-2xl shadow-blue-900/5 flex flex-col gap-6"
                >
                  <div 
                    {...getRootProps()} 
                    className={`
                      border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer
                      ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                      ${file ? 'border-emerald-500 bg-emerald-50/30' : ''}
                    `}
                  >
                    <input {...getInputProps()} />
                    <div className={`p-4 rounded-2xl ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {file ? <CheckCircle2 size={32} /> : <Upload size={32} />}
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-900">
                        {file ? file.name : 'Subir B/L o Booking'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Solo archivos PDF, PNG o JPG
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 items-center text-rose-600 text-sm">
                      <AlertCircle size={18} />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    onClick={processFile}
                    disabled={!file}
                    className={`
                      w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all
                      ${file 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                    `}
                  >
                    Iniciar Extracción <ArrowRight size={18} />
                  </button>
                </motion.div>
              ) : isProcessing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white p-12 rounded-[32px] border border-slate-200 shadow-2xl flex flex-col items-center justify-center gap-6 min-h-[440px]"
                >
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                    <motion.div 
                      className="absolute inset-0 bg-blue-600/10 blur-2xl rounded-full"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">IA en Procesamiento</h3>
                    <p className="text-sm text-slate-400 max-w-[240px]">
                      Estamos digitalizando las celdas de tu documento...
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-2xl flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <CheckCircle2 size={20} />
                      </div>
                      <h3 className="font-bold text-slate-900">Extraído con éxito</h3>
                    </div>
                    <button 
                      onClick={reset}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 transition-all"
                      title="Reiniciar"
                    >
                      <RefreshCw size={20} />
                    </button>
                  </div>

                  <div className="max-h-[500px] overflow-auto border border-slate-50 rounded-2xl custom-scrollbar bg-slate-50/50 p-4">
                    {extractedData && (
                      <div className="space-y-6">
                        <div className="p-4 space-y-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Datos Clave del Documento</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'B/L Number', value: extractedData.importantItems.billOfLadingNo },
                              { label: 'Booking', value: extractedData.importantItems.bookingNo },
                              { label: 'Carrier/Vessel', value: `${extractedData.importantItems.vesselName || ''} ${extractedData.importantItems.voyageNo || ''}` },
                              { label: 'Type of Move', value: extractedData.importantItems.typeOfMove },
                              { label: 'POL', value: extractedData.importantItems.portOfLoading },
                              { label: 'POD', value: extractedData.importantItems.portOfDischarge },
                              { label: 'Freight', value: extractedData.importantItems.freightTerms },
                              { label: 'Payable At', value: extractedData.importantItems.payableAt },
                              { label: 'Place of Issue', value: extractedData.importantItems.placeOfIssue },
                              { label: 'Date of Issue', value: extractedData.importantItems.dateOfIssue },
                              { label: 'Originals', value: extractedData.importantItems.numberOfOriginalBLs },
                              { label: 'Packages', value: extractedData.importantItems.totalPackages },
                              { label: 'Weight (KGS)', value: extractedData.importantItems.totalGrossWeight },
                              { label: 'Measure (CBM)', value: extractedData.importantItems.totalMeasurement },
                              { label: 'Shipper', value: extractedData.importantItems.shipper, full: true },
                              { label: 'Consignee', value: extractedData.importantItems.consignee, full: true },
                            ].map((item, idx) => (
                              <div key={idx} className={`bg-white p-3 rounded-xl border border-slate-100 shadow-sm ${item.full ? 'col-span-2 md:col-span-4' : ''}`}>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</span>
                                <span className="text-xs font-semibold text-slate-800 break-words line-clamp-2">{item.value || '-'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center italic">
                          Vista previa de tablas adicionales simplificada
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => extractedData && downloadAsExcel(extractedData)}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                  >
                    <Download size={18} /> Descargar Master Excel (.xlsx)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Background Decorations */}
            <div className="absolute -z-10 -top-12 -right-12 w-64 h-64 bg-blue-400/5 blur-[100px] rounded-full" />
            <div className="absolute -z-10 -bottom-12 -left-12 w-64 h-64 bg-cyan-400/5 blur-[100px] rounded-full" />
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="mt-20 border-t border-gray-100 py-12 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto md:mx-0">
              <ImageIcon className="text-orange-500" size={24} />
            </div>
            <h4 className="font-bold">Multiformato</h4>
            <p className="text-sm text-gray-500">Sube capturas de pantalla, fotos de recibos o documentos PDF oficiales.</p>
          </div>
          <div className="space-y-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto md:mx-0">
              <Loader2 className="text-blue-500" size={24} />
            </div>
            <h4 className="font-bold">IA Avanzada</h4>
            <p className="text-sm text-gray-500">Impulsado por Gemini Pro para entender estructuras complejas de datos.</p>
          </div>
          <div className="space-y-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto md:mx-0">
              <Download className="text-green-500" size={24} />
            </div>
            <h4 className="font-bold">Descarga Segura</h4>
            <p className="text-sm text-gray-500">Tus datos se procesan y se convierten instantáneamente a un formato estándar.</p>
          </div>
        </div>
        <div className="mt-12 text-center text-gray-400 text-xs tracking-widest uppercase">
          © 2024 DataExtractor AI • Automatiza tu flujo de trabajo
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
