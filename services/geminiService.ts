import { GoogleGenAI } from "@google/genai";
import { AnalysisInput, GeminiResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeContent = async (input: AnalysisInput): Promise<GeminiResponse> => {
  try {
    let prompt = "";
    let contents: any = {};

    if (input.type === 'image') {
      prompt = `
        You are a Quality Control AI specializing in Dimension Extraction.
        
        TASK:
        Analyze the image and extract ALL numerical dimensions (length, width, height, etc.).
        
        OUTPUT FORMAT:
        Return a valid JSON object. Do not wrap in markdown code blocks.
        
        JSON Structure:
        {
          "dimensions": [number, number, ...],
          "units": "string (inches, cm, mm, etc)",
          "markdown_table": "A formatted markdown table summarizing the findings for display",
          "raw_text": "A brief summary of what was found"
        }

        RULES:
        1. Convert fractions to decimals if found (e.g., 1/2 -> 0.5).
        2. Filter out non-dimension numbers like Barcodes, IDs, or Dates unless they look like dimensions.
        3. Identify the most likely unit of measurement.
      `;

      contents = {
        parts: [
          {
            inlineData: {
              data: input.content,
              mimeType: input.mimeType,
            },
          },
          { text: prompt },
        ],
      };
    } else {
      // Logic for generic text/csv analysis if needed in future
      // For now, mapping this to the same JSON structure for consistency
       prompt = `
        Extract dimensions from this text data.
        Return JSON: { "dimensions": [], "units": "unknown", "markdown_table": "...", "raw_text": "..." }
        Data: ${input.content}
      `;
       contents = { parts: [{ text: prompt }] };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return {
        dimensions: parsed.dimensions || [],
        units: parsed.units || "unknown",
        markdown_table: parsed.markdown_table || "",
        raw_text: parsed.raw_text || ""
      };
    } else {
      throw new Error("No response from Gemini.");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Error analyzing content.");
  }
};
