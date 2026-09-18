"use client";

import { useCallback, useReducer } from "react";
import type { Slide } from "@/lib/slides";
import * as ops from "@/lib/deck-ops";

const HISTORY_LIMIT = 60;

interface State {
  past: Slide[][];
  present: Slide[];
  future: Slide[][];
  edited: boolean;
  lastKey: string | null;
}

type Action =
  | { type: "load"; slides: Slide[] }
  | { type: "edit"; slides: Slide[]; key?: string }
  | { type: "undo" }
  | { type: "redo" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return { past: [], present: action.slides, future: [], edited: false, lastKey: null };

    case "edit": {
      if (action.slides === state.present) return state;
      const coalesced = action.key != null && action.key === state.lastKey;
      return {
        past: coalesced
          ? state.past
          : [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: action.slides,
        future: [],
        edited: true,
        lastKey: action.key ?? null,
      };
    }

    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        edited: true,
        lastKey: null,
      };
    }

    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest,
        edited: true,
        lastKey: null,
      };
    }
  }
}

export function useDeck(initial: Slide[] = []) {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: initial,
    future: [],
    edited: false,
    lastKey: null,
  });

  const edit = useCallback(
    (slides: Slide[], key?: string) => dispatch({ type: "edit", slides, key }),
    [],
  );

  const slides = state.present;

  return {
    slides,
    edited: state.edited,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,

    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
    load: useCallback((next: Slide[]) => dispatch({ type: "load", slides: next }), []),

    setTitle: (i: number, v: string) => edit(ops.setTitle(slides, i, v), `title:${i}`),
    setNote: (i: number, v: string) => edit(ops.setNote(slides, i, v), `note:${i}`),
    setBullet: (i: number, b: number, v: string) =>
      edit(ops.setBullet(slides, i, b, v), `bullet:${i}:${b}`),

    addBullet: (i: number, at?: number) => edit(ops.addBullet(slides, i, at)),
    removeBullet: (i: number, b: number) => edit(ops.removeBullet(slides, i, b)),
    addSlide: (after: number) => edit(ops.addSlide(slides, after)),
    duplicateSlide: (i: number) => edit(ops.duplicateSlide(slides, i)),
    removeSlide: (i: number) => edit(ops.removeSlide(slides, i)),
    moveSlide: (from: number, to: number) => edit(ops.moveSlide(slides, from, to)),
    setImage: (i: number, image: string | undefined) =>
      edit(ops.setImage(slides, i, image), `image:${i}`),
    setLayout: (i: number, layout: Slide["layout"]) =>
      edit(ops.setLayout(slides, i, layout), `layout:${i}`),
  };
}
