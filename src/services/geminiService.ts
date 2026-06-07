import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY || "" });

export interface InvoiceData {
  items: {
    invoiceNumber?: string;
    issueDate?: string;
    issuePlace?: string;
    sellerName?: string;
    sellerAddress?: string;
    sellerEmail?: string;
    sellerPhone?: string;
    buyerName?: string;
    buyerAddress?: string;
    buyerEmail?: string;
    buyerPhone?: string;
    descriptionOfGoods?: string;
    quantity?: string;
    unitPrice?: string;
    totalPrice?: string;
    currency?: string;
    incoterms?: string;
    originOfGoods?: string;
    portOfLoading?: string;
    portOfDischarge?: string;
    paymentTerms?: string;
    isOriginalAndDefinitive?: boolean;
    hasNoErasures?: boolean;
    realPriceReflected?: boolean;
    shippingMarks?: string;
    packingType?: string;
    grossWeight?: string;
    netWeight?: string;
  };
  additionalIdentifiedInfo?: { label: string; value: string }[];
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
  const prompt = `Actúa como un Auditor de Comercio Exterior experto. Genera un CUADRO COMPARATIVO DE DOBLE ENTRADA basado en estos 4 documentos: Factura, BL, Swift 1 y Aviso de llegada.

  Debes extraer y comparar la información para estos EXACTOS 8 CAMPOS con estas REGLAS DE CONEXIÓN:
  1. SHIPPER: Nombre del exportador/vendedor. REGLA: Compara Factura vs BL vs SWIFT. NO lo compares con el Aviso de llegada (deja su valor como "-").
  2. DIRECCIÓN (Shipper): Dirección completa del exportador.
  3. CONSIGNED: Nombre del importador/consignatario.
  4. DIRECCIÓN (Consigned): Dirección completa del importador.
  5. DESCRIPCIÓN: Descripción de la mercancía.
  6. CANTIDAD: Cantidad de bultos o unidades (ej: 1 SETS, 67 PACKAGES).
  7. MONTO: Valor total de la transacción. REGLA: Compara Factura vs SWIFT. NO lo compares con BL ni Aviso de llegada (deja sus valores como "-").
  8. FLETE: Costo del flete/ocean. REGLA: Compara BL vs AVISO DE LLEGADA. NO lo compares con Factura ni SWIFT (deja sus valores como "-").

  CONSIDERACIONES IMPORTANTES:
  - Factura: Fuente principal de Monto para comparar con SWIFT. No tiene flete.
  - BL: Fuente principal de Shipper, Consignee, Cantidad y Flete (para comparar con Aviso).
  - Aviso de Llegada: Fuente para verificar el Flete indicado en el BL. No aplica para Shipper ni Monto.
  - SWIFT: Fuente para verificar el Monto indicado en la Factura y el Shipper.

  REGLA DE ORO DE COMPARACIÓN:
  - Para SHIPPER: El estado "IDENTICO" solo debe basarse en FACTURA, BL y SWIFT. El campo "arrivalValue" debe ser siempre "-".
  - Para MONTO: El estado "IDENTICO" solo debe basarse en FACTURA y SWIFT. Los campos "blValue" y "arrivalValue" deben ser "-".
  - Para FLETE: El estado "IDENTICO" solo debe basarse en la coincidencia entre BL y AVISO DE LLEGADA. Los campos "invoiceValue" y "swiftValue" deben ser "-".
  - Si un documento no está presente, marca el status según los documentos disponibles respetando la conexión lógica.

  DATOS DISPONIBLES:
  - BL: ${JSON.stringify(blData)}
  - FACTURA: ${JSON.stringify(invoiceData)}
  ${arrivalData ? `- AVISO DE LLEGADA: ${JSON.stringify(arrivalData)}` : ""}
  ${swiftData ? `- SWIFT: ${JSON.stringify(swiftData)}` : ""}
  
  REGLAS DE SALIDA:
  - Si un dato no aplica o no está en un documento, usa "-".
  - En la columna de observación, indica claramente si "Coincide" o "No coincide" y por qué.
  
  Devuelve un JSON con 'matches' (lista de 8 objetos con field, blValue, invoiceValue, arrivalValue, swiftValue, status, observation) y 'summary' (resumen ejecutivo en español).`;

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
    - OCEAN FREIGHT: Identify the specific amount for Ocean Freight (usually in USD).
    - TOTALS: Total number of packages, Total Gross Weight (KGS), and Measurement (CBM).
    
