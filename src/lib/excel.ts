import XLSX from 'xlsx-js-style';
import { ExtractedData } from '../services/geminiService';

// Executive Color Palette
const COLORS = {
  HEADER_BG: '1E293B', // Slate 800
  HEADER_TEXT: 'FFFFFF',
  SUCCESS_BG: 'DCFCE7', // Emerald 50
  SUCCESS_TEXT: '166534', // Emerald 800
  WARNING_BG: 'FEF3C7', // Amber 50
  WARNING_TEXT: '92400E', // Amber 800
  DANGER_BG: 'FEE2E2', // Rose 50
  DANGER_TEXT: '991B1B', // Rose 800
  INFO_BG: 'F1F5F9', // Slate 100
};

function applyExecutiveStyles(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[address]) continue;

      const cell = ws[address];
      const val = String(cell.v || '');

      // DEFAULT STYLE
      cell.s = {
        font: { name: 'Calibri', sz: 10 },
        alignment: { vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      // TITLE STYLE (First row typically)
      const isTitle = val.includes('REPORTE') || val.includes('DETALLE ESTRUCTURADO') || val.includes('RESUMEN EJECUTIVO') || val.includes('DIGITALIZACIÓN');
      if (R === 0 && isTitle) {
        cell.s.font = { name: 'Calibri', sz: 16, bold: true, color: { rgb: COLORS.HEADER_BG } };
        cell.s.fill = { fgColor: { rgb: COLORS.INFO_BG } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
        cell.s.border = {};
        continue;
      }

      // SUBTITLE / SECTION STYLE
      const isSubtitle = val.includes('DATOS') || val.includes('FACTURA') || val.includes('REQUISITO') || val.includes('COMPARATIVO') || val.includes('MERCANCÍA') || val.includes('ITEMS') || val.includes('HALLAZGOS');
      if (R >= 1 && R <= 25 && isSubtitle && (val === val.toUpperCase() || val.endsWith(':'))) {
        cell.s.font = { bold: true, color: { rgb: '334155' } }; // Slate 700
        cell.s.fill = { fgColor: { rgb: 'F8FAFC' } };
        if (val.endsWith(':')) {
           cell.s.alignment.horizontal = 'right';
        }
        continue;
      }

      // EXPLICIT HEADERS (Table Column Headers)
      const isHeader = (
        val === "#" || 
        val === "ITEM" || 
        val === "Nro" ||
        val === "QTY" ||
        val === "CANT" ||
        val === "CANTIDAD" ||
        val === "DESC" ||
        val.includes("PUNTO DE CONTROL") || 
        val.includes("CONCEPTO") || 
        val.includes("FACTURA") || 
        val.includes("ESTADO") || 
        val.includes("OBSERVACIÓN") || 
        val.includes("HALLAZGO") || 
        val.includes("CANTIDAD") || 
        val.includes("DESCRIPCIÓN") ||
        val.includes("IDENTIFICADA") ||
        val.includes("COMPARATIVO") ||
        val.includes("REFERENCIA") ||
        val.includes("VALOR") ||
        val.includes("UNIT.") ||
        val.includes("TIPO") ||
        val === "TOTAL" ||
        val === "SHIPPER" ||
        val === "CONSIGNEE" ||
        val === "VESSEL" ||
        val === "MONEDA" ||
        val === "AMOUNT" ||
        val === "PRICE" ||
        val === "PARTIDAS" ||
        val === "VALIDACIÓN FLETE" ||
        val === "OCEAN FREIGHT"
      );

      if (isHeader && R > 0) {
        cell.s.font = { bold: true, color: { rgb: COLORS.HEADER_TEXT } };
        cell.s.fill = { fgColor: { rgb: COLORS.HEADER_BG } };
        cell.s.alignment.horizontal = 'center';
        cell.s.alignment.vertical = 'center';
        continue;
      }

      // LABEL STYLE (Rows with labels like "Nombre:")
      if (val.endsWith(':')) {
        cell.s.font = { bold: true, color: { rgb: '475569' } };
        cell.s.alignment.horizontal = 'right';
        continue;
      }

      // STATUS COLORS (Exact match preferred to avoid false positives)
      const upperVal = val.trim().toUpperCase();
      if (upperVal === 'CUMPLE' || upperVal === 'IDENTICO' || upperVal === '[✓] CUMPLE' || upperVal === 'FLETADO') {
        cell.s.fill = { fgColor: { rgb: COLORS.SUCCESS_BG } };
        cell.s.font.color = { rgb: COLORS.SUCCESS_TEXT };
        cell.s.font.bold = true;
      } else if (upperVal === 'PARCIAL' || upperVal === 'NO APLICA' || upperVal === '[-] NO APLICA') {
        cell.s.fill = { fgColor: { rgb: COLORS.WARNING_BG } };
        cell.s.font.color = { rgb: COLORS.WARNING_TEXT };
        cell.s.font.bold = true;
      } else if (upperVal === 'NO CUMPLE' || upperVal === 'DIFERENTE' || upperVal === '[X] NO CUMPLE' || upperVal === 'FALTA FLETAR') {
        cell.s.fill = { fgColor: { rgb: COLORS.DANGER_BG } };
        cell.s.font.color = { rgb: COLORS.DANGER_TEXT };
        cell.s.font.bold = true;
      }
    }
  }
}

