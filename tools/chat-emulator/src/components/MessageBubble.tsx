import { richText } from "../lib/richText";
import type { ChatMessage } from "../types";

const LABEL: Record<ChatMessage["role"], string> = {
  tx: "YOU",
  rx: "BOT",
  sys: "SYS",
  err: "ERR",
};

export function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "sys" || msg.role === "err") {
    return (
      <div className={"note note--" + msg.role} role="status">
        {msg.text}
      </div>
    );
  }

  return (
    <div className={"line line--" + msg.role}>
      <span className="line__tag mono">{LABEL[msg.role]}</span>
      <div className="bubble">
        <p className="bubble__text">{richText(msg.text)}</p>
        <time className="bubble__time mono">{msg.time}</time>
      </div>
    </div>
  );
}
