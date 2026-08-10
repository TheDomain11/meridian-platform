// Turns raw http(s):// URLs inside a plain-text string into clickable <a> tags, so a
// reviewer can check a source without copy-pasting it out of the draft. Display-only: this
// never touches the underlying string, and it's meant for rendering, not for anything in a
// send path — a draft still gets stored and sent as the exact same plain text it always was.
const URL_REGEX = /https?:\/\/[^\s<>"']+/g

const CLOSING_TO_OPENING = { ')': '(', ']': '[', '}': '{' }

// A URL matched greedily off the end of a sentence often swallows trailing punctuation that
// isn't really part of it — "https://example.com/page." or "(https://example.com/page)".
// Strip simple trailing punctuation, and only strip a closing bracket/paren if it isn't
// balanced by a matching opener actually inside the URL (so a Wikipedia-style URL ending in
// "_(disambiguation)" keeps its closing paren).
function trimTrailingPunctuation(url) {
  let end = url.length
  while (end > 0) {
    const ch = url[end - 1]
    const opener = CLOSING_TO_OPENING[ch]
    if (opener) {
      const prefix = url.slice(0, end)
      const opens = prefix.split(opener).length - 1
      const closes = prefix.split(ch).length - 1
      if (closes > opens) {
        end--
        continue
      }
      break
    }
    if ('.,;:!?\'"'.includes(ch)) {
      end--
      continue
    }
    break
  }
  return { clean: url.slice(0, end), trailing: url.slice(end) }
}

/**
 * Splits plain text on http(s):// URLs and returns an array of strings and <a> elements,
 * ready to render directly as JSX children (e.g. {linkify(text)}). Text around the URLs is
 * returned untouched as plain strings — only the URL substrings become links.
 */
export function linkify(text) {
  if (!text) return text

  const nodes = []
  let lastIndex = 0
  let match
  let key = 0

  URL_REGEX.lastIndex = 0
  while ((match = URL_REGEX.exec(text)) !== null) {
    const { clean, trailing } = trimTrailingPunctuation(match[0])
    if (!clean) continue

    const start = match.index
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start))
    }

    nodes.push(
      <a
        key={`linkify-${key++}`}
        href={clean}
        target="_blank"
        rel="noopener noreferrer"
        className="text-teal hover:text-navy underline transition-colors duration-150"
      >
        {clean}
      </a>
    )
    if (trailing) nodes.push(trailing)

    lastIndex = start + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}
