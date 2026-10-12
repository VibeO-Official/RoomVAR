import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/image")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { CORS } = await import("@/lib/roomvar-api.server");
        return new Response(null, { status: 204, headers: CORS });
      },
      POST: async ({ request }) => {
        const { json, verifyUser, gatewayError } = await import("@/lib/roomvar-api.server");
        const userId = await verifyUser(request);
        if (!userId) return json({ error: "Please sign in to generate images." }, 401);
        const apiKey = process.env['LOVABLE_API_KEY'];
        if (!apiKey) return json({ error: "AI service is not configured." }, 500);

        let body: { prompt?: string; size?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid request." }, 400);
        }
        const prompt = (body.prompt ?? "").trim().slice(0, 2000);
        if (!prompt) return json({ error: "Please describe the image." }, 400);
        const size = ["1024x1024", "1536x1024", "1024x1536"].includes(body.size ?? "")
          ? body.size
          : "1536x1024";

        const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          signal: request.signal,
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-image-2.5-sunburst",
            prompt: `Photorealistic interior design visualization. ${prompt}`,
            size,
            quality: "medium",
            output_format: "jpeg",
            output_compression: 80,
          }),
        });
        if (!res.ok) return gatewayError(res);
        const data = (await res.json()) as { data?: { b64_json?: string }[] };
        const b64 = data.data?.[0]?.b64_json;
        if (!b64) return json({ error: "The image could not be generated. Try a different description." }, 502);
        return json({ image: `data:image/jpeg;base64,${b64}` });
      },
    },
  },
});
