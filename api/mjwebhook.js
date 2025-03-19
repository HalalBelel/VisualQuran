import { Client, GatewayIntentBits, Partials } from "discord.js";

// In-memory storage for tracking prompts and their responses.
const promptMap = new Map();

// Use a global variable to avoid reinitializing the Discord client.
let client = globalThis.discordClient || null;

async function initDiscord() {
  if (!client) {
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel],
    });
    await client.login(process.env.DISCORD_BOT_TOKEN);

    client.on("messageCreate", (message) => {
      // Only process messages from the Midjourney Bot.
      if (message.author.id !== process.env.MIDJOURNEY_BOT_ID) return;

      const attachments = Array.from(message.attachments.values());
      if (attachments.length > 0) {
        const imageUrl = attachments[0].url;

        // Loop through stored prompts to match the message content.
        for (const [id, data] of promptMap.entries()) {
          if (!data.resolved && message.content.includes(data.prompt)) {
            data.images.push(imageUrl);
            data.resolved = true;
          }
        }
      }
    });

    globalThis.discordClient = client;
  }
}

export default async function handler(req, res) {
  // 1) CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 2) Handle preflight (OPTIONS) requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 3) Initialize the Discord client (only once)
  await initDiscord();

  // 4) Handle POST, GET, or else 405
  if (req.method === "POST") {
    const { prompts, requestId } = req.body;
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: "No prompts provided" });
    }

    const id = requestId || Date.now().toString();
    const joinedPrompt = prompts.join("\n");
    promptMap.set(id, { prompt: joinedPrompt, images: [], resolved: false });

    try {
      const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

      // Send the command to Midjourney for each prompt
      for (let p of prompts) {
        await channel.send(`/imagine prompt: ${p}`);
      }

      return res.status(200).json({ success: true, requestId: id });
    } catch (error) {
      console.error("Error sending prompt:", error);
      return res.status(500).json({ error: "Error sending prompt" });
    }

  } else if (req.method === "GET") {
    const { requestId } = req.query;
    if (!requestId || !promptMap.has(requestId)) {
      return res.status(404).json({ error: "Unknown requestId" });
    }

    const data = promptMap.get(requestId);
    return res.status(200).json({ resolved: data.resolved, images: data.images });

  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
