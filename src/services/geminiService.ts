import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export interface InvoiceData {
  items: {
    invoiceNumber?: string;
    issueDate?: string;
    issuePlace?: string;
    sellerName?: string;
    sellerAddress?: string;
    buyerName?: string;
    buyerAddress?: string;
    descriptionOfGoods?: string;
    quantity?: string;
    unitPrice?: string;
    totalPrice?: string;
    currency?: string;
    incoterms?: string;
    originOfGoods?: string;
    paymentTerms?: string;
    isOriginalAndDefinitive?: boolean;
    hasNoErasures?: boolean;
    realPriceReflected?: boolean;
  };
  validation: {
    index: number;
    description: string;
    status: "CUMPLE" | "NO CUMPLE" | "NO APLICA";
    comment: string;
  }[];
  tables: {
    name: string;
    headers: string[];
    data: string[][];
  }[];
}

export interface ComparisonResul {
  matches: {
    field: string;
    blValue: string;
    invoiceValue: string;
    arrivalValue?: string;
    swiftValue?: string;
    status: "IDENTICO" | "DIFERENTE" | "PARCIAL";
    observation: string;
  }[];
  summary: string;
}

export interface ExtractedData {
  documentType: "BL" | "INVOICE" | "ARRIVAL_NOTICE" | "SWIFT" | "COMPARISON";
  blData?: {
    importantItems: any;
    tables: any[];
  };
  invoiceData?: InvoiceData;
  arrivalData?: {
    importantItems: any;
    tables: any[];
  };
  swiftData?: {
    importantItems: any;
    tables: any[];
  };
  comparison?: ComparisonResul;
}

