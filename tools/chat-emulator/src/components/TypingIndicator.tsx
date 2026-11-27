export function TypingIndicator() {
  return (
    <div className="line line--rx">
      <span className="line__tag mono">BOT</span>
      <div className="bubble bubble--typing" aria-label="The Assistant is answering">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}
