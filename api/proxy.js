// api/proxy.js

export default async function handler(req, res) {
  // Set CORS headers to allow requests from any origin.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, anthropic-version");

  // Handle preflight (OPTIONS) requests.
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  
  const apiUrl = "https://api.anthropic.com/v1/messages";
  
  try {
    const response = await fetch(apiUrl, {
      method: req.method,
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY, // Stored in Vercel Environment Variables.
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: req.method === "GET" ? null : JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
