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
  FileSearch,
  Table as TableIcon,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractDocumentData, compareDocuments, ExtractedData } from './services/geminiService';
import { downloadAsExcel } from './lib/excel';

export default function App() {
  const [activeModule, setActiveModule] = useState<"DASHBOARD" | "BL" | "INVOICE" | "ARRIVAL" | "SWIFT" | "COMPARISON">("DASHBOARD");
  const [file, setFile] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null); 
  const [file3, setFile3] = useState<File | null>(null); 
  const [file4, setFile4] = useState<File | null>(null); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [sessionResults, setSessionResults] = useState<{
    invoice?: any;
    bl?: any;
    arrival?: any;
    swift?: any;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [documentTimes, setDocumentTimes] = useState<{
    invoice?: number;
    bl?: number;
    arrival?: number;
    swift?: number;
    comparison?: number;
  }>({});

  const formatDuration = (seconds: number | undefined, short = false) => {
    if (seconds === undefined || seconds === 0) return short ? "0s" : "0 segundos";
    if (seconds < 60) {
      return short ? `${seconds}s` : `${seconds} segundos`;
    }
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (short) {
      return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
    }
    return remainingSecs > 0 ? `${mins} min ${remainingSecs} s` : `${mins} min`;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      if (activeModule === "COMPARISON") {
        // Multi-upload logic for comparison
        if (!file) {
          setFile(acceptedFiles[0]);
        } else if (!file2) {
          setFile2(acceptedFiles[0]);
        } else if (!file3) {
          setFile3(acceptedFiles[0]);
        } else if (!file4) {
          setFile4(acceptedFiles[0]);
        }
      } else {
        setFile(acceptedFiles[0]);
      }
      setError(null);
      setExtractedData(null);
    }
  }, [activeModule, file, file2, file3, file4]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    multiple: activeModule === "COMPARISON"
  } as any);

  const processFile = async () => {
    const isComparisonReady = activeModule === "COMPARISON" && !!(sessionResults.bl && sessionResults.invoice);
    if (!file && !isComparisonReady) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (activeModule === "COMPARISON") {
        let blToCompare = sessionResults.bl;
        let invoiceToCompare = sessionResults.invoice;
        let arrivalToCompare = sessionResults.arrival;
        let swiftToCompare = sessionResults.swift;

        let blDuration = 0;
        let invoiceDuration = 0;
        let arrivalDuration = 0;
        let swiftDuration = 0;

        // If files are uploaded in the comparison module, they override session data
        if (file && file2) {
          const tBl0 = Date.now();
          const b64_1 = await fileToBase64(file);
          const res1 = await extractDocumentData(b64_1, file.type, "BL");
          blToCompare = res1.blData;
          blDuration = Math.max(1, Math.round((Date.now() - tBl0) / 1000));

          const tInv0 = Date.now();
          const b64_2 = await fileToBase64(file2);
          const res2 = await extractDocumentData(b64_2, file2.type, "INVOICE");
          invoiceToCompare = res2.invoiceData;
          invoiceDuration = Math.max(1, Math.round((Date.now() - tInv0) / 1000));

          if (file3) {
            const tArr0 = Date.now();
            const b64_3 = await fileToBase64(file3);
            const res3 = await extractDocumentData(b64_3, file3.type, "ARRIVAL_NOTICE");
            arrivalToCompare = res3.arrivalData;
            arrivalDuration = Math.max(1, Math.round((Date.now() - tArr0) / 1000));
          }

          if (file4) {
            const tSw0 = Date.now();
            const b64_4 = await fileToBase64(file4);
            const res4 = await extractDocumentData(b64_4, file4.type, "SWIFT");
            swiftToCompare = res4.swiftData;
            swiftDuration = Math.max(1, Math.round((Date.now() - tSw0) / 1000));
          }
        }

        if (!blToCompare || !invoiceToCompare) {
          throw new Error("Se requiere al menos Factura y Bill of Lading para realizar la comparativa.");
        }
        
        setSessionResults(prev => ({
          ...prev,
          bl: blToCompare,
          invoice: invoiceToCompare,
          arrival: arrivalToCompare,
          swift: swiftToCompare
        }));

        const tComp0 = Date.now();
        const comparison = await compareDocuments(blToCompare, invoiceToCompare, arrivalToCompare, swiftToCompare);
        const comparisonDuration = Math.max(1, Math.round((Date.now() - tComp0) / 1000));
        
        setDocumentTimes(prev => ({
          ...prev,
          bl: blDuration || prev.bl,
          invoice: invoiceDuration || prev.invoice,
          arrival: arrivalDuration || prev.arrival,
          swift: swiftDuration || prev.swift,
          comparison: comparisonDuration
        }));

        setExtractedData({
          documentType: "COMPARISON",
          blData: blToCompare,
          invoiceData: invoiceToCompare,
          arrivalData: arrivalToCompare,
          swiftData: swiftToCompare,
          comparison
        });
      } else {
        const startTime = Date.now();
        const base64 = await fileToBase64(file!);
        const typeMap: Record<string, any> = {
          "BL": "BL",
          "INVOICE": "INVOICE",
          "ARRIVAL": "ARRIVAL_NOTICE",
          "SWIFT": "SWIFT"
        };
        const docType = typeMap[activeModule];
        const data = await extractDocumentData(base64, file!.type, docType);
        
        const endTime = Date.now();
        const durationSec = Math.max(1, Math.round((endTime - startTime) / 1000));

        setExtractedData(data);

        // Persistent Session Record
        setSessionResults(prev => ({
          ...prev,
          invoice: docType === "INVOICE" ? data.invoiceData : prev.invoice,
          bl: docType === "BL" ? data.blData : prev.bl,
          arrival: docType === "ARRIVAL_NOTICE" ? data.arrivalData : prev.arrival,
          swift: docType === "SWIFT" ? data.swiftData : prev.swift,
        }));

        setDocumentTimes(prev => {
          const key = activeModule.toLowerCase() as "invoice" | "bl" | "arrival" | "swift";
          return {
            ...prev,
            [key]: durationSec
          };
        });
      }
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
    setFile2(null);
    setFile3(null);
    setFile4(null);
    setExtractedData(null);
    setError(null);
  };

  const hardReset = () => {
    reset();
    setSessionResults({});
    setDocumentTimes({});
  };

  const totalSystemSec: number = Object.values(documentTimes).reduce((acc: number, val: any) => acc + (val || 0), 0) as number;
  const humanSec = 1200; // 20 minutes average baseline
  const savedSec = Math.max(0, humanSec - totalSystemSec);

  const totalSystemFormatted = formatDuration(totalSystemSec);
  const savedFormatted = formatDuration(savedSec);
  const savingsPct = Math.max(0, Math.min(100, Math.round((savedSec / humanSec) * 100)));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-blue-100">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#0F172A] p-2 rounded-lg text-[#38BDF8] shadow-sm">
              <FileSpreadsheet size={22} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#0F172A]">Revisor de <span className="text-[#38BDF8]">Documentos</span></span>
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

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {activeModule === "DASHBOARD" ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Módulos Especializados</h2>
                <p className="text-slate-500 max-w-2xl mx-auto italic">
                  Digitaliza tus documentos y compáralos para minimizar errores en la gestión logística y evita multas y sanciones.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { 
                    id: "INVOICE", 
                    title: "Módulo Factura Comercial", 
                    desc: "Revisión exhaustiva de 18 puntos SUNAT. Validación de precios, remitentes y legalidad.", 
                    icon: <FileText size={24} />, 
                    color: "emerald" 
                  },
                  { 
                    id: "BL", 
                    title: "Módulo Bill of Lading", 
                    desc: "Extracción de datos marítimos (B/L, Booking). Control de rutas, naves y pesos.", 
                    icon: <FileSpreadsheet size={24} />, 
                    color: "blue" 
                  },
                  { 
                    id: "COMPARISON", 
                    title: "Cuadro Comparativo", 
                    desc: "Cruce inteligente entre Factura, BL, Swift y Aviso. Auditoría multi-documental.", 
                    icon: <FileSearch size={24} />, 
                    color: "indigo" 
                  },
                  { 
                    id: "ARRIVAL", 
                    title: "Aviso de Llegada", 
                    desc: "Gestión de ETAs, terminales y almacenes. Control de fletes y cargos locales.", 
                    icon: <RefreshCw size={24} />, 
                    color: "amber" 
                  },
                  { 
                    id: "SWIFT", 
                    title: "Comprobante Swift", 
                    desc: "Verificación de pagos internacionales. Montos, bancos y beneficiarios.", 
                    icon: <CheckCircle2 size={24} />, 
                    color: "violet" 
                  }
                ].map((mod) => (
                  <motion.button
                    key={mod.id}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveModule(mod.id as any);
                      reset();
                    }}
                    className={`text-left p-6 rounded-[24px] bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-${mod.color}-200 transition-all group`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-${mod.color}-50 text-${mod.color}-600 flex items-center justify-center mb-6 group-hover:bg-${mod.color}-600 group-hover:text-white transition-colors`}>
                      {mod.icon}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{mod.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-4">{mod.desc}</p>
                    <div className={`flex items-center gap-2 text-${mod.color}-600 font-bold text-xs uppercase tracking-wider`}>
                      Abrir Módulo <ArrowRight size={14} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="module"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Module Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveModule("DASHBOARD")}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all font-bold text-xs flex items-center gap-2"
                  >
                    <RefreshCw size={14} className="rotate-180" /> Volver al Menú
                  </button>
                  <div className="h-4 w-[1px] bg-slate-200" />
                  <h2 className="text-2xl font-bold text-slate-900">
                    {activeModule === "BL" && "Módulo Bill of Lading"}
                    {activeModule === "INVOICE" && "Módulo Factura Comercial"}
                    {activeModule === "ARRIVAL" && "Aviso de Llegada"}
                    {activeModule === "SWIFT" && "Comprobante Swift"}
                    {activeModule === "COMPARISON" && "Cuadro Comparativo Integral"}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100`}>
                    Receptor Especializado
                  </div>
                </div>
              </div>

              {/* Stepper Component */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                <div className="flex items-center justify-between min-w-[600px] px-4">
                  {[
                    { id: "INVOICE", label: "Paso 1: Factura", icon: <FileText size={14} /> },
                    { id: "BL", label: "Paso 2: BL", icon: <FileSpreadsheet size={14} /> },
                    { id: "SWIFT", label: "Paso 3: Swift (Opc)", icon: <CheckCircle2 size={14} /> },
                    { id: "ARRIVAL", label: "Paso 4: Aviso (Opc)", icon: <RefreshCw size={14} /> },
                    { id: "COMPARISON", label: "Paso 5: Comparar", icon: <FileSearch size={14} /> }
                  ].map((step, idx) => {
                    const isCompleted = sessionResults[step.id.toLowerCase() as keyof typeof sessionResults] || (step.id === "COMPARISON" && sessionResults.invoice && sessionResults.bl);
                    const isActive = activeModule === step.id;
                    
                    return (
                      <React.Fragment key={step.id}>
                        <div 
                          onClick={() => { setActiveModule(step.id as any); reset(); }}
                          className={`flex flex-col items-center gap-2 cursor-pointer transition-all ${isActive ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                            isActive ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 
                            isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400'
                          }`}>
                            {isCompleted && !isActive ? <CheckCircle2 size={16} /> : step.icon}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{step.label}</span>
                          {documentTimes[step.id.toLowerCase() as keyof typeof documentTimes] !== undefined && (
                            <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.25 rounded-md flex items-center gap-0.5">
                              <Clock size={8} /> {formatDuration(documentTimes[step.id.toLowerCase() as keyof typeof documentTimes], true)}
                            </span>
                          )}
                        </div>
                        {idx < 4 && (
                          <div className={`h-[2px] flex-1 mx-4 min-w-[20px] rounded-full transition-colors ${
                            sessionResults[step.id.toLowerCase() as keyof typeof sessionResults] ? 'bg-emerald-200' : 'bg-slate-100'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Interaction Zone */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Upload Section */}
                <div className="lg:col-span-5 space-y-6">
                  {!extractedData && !isProcessing ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-2xl shadow-blue-900/5 flex flex-col gap-6"
                    >
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-900">Sube tus archivos</h3>
                        <p className="text-xs text-slate-500 italic">
                          {activeModule === "COMPARISON" 
                            ? (sessionResults.invoice && sessionResults.bl 
                               ? "Ya tienes registros en memoria. Puedes subir archivos nuevos para sobrescribir o comparar los actuales." 
                               : "Sube secuencialmente: 1. BL, 2. Factura, 3. SWIFT (opc), 4. Aviso (opc)")
                            : `Sube el archivo de ${activeModule} para revisión.`}
                        </p>
                      </div>

                      <div 
                        {...getRootProps()} 
                        className={`
                          border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer
                          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                          ${file ? 'border-emerald-500 bg-emerald-50/30' : ''}
                        `}
                      >
                        <input {...getInputProps()} />
                        <div className={`p-4 rounded-2xl ${file || file2 || file3 || file4 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {file ? <CheckCircle2 size={32} /> : <Upload size={32} />}
                        </div>
                        <div className="text-center">
                          {activeModule === "COMPARISON" ? (
                            <div className="space-y-2">
                              {sessionResults.invoice && sessionResults.bl && !file && (
                                <div className="mb-4 space-y-1">
                                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Registros Listos para Comparar ✓</p>
                                  <p className="text-[9px] text-slate-400 italic">Haz clic para subir nuevos archivos si deseas reemplazarlos</p>
                                </div>
                              )}
                              <p className="font-bold text-slate-900 text-xs">{file ? `✓ BL a usar: ${file.name}` : (sessionResults.bl ? '✓ BL Cargado en Sesión' : '❌ Esperando BL...')}</p>
                              <p className="font-bold text-slate-900 text-xs">{file2 ? `✓ Factura a usar: ${file2.name}` : (sessionResults.invoice ? '✓ Factura Cargadora en Sesión' : '❌ Esperando Factura...')}</p>
                              {( (file && file2) || (sessionResults.invoice && sessionResults.bl) ) && (
                                <p className="text-[10px] text-blue-500 font-bold uppercase mt-2 italic">+ Haz clic para añadir SWIFT o Aviso (Opcional)</p>
                              )}
                              {(file3 || file4 || sessionResults.swift || sessionResults.arrival) && (
                                <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                                  {(file3 || sessionResults.arrival) && <p className="text-[9px] text-slate-500 italic">✓ Aviso: {file3?.name || 'Cargado en Sesión'}</p>}
                                  {(file4 || sessionResults.swift) && <p className="text-[9px] text-slate-500 italic">✓ SWIFT: {file4?.name || 'Cargado en Sesión'}</p>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="font-bold text-slate-900">
                              {file ? file.name : (sessionResults[activeModule.toLowerCase() as keyof typeof sessionResults] ? '✓ Datos guardados (Haz clic para subir nuevo)' : 'Arrastra o haz clic aquí')}
                            </p>
                          )}
                          {!file && !sessionResults[activeModule.toLowerCase() as keyof typeof sessionResults] && <p className="text-[11px] text-slate-400 mt-1">Soporta PDF, PNG, JPG</p>}
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
                        disabled={activeModule === "COMPARISON" 
                          ? !( (file && file2) || (sessionResults.invoice && sessionResults.bl) )
                          : !file
                        }
                        className={`
                          w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all
                          ${(file && (activeModule !== "COMPARISON" || file2)) || (activeModule === "COMPARISON" && sessionResults.invoice && sessionResults.bl)
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                        `}
                      >
                        {activeModule === "COMPARISON" && sessionResults.invoice && sessionResults.bl && !file 
                          ? "Generar Comparativa con Datos Guardados" 
                          : "Iniciar Digitalización"} <ArrowRight size={18} />
                      </button>
                    </motion.div>
                  ) : isProcessing ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white p-12 rounded-[32px] border border-slate-200 shadow-2xl flex flex-col items-center justify-center gap-6 min-h-[400px]"
                    >
                      <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-slate-900">IA Procesando</h3>
                        <p className="text-sm text-slate-400">Analizando requerimientos específicos del módulo {activeModule}...</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Documento Listo</h3>
                        <button onClick={hardReset} className="text-xs text-rose-500 font-bold hover:underline">Reiniciar Todo</button>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                        <CheckCircle2 className="text-emerald-600" size={24} />
                        <div>
                          <p className="text-xs font-bold text-emerald-700">Digitalización Exitosa</p>
                          <p className="text-[10px] text-emerald-600 italic">Los datos se han extraído siguiendo los protocolos del módulo.</p>
                        </div>
                      </div>

                      {/* diagnostic review time circle representation */}
                      {documentTimes[activeModule.toLowerCase() as keyof typeof documentTimes] !== undefined && (
                        <div className="flex items-center gap-3.5 bg-blue-50/55 p-4 rounded-2xl border border-blue-100 shadow-sm border-dashed">
                          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex flex-col items-center justify-center font-bold font-mono text-xs shrink-0 shadow-lg shadow-blue-100">
                            <span className="text-[9px] uppercase tracking-wider font-sans text-blue-100 leading-none">IA</span>
                            <span className="leading-tight mt-0.5">{documentTimes[activeModule.toLowerCase() as keyof typeof documentTimes]}s</span>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-blue-950">Tiempo de Revisión Inteligente</p>
                            <p className="text-[10px] text-blue-700 font-medium">La IA completó el análisis de este documento en <span className="font-extrabold text-blue-800">{formatDuration(documentTimes[activeModule.toLowerCase() as keyof typeof documentTimes])}</span>.</p>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => extractedData && downloadAsExcel(extractedData)}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                      >
                        <Download size={16} /> Exportar Reporte (.xlsx)
                      </button>

                      {activeModule === "INVOICE" && extractedData && (
                        <button
                          onClick={() => {
                            setActiveModule("BL");
                            reset();
                          }}
                          className="w-full py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all"
                        >
                          Siguiente: Validar Bill of Lading <ArrowRight size={16} />
                        </button>
                      )}
                      
                      {activeModule === "BL" && extractedData && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">Continúa con los Pasos Opcionales</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setActiveModule("SWIFT");
                                reset();
                              }}
                              className="py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-violet-100 transition-all"
                            >
                              <CheckCircle2 size={12} /> Paso 3: Swift
                            </button>
                            <button
                              onClick={() => {
                                setActiveModule("ARRIVAL");
                                reset();
                              }}
                              className="py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-amber-100 transition-all"
                            >
                              <RefreshCw size={12} /> Paso 4: Aviso
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setActiveModule("COMPARISON");
                              reset();
                            }}
                            className="w-full mt-2 py-3 bg-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                          >
                            Ir a Cuadro Comparativo <FileSearch size={16} />
                          </button>
                        </div>
                      )}

                      {(activeModule === "ARRIVAL" || activeModule === "SWIFT") && extractedData && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">¿Deseas añadir otro documento?</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setActiveModule(activeModule === "SWIFT" ? "ARRIVAL" : "SWIFT");
                                reset();
                              }}
                              className={`py-2 border rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                                activeModule === "SWIFT" 
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" 
                                : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                              }`}
                            >
                              {activeModule === "SWIFT" ? <RefreshCw size={12} /> : <CheckCircle2 size={12} />} 
                              {activeModule === "SWIFT" ? "Añadir Aviso" : "Añadir Swift"}
                            </button>
                            <button
                               onClick={() => {
                                setActiveModule("COMPARISON");
                                reset();
                              }}
                              className="py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-indigo-100 transition-all"
                            >
                              <FileSearch size={12} /> Comparar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-slate-900 text-slate-300 p-6 rounded-[32px] space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-l-2 border-blue-500 pl-3">Requerimientos del Módulo</h4>
                    <ul className="space-y-3">
                      {activeModule === "INVOICE" && [
                        "Validación de 18 puntos SUNAT",
                        "Control de precio real pagado",
                        "Verificación de IncoTerms y Origen",
                        "Cruce de vendedor/comprador"
                      ].map((item, i) => (
                        <li key={i} className="text-[10px] flex items-center gap-2"><div className="w-1 h-1 bg-blue-500 rounded-full" /> {item}</li>
                      ))}
                      {activeModule === "BL" && [
                        "Trazabilidad de Nave y Viaje",
                        "Extracto de Puerto Carga/Descarga",
                        "Digitalización de Contenedores y Sellos",
                        "Validación de fechas 'Shipped on Board'"
                      ].map((item, i) => (
                        <li key={i} className="text-[10px] flex items-center gap-2"><div className="w-1 h-1 bg-blue-500 rounded-full" /> {item}</li>
                      ))}
                      {activeModule === "COMPARISON" && [
                        "Cruce Shipper/Consignee (8 campos)",
                        "Detección de inconsistencias en Fletes",
                        "Validación de Montos Factura vs Swift",
                        "Auditoría integral logística"
                      ].map((item, i) => (
                        <li key={i} className="text-[10px] flex items-center gap-2"><div className="w-1 h-1 bg-blue-500 rounded-full" /> {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Results Section */}
                <div className="lg:col-span-7">
                  {extractedData ? (
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-xl min-h-[600px] overflow-hidden">
                      <div className="max-h-[800px] overflow-auto custom-scrollbar pr-2">
                        {extractedData?.documentType === "BL" && extractedData.blData ? (
                           <div className="space-y-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Resultados Detallados - B/L</p>
                                {documentTimes.bl && (
                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1.5">
                                    ⏱️ IA: {formatDuration(documentTimes.bl)}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  { label: 'B/L Number', value: extractedData.blData.importantItems.billOfLadingNo },
                                  { label: 'Booking', value: extractedData.blData.importantItems.bookingNo },
                                  { label: 'Carrier/Vessel', value: `${extractedData.blData.importantItems.vesselName || ''} ${extractedData.blData.importantItems.voyageNo || ''}` },
                                  { label: 'Type of Move', value: extractedData.blData.importantItems.typeOfMove },
                                  { label: 'POL', value: extractedData.blData.importantItems.portOfLoading },
                                  { label: 'POD', value: extractedData.blData.importantItems.portOfDischarge },
                                  { label: 'Shipper', value: extractedData.blData.importantItems.shipper, full: true },
                                  { label: 'Consignee', value: extractedData.blData.importantItems.consignee, full: true },
                                ].map((item, idx) => (
                                  <div key={idx} className={`bg-slate-50 p-3 rounded-xl border border-slate-100 ${item.full ? 'col-span-2' : ''}`}>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</span>
                                    <span className="text-xs font-semibold text-slate-800 break-words line-clamp-3">{item.value || '-'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : extractedData?.documentType === "SWIFT" && extractedData.swiftData ? (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-violet-600">Extracto Bancario - SWIFT MT103</p>
                              {documentTimes.swift && (
                                <span className="px-2.5 py-1 text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 rounded-full flex items-center gap-1.5">
                                  ⏱️ IA: {formatDuration(documentTimes.swift)}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: 'Monto', value: `${extractedData.swiftData.importantItems.currency || ''} ${extractedData.swiftData.importantItems.amount || ''}`, full: true },
                                { label: 'Fecha Valor', value: extractedData.swiftData.importantItems.valueDate },
                                { label: 'Referencia', value: extractedData.swiftData.importantItems.transactionRef },
                                { label: 'Banco Emisor', value: extractedData.swiftData.importantItems.senderBank },
                                { label: 'Banco Receptor', value: extractedData.swiftData.importantItems.receiverBank },
                                { label: 'Ordenante', value: extractedData.swiftData.importantItems.orderingCustomer, full: true },
                                { label: 'Beneficiario', value: extractedData.swiftData.importantItems.beneficiary, full: true },
                                { label: 'Concepto', value: extractedData.swiftData.importantItems.remittanceInfo, full: true },
                              ].map((item, idx) => (
                                <div key={idx} className={`bg-slate-50 p-3 rounded-xl border border-slate-100 ${item.full ? 'col-span-2' : ''}`}>
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</span>
                                  <span className="text-xs font-semibold text-slate-800 break-words">{item.value || '-'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : extractedData?.documentType === "ARRIVAL_NOTICE" && extractedData.arrivalData ? (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Extracto Logístico - Aviso de Llegada</p>
                              {documentTimes.arrival && (
                                <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1.5">
                                  ⏱️ IA: {formatDuration(documentTimes.arrival)}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: 'Nro. B/L', value: extractedData.arrivalData.importantItems.billOfLadingNo },
                                { label: 'ETA / LLEGADA', value: extractedData.arrivalData.importantItems.eta },
                                { label: 'Vessel / Voyage', value: extractedData.arrivalData.importantItems.vesselVoyage },
                                { label: 'Port of Discharge', value: extractedData.arrivalData.importantItems.portOfDischarge },
                                { label: 'Consignatario', value: extractedData.arrivalData.importantItems.consignatario, full: true },
                                { label: 'Terminal / Almacén', value: extractedData.arrivalData.importantItems.warehouse, full: true },
                                { label: 'Containers', value: extractedData.arrivalData.importantItems.containers, full: true },
                                { label: 'Bultos', value: extractedData.arrivalData.importantItems.totalPackages },
                                { label: 'Peso', value: extractedData.arrivalData.importantItems.totalWeight },
                                { label: 'Gastos Locales', value: extractedData.arrivalData.importantItems.localCharges, full: true },
                              ].map((item, idx) => (
                                <div key={idx} className={`bg-slate-50 p-3 rounded-xl border border-slate-100 ${item.full ? 'col-span-2' : ''}`}>
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</span>
                                  <span className="text-xs font-semibold text-slate-800 break-words">{item.value || '-'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : extractedData?.documentType === "INVOICE" && extractedData.invoiceData ? (
                          <div className="space-y-8">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider text-blue-500">I. Información General de Factura</p>
                                {documentTimes.invoice && (
                                  <span className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1.5">
                                    ⏱️ IA: {formatDuration(documentTimes.invoice)}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  { label: 'Invoice #', value: extractedData.invoiceData.items.invoiceNumber },
                                  { label: 'Fecha', value: extractedData.invoiceData.items.issueDate },
                                  { label: 'Moneda', value: extractedData.invoiceData.items.currency },
                                  { label: 'Total', value: extractedData.invoiceData.items.totalPrice },
                                  { label: 'Incoterms', value: extractedData.invoiceData.items.incoterms },
                                  { label: 'Vendedor', value: extractedData.invoiceData.items.sellerName, full: true },
                                  { label: 'Comprador', value: extractedData.invoiceData.items.buyerName, full: true },
                                ].map((item, idx) => (
                                  <div key={idx} className={`bg-slate-50 p-3 rounded-xl border border-slate-100 ${item.full ? 'col-span-2' : ''}`}>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</span>
                                    <span className="text-xs font-semibold text-slate-800 line-clamp-2">{item.value || '-'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="p-1 space-y-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2">
                                <CheckCircle2 size={14} /> II. Validación SUNAT (18 Puntos Clave)
                              </p>
                              <div className="grid grid-cols-1 gap-2">
                                {extractedData.invoiceData.validation.map((v, i) => (
                                  <div key={i} className="flex gap-3 items-start bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <div className={`mt-0.5 w-6 h-6 flex items-center justify-center shrink-0 rounded-lg text-[11px] font-bold ${
                                      v.status === 'CUMPLE' ? 'bg-emerald-100 text-emerald-600' :
                                      v.status === 'NO CUMPLE' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {v.index}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[11px] font-bold text-slate-800 leading-tight">{v.description}</p>
                                        <span className={`text-[8px] font-bold px-1.5 py-0.25 rounded-md uppercase ${
                                          v.status === 'CUMPLE' ? 'bg-emerald-50 text-emerald-600' :
                                          v.status === 'NO CUMPLE' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
                                        }`}>
                                          {v.status}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 leading-snug italic">{v.comment}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : extractedData?.documentType === "COMPARISON" && extractedData.comparison ? (
                          <div className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2">
                                <FileSearch size={14} /> Auditoría Comparativa Multi-Documental
                              </p>
                              {totalSystemSec > 0 && (
                                <span className="px-3 py-1 text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-200 rounded-full flex items-center gap-1.5 animate-pulse">
                                  ⚡ IA Ahorro Activo: -{savingsPct}%
                                </span>
                              )}
                            </div>

                            {/* Panel de Ahorro de Tiempo de Auditoría */}
                            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-[24px] border border-slate-800 shadow-xl relative overflow-hidden">
                              <div className="absolute top-1/2 -right-4 -translate-y-1/2 p-8 opacity-[0.03] pointer-events-none select-none">
                                <Clock size={160} className="text-white" />
                              </div>
                              
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      Análisis Multi-Documental Completado
                                    </span>
                                  </div>
                                  <h3 className="text-lg font-bold tracking-tight text-white md:text-xl">
                                    ¡Comparación en Tiempo Récord!
                                  </h3>
                                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                                    Hemos consolidado y validado tus documentos logísticos en fracción de segundos. El tiempo promedio estimado para esta revisión realizada manualmente por un auditor humano es de <span className="font-bold text-slate-100">20 minutos</span>.
                                  </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0 bg-white/5 p-4 rounded-2xl border border-white/10">
                                  <div className="w-14 h-14 rounded-full border-4 border-emerald-500 flex flex-col items-center justify-center bg-indigo-950 shadow-md">
                                    <span className="text-xs font-extrabold text-emerald-400 leading-none">{savingsPct}%</span>
                                    <span className="text-[7px] uppercase tracking-widest text-[#94A3B8] font-bold mt-1">Ahorro</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Tiempo Total IA</p>
                                    <p className="text-base font-extrabold text-white">{totalSystemFormatted}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-slate-800 mt-5 relative z-10">
                                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Revisión Manual (Humana)</span>
                                  <span className="text-base font-semibold text-slate-300">20 minutos</span>
                                </div>
                                <div className="bg-indigo-950/50 p-3 rounded-xl border border-indigo-900/30">
                                  <span className="block text-[9px] font-bold text-indigo-300 uppercase tracking-wider font-semibold">Revisión IA Consolidada</span>
                                  <span className="text-base font-extrabold text-blue-400">{totalSystemFormatted}</span>
                                </div>
                                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                                  <span className="block text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-semibold">Tiempo total ahorrado</span>
                                  <span className="text-base font-extrabold text-emerald-400">Te has ahorrado {savedFormatted}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
                              <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                  <tr className="bg-[#0F172A] text-white border-b border-slate-200">
                                    <th className="p-3 text-[10px] font-bold text-blue-300 uppercase">Campo</th>
                                    <th className="p-3 text-[10px] font-bold text-white uppercase">Factura</th>
                                    <th className="p-3 text-[10px] font-bold text-white uppercase">BL</th>
                                    {extractedData.swiftData && <th className="p-3 text-[10px] font-bold text-white uppercase text-center">Swift</th>}
                                    {extractedData.arrivalData && <th className="p-3 text-[10px] font-bold text-white uppercase text-center">Aviso</th>}
                                    <th className="p-3 text-[10px] font-bold text-blue-400 uppercase">Resultado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {extractedData.comparison.matches.map((match, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                      <td className="p-3 text-[10px] font-bold text-slate-500 bg-slate-50/10">{match.field}</td>
                                      <td className="p-3 text-[10px] text-slate-700">{match.invoiceValue || '-'}</td>
                                      <td className="p-3 text-[10px] text-slate-700">{match.blValue || '-'}</td>
                                      {extractedData.swiftData && <td className="p-3 text-[10px] text-slate-700 text-center">{match.swiftValue || '-'}</td>}
                                      {extractedData.arrivalData && <td className="p-3 text-[10px] text-slate-700 text-center">{match.arrivalValue || '-'}</td>}
                                      <td className="p-3">
                                        <div className="flex flex-col gap-1">
                                          <span className={`self-start px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                            match.status === 'IDENTICO' ? 'bg-emerald-100 text-emerald-600' :
                                            match.status === 'PARCIAL' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                                          }`}>
                                            {match.status}
                                          </span>
                                          <p className="text-[8px] text-slate-400 italic leading-none truncate w-[120px]" title={match.observation}>{match.observation}</p>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <p className="text-xs font-bold text-slate-900 mb-1">Resumen Auditado:</p>
                                <p className="text-[11px] text-slate-600 leading-relaxed italic">{extractedData.comparison.summary}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 italic">Visualización del módulo no disponible.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[600px] border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center text-slate-400 p-12 text-center space-y-4">
                      <div className="p-6 rounded-full bg-slate-50">
                        <FileText size={48} className="opacity-20" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-500">Visor de Resultados</p>
                        <p className="text-xs max-w-xs">Sube y procesa tus documentos para ver la digitalización estructurada en este panel.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Background Decorations */}
        <div className="absolute -z-10 -top-12 -right-12 w-64 h-64 bg-blue-400/5 blur-[100px] rounded-full" />
        <div className="absolute -z-10 -bottom-12 -left-12 w-64 h-64 bg-cyan-400/5 blur-[100px] rounded-full" />
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
          © 2024 Revisor de Documentos Logísticos • Inteligencia para Operadores
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
