export const CHAT_CONTRACT_VERSION = "1.0";

export const ChatEvent = {
  Connect: "chat:v1:connect",
  SessionStart: "chat:v1:session:start",
  SessionClose: "chat:v1:session:close",
  MessageSend: "chat:v1:message:send",
  MessageReceive: "chat:v1:message:receive",
  MessageAck: "chat:v1:message:ack",
} as const;

export type DeliveryState = "pending" | "delivered" | "failed";

export interface ChatMessage {
  sessionId: string;
  messageId: string;
  senderUserId: string;
  body: string;
  sequence: number;
  deliveryState: DeliveryState;
}
