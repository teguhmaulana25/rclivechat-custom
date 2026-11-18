import { io, Socket } from "socket.io-client";
import { CHAT_CONTRACT_VERSION, ChatEvent, ChatMessage } from "./chat-contract";

export class ChatSocketClient {
  private socket: Socket;
  private sessionId: string | null = null;

  constructor(
    private readonly opts: {
      url: string;
      appId: string;
      userId: string;
      role: "user" | "agent";
    },
  ) {
    this.socket = io(opts.url, {
      autoConnect: true,
      transports: ["websocket"],
      auth: {
        appId: opts.appId,
        userId: opts.userId,
        role: opts.role,
      },
    });
  }

  async handshake(): Promise<void> {
    await this.emitWithAck(ChatEvent.Connect, {
      contractVersion: CHAT_CONTRACT_VERSION,
    });
  }

  async startSession(sessionId?: string): Promise<string> {
    const result = await this.emitWithAck<{ sessionId: string }>(
      ChatEvent.SessionStart,
      { sessionId },
    );
    this.sessionId = result.sessionId;
    return result.sessionId;
  }

  async sendMessage(body: string, messageId?: string): Promise<ChatMessage> {
    if (!this.sessionId) {
      await this.startSession();
    }

    const currentSessionId = this.sessionId;
    if (!currentSessionId) {
      throw new Error("Session has not started");
    }

    const resolvedMessageId = messageId ?? crypto.randomUUID();
    return this.emitWithAck<ChatMessage>(ChatEvent.MessageSend, {
      sessionId: currentSessionId,
      messageId: resolvedMessageId,
      body,
    });
  }

  onMessage(callback: (message: ChatMessage) => void): void {
    this.socket.on(ChatEvent.MessageReceive, callback);
  }

  onAck(callback: (message: ChatMessage) => void): void {
    this.socket.on(ChatEvent.MessageAck, callback);
  }

  onReconnect(callback: () => void): void {
    this.socket.on("reconnect", callback);
  }

  clearEventHandlers(): void {
    this.socket.off(ChatEvent.MessageReceive);
    this.socket.off(ChatEvent.MessageAck);
    this.socket.off("reconnect");
  }

  async reconnectToSession(): Promise<void> {
    if (!this.sessionId) {
      return;
    }
    await this.startSession(this.sessionId);
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  private emitWithAck<T = Record<string, unknown>>(
    event: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.socket
        .timeout(4000)
        .emit(event, payload, (err: Error | null, response: T) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(response);
        });
    });
  }
}
