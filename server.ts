import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function computeFallbackAlignment(images: any[], currentSettings: any) {
  if (!images || images.length === 0) {
    return {
      reorderedImageIds: [],
      recommendedLayout: 'auto',
      recommendedColumns: 3,
      recommendedOrientation: 'mixed',
      recommendedOutputOrientation: 'landscape',
      recommendedAspectRatioId: '16-9',
      recommendedGap: 12,
      recommendedPadding: 20,
      recommendedAlignHorizontal: 'center',
      recommendedAlignVertical: 'center',
      reasoning: 'Algorithmic fallback: default balanced auto grid.',
    };
  }

  const count = images.length;
  let landscapeCount = 0;
  let portraitCount = 0;
  let totalAR = 0;

  images.forEach(img => {
    const ar = img.aspectRatio || (img.width && img.height ? img.width / img.height : 1);
    totalAR += ar;
    if (ar > 1.1) landscapeCount++;
    else if (ar < 0.9) portraitCount++;
  });

  const avgAR = totalAR / count;
  let recOrientation: 'landscape' | 'portrait' | 'mixed' = 'mixed';
  if (landscapeCount / count > 0.6) recOrientation = 'landscape';
  else if (portraitCount / count > 0.6) recOrientation = 'portrait';

  // Sort images: place widest/most hero-like image first, then alternate or group
  const sortedImages = [...images].sort((a, b) => {
    const arA = a.aspectRatio || 1;
    const arB = b.aspectRatio || 1;
    return arB - arA;
  });

  let recLayout = 'auto';
  let recCols = Math.round(Math.sqrt(count));
  if (recOrientation === 'landscape') {
    recLayout = count <= 6 ? 'horizontal_strips' : 'masonry';
    recCols = Math.min(count, Math.ceil(Math.sqrt(count * 1.3)));
  } else if (recOrientation === 'portrait') {
    recLayout = 'masonry';
    recCols = Math.min(count, Math.ceil(Math.sqrt(count * 1.2)));
  } else if (count >= 3 && sortedImages[0].aspectRatio > 1.3) {
    recLayout = 'featured_left';
  } else {
    recLayout = 'auto';
  }

  return {
    reorderedImageIds: sortedImages.map(img => img.id),
    recommendedLayout: recLayout,
    recommendedColumns: Math.max(1, recCols),
    recommendedOrientation: recOrientation,
    recommendedOutputOrientation: avgAR > 1.2 ? 'landscape' : avgAR < 0.8 ? 'portrait' : 'square',
    recommendedAspectRatioId: avgAR > 1.3 ? '16-9' : avgAR < 0.8 ? '9-16' : '1-1',
    recommendedGap: Math.min(24, Math.max(8, Math.round(16 - count * 0.5))),
    recommendedPadding: 20,
    recommendedAlignHorizontal: 'center',
    recommendedAlignVertical: 'center',
    reasoning: `Smart alignment sorted ${count} images by aspect ratio balance (${landscapeCount} landscape, ${portraitCount} portrait). Selected ${recLayout} layout with ${recCols} columns for zero-crop optimization.`,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Health Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", aiEnabled: Boolean(process.env.GEMINI_API_KEY) });
  });

  // AI Auto Align API Route
  app.post("/api/ai-align", async (req, res) => {
    try {
      const { images, currentSettings } = req.body;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "No images provided for alignment." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const fallback = computeFallbackAlignment(images, currentSettings);
        return res.json({
          ...fallback,
          reasoning: "Rule-based alignment applied (Gemini API key is not configured in secrets).",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `
You are an expert graphic designer and layout artist specializing in photo collages and grid compositions.
Analyze the following set of ${images.length} images and determine the most visually appealing, balanced, and aesthetic collage layout parameters without cropping any image.

Image metadata:
${JSON.stringify(images.map(img => ({
  id: img.id,
  name: img.name,
  width: img.width,
  height: img.height,
  aspectRatio: img.aspectRatio,
  orientation: img.orientation,
})), null, 2)}

Current settings: ${JSON.stringify(currentSettings)}

Your goal is to recommend:
1. reorderedImageIds: An array containing ALL image IDs from input in the optimal visual sequence (e.g. placing visually dominant/hero photos first or arranging landscape/portrait photos for rhythmic symmetry).
2. recommendedLayout: One of ['auto', 'uniform_grid', 'masonry', 'horizontal_strips', 'vertical_strips', 'featured_left', 'featured_top'].
3. recommendedColumns: Integer columns (1-6).
4. recommendedOrientation: One of ['landscape', 'portrait', 'mixed'].
5. recommendedOutputOrientation: One of ['landscape', 'portrait', 'square'].
6. recommendedAspectRatioId: One of ['16-9', '4-3', '1-1', '3-4', '9-16', '21-9'].
7. recommendedGap: Integer gap in pixels (e.g. 8 to 24).
8. recommendedPadding: Integer padding in pixels (e.g. 12 to 32).
9. recommendedAlignHorizontal: One of ['center', 'left', 'right'].
10. recommendedAlignVertical: One of ['center', 'top', 'bottom'].
11. reasoning: A concise 2-3 sentence rationale explaining why this specific layout, order, and geometry was chosen to eliminate cropping while maximizing visual impact.
`;

      const parts: any[] = [{ text: promptText }];

      // Include base64 thumbnail payloads if available
      if (req.body.thumbnails && Array.isArray(req.body.thumbnails)) {
        req.body.thumbnails.slice(0, 8).forEach((thumb: any) => {
          if (thumb.data && thumb.mimeType) {
            parts.push({
              inlineData: {
                data: thumb.data,
                mimeType: thumb.mimeType,
              },
            });
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reorderedImageIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of image IDs in optimal sequence",
              },
              recommendedLayout: {
                type: Type.STRING,
                description: "Layout type: auto, uniform_grid, masonry, horizontal_strips, vertical_strips, featured_left, featured_top",
              },
              recommendedColumns: { type: Type.INTEGER },
              recommendedOrientation: { type: Type.STRING },
              recommendedOutputOrientation: { type: Type.STRING },
              recommendedAspectRatioId: { type: Type.STRING },
              recommendedGap: { type: Type.INTEGER },
              recommendedPadding: { type: Type.INTEGER },
              recommendedAlignHorizontal: { type: Type.STRING },
              recommendedAlignVertical: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: [
              "reorderedImageIds",
              "recommendedLayout",
              "recommendedColumns",
              "recommendedOrientation",
              "reasoning",
            ],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini model.");
      }

      const parsed = JSON.parse(text);

      // Validate reordered IDs
      const validIds = new Set(images.map((img: any) => img.id));
      let finalReordered = (parsed.reorderedImageIds || []).filter((id: string) => validIds.has(id));
      images.forEach((img: any) => {
        if (!finalReordered.includes(img.id)) {
          finalReordered.push(img.id);
        }
      });

      return res.json({
        ...parsed,
        reorderedImageIds: finalReordered,
      });
    } catch (error: any) {
      console.error("Gemini AI Align Error:", error);
      const fallback = computeFallbackAlignment(req.body.images, req.body.currentSettings);
      return res.json({
        ...fallback,
        reasoning: `Smart algorithmic layout applied (${error.message || "Gemini AI server fallback"}).`,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
