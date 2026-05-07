import * as XLSX from 'xlsx';
import { ExtractedData } from '../services/geminiService';

export function downloadAsExcel(extractedData: ExtractedData) {
  const wb = XLSX.utils.book_new();
  
  // Create a flat structure for horizontal ordering
  const items = extractedData.importantItems;
  
  // Headers for the horizontal row
  const headers = [
    "B/L NUMBER", 
    "BOOKING NO", 
    "SHIPPER", 
    "CONSIGNEE", 
    "NOTIFY PARTY", 
    "VESSEL", 
    "VOYAGE", 
    "PORT OF LOADING",
    "PORT OF DISCHARGE",
    "PLACE OF RECEIPT",
    "PLACE OF DELIVERY",
    "TYPE OF MOVE",
    "FREIGHT TERMS",
    "PAYABLE AT",
    "PLACE OF ISSUE",
    "DATE OF ISSUE",
    "SHIPPED ON BOARD DATE",
    "NO. OF ORIGINALS",
    "TOTAL PACKAGES",
    "TOTAL GROSS WEIGHT",
    "TOTAL MEASUREMENT",
    "DELIVERY AGENT"
  ];

  // Values for the row
  const values = [
    items.billOfLadingNo || "",
    items.bookingNo || "",
    items.shipper || "",
    items.consignee || "",
    items.notifyParty || "",
    items.vesselName || "",
    items.voyageNo || "",
    items.portOfLoading || "",
    items.portOfDischarge || "",
    items.placeOfReceipt || "",
    items.placeOfDelivery || "",
    items.typeOfMove || "",
    items.freightTerms || "",
    items.payableAt || "",
    items.placeOfIssue || "",
    items.dateOfIssue || "",
    items.shippedOnBoardDate || "",
    items.numberOfOriginalBLs || "",
    items.totalPackages || "",
    items.totalGrossWeight || "",
    items.totalMeasurement || "",
    items.deliveryAgent || ""
  ];

  // We will create one sheet that has the Master Data at the top.
  const masterData = [headers, values];
  const ws = XLSX.utils.aoa_to_sheet(masterData);

  // Add tables below the master data if they exist
  if (extractedData.tables && extractedData.tables.length > 0) {
    let currentRow = 4; // Leave some space after master data
    
    extractedData.tables.forEach((table) => {
      // Add table name
      XLSX.utils.sheet_add_aoa(ws, [[table.name.toUpperCase()]], { origin: `A${currentRow}` });
      currentRow++;
      
      // Add table headers and data
      const tableData = [table.headers, ...table.data];
      XLSX.utils.sheet_add_aoa(ws, tableData, { origin: `A${currentRow}` });
      
      currentRow += tableData.length + 2; // Move down for next table
    });
  }
  
  XLSX.utils.book_append_sheet(wb, ws, "LogiData");
  
  XLSX.writeFile(wb, `LogiExtract_BL_${items.billOfLadingNo || 'DOC'}_${new Date().getTime()}.xlsx`);
}
