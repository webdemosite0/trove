/**
 * Detect prompts that should go through the image generator
 * instead of (or in addition to) a normal text reply.
 */
export function isImagePrompt(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  // Explicit image verbs + image nouns
  if (
    /\b(generate|create|draw|make|paint|render|imagine|design|sketch)\b[\s\S]{0,48}\b(image|picture|photo|illustration|artwork|logo|icon|mockup|wireframe|screenshot|ui|ux)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  // Shorthand
  if (/\b(txt2img|text to image|image of|logo for|icon for)\b/i.test(t)) {
    return true;
  }

  // UI / UX design requests
  if (
    /\b(ui|ux|user interface|user experience|app screen|landing page|dashboard|mobile screen|web page)\b/i.test(
      t,
    ) &&
    /\b(design|mockup|wireframe|prototype|layout|visual|looks like|screenshot)\b/i.test(t)
  ) {
    return true;
  }

  return false;
}

/** Whether this is primarily a UI/UX visual request. */
export function isUiUxImagePrompt(text: string): boolean {
  return /\b(ui|ux|user interface|user experience|mockup|wireframe|app screen|dashboard|landing page|mobile screen|prototype|interface design)\b/i.test(
    text,
  );
}

/**
 * Build a stronger prompt for the image model when the user wants UI/UX work.
 */
export function enrichImagePrompt(raw: string): string {
  const prompt = raw.trim().slice(0, 1800);
  if (!isUiUxImagePrompt(prompt)) return prompt;

  return [
    prompt,
    "",
    "Style requirements for this UI/UX visual:",
    "- Clean modern product design, high fidelity, realistic interface",
    "- Clear hierarchy, readable type, consistent spacing and alignment",
    "- Polished component styling (buttons, cards, nav, forms) with soft shadows",
    "- Cohesive color system; avoid cluttered or low-contrast UI",
    "- Show a full screen or key frames as appropriate; no watermark, no browser chrome unless asked",
  ].join("\n");
}

export function imageCaptionFromPrompt(prompt: string): string {
  const cleaned =
    prompt
      .replace(
        /^(generate|create|draw|make|paint|render|imagine|design|sketch)\s+(an?\s+)?(image|picture|photo|illustration|mockup|wireframe|ui|ux)\s+(of\s+)?/i,
        "",
      )
      .trim() || "Image";
  return cleaned.slice(0, 80);
}
