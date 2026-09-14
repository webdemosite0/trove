import type { Slide } from "@/lib/slides";

/**
 * Every edit a deck supports, as pure functions.
 */

export const BLANK_SLIDE: Slide = {
  title: "New slide",
  bullets: ["Point one"],
  note: "",
  layout: "bullets",
};

function replace(slides: Slide[], index: number, change: Partial<Slide>): Slide[] {
  const target = slides[index];
  if (!target) return slides;
  const next = [...slides];
  next[index] = { ...target, ...change };
  return next;
}

export function setTitle(slides: Slide[], index: number, title: string): Slide[] {
  return replace(slides, index, { title });
}

export function setNote(slides: Slide[], index: number, note: string): Slide[] {
  return replace(slides, index, { note });
}

export function setBullet(
  slides: Slide[],
  index: number,
  bullet: number,
  text: string,
): Slide[] {
  const target = slides[index];
  if (!target || bullet < 0 || bullet >= target.bullets.length) return slides;
  const bullets = [...target.bullets];
  bullets[bullet] = text;
  return replace(slides, index, { bullets });
}

export function addBullet(slides: Slide[], index: number, at?: number): Slide[] {
  const target = slides[index];
  if (!target) return slides;
  const bullets = [...target.bullets];
  bullets.splice(at ?? bullets.length, 0, "");
  return replace(slides, index, { bullets });
}

export function removeBullet(slides: Slide[], index: number, bullet: number): Slide[] {
  const target = slides[index];
  if (!target || !target.bullets[bullet]) return slides;
  return replace(slides, index, {
    bullets: target.bullets.filter((_, n) => n !== bullet),
  });
}

export function addSlide(slides: Slide[], afterIndex: number): Slide[] {
  const at = Math.max(-1, Math.min(slides.length - 1, afterIndex));
  return [
    ...slides.slice(0, at + 1),
    { ...BLANK_SLIDE, bullets: [...BLANK_SLIDE.bullets] },
    ...slides.slice(at + 1),
  ];
}

export function duplicateSlide(slides: Slide[], index: number): Slide[] {
  const source = slides[index];
  if (!source) return slides;
  return [
    ...slides.slice(0, index + 1),
    { ...source, bullets: [...source.bullets], image: source.image },
    ...slides.slice(index + 1),
  ];
}

export function removeSlide(slides: Slide[], index: number): Slide[] {
  if (slides.length <= 1 || !slides[index]) return slides;
  return slides.filter((_, n) => n !== index);
}

export function moveSlide(slides: Slide[], from: number, to: number): Slide[] {
  if (from === to || !slides[from]) return slides;
  const next = [...slides];
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);
  return next;
}
