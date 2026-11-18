import { ChatPanel } from "../../components/chat/chat-panel";

export default function ChatPage() {
  if (process.env.NEXT_PUBLIC_FEATURE_LIVE_CHAT !== "true") {
    return <main>Live chat feature is disabled.</main>;
  }

  const appId = process.env.NEXT_PUBLIC_APP_ID ?? "demo-app";
  const userId = process.env.NEXT_PUBLIC_USER_ID ?? "demo-user";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#efeff1",
        color: "#2b2f37",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>
        INI DASHBOARD
      </h1>
      <ChatPanel appId={appId} userId={userId} />
    </main>
  );
}
