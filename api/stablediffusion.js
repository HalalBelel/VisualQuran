// VisualQuran/api/stablediffusion.js

// This function calls Stability AI's text-to-image endpoint for each prompt
// and returns an array of base64 image data URLs.

// --- CORS & OPTIONS Handling ---
export default async function handler(req, res) {
  // ! CORS HEADERS (do not change)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Read and Validate Payload ---
  const { prompts } = req.body;
  if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
    return res.status(400).json({ error: "Invalid prompts" });
  }

  // ! Make sure you set STABILITY_API_KEY in Vercel Environment Variables !
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing STABILITY_API_KEY" });
  }

  // ! Change the engineId if you wish. Here we use stable-diffusion-xl-1024-v1-0 !
  const engineId = "stable-diffusion-xl-1024-v1-0";

  try {
    // Map over each prompt to call the API in parallel
    const fetchPromises = prompts.map(async (promptText) => {
      const response = await fetch(
        `https://api.stability.ai/v1/generation/${engineId}/text-to-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            text_prompts: [{ text: promptText }],
            cfg_scale: 7, // ! Adjust if needed
            clip_guidance_preset: "FAST_BLUE", // ! You may experiment here
            samples: 1, // 1 image per prompt
            steps: 30, // ! Adjust inference steps if desired
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Stability API error: ${err}`);
      }

      const data = await response.json();
      if (!data.artifacts || !Array.isArray(data.artifacts) || data.artifacts.length === 0) {
        throw new Error("No images returned from Stability API");
      }

      // Grab the first image's base64 string and form a data URL.
      const base64Image = data.artifacts[0].base64;
      return `data:image/png;base64,${base64Image}`;
    });

    const images = await Promise.all(fetchPromises);
    return res.status(200).json({ success: true, images });
  } catch (error) {
    console.error("Stability AI Error:", error);
    return res.status(500).json({ error: "Stability AI request failed" });
  }
}
