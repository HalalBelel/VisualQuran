// api/proxy.js
export default async function handler(req, res) {
  const apiUrl = "https://api.anthropic.com/v1/messages";
  try {
    const response = await fetch(apiUrl, {
      method: req.method,
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY, // This will be set in Vercel's environment variables.
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