export function downloadAsExcel(extractedData: ExtractedData) {
  const wb = XLSX.utils.book_new();
  
  if (extractedData.documentType === "BL" && extractedData.blData) {
    const items = extractedData.blData.importantItems;
    const headers = [
      "B/L NUMBER", "BOOKING NO", "SHIPPER", "CONSIGNEE", "NOTIFY PARTY", "DELIVERY AGENT",
      "PORT OF LOADING", "PORT OF DISCHARGE", "VESSEL", "VOYAGE", "FREIGHT TERMS", 
      "DATE OF ISSUE", "SHIPPED ON BOARD", "OCEAN FREIGHT", "VALIDACIÓN FLETE"
    ];

    // Determine freight status logic
    const hasFreight = items.oceanFreight && (items.oceanFreight.includes('$') || items.oceanFreight.match(/\d/));
    const freightStatus = hasFreight ? "FLETADO" : "FALTA FLETAR";

    const values = [
      items.billOfLadingNo || "", items.bookingNo || "", items.shipper || "", items.consignee || "", 
      items.notifyParty || "", items.deliveryAgent || "", 
      items.portOfLoading || "", items.portOfDischarge || "", 
      items.vesselName || "", items.voyageNo || "", items.freightTerms || "",
      items.dateOfIssue || "", items.shippedOnBoardDate || "20- MAR - 2026", 
      items.oceanFreight || "0.00", freightStatus
    ];

    const finalRows: any[][] = [
      ["REPORTE DE DIGITALIZACIÓN: BILL OF LADING"],
      [""],
      headers,
      values,
      [""]
    ];

    if (extractedData.blData.tables.length > 0) {
      extractedData.blData.tables.forEach((table) => {
        finalRows.push([table.name.toUpperCase()]);
        finalRows.push(table.headers);
        table.data.forEach(r => finalRows.push(r));
        finalRows.push([""]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(finalRows);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    applyExecutiveStyles(ws);
    XLSX.utils.book_append_sheet(wb, ws, "LogiData_BL");
    XLSX.writeFile(wb, `LogiExtract_BL_${items.billOfLadingNo || 'DOC'}.xlsx`);

  } else if (extractedData.documentType === "INVOICE" && extractedData.invoiceData) {
    const items = extractedData.invoiceData.items;
    
    // SHEET 1: VALIDACIÓN SUNAT (18 Puntos)
    const validationRows: any[][] = [
      ["REPORTE DE AUDITORÍA: VALIDACIÓN DE FACTURA COMERCIAL (SUNAT)"],
      ["", "DATOS GENERALES DE LA OPERACIÓN"],
      ["", "Empresa Compradora:", items.buyerName || 'N/A'],
      ["", "Factura Pro-forma/Comercial:", items.invoiceNumber || 'N/A'],
      ["", "Fecha de Emisión:", items.issueDate || 'N/A'],
      ["", "IncoTerm Pactado:", items.incoterms || 'N/A'],
      ["", "Valor total de factura:", `${items.currency || ''} ${items.totalPrice || ''}`],
      ["", "Fecha de Auditoría:", new Date().toLocaleDateString()],
      [""],
      ["#", "REQUISITO / PUNTO DE CONTROL (CRITERIO)", "ESTADO", "OBSERVACIÓN DETALLADA / SUSTENTO"]
    ];

    if (extractedData.invoiceData.validation) {
      extractedData.invoiceData.validation.forEach(v => {
        const statusText = v.status === 'CUMPLE' ? "CUMPLE" : 
                           v.status === 'NO CUMPLE' ? "NO CUMPLE" : "NO APLICA";
        validationRows.push([v.index, v.description, statusText, v.comment]);
      });
    }

    const wsValidation = XLSX.utils.aoa_to_sheet(validationRows);
    wsValidation['!cols'] = [{ wch: 8 }, { wch: 55 }, { wch: 18 }, { wch: 65 }];
    wsValidation['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Title
      { s: { r: 1, c: 1 }, e: { r: 1, c: 3 } }  // Subtitle
    ];
    applyExecutiveStyles(wsValidation);
    XLSX.utils.book_append_sheet(wb, wsValidation, "1. VALIDACION SUNAT");

    // SHEET 2: TIPEO DE PARTIDAS (Line Items)
    const typingRows: any[][] = [
      ["DETALLE ESTRUCTURADO DE PARTIDAS DIGITALIZADAS"],
      ["", "FACTURA COMERCIAL: " + (items.invoiceNumber || "S/N"), "", "Fecha:", items.issueDate || "S/N"],
      [""],
      ["DATOS DEL VENDEDOR / SHIPPER:"],
      ["Nombre/Razón Social:", items.sellerName, "Email:", items.sellerEmail || "-"],
      ["Dirección:", items.sellerAddress, "Teléfono:", items.sellerPhone || "-"],
      [""],
      ["DATOS DEL COMPRADOR / CONSIGNEE:"],
      ["Nombre/Razón Social:", items.buyerName, "Email:", items.buyerEmail || "-"],
      ["Dirección:", items.buyerAddress, "Teléfono:", items.buyerPhone || "-"],
      [""],
      ["DATOS LOGÍSTICOS Y COMERCIALES:"],
      ["Condición de Pago:", items.paymentTerms, "IncoTerm:", items.incoterms],
      ["País de Origen:", items.originOfGoods, "Moneda:", items.currency],
      ["Puerto de Carga:", items.portOfLoading || "-", "Puerto Descarga:", items.portOfDischarge || "-"],
      [""],
      ["DETALLE DE MERCANCÍA (LINE ITEMS)"]
    ];

    if (extractedData.invoiceData.tables && extractedData.invoiceData.tables.length > 0) {
      extractedData.invoiceData.tables.forEach((table, tIdx) => {
        if (tIdx > 0) {
          typingRows.push([""]);
          typingRows.push([table.name.toUpperCase()]);
        }
        typingRows.push(table.headers);
        table.data.forEach(row => typingRows.push(row));
      });
    } else {
      typingRows.push(["ITEM", "DESCRIPCIÓN DETALLADA", "CANTIDAD", "U.M", "PRECIO UNIT.", "TOTAL"]);
      typingRows.push(["1", items.descriptionOfGoods || "Varios", items.quantity || "1", "UN", items.unitPrice || items.totalPrice, items.totalPrice]);
    }
    
    // Add weights and marks if present
    if (items.grossWeight || items.netWeight || items.shippingMarks || items.packingType) {
      typingRows.push([""]);
      typingRows.push(["PESOS Y EMBALAJE:"]);
      if (items.grossWeight) typingRows.push(["Peso Bruto:", items.grossWeight]);
      if (items.netWeight) typingRows.push(["Peso Neto:", items.netWeight]);
      if (items.shippingMarks) typingRows.push(["Marcas:", items.shippingMarks]);
      if (items.packingType) typingRows.push(["Tipo Embalaje:", items.packingType]);
    }

    // Proactive Additional Information Section
    if (extractedData.invoiceData.additionalIdentifiedInfo && extractedData.invoiceData.additionalIdentifiedInfo.length > 0) {
      typingRows.push([""]);
      typingRows.push(["OTRA INFORMACIÓN RELEVANTE IDENTIFICADA (IA):"]);
      extractedData.invoiceData.additionalIdentifiedInfo.forEach(info => {
        typingRows.push([info.label + ":", info.value]);
      });
    }

    const wsTyping = XLSX.utils.aoa_to_sheet(typingRows);
    wsTyping['!cols'] = [{ wch: 22 }, { wch: 55 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
    wsTyping['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Main title
      { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } }, // Seller name merge
      { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } }, // Seller address merge
      { s: { r: 8, c: 1 }, e: { r: 8, c: 2 } }, // Buyer name merge
      { s: { r: 9, c: 1 }, e: { r: 9, c: 2 } }  // Buyer address merge
    ];
    applyExecutiveStyles(wsTyping);
    XLSX.utils.book_append_sheet(wb, wsTyping, "2. TIPEO DE ITEMS");

    XLSX.writeFile(wb, `Auditoria_Factura_${items.invoiceNumber || 'DOC'}.xlsx`);

  } else if (extractedData.documentType === "COMPARISON" && extractedData.comparison) {
    const hasSwift = !!extractedData.swiftData;
    const hasArrival = !!extractedData.arrivalData;

    const headers = ["CONCEPTO / CAMPO", "FACTURA", "BL"];
    if (hasSwift) headers.push("SWIFT / PAGO");
    if (hasArrival) headers.push("AVISO LLEGADA");
    headers.push("ESTADO AUDITORÍA", "HALLAZGO / COMENTARIO");

    const finalReportRows: any[][] = [
      ["REPORTE DE AUDITORÍA LOGÍSTICA INTEGRAL (COMPARATIVO)"],
      [`Empresa: ${extractedData.blData?.importantItems.consignee || 'Auditada'}`],
      [`Fecha de Auditoría: ${new Date().toLocaleDateString()}`],
      [""],
      ["RESUMEN EJECUTIVO HALLAZGOS (OBSERVACIONES DEL SISTEMA):"],
      [extractedData.comparison.summary],
      [""],
      ["CUADRO COMPARATIVO MULTI-DOCUMENTAL"],
      [""],
      headers
    ];

    extractedData.comparison.matches.forEach(m => {
      const row = [
        m.field, 
        m.invoiceValue || "-", 
        m.blValue || "-"
      ];
      if (hasSwift) row.push(m.swiftValue || "-");
      if (hasArrival) row.push(m.arrivalValue || "-");
      row.push(m.status, m.observation);
      
      finalReportRows.push(row);
    });

    const wsUnified = XLSX.utils.aoa_to_sheet(finalReportRows);
    
    // Adaptive column widths
    const cols = [{wch: 28}, {wch: 35}, {wch: 35}];
    if (hasSwift) cols.push({wch: 25});
    if (hasArrival) cols.push({wch: 25});
    cols.push({wch: 22}, {wch: 60});

    wsUnified['!cols'] = cols;
    
    const lastColIndex = headers.length - 1;
    wsUnified['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: lastColIndex } } // Summary box
    ];
    applyExecutiveStyles(wsUnified);

    XLSX.utils.book_append_sheet(wb, wsUnified, "REPORTE COMPARATIVO");
    XLSX.writeFile(wb, `Reporte_Auditoria_Logistica_${new Date().getTime()}.xlsx`);
  }
}
