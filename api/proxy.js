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
    // Only process the body for non-GET requests.
    let body = req.method === "GET" ? null : req.body;
    
    // If there's a messages array, remove any messages with role "system"
    // and set their content in a top-level "system" field.
    if (body && Array.isArray(body.messages)) {
      const systemMessages = body.messages.filter(
        msg => msg.role && msg.role.toLowerCase() === "system"
      );
      if (systemMessages.length > 0) {
        // Combine system messages if there are more than one.
        body.system = systemMessages.map(msg => msg.content).join("\n");
        // Remove system messages from the messages array.
        body.messages = body.messages.filter(
          msg => msg.role.toLowerCase() !== "system"
        );
      }
    }
    
    const response = await fetch(apiUrl, {
      method: req.method,
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY, // Set this in Vercel Environment Variables.
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: req.method === "GET" ? null : JSON.stringify(body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
