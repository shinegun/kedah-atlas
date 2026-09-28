/** Public source repository: corrections go to its issues. */
export const REPO = "https://github.com/shinegun/kedah-atlas";

/**
 * Where place suggestions for the local guides go (see suggestUrl in lib/jalan.ts).
 * The first one set wins: a WhatsApp number (international form, e.g. "60123456789"),
 * then a form URL (e.g. a Google Form); with neither, the GitHub issue form.
 */
export const SUGGEST = { whatsapp: "", form: "" };
