import { richText } from "../lib/richText";
import type { ChatMessage, Choice, Choices } from "../types";
import { ChoiceButtons } from "./ChoiceButtons";

const LABEL: Record<ChatMessage["role"], string> = {
  tx: "YOU",
  rx: "BOT",
  sys: "SYS",
  err: "ERR",
};

interface Props {
  msg: ChatMessage;
  onTap: (choices: Choices, choice: Choice) => void;
}

export function MessageBubble({ msg, onTap }: Props) {
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
        {msg.attachment &&
          (msg.attachment.previewUrl ? (
            <img
              className="bubble__photo"
              src={msg.attachment.previewUrl}
              alt={msg.attachment.name}
            />
          ) : (
            <p className="bubble__file mono">{msg.attachment.name}</p>
          ))}
        {msg.text && <p className="bubble__text">{richText(msg.text)}</p>}
        {msg.footer && <p className="bubble__footer">{msg.footer}</p>}
        <time className="bubble__time mono">{msg.time}</time>
      </div>
      {msg.choices && <ChoiceButtons choices={msg.choices} onTap={onTap} />}
    </div>
  );
}