    Also, extract tabular data (Container/Seal No, No. of Packages, Description of Goods, Gross Weight, Measurement).`;
  } else if (type === "INVOICE") {
    prompt = `Extract all data from this COMMERCIAL INVOICE.
    Identify and extract basic info and line items.
    
    CRITICAL: Realiza una validación exhaustiva de los siguientes 18 puntos requeridos por SUNAT (Aduanas Perú) para una FACTURA COMERCIAL. 
    Para cada punto, indica si CUMPLE, NO CUMPLE o NO APLICA, y proporciona una breve explicación en español indicando el dato exacto encontrado en el documento:
    1. Reflejar el precio realmente pagado o por pagar por las mercancías importadas.
    2. Ser un documento original y definitivo (En digital, verificar que sea un formato final).
    3. Ser expedida por el vendedor de la mercancía.
    4. Carecer de borrones, enmendaduras o adulteraciones.
    5. Contener número de expedición (Invoice Number).
    6. Contener fecha de expedición.
    7. Lugar de expedición de la factura (Ciudad/País).
    8. Nombre completo del vendedor (Seller).
    9. Dirección completa del vendedor.
    10. Nombre completo del comprador (Buyer / Importador).
    11. Dirección completa del comprador (Debe coincidir con domicilio fiscal).
    12. Descripción detallada de la mercancía (Clara y precisa).
    13. Cantidad (Unidades, bultos, etc).
    14. Precio unitario y precio total.
    15. Moneda de la transacción comercial (Ej: USD, EUR).
    16. Lugar y condiciones de entrega (INCOTERM y Puerto/Lugar).
    17. Origen de la mercancía (País de fabricación/procedencia).
    18. Forma y condiciones de pago (Ej: T/T, LC, Plazos) y descuentos/comisiones si los hay.

    Extrae también los datos básicos de la factura y los ítems de la tabla. Asegúrate de identificar correos, teléfonos y puertos de carga/descarga si están presentes.
    MUY IMPORTANTE: Busca en todo el texto cualquier otra información relevante que pueda ser útil para gerencia (Ej: Datos bancarios, números de cuenta, cláusulas especiales de entrega, notas al pie, referencias de pedido adicionales). Si encuentras información importante que no encaja en los campos anteriores, inclúyela en "additionalIdentifiedInfo" con una etiqueta descriptiva.`;
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
              oceanFreight: { type: Type.STRING },
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
          sellerEmail: { type: Type.STRING },
          sellerPhone: { type: Type.STRING },
          buyerName: { type: Type.STRING },
          buyerAddress: { type: Type.STRING },
          buyerEmail: { type: Type.STRING },
          buyerPhone: { type: Type.STRING },
          descriptionOfGoods: { type: Type.STRING },
          quantity: { type: Type.STRING },
          unitPrice: { type: Type.STRING },
          totalPrice: { type: Type.STRING },
          currency: { type: Type.STRING },
          incoterms: { type: Type.STRING },
          originOfGoods: { type: Type.STRING },
          portOfLoading: { type: Type.STRING },
          portOfDischarge: { type: Type.STRING },
          paymentTerms: { type: Type.STRING },
          isOriginalAndDefinitive: { type: Type.BOOLEAN },
          hasNoErasures: { type: Type.BOOLEAN },
          realPriceReflected: { type: Type.BOOLEAN },
          shippingMarks: { type: Type.STRING },
          packingType: { type: Type.STRING },
          grossWeight: { type: Type.STRING },
          netWeight: { type: Type.STRING }
        }
      },
      additionalIdentifiedInfo: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            value: { type: Type.STRING }
          }
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
