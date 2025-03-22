// /api/stablediffusion.js

export default async function handler(req, res) {
  // Basic CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompts, negative_prompt } = req.body;
  if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
    return res.status(400).json({ error: "Invalid prompts" });
  }

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing STABILITY_API_KEY" });
  }

  const engineId = "stable-diffusion-xl-1024-v1-0"; // or whichever you use

  try {
    // For each prompt, call the Stability API in parallel
    const results = await Promise.all(
      prompts.map(async (promptText) => {
        const response = await fetch(
          `https://api.stability.ai/v1/generation/${engineId}/text-to-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              text_prompts: [{ text: promptText }],
              negative_prompt, // <--- pass the negative prompt here
              cfg_scale: 9,
              clip_guidance_preset: "FAST_BLUE",
              samples: 1,
              steps: 30
            })
          }
        );

        if (!response.ok) {
          const errMsg = await response.text();
          throw new Error(`Stability API error: ${errMsg}`);
        }

        const data = await response.json();
        if (!data.artifacts || !Array.isArray(data.artifacts) || data.artifacts.length === 0) {
          throw new Error("No images returned from Stability API");
        }

        // Return the first image as base64
        return `data:image/png;base64,${data.artifacts[0].base64}`;
      })
    );

    return res.status(200).json({ success: true, images: results });
  } catch (err) {
    console.error("Stability AI error:", err);
    return res.status(500).json({ error: "Stability AI request failed" });
  }
}
