interface Env {
  GEMINI_API_KEY?: string;
}

interface ImageMetadata {
  id: string;
  name?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  orientation?: string;
}

interface AlignmentSettings {
  [key: string]: unknown;
}

function computeFallbackAlignment(images: ImageMetadata[], currentSettings: AlignmentSettings) {
  if (!images?.length) {
    return {
      reorderedImageIds: [], recommendedLayout: "auto", recommendedColumns: 3,
      recommendedOrientation: "mixed", recommendedOutputOrientation: "landscape",
      recommendedAspectRatioId: "16-9", recommendedGap: 12, recommendedPadding: 20,
      recommendedAlignHorizontal: "center", recommendedAlignVertical: "center",
      reasoning: "Algorithmic fallback: default balanced auto grid.",
    };
  }

  const count = images.length;
  let landscapeCount = 0;
  let portraitCount = 0;
  let totalAspectRatio = 0;

  for (const image of images) {
    const aspectRatio = image.aspectRatio || (image.width && image.height ? image.width / image.height : 1);
    totalAspectRatio += aspectRatio;
    if (aspectRatio > 1.1) landscapeCount++;
    else if (aspectRatio < 0.9) portraitCount++;
  }

  const averageAspectRatio = totalAspectRatio / count;
  const recommendedOrientation = landscapeCount / count > 0.6
    ? "landscape"
    : portraitCount / count > 0.6 ? "portrait" : "mixed";
  const sortedImages = [...images].sort((a, b) => (b.aspectRatio || 1) - (a.aspectRatio || 1));

  let recommendedLayout = "auto";
  let recommendedColumns = Math.round(Math.sqrt(count));
  if (recommendedOrientation === "landscape") {
    recommendedLayout = count <= 6 ? "horizontal_strips" : "masonry";
    recommendedColumns = Math.min(count, Math.ceil(Math.sqrt(count * 1.3)));
  } else if (recommendedOrientation === "portrait") {
    recommendedLayout = "masonry";
    recommendedColumns = Math.min(count, Math.ceil(Math.sqrt(count * 1.2)));
  } else if (count >= 3 && (sortedImages[0].aspectRatio || 1) > 1.3) {
    recommendedLayout = "featured_left";
  }

  return {
    reorderedImageIds: sortedImages.map((image) => image.id),
    recommendedLayout,
    recommendedColumns: Math.max(1, recommendedColumns),
    recommendedOrientation,
    recommendedOutputOrientation: averageAspectRatio > 1.2 ? "landscape" : averageAspectRatio < 0.8 ? "portrait" : "square",
    recommendedAspectRatioId: averageAspectRatio > 1.3 ? "16-9" : averageAspectRatio < 0.8 ? "9-16" : "1-1",
    recommendedGap: Math.min(24, Math.max(8, Math.round(16 - count * 0.5))),
    recommendedPadding: 20,
    recommendedAlignHorizontal: "center",
    recommendedAlignVertical: "center",
    reasoning: `Smart alignment sorted ${count} images by aspect ratio balance (${landscapeCount} landscape, ${portraitCount} portrait). Selected ${recommendedLayout} layout with ${recommendedColumns} columns for zero-crop optimization.`,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  let body: { images?: ImageMetadata[]; currentSettings?: AlignmentSettings; thumbnails?: { data?: string; mimeType?: string }[] };
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  if (!Array.isArray(body.images) || body.images.length === 0) {
    return jsonResponse({ error: "No images provided for alignment." }, 400);
  }

  const fallback = computeFallbackAlignment(body.images, body.currentSettings || {});
  if (!context.env.GEMINI_API_KEY) {
    return jsonResponse({
      ...fallback,
      reasoning: "Rule-based alignment applied (Gemini API key is not configured in Cloudflare Pages secrets).",
    });
  }

  const prompt = `You are an expert graphic designer. Analyze these image metadata and return JSON only. Recommend a no-crop collage composition. Include reorderedImageIds containing every input ID, recommendedLayout (auto, uniform_grid, masonry, horizontal_strips, vertical_strips, featured_left, or featured_top), recommendedColumns (1-6), recommendedOrientation (landscape, portrait, or mixed), recommendedOutputOrientation (landscape, portrait, or square), recommendedAspectRatioId (16-9, 4-3, 1-1, 3-4, 9-16, or 21-9), recommendedGap, recommendedPadding, recommendedAlignHorizontal (center, left, or right), recommendedAlignVertical (center, top, or bottom), and a concise reasoning.\n\nImage metadata:\n${JSON.stringify(body.images.map(({ id, name, width, height, aspectRatio, orientation }) => ({ id, name, width, height, aspectRatio, orientation })))}\n\nCurrent settings:\n${JSON.stringify(body.currentSettings || {})}`;
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (const thumbnail of body.thumbnails?.slice(0, 8) || []) {
    if (thumbnail.data && thumbnail.mimeType) {
      parts.push({ inline_data: { data: thumbnail.data, mime_type: thumbnail.mimeType } });
    }
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": context.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!response.ok) throw new Error(`Gemini request failed with ${response.status}.`);

    const result = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no response text.");

    const recommendation = JSON.parse(text) as Record<string, unknown>;
    const validIds = new Set(body.images.map((image) => image.id));
    const returnedIds = Array.isArray(recommendation.reorderedImageIds)
      ? recommendation.reorderedImageIds.filter((id): id is string => typeof id === "string" && validIds.has(id))
      : [];
    for (const image of body.images) if (!returnedIds.includes(image.id)) returnedIds.push(image.id);
    return jsonResponse({ ...fallback, ...recommendation, reorderedImageIds: returnedIds });
  } catch (error) {
    console.error("Gemini AI alignment failed", error);
    return jsonResponse({ ...fallback, reasoning: "Smart algorithmic layout applied because Gemini was unavailable." });
  }
}