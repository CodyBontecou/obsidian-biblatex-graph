export interface BiblatexGraphSettings {
  /** The prefix character(s) used before a citekey, e.g. "@" */
  citationPrefix: string;
  /** Folder where reference notes live, e.g. "references" */
  referenceFolder: string;
  /** Whether to auto-create a reference note when clicking a missing citekey */
  autoCreateNote: boolean;
}

export const DEFAULT_SETTINGS: BiblatexGraphSettings = {
  citationPrefix: "@",
  referenceFolder: "references",
  autoCreateNote: true,
};
