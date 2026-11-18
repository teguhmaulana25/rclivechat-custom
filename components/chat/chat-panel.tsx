"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ChatMessage } from "../../lib/chat-contract";
import styles from "./chat-panel.module.css";

interface Props {
  appId: string;
  userId: string;
}

export function ChatPanel({ appId, userId }: Props) {
  const sessionStorageKey = useMemo(
    () => `chat.session.${appId}.${userId}`,
    [appId, userId],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_CHAT_URL ??
    "http://localhost:3001";

  useEffect(() => {
    const savedSession = window.localStorage.getItem(sessionStorageKey);
    if (savedSession) {
      setSessionId(savedSession);
      setIsChatMode(true);
    }
  }, [sessionStorageKey]);

  useEffect(() => {
    if (!sessionId) {
      window.localStorage.removeItem(sessionStorageKey);
      return;
    }

    window.localStorage.setItem(sessionStorageKey, sessionId);
  }, [sessionId, sessionStorageKey]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const response = await fetch(
          `${apiBase}/chat/messages/${encodeURIComponent(sessionId)}`,
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            errorText || `Failed to load messages (${response.status})`,
          );
        }

        const json = (await response.json()) as {
          messages?: Array<{
            id: string;
            sessionId: string;
            senderType: string;
            message: string;
            createdAt: string;
          }>;
        };

        if (cancelled) {
          return;
        }

        const mapped: ChatMessage[] = (json.messages ?? []).map((item) => ({
          sessionId: item.sessionId,
          messageId: item.id,
          senderUserId:
            item.senderType === "customer" ? userId : item.senderType,
          body: item.message,
          sequence: new Date(item.createdAt).getTime(),
          deliveryState: "delivered",
        }));

        setMessages(mapped);
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load chat messages";
          setSubmitError(message);
        }
      }
    };

    void loadMessages();
    const intervalId = window.setInterval(() => {
      void loadMessages();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [apiBase, sessionId, userId]);

  const sendApiMessage = async (text: string): Promise<void> => {
    if (!sessionId) {
      setSubmitError("Session is not ready. Please start chat first.");
      return;
    }

    const optimistic: ChatMessage = {
      sessionId,
      messageId: crypto.randomUUID(),
      senderUserId: userId,
      body: text,
      sequence: Date.now(),
      deliveryState: "pending",
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await fetch(`${apiBase}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          name,
          message: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || `Message send failed (${response.status})`,
        );
      }

      const json = (await response.json()) as {
        messageId?: string;
        sessionId?: string;
      };

      setMessages((prev) =>
        prev.map((item) =>
          item.messageId === optimistic.messageId
            ? {
                ...item,
                messageId: json.messageId ?? item.messageId,
                sessionId: json.sessionId ?? item.sessionId,
                deliveryState: "delivered",
              }
            : item,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send message";
      setSubmitError(message);
      setMessages((prev) =>
        prev.map((item) =>
          item.messageId === optimistic.messageId
            ? { ...item, deliveryState: "failed" }
            : item,
        ),
      );
    }
  };

  const onStartChat = async () => {
    if (
      !email.trim() ||
      !phoneNumber.trim() ||
      !leadMessage.trim() ||
      isSubmitting
    ) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const leadResponse = await fetch(`${apiBase}/chat/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId,
          name,
          email,
          phoneNumber,
          message: leadMessage,
        }),
      });

      if (!leadResponse.ok) {
        const errorText = await leadResponse.text();
        throw new Error(
          errorText || `Lead submit failed (${leadResponse.status})`,
        );
      }

      const json = (await leadResponse.json()) as {
        sessionId?: string;
      };

      if (!json.sessionId) {
        throw new Error("chat/start response does not contain sessionId");
      }

      setSessionId(json.sessionId);

      setIsChatMode(true);
      setLeadMessage("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit chat";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canStart =
    email.trim().length > 0 &&
    phoneNumber.trim().length > 0 &&
    leadMessage.trim().length > 0 &&
    !isSubmitting;

  const canSendChat = chatDraft.trim().length > 0 && !isSubmitting;

  const openWidget = () => setIsOpen(true);
  const closeWidget = () => {
    setIsOpen(false);
  };

  const endChat = () => {
    setIsChatMode(false);
    setSessionId(null);
    window.localStorage.removeItem(sessionStorageKey);
    setMessages([]);
    setChatDraft("");
  };

  const onSendChat = async () => {
    if (!canSendChat) {
      return;
    }
    const text = chatDraft.trim();
    setChatDraft("");
    await sendApiMessage(text);
  };

  const formatTime = (sequence: number): string => {
    return new Date(sequence).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <section className={styles.widgetDock}>
      {isOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close chat widget backdrop"
          onClick={closeWidget}
        />
      ) : null}

      {isOpen ? (
        <div className={styles.card}>
          {isChatMode ? (
            <>
              <header className={styles.chatHeader}>
                <h1 className={styles.chatTitle}>Raisecall Custom Channel</h1>
                <button
                  type="button"
                  className={styles.endChatButton}
                  onClick={endChat}
                >
                  End Chat
                </button>
              </header>

              <div className={styles.chatBody}>
                <div className={styles.dayPill}>Today</div>

                <div className={styles.chatScrollArea}>
                  {messages.map((message) =>
                    message.senderUserId === userId ? (
                      <div
                        key={message.messageId}
                        className={styles.messageItemOwn}
                      >
                        <p className={styles.messageAuthor}>You</p>
                        <div className={styles.bubbleOwn}>{message.body}</div>
                        <p className={styles.messageMetaOwn}>
                          {message.deliveryState === "delivered"
                            ? "✓"
                            : message.deliveryState === "failed"
                              ? "!"
                              : "…"}{" "}
                          {formatTime(message.sequence)}
                        </p>
                      </div>
                    ) : (
                      <div
                        key={message.messageId}
                        className={styles.messageItemAgent}
                      >
                        <p className={styles.messageAuthorAgent}>Agent</p>
                        <div className={styles.bubbleAgent}>{message.body}</div>
                        <p className={styles.messageMetaAgent}>
                          {formatTime(message.sequence)}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                {submitError ? (
                  <p className={styles.errorText}>{submitError}</p>
                ) : null}

                <div className={styles.composerWrap}>
                  <input
                    className={styles.composerInput}
                    placeholder="Type message here..."
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void onSendChat();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={`${styles.sendButton} ${canSendChat ? styles.sendButtonActive : ""}`}
                    onClick={() => void onSendChat()}
                    disabled={!canSendChat}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <header className={styles.header}>
                <div className={styles.logo}>R</div>
                <h1 className={styles.title}>CS Raisecall</h1>
              </header>

              <div className={styles.body}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="lead-name">
                    Name
                  </label>
                  <input
                    id="lead-name"
                    className={styles.input}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="lead-email">
                    Email<span className={styles.required}>*</span>
                  </label>
                  <input
                    id="lead-email"
                    className={styles.input}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="e.g. yourname@domain.com"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="lead-phone">
                    Phone Number<span className={styles.required}>*</span>
                  </label>
                  <input
                    id="lead-phone"
                    className={styles.input}
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="e.g. +62 855 888"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="lead-message">
                    Message<span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id="lead-message"
                    className={styles.textarea}
                    value={leadMessage}
                    onChange={(event) => setLeadMessage(event.target.value)}
                    placeholder="Type here"
                  />
                </div>

                <div className={styles.footer}>
                  <button
                    type="button"
                    onClick={onStartChat}
                    className={`${styles.startButton} ${canStart ? styles.startButtonActive : ""}`}
                    disabled={!canStart}
                  >
                    {isSubmitting ? "Sending..." : "Start Chat"}
                  </button>
                </div>

                {submitError ? (
                  <p className={styles.errorText}>{submitError}</p>
                ) : null}

                <p className={styles.meta}>
                  Session: {sessionId ? "ready" : "pending"}
                </p>
              </div>
            </>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className={isOpen ? styles.fabClose : styles.fabLauncher}
        aria-label={isOpen ? "Hide chat widget" : "Open chat widget"}
        onClick={isOpen ? closeWidget : openWidget}
      >
        {isOpen ? "×" : "✦"}
      </button>
    </section>
  );
}
