import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export interface ExtractedData {
  importantItems: {
    shipper?: string;
    consignee?: string;
    notifyParty?: string;
    vesselName?: string;
    voyageNo?: string;
    billOfLadingNo?: string;
    bookingNo?: string;
    portOfLoading?: string;
    portOfDischarge?: string;
    placeOfReceipt?: string;
    placeOfDelivery?: string;
    typeOfMove?: string; // e.g., FCL/FCL, CY/CY
    freightTerms?: string; // e.g., Prepaid, Collect
    totalPackages?: string;
    totalGrossWeight?: string;
    totalMeasurement?: string;
    deliveryAgent?: string; // FOR PARTICULARS OF DELIVERY APPLY WITH B / L TO
  };
  tables: {
    name: string;
    headers: string[];
    data: string[][];
  }[];
}

export async function extractTableData(fileBase64: string, mimeType: string): Promise<ExtractedData> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Extract all data from this shipping document (Bill of Lading / Booking / Sea Waybill).
  Identify and extract the following key fields if they are present:
  - SHIPPER: Full name and address.
  - CONSIGNEE: Full name and address.
  - NOTIFY PARTY: Full name and address.
  - VESSEL/VOYAGE: The name of the ship and voyage number.
  - BILL OF LADING NO: The unique identifier for the B/L.
  - BOOKING NO: The booking reference number.
  - PORT OF LOADING: Where the cargo is loaded.
  - PORT OF DISCHARGE: Where the cargo is unloaded.
  - PLACE OF RECEIPT: Where the carrier received the goods.
  - PLACE OF DELIVERY: Where the carrier will deliver the goods.
  - TYPE OF MOVE: e.g., CY/CY, CFS/CFS, FCL/LCL, Door-to-Door.
  - FREIGHT TERMS: e.g., Prepaid, Collect.
  - TOTALS: Total number of packages, total gross weight, and total measurement.
  - DELIVERY AGENT: The info mentioned in "FOR PARTICULARS OF DELIVERY APPLY WITH B / L TO" or similar.
  
  Also, extract all tabular data precisely (Container numbers, seals, description of packages and goods, weights, and measurements).
  
  Format the response as a JSON object strictly following the provided schema.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: fileBase64,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          importantItems: {
            type: Type.OBJECT,
            properties: {
              shipper: { type: Type.STRING },
              consignee: { type: Type.STRING },
              notifyParty: { type: Type.STRING },
              vesselName: { type: Type.STRING },
              voyageNo: { type: Type.STRING },
              billOfLadingNo: { type: Type.STRING },
              bookingNo: { type: Type.STRING },
              portOfLoading: { type: Type.STRING },
              portOfDischarge: { type: Type.STRING },
              placeOfReceipt: { type: Type.STRING },
              placeOfDelivery: { type: Type.STRING },
              typeOfMove: { type: Type.STRING },
              freightTerms: { type: Type.STRING },
              totalPackages: { type: Type.STRING },
              totalGrossWeight: { type: Type.STRING },
              totalMeasurement: { type: Type.STRING },
              deliveryAgent: { type: Type.STRING }
            }
          },
          tables: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Display name for the table or sheet" },
                headers: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Column headers"
                },
                data: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  description: "The data rows, excluding headers"
                }
              },
              required: ["name", "headers", "data"]
            }
          }
        },
        required: ["importantItems", "tables"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No se pudo extraer información del documento.");
  }

  try {
    return JSON.parse(response.text.trim()) as ExtractedData;
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", response.text);
    throw new Error("Error al procesar la respuesta de la IA.");
  }
}
