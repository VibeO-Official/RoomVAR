import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You are RoomVAR, a warm, expert AI interior designer and furniture advisor.
Help users redesign rooms, choose styles, palettes, layouts, lighting and furniture.
When a room photo is attached, analyze it concretely (layout, light, colors, issues) and give actionable suggestions.
Never invent specific products, prices or store links; describe item types, dimensions and materials instead.
Use concise markdown with headings and bullet lists. If the user wants a visual, suggest they use the Image tool.`;

type InMsg = { role: "user" | "assistant"; content: string; image?: string | null };

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { CORS } = await import("@/lib/roomvar-api.server");
        return new Response(null, { status: 204, headers: CORS });
      },
      POST: async ({ request }) => {
        const { CORS, json, verifyUser, gatewayError } = await import("@/lib/roomvar-api.server");
        const userId = await verifyUser(request);
        if (!userId) return json({ error: "Please sign in to chat." }, 401);
        const apiKey = process.env['LOVABLE_API_KEY'];
        if (!apiKey) return json({ error: "AI service is not configured." }, 500);

        let body: { messages?: InMsg[] };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid request." }, 400);
        }
        const msgs = (body.messages ?? []).slice(-30);
        if (!msgs.length) return json({ error: "No messages." }, 400);

        const input = msgs.map((m) =>
          m.role === "assistant"
            ? { role: "assistant", content: [{ type: "output_text", text: m.content }] }
            : {
                role: "user",
                content: [
                  { type: "input_text", text: m.content || "Analyze this image." },
                  ...(m.image ? [{ type: "input_image", image_url: m.image }] : []),
                ],
              },
        );

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
            method: "POST",
            signal: request.signal,
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey,
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({
              model: "openai/gpt-6-astra",
              instructions: SYSTEM,
              input,
              stream: true,
              store: false,
              reasoning: { effort: "low" },
            }),
          });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw e;
        }
        if (!upstream.ok || !upstream.body) return gatewayError(upstream);

        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        const enc = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            let buf = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                let i;
                while ((i = buf.indexOf("\n")) >= 0) {
                  const line = buf.slice(0, i).trim();
                  buf = buf.slice(i + 1);
                  if (!line.startsWith("data:")) continue;
                  const data = line.slice(5).trim();
                  if (!data || data === "[DONE]") continue;
                  try {
                    const ev = JSON.parse(data);
                    if (ev.type === "response.output_text.delta" && ev.delta)
                      controller.enqueue(enc.encode(ev.delta));
                    if (ev.type === "error" || ev.type === "response.failed")
                      controller.enqueue(enc.encode("\n\n⚠️ The AI response failed. Please try again."));
                  } catch {
                    /* partial */
                  }
                }
              }
            } catch {
              /* aborted */
            }
            controller.close();
          },
          cancel() {
            reader.cancel();
          },
        });
        return new Response(stream, {
          headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
