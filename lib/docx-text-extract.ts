type InlineStyle = {
  bold: boolean;
  italic: boolean;
};

const DEFAULT_INLINE_STYLE: InlineStyle = { bold: false, italic: false };

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "section",
  "article",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
]);

function wrapStyledText(text: string, style: InlineStyle): string {
  if (!text) {
    return "";
  }

  if (style.bold && style.italic) {
    return `***${text}***`;
  }
  if (style.bold) {
    return `**${text}**`;
  }
  if (style.italic) {
    return `*${text}*`;
  }

  return text;
}

function renderInline(node: Node, style: InlineStyle): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return wrapStyledText(node.textContent ?? "", style);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === "br") {
    return "\n";
  }

  const nextStyle: InlineStyle = {
    bold: style.bold || tag === "strong" || tag === "b",
    italic: style.italic || tag === "em" || tag === "i",
  };

  return Array.from(element.childNodes)
    .map((child) => renderInline(child, nextStyle))
    .join("");
}

function renderBlockChildren(element: HTMLElement): string {
  return Array.from(element.childNodes)
    .map((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        return renderBlock(child as HTMLElement);
      }
      if (child.nodeType === Node.TEXT_NODE) {
        return child.textContent ?? "";
      }
      return "";
    })
    .join("");
}

function renderBlock(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();

  if (tag === "ul" || tag === "ol") {
    return Array.from(element.children)
      .map((child) => renderBlock(child as HTMLElement))
      .filter(Boolean)
      .join("\n");
  }

  if (tag === "li") {
    const content = renderBlockChildren(element).trim();
    return content ? `- ${content}` : "";
  }

  if (tag === "blockquote") {
    const content = renderBlockChildren(element).trim();
    return content ? `$${content}$` : "";
  }

  if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
    const content = renderBlockChildren(element).trim();
    return content ? `**${content}**` : "";
  }

  if (BLOCK_TAGS.has(tag) || tag === "body") {
    const inlineParts = Array.from(element.childNodes).map((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return child.textContent ?? "";
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childElement = child as HTMLElement;
        if (BLOCK_TAGS.has(childElement.tagName.toLowerCase())) {
          return renderBlock(childElement);
        }
        return renderInline(child, DEFAULT_INLINE_STYLE);
      }
      return "";
    });

    return inlineParts.join("").trim();
  }

  return renderInline(element, DEFAULT_INLINE_STYLE);
}

function htmlToStoryMarkup(html: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const blocks: string[] = [];

  for (const child of Array.from(document.body.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim();
      if (text) {
        blocks.push(text);
      }
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const content = renderBlock(child as HTMLElement).trim();
    if (content) {
      blocks.push(content);
    }
  }

  return blocks
    .join("\n\n")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Quote'] => blockquote",
        "p[style-name='인용'] => blockquote",
        "p[style-name='대사'] => p",
      ],
    },
  );

  if (result.messages.length > 0) {
    const hasError = result.messages.some((message) => message.type === "error");
    if (hasError && !result.value.trim()) {
      throw new Error("DOCX 파일을 읽는 중 오류가 발생했어요.");
    }
  }

  const markup = htmlToStoryMarkup(result.value);
  if (!markup) {
    throw new Error("DOCX에서 읽을 수 있는 텍스트가 없어요.");
  }

  return markup;
}
