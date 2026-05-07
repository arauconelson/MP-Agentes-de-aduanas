import * as XLSX from 'xlsx';
import { ExtractedData } from '../services/geminiService';

export function downloadAsExcel(extractedData: ExtractedData) {
  const wb = XLSX.utils.book_new();
  
  if (extractedData.documentType === "BL" && extractedData.blData) {
    const items = extractedData.blData.importantItems;
    const headers = [
      "B/L NUMBER", "BOOKING NO", "SHIPPER", "CONSIGNEE", "NOTIFY PARTY", "DELIVERY AGENT",
      "PRE-CARRIAGE BY", "PLACE OF RECEIPT", "PORT OF LOADING", "PORT OF DISCHARGE", 
      "VESSEL", "VOYAGE", "PLACE OF DELIVERY", "TYPE OF MOVE", "FREIGHT TERMS", 
      "EX. RATE", "PREPAID AT", "PAYABLE AT", "TOTAL PREPAID", "NO. OF ORIGINALS",
      "PLACE OF ISSUE", "DATE OF ISSUE", "SHIPPED ON BOARD DATE", 
      "TOTAL PACKAGES", "TOTAL GROSS WEIGHT (KGS)", "TOTAL MEASUREMENT (CBM)"
    ];
    const values = [
      items.billOfLadingNo || "", items.bookingNo || "", items.shipper || "", items.consignee || "", 
      items.notifyParty || "", items.deliveryAgent || "", items.preCarriageBy || "", 
      items.placeOfReceipt || "", items.portOfLoading || "", items.portOfDischarge || "", 
      items.vesselName || "", items.voyageNo || "", items.placeOfDelivery || "", 
      items.typeOfMove || "", items.freightTerms || "", items.exchangeRate || "",
      items.prepaidAt || "", items.payableAt || "", items.totalPrepaid || "",
      items.numberOfOriginalBLs || "", items.placeOfIssue || "", items.dateOfIssue || "", 
      items.shippedOnBoardDate || "", items.totalPackages || "", 
      items.totalGrossWeight || "", items.totalMeasurement || ""
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, values]);
    
    if (extractedData.blData.tables.length > 0) {
      let currentRow = 4;
      extractedData.blData.tables.forEach((table) => {
        XLSX.utils.sheet_add_aoa(ws, [[table.name.toUpperCase()]], { origin: `A${currentRow}` });
        currentRow++;
        const tableData = [table.headers, ...table.data];
        XLSX.utils.sheet_add_aoa(ws, tableData, { origin: `A${currentRow}` });
        currentRow += tableData.length + 2;
      });
    }
    XLSX.utils.book_append_sheet(wb, ws, "LogiData_BL");
    XLSX.writeFile(wb, `LogiExtract_BL_${items.billOfLadingNo || 'DOC'}.xlsx`);

  } else if (extractedData.documentType === "INVOICE" && extractedData.invoiceData) {
    const items = extractedData.invoiceData.items;
    const headers = [
      "INVOICE NUMBER", "ISSUE DATE", "ISSUE PLACE", "SELLER NAME", "SELLER ADDRESS",
      "BUYER NAME", "BUYER ADDRESS", "DESCRIPTION", "QUANTITY", "UNIT PRICE", "TOTAL PRICE",
      "CURRENCY", "INCOTERMS", "ORIGIN", "PAYMENT TERMS", "ORIGINAL/DEF?", "NO ERASURES?", "REAL PRICE?"
    ];
    
    const missingMsg = "No tiene esos datos";
    const values = [
      items.invoiceNumber || missingMsg, items.issueDate || missingMsg, items.issuePlace || missingMsg,
      items.sellerName || missingMsg, items.sellerAddress || missingMsg, items.buyerName || missingMsg,
      items.buyerAddress || missingMsg, items.descriptionOfGoods || missingMsg, items.quantity || missingMsg,
      items.unitPrice || missingMsg, items.totalPrice || missingMsg, items.currency || missingMsg,
      items.incoterms || missingMsg, items.originOfGoods || missingMsg, items.paymentTerms || missingMsg,
      items.isOriginalAndDefinitive !== undefined ? (items.isOriginalAndDefinitive ? "SÍ" : "NO") : missingMsg,
      items.hasNoErasures !== undefined ? (items.hasNoErasures ? "SÍ" : "NO") : missingMsg,
      items.realPriceReflected !== undefined ? (items.realPriceReflected ? "SÍ" : "NO") : missingMsg
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, values]);
    
    let currentRow = 4;

    // Add validation checklist
    if (extractedData.invoiceData.validation && extractedData.invoiceData.validation.length > 0) {
      XLSX.utils.sheet_add_aoa(ws, [["VALORACIÓN DE REQUISITOS (ADUANAS)"]], { origin: `A${currentRow}` });
      currentRow++;
      const vHeaders = ["#", "PUNTO DE CONTROL", "ESTADO", "OBSERVACIÓN / COMENTARIO"];
      const vData = extractedData.invoiceData.validation.map(v => [v.index, v.description, v.status, v.comment]);
      XLSX.utils.sheet_add_aoa(ws, [vHeaders, ...vData], { origin: `A${currentRow}` });
      currentRow += vData.length + 2;
    }
    
    if (extractedData.invoiceData.tables.length > 0) {
      extractedData.invoiceData.tables.forEach((table) => {
        XLSX.utils.sheet_add_aoa(ws, [[table.name.toUpperCase()]], { origin: `A${currentRow}` });
        currentRow++;
        const tableData = [table.headers, ...table.data];
        XLSX.utils.sheet_add_aoa(ws, tableData, { origin: `A${currentRow}` });
        currentRow += tableData.length + 2;
      });
    }
    XLSX.utils.book_append_sheet(wb, ws, "LogiData_Invoice");
    XLSX.writeFile(wb, `LogiExtract_Invoice_${items.invoiceNumber || 'DOC'}.xlsx`);

  } else if (extractedData.documentType === "COMPARISON" && extractedData.comparison) {
    // BL Data Sheet if present
    if (extractedData.blData) {
      const items = extractedData.blData.importantItems;
      const headers = ["FIELD", "VALUE"];
      const rows = Object.entries(items).map(([k, v]) => [k.toUpperCase(), String(v)]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Data_BL");
    }

    // Invoice Data Sheet if present
    if (extractedData.invoiceData) {
      const items = extractedData.invoiceData.items;
      const headers = ["FIELD", "VALUE"];
      const rows = Object.entries(items).map(([k, v]) => [k.toUpperCase(), String(v)]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Data_Factura");
    }

    // Comparison Sheet
    const compHeaders = ["ITEM / CAMPO", "VALOR EN BL", "VALOR EN FACTURA", "ESTADO", "OBSERVACIÓN"];
    const compRows = extractedData.comparison.matches.map(m => [
      m.field,
      m.blValue,
      m.invoiceValue,
      m.status,
      m.observation
    ]);
    
    const wsComp = XLSX.utils.aoa_to_sheet([["RESUMEN DE AUDITORÍA", extractedData.comparison.summary], [], compHeaders, ...compRows]);
    XLSX.utils.book_append_sheet(wb, wsComp, "COMPARATIVA");

    XLSX.writeFile(wb, `Comparativa_Logistica_${new Date().getTime()}.xlsx`);
  }
}
