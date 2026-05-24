export interface MarkdownStructure {
  markdown: string;
  headers: string[];
}

/**
 * Extracts lightweight document structure used by the webview header list.
 */
export async function parseMarkdownToStructure(
  markdownText: string,
): Promise<MarkdownStructure> {
  const headers: string[] = [];
  let activeFence: { marker: "`" | "~"; length: number } | undefined;

  for (const line of markdownText.split("\n")) {
    const fenceMatch = line.match(/^( {0,3})(`{3,}|~{3,})/);
    if (fenceMatch) {
      const fence = fenceMatch[2];
      const marker = fence[0] as "`" | "~";

      if (!activeFence) {
        activeFence = { marker, length: fence.length };
        continue;
      }

      if (activeFence.marker === marker && fence.length >= activeFence.length) {
        activeFence = undefined;
      }

      continue;
    }

    if (activeFence) {
      continue;
    }

    const headingMatch = line.match(/^ {0,3}(#{1,6})(?:\s+|$)(.*)$/);
    if (headingMatch) {
      headers.push(headingMatch[2].replace(/\s+#+\s*$/, "").trim());
    }
  }

  return {
    markdown: markdownText,
    headers,
  };
}