export async function compareDocuments(blData: any, invoiceData: any, arrivalData?: any, swiftData?: any): Promise<ComparisonResul> {
  const model = "gemini-3-flash-preview";
  const prompt = `Compare the following datasets extracted from logistics and financial documents.
  Analyze if the data is consistent across ALL provided documents for:
  - Shipper vs Seller vs Ordering Customer (SWIFT)
  - Consignee vs Buyer vs Arrivee vs Beneficiary (SWIFT)
  - Description of Goods vs Remittance Info (SWIFT)
  - Quantities/Weights
  - Total Prices/Values (Invoice Total vs SWIFT Amount)
  - Numbers/References (B/L Number, Invoice Number, Booking, SWIFT Reference)
  
  BL DATA: ${JSON.stringify(blData)}
  INVOICE DATA: ${JSON.stringify(invoiceData)}
  ${arrivalData ? `ARRIVAL NOTICE DATA: ${JSON.stringify(arrivalData)}` : ""}
  ${swiftData ? `SWIFT DATA: ${JSON.stringify(swiftData)}` : ""}
  
  Return a JSON object with a list of matches including field name, value in BL, value in Invoice, ${arrivalData ? "value in Arrival Notice," : ""} ${swiftData ? "value in SWIFT," : ""} status (IDENTICO, DIFERENTE, PARCIAL), and a brief observation in Spanish explicandolo. Include a general summary.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                field: { type: Type.STRING },
                blValue: { type: Type.STRING },
                invoiceValue: { type: Type.STRING },
                arrivalValue: { type: Type.STRING },
                swiftValue: { type: Type.STRING },
                status: { type: Type.STRING, enum: ["IDENTICO", "DIFERENTE", "PARCIAL"] },
                observation: { type: Type.STRING }
              },
              required: ["field", "blValue", "invoiceValue", "status", "observation"]
            }
          },
          summary: { type: Type.STRING }
        },
        required: ["matches", "summary"]
      }
    }
  });

  return JSON.parse(response.text?.trim() || "{}") as ComparisonResul;
}

export async function extractDocumentData(fileBase64: string, mimeType: string, type: "BL" | "INVOICE" | "ARRIVAL_NOTICE" | "SWIFT"): Promise<ExtractedData> {
  const model = "gemini-3-flash-preview";
  
  let prompt = "";
  if (type === "BL") {
    prompt = `Extract all data from this shipping document (Bill of Lading / Booking / Sea Waybill).
    Identify and extract the following fields precisely:
    - SHIPPER: Full name and address.
    - BOOKING NO.
    - B/L NO.
    - FOR DELIVERY OF GOODS PLEASE APPLY TO: (The delivery agent info).
    - CONSIGNEE: Full name and address.
    - NOTIFY PARTY: Full name and address.
    - COMBINED TRANSPORT (PRE-CARRIAGE BY)
    - COMBINED TRANSPORT (PLACE OF RECEIPT)
    - PORT OF LOADING
    - PORT OF DISCHARGE
    - VESSEL
    - VOYAGE NO
    - COMBINED TRANSPORT (PLACE OF DELIVERY)
    - TYPE OF MOVE: (e.g., CY/CY, FCL/FCL).
    - FREIGHT & CHARGES: Identify if it is FREIGHT COLLECT or PREPAID.
    - EX. RATE (Exchange Rate).
    - PREPAID AT.
    - PAYABLE AT.
    - TOTAL PREPAID.
    - NO. OF ORIGINAL B/L (e.g. THREE(3)).
    - PLACE AND DATE OF ISSUE.
    - SHIPPED ON BOARD DATE.
    - TOTALS: Total number of packages, Total Gross Weight (KGS), and Measurement (CBM).
    
    Also, extract tabular data (Container/Seal No, No. of Packages, Description of Goods, Gross Weight, Measurement).`;
  } else if (type === "INVOICE") {
    prompt = `Extract all data from this COMMERCIAL INVOICE.
    Identify and extract basic info and line items.
    
    CRITICAL: Perform a validation of the following 18 points for Importation into Peru (SUNAT Customs requirements):
    1. Reflejar el precio realmente pagado o por pagar.
    2. Ser un documento original y definitivo.
    3. Ser expedida por el vendedor.
    4. Carecer de borrones, enmendaduras o adulteraciones.
    5. Contener número de expedición (Invoice #).
    6. Contener fecha de expedición.
    7. Lugar de expedición.
    8. Nombre del vendedor.
    9. Dirección del vendedor.
    10. Nombre del comprador.
    11. Dirección del comprador.
    12. Descripción de la mercancía.
    13. Cantidad.
    14. Precio unitario y total.
    15. Moneda de la transacción.
    16. Incoterms o condiciones de entrega.
    17. Origen de la mercancía.
    18. Forma y condiciones de pago y descuentos.

    For each point, determine if it complies (CUMPLE), doesn't comply (NO CUMPLE) or is not applicable (NO APLICA), and add a brief comment in Spanish.`;
  } else if (type === "ARRIVAL_NOTICE") {
    prompt = `Extract all data from this AVISO DE LLEGADA (Arrival Notice).
    Identify and extract:
    - CONSIGNATARIO (Consignee)
    - NOTIFICAR A (Notify Party)
    - NRO. B/L (B/L Number)
    - NAVE / VIAJE (Vessel/Voyage)
    - PUERTO DE DESCARGA (Port of Discharge)
    - FECHA DE LLEGADA / ETA (Arrival Date)
    - CONTENEDORES / SELLOS (Containers/Seals)
    - ALMACÉN / TERMINAL (Warehouse/Terminal)
    - AGENTE DE CARGA (Freight Forwarder)
    - GASTOS LOCALES (Local Charges if any)
    - TOTAL PAQUETES / PESO / VOLUMEN
    
    Extract tabular data if available.`;
  } else {
    prompt = `Extract all data from this SWIFT MT103 / Payment Message.
    Identify and extract:
    - SENDER BANK (Ordering Institution)
    - RECEIVER BANK (Beneficiary Institution)
    - ORDERING CUSTOMER (Debtor name/address)
    - BENEFICIARY (Creditor name/address)
    - AMOUNT (Instructed Amount)
    - CURRENCY
    - VALUE DATE (Execution Date)
    - REMITTANCE INFORMATION (Reference Message / Purpose)
    - TRANSACTION REFERENCE (MsgId / UETR)
    
    Format nicely in JSON.`;
  }

  const responseSchema = type === "BL" ? {
    type: Type.OBJECT,
    properties: {
          importantItems: {
            type: Type.OBJECT,
            properties: {
              shipper: { type: Type.STRING },
              bookingNo: { type: Type.STRING },
              billOfLadingNo: { type: Type.STRING },
              deliveryAgent: { type: Type.STRING },
              consignee: { type: Type.STRING },
              notifyParty: { type: Type.STRING },
              preCarriageBy: { type: Type.STRING },
              placeOfReceipt: { type: Type.STRING },
              portOfLoading: { type: Type.STRING },
              portOfDischarge: { type: Type.STRING },
              vesselName: { type: Type.STRING },
              voyageNo: { type: Type.STRING },
              placeOfDelivery: { type: Type.STRING },
              typeOfMove: { type: Type.STRING },
              freightTerms: { type: Type.STRING },
              exchangeRate: { type: Type.STRING },
              prepaidAt: { type: Type.STRING },
              payableAt: { type: Type.STRING },
              totalPrepaid: { type: Type.STRING },
              totalPackages: { type: Type.STRING },
              totalGrossWeight: { type: Type.STRING },
              totalMeasurement: { type: Type.STRING },
              placeOfIssue: { type: Type.STRING },
              dateOfIssue: { type: Type.STRING },
              shippedOnBoardDate: { type: Type.STRING },
              numberOfOriginalBLs: { type: Type.STRING }
            }
          },
      tables: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
            data: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
          },
          required: ["name", "headers", "data"]
        }
      }
    },
    required: ["importantItems", "tables"]
  } : type === "INVOICE" ? {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.OBJECT,
        properties: {
          invoiceNumber: { type: Type.STRING },
          issueDate: { type: Type.STRING },
          issuePlace: { type: Type.STRING },
          sellerName: { type: Type.STRING },
          sellerAddress: { type: Type.STRING },
          buyerName: { type: Type.STRING },
          buyerAddress: { type: Type.STRING },
          descriptionOfGoods: { type: Type.STRING },
          quantity: { type: Type.STRING },
          unitPrice: { type: Type.STRING },
          totalPrice: { type: Type.STRING },
          currency: { type: Type.STRING },
          incoterms: { type: Type.STRING },
          originOfGoods: { type: Type.STRING },
          paymentTerms: { type: Type.STRING },
          isOriginalAndDefinitive: { type: Type.BOOLEAN },
          hasNoErasures: { type: Type.BOOLEAN },
          realPriceReflected: { type: Type.BOOLEAN }
        }
      },
      validation: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.NUMBER },
            description: { type: Type.STRING },
            status: { type: Type.STRING, enum: ["CUMPLE", "NO CUMPLE", "NO APLICA"] },
            comment: { type: Type.STRING }
          },
          required: ["index", "description", "status", "comment"]
        }
      },
      tables: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
            data: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
          },
          required: ["name", "headers", "data"]
        }
      }
    },
    required: ["items", "validation", "tables"]
  } : type === "ARRIVAL_NOTICE" ? {
    type: Type.OBJECT,
    properties: {
      importantItems: {
        type: Type.OBJECT,
        properties: {
          consignatario: { type: Type.STRING },
          notificarA: { type: Type.STRING },
          billOfLadingNo: { type: Type.STRING },
          vesselVoyage: { type: Type.STRING },
          portOfDischarge: { type: Type.STRING },
          eta: { type: Type.STRING },
          containers: { type: Type.STRING },
          warehouse: { type: Type.STRING },
          freightForwarder: { type: Type.STRING },
          localCharges: { type: Type.STRING },
          totalPackages: { type: Type.STRING },
          totalWeight: { type: Type.STRING },
          totalVolume: { type: Type.STRING }
        }
      },
      tables: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
            data: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
          },
          required: ["name", "headers", "data"]
        }
      }
    },
    required: ["importantItems", "tables"]
  } : {
    type: Type.OBJECT,
    properties: {
      importantItems: {
        type: Type.OBJECT,
        properties: {
          senderBank: { type: Type.STRING },
          receiverBank: { type: Type.STRING },
          orderingCustomer: { type: Type.STRING },
          beneficiary: { type: Type.STRING },
          amount: { type: Type.STRING },
          currency: { type: Type.STRING },
          valueDate: { type: Type.STRING },
          remittanceInfo: { type: Type.STRING },
          transactionRef: { type: Type.STRING }
        }
      },
      tables: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
            data: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
          },
          required: ["name", "headers", "data"]
        }
      }
    },
    required: ["importantItems", "tables"]
  };

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ inlineData: { data: fileBase64, mimeType: mimeType } }, { text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema as any
    }
  });

  const parsed = JSON.parse(response.text?.trim() || "{}");
  return {
    documentType: type,
    blData: type === "BL" ? parsed : undefined,
    invoiceData: type === "INVOICE" ? parsed : undefined,
    arrivalData: type === "ARRIVAL_NOTICE" ? parsed : undefined,
    swiftData: type === "SWIFT" ? parsed : undefined
  };
}
