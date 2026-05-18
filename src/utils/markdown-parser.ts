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
  return {
    markdown: markdownText,
    headers: markdownText
      .split("\n")
      .filter((line) => line.match(/^(#{1,6})\s+/))
      .map((line) => line.replace(/^#+\s+/, "")),
  };
}
