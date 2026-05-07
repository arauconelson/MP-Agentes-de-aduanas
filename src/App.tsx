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
import { extractDocumentData, compareDocuments, ExtractedData } from './services/geminiService';
import { downloadAsExcel } from './lib/excel';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null); 
  const [file3, setFile3] = useState<File | null>(null); 
  const [file4, setFile4] = useState<File | null>(null); 
  const [docType, setDocType] = useState<"BL" | "INVOICE" | "ARRIVAL_NOTICE" | "SWIFT" | "COMPARISON">("BL");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      if (docType === "COMPARISON") {
        setFile(acceptedFiles[0] || null);
        setFile2(acceptedFiles[1] || null);
        setFile3(acceptedFiles[2] || null);
        setFile4(acceptedFiles[3] || null);
      } else {
        setFile(acceptedFiles[0]);
      }
      setError(null);
      setExtractedData(null);
    }
  }, [docType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    multiple: docType === "COMPARISON"
  } as any);

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (docType === "COMPARISON") {
        if (!file || !file2) throw new Error("Por favor sube al menos dos documentos (ej. BL y Factura) para la comparativa.");
        
        const b64_1 = await fileToBase64(file);
        const b64_2 = await fileToBase64(file2);
        
        const res1 = await extractDocumentData(b64_1, file.type, "BL");
        const res2 = await extractDocumentData(b64_2, file2.type, "INVOICE");
        
        let arrivalRes = null;
        if (file3) {
          const b64_3 = await fileToBase64(file3);
          arrivalRes = await extractDocumentData(b64_3, file3.type, "ARRIVAL_NOTICE");
        }

        let swiftRes = null;
        if (file4) {
          const b64_4 = await fileToBase64(file4);
          swiftRes = await extractDocumentData(b64_4, file4.type, "SWIFT");
        }
        
        const comparison = await compareDocuments(res1.blData, res2.invoiceData, arrivalRes?.arrivalData, swiftRes?.swiftData);
        
        setExtractedData({
          documentType: "COMPARISON",
          blData: res1.blData,
          invoiceData: res2.invoiceData,
          arrivalData: arrivalRes?.arrivalData,
          swiftData: swiftRes?.swiftData,
          comparison
        });
      } else {
        const base64 = await fileToBase64(file);
        const data = await extractDocumentData(base64, file.type, docType);
        setExtractedData(data);
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
                  {/* Type Selector */}
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button
                      onClick={() => setDocType("BL")}
                      className={`flex-1 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all ${docType === "BL" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      B/L
                    </button>
                    <button
                      onClick={() => setDocType("INVOICE")}
                      className={`flex-1 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all ${docType === "INVOICE" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Factura
                    </button>
                    <button
                      onClick={() => setDocType("ARRIVAL_NOTICE")}
                      className={`flex-1 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all ${docType === "ARRIVAL_NOTICE" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Aviso
                    </button>
                    <button
                      onClick={() => setDocType("SWIFT")}
                      className={`flex-1 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all ${docType === "SWIFT" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      SWIFT
                    </button>
                    <button
                      onClick={() => setDocType("COMPARISON")}
                      className={`flex-1 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all ${docType === "COMPARISON" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Comparativa
                    </button>
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
                      {docType === "COMPARISON" ? (
                        <>
                          <p className="font-bold text-slate-900 text-[10px] md:text-xs">
                            {file ? `✓ ${file.name}` : 'Subir Doc 1 (B/L)'}
                          </p>
                          <p className="font-bold text-slate-900 text-[10px] md:text-xs mt-1">
                            {file2 ? `✓ ${file2.name}` : 'Subir Doc 2 (Factura)'}
                          </p>
                          <p className="font-bold text-slate-900 text-[10px] md:text-xs mt-1">
                            {file3 ? `✓ ${file3.name}` : 'Subir Doc 3 (Opcional - Aviso)'}
                          </p>
                          <p className="font-bold text-slate-900 text-[10px] md:text-xs mt-1">
                            {file4 ? `✓ ${file4.name}` : 'Subir Doc 4 (Opcional - SWIFT)'}
                          </p>
                        </>
                      ) : (
                        <p className="font-bold text-slate-900">
                          {file ? file.name : 'Subir Documento'}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        PDF o Imágenes aceptados
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
                    {extractedData?.documentType === "BL" && extractedData.blData ? (
                      <div className="space-y-6">
                        <div className="p-4 space-y-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Datos Clave - B/L</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'B/L Number', value: extractedData.blData.importantItems.billOfLadingNo },
                              { label: 'Booking', value: extractedData.blData.importantItems.bookingNo },
                              { label: 'Carrier/Vessel', value: `${extractedData.blData.importantItems.vesselName || ''} ${extractedData.blData.importantItems.voyageNo || ''}` },
                              { label: 'Type of Move', value: extractedData.blData.importantItems.typeOfMove },
                              { label: 'Freight', value: extractedData.blData.importantItems.freightTerms },
                              { label: 'Payable At', value: extractedData.blData.importantItems.payableAt },
                              { label: 'Pre-Carriage', value: extractedData.blData.importantItems.preCarriageBy },
                              { label: 'Receipt At', value: extractedData.blData.importantItems.placeOfReceipt },
                              { label: 'POL', value: extractedData.blData.importantItems.portOfLoading },
                              { label: 'POD', value: extractedData.blData.importantItems.portOfDischarge },
                              { label: 'Delivery At', value: extractedData.blData.importantItems.placeOfDelivery },
                              { label: 'Shipped Date', value: extractedData.blData.importantItems.shippedOnBoardDate },
                              { label: 'Shipper', value: extractedData.blData.importantItems.shipper, full: true },
                              { label: 'Consignee', value: extractedData.blData.importantItems.consignee, full: true },
                              { label: 'Notify Party', value: extractedData.blData.importantItems.notifyParty, full: true },
                              { label: 'Delivery Agent', value: extractedData.blData.importantItems.deliveryAgent, full: true },
                            ].map((item, idx) => (
                              <div key={idx} className={`bg-white p-3 rounded-xl border border-slate-100 shadow-sm ${item.full ? 'col-span-2 md:col-span-4' : ''}`}>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</span>
                                <span className="text-xs font-semibold text-slate-800 break-words line-clamp-2">{item.value || '-'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : extractedData?.documentType === "INVOICE" && extractedData.invoiceData ? (
                      <div className="space-y-6">
                        <div className="p-4 space-y-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Datos Clave - Factura</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'Invoice #', value: extractedData.invoiceData.items.invoiceNumber },
                              { label: 'Fecha', value: extractedData.invoiceData.items.issueDate },
                              { label: 'Lugar', value: extractedData.invoiceData.items.issuePlace },
                              { label: 'Moneda', value: extractedData.invoiceData.items.currency },
                              { label: 'Total', value: extractedData.invoiceData.items.totalPrice },
                              { label: 'Incoterms', value: extractedData.invoiceData.items.incoterms },
                              { label: 'Vendedor', value: extractedData.invoiceData.items.sellerName, full: true },
                              { label: 'Comprador', value: extractedData.invoiceData.items.buyerName, full: true },
                            ].map((item, idx) => (
                              <div key={idx} className={`bg-white p-3 rounded-xl border border-slate-100 shadow-sm ${item.full ? 'col-span-2 md:col-span-4' : ''}`}>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</span>
                                <span className="text-xs font-semibold text-slate-800 break-words line-clamp-2">{item.value || '-'}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {extractedData.invoiceData.validation && (
                          <div className="p-4 space-y-4 border-t border-slate-100">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Validación de Aduanas (SUNAT)</p>
                            <div className="space-y-2">
                              {extractedData.invoiceData.validation.map((v, i) => (
                                <div key={i} className="flex gap-3 items-start bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                  <div className={`mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 rounded-full text-[10px] font-bold ${
                                    v.status === 'CUMPLE' ? 'bg-emerald-100 text-emerald-600' :
                                    v.status === 'NO CUMPLE' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {v.status === 'CUMPLE' ? '✓' : v.status === 'NO CUMPLE' ? '✗' : '-'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 leading-tight">{v.description}</p>
                                    <p className="text-[10px] text-slate-500 mt-1 italic">{v.comment}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : extractedData?.documentType === "ARRIVAL_NOTICE" && extractedData.arrivalData ? (
                      <div className="space-y-6">
                        <div className="p-4 space-y-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Datos Clave - Aviso de Llegada</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'B/L Number', value: extractedData.arrivalData.importantItems.billOfLadingNo },
                              { label: 'Nave / Viaje', value: extractedData.arrivalData.importantItems.vesselVoyage },
                              { label: 'ETA', value: extractedData.arrivalData.importantItems.eta },
                              { label: 'Terminal', value: extractedData.arrivalData.importantItems.warehouse },
                              { label: 'Puerto', value: extractedData.arrivalData.importantItems.portOfDischarge },
                              { label: 'Agente', value: extractedData.arrivalData.importantItems.freightForwarder },
                              { label: 'Contenedores', value: extractedData.arrivalData.importantItems.containers, full: true },
                              { label: 'Consignatario', value: extractedData.arrivalData.importantItems.consignatario, full: true },
                            ].map((item, idx) => (
                              <div key={idx} className={`bg-white p-3 rounded-xl border border-slate-100 shadow-sm ${item.full ? 'col-span-2 md:col-span-4' : ''}`}>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</span>
                                <span className="text-xs font-semibold text-slate-800 break-words line-clamp-2">{item.value || '-'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : extractedData?.documentType === "COMPARISON" && extractedData.comparison ? (
                      <div className="space-y-6">
                        <div className="p-4 space-y-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Auditoría Comparativa</p>
                          <div className="p-3 bg-blue-50 rounded-xl mb-4">
                            <p className="text-xs text-blue-700 leading-relaxed italic">{extractedData.comparison.summary}</p>
                          </div>
                          <div className="space-y-3">
                            {extractedData.comparison.matches.map((match, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{match.field}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    match.status === 'IDENTICO' ? 'bg-emerald-100 text-emerald-700' : 
                                    match.status === 'PARCIAL' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {match.status}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-[9px] text-slate-400 block uppercase">B/L</span>
                                    <span className="font-medium text-slate-700">{match.blValue || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 block uppercase">Factura</span>
                                    <span className="font-medium text-slate-700">{match.invoiceValue || '-'}</span>
                                  </div>
                                  {extractedData.arrivalData && (
                                    <div className="col-span-2 md:col-span-1">
                                      <span className="text-[9px] text-slate-400 block uppercase">Aviso</span>
                                      <span className="font-medium text-slate-700">{match.arrivalValue || '-'}</span>
                                    </div>
                                  )}
                                  {extractedData.swiftData && (
                                    <div className="col-span-2 md:col-span-1">
                                      <span className="text-[9px] text-slate-400 block uppercase">SWIFT</span>
                                      <span className="font-medium text-slate-700">{match.swiftValue || '-'}</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <span className="font-bold">Observación:</span> {match.observation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : extractedData?.documentType === "SWIFT" && extractedData.swiftData ? (
                      <div className="space-y-6">
                        <div className="p-4 space-y-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Datos Clave - SWIFT / Pago</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'Referencia', value: extractedData.swiftData.importantItems.transactionRef },
                              { label: 'Importe', value: `${extractedData.swiftData.importantItems.amount} ${extractedData.swiftData.importantItems.currency}` },
                              { label: 'Fecha Valor', value: extractedData.swiftData.importantItems.valueDate },
                              { label: 'Banco Emisor', value: extractedData.swiftData.importantItems.senderBank },
                              { label: 'Banco Receptor', value: extractedData.swiftData.importantItems.receiverBank },
                              { label: 'Ordenante', value: extractedData.swiftData.importantItems.orderingCustomer, full: true },
                              { label: 'Beneficiario', value: extractedData.swiftData.importantItems.beneficiary, full: true },
                              { label: 'Información de Remesa', value: extractedData.swiftData.importantItems.remittanceInfo, full: true },
                            ].map((item, idx) => (
                              <div key={idx} className={`bg-white p-3 rounded-xl border border-slate-100 shadow-sm ${item.full ? 'col-span-2 md:col-span-4' : ''}`}>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</span>
                                <span className="text-xs font-semibold text-slate-800 break-words line-clamp-2">{item.value || '-'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 italic">No se detectaron datos.</div>
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
