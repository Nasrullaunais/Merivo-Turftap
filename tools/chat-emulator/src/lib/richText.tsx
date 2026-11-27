import { Fragment, type ReactNode } from "react";

// Handles **bold** *bold* _italic_ ~strike~ `code` and links as React nodes, never raw HTML.
const TOKEN_SOURCE =
  "(\\*\\*[^*\\n]+\\*\\*|\\*[^*\\n]+\\*|_[^_\\n]+_|~[^~\\n]+~|`[^`\\n]+`|https?:\\/\\/[^\\s]+)";

function unwrap(token: string): string {
  if (token.startsWith("**") && token.endsWith("**")) return token.slice(2, -2);
  return token.slice(1, -1);
}

export function richText(text: string, prefix = "r"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  // New regex per call: a shared global regex's lastIndex would be clobbered by the recursion.
  const token_re = new RegExp(TOKEN_SOURCE, "g");
  while ((match = token_re.exec(text)) !== null) {
    const token = match[0];
    if (match.index > last) out.push(text.slice(last, match.index));
    const key = `${prefix}-${i++}`;

    if (token.startsWith("`")) {
      out.push(
        <code key={key} className="md-code">
          {unwrap(token)}
        </code>,
      );
    } else if (/^https?:\/\//.test(token)) {
      out.push(
        <a key={key} href={token} target="_blank" rel="noopener noreferrer">
          {token}
        </a>,
      );
    } else if (token.startsWith("**") || token.startsWith("*")) {
      out.push(<strong key={key}>{richText(unwrap(token), key)}</strong>);
    } else if (token.startsWith("_")) {
      out.push(<em key={key}>{richText(unwrap(token), key)}</em>);
    } else if (token.startsWith("~")) {
      out.push(<s key={key}>{richText(unwrap(token), key)}</s>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));

  return [<Fragment key={`${prefix}-x`}>{out}</Fragment>];
}
