// VisualQuran/api/stablediffusion.js

// This serverless function calls Stability AI's text-to-image endpoint
// to generate an image from a given prompt. It returns a base64 image
// that you can display directly in <img src>.

export default async function handler(req, res) {
  // ! CORS HEADERS (no changes needed) !
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ! Handle OPTIONS requests (CORS preflight) !
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ! Only allow POST for generating images !
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ! Read the prompt from the request body !
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Invalid prompt" });
  }

  // ! Make sure you set STABILITY_API_KEY in Vercel Env Vars !
  const apiKey = process.env.STABILITY_API_KEY; // ! Must be set in Vercel -> Settings -> Environment Variables !
  if (!apiKey) {
    return res.status(500).json({ error: "Missing STABILITY_API_KEY" });
  }

  try {
    // ! You can change the engineId if you want a different model, e.g. "stable-diffusion-xl-beta-v2-2-2" !
    const engineId = "stable-diffusion-xl-1024-v1-0";

    // POST request to Stability AI's text-to-image endpoint
    const response = await fetch(
      `https://api.stability.ai/v1/generation/${engineId}/text-to-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt }],
          cfg_scale: 7,
          clip_guidance_preset: "FAST_BLUE",
          samples: 1,
          steps: 30,
        }),
      }
    );

    // If Stability's API call fails
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `Stability API error: ${err}` });
    }

    // Parse JSON; artifacts[] should contain base64 images
    const data = await response.json();
    if (!data.artifacts || !Array.isArray(data.artifacts) || data.artifacts.length === 0) {
      return res.status(500).json({ error: "No images returned from Stability API" });
    }

    // Grab the first image as base64
    const base64Image = data.artifacts[0].base64;
    // Convert to a data URL
    const imageDataUrl = `data:image/png;base64,${base64Image}`;

    // Return JSON with success + the image data
    return res.status(200).json({
      success: true,
      image: imageDataUrl,
    });
  } catch (error) {
    console.error("Stability AI Error:", error);
    return res.status(500).json({ error: "Stability AI request failed" });
  }
}
