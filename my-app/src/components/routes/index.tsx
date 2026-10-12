import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "roomvar — AI interior designer" },
      { name: "description", content: "Chat with an AI interior designer and generate photorealistic room visuals." },
      { property: "og:title", content: "roomvar — AI interior designer" },
      { property: "og:description", content: "Chat with an AI interior designer and generate photorealistic room visuals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// The whole RoomVAR app lives in the single file public/roomvar.html.
function Index() {
  return (
    <iframe
      src="/roomvar.html"
      title="roomvar"
      className="fixed inset-0 h-full w-full border-0 bg-background"
      allow="microphone"
    />
  );
}
