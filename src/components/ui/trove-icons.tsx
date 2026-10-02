import * as React from "react";
import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

/**
 * Trove's custom sidebar icon set — hand-drawn, ChatGPT-style premium glyphs.
 * Each icon has a signature detail (filled accent, unique silhouette) so no two
 * read as generic feather/tabler clones. 24x24 grid, round caps/joins.
 */

type SvgProps = LucideProps & { children: React.ReactNode };

const Svg = forwardRef<SVGSVGElement, SvgProps>(function Svg(
  { size = 20, className, strokeWidth = 2.5, style, children, absoluteStrokeWidth, ...rest },
  ref,
) {
  void absoluteStrokeWidth;
  // Never render thinner than 2.5 — keeps glyphs bold and legible at small sizes.
  const sw = Math.max(2.5, Number(strokeWidth) || 2.5);
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
});

function defineIcon(displayName: string, children: React.ReactNode): LucideIcon {
  const C = forwardRef<SVGSVGElement, LucideProps>(function TroveIcon(props, ref) {
    return (
      <Svg {...props} ref={ref}>
        {children}
      </Svg>
    );
  });
  C.displayName = displayName;
  return C as LucideIcon;
}

/** Home — house with arched door and a round window. */
export const TroveHomeIcon = defineIcon("TroveHomeIcon", <>
  <path d="M4 11 12 4l8 7" />
  <path d="M6.2 9.8V18a1.8 1.8 0 0 0 1.8 1.8h8A1.8 1.8 0 0 0 17.8 18V9.8" />
  <path d="M10.4 19.8v-3.4a1.6 1.6 0 0 1 3.2 0v3.4" />
  <circle cx="15.3" cy="13.2" r="0.9" fill="currentColor" stroke="none" />
</>);

/** Chat — clean speech bubble with a tail. */
export const TroveChatIcon = defineIcon("TroveChatIcon", <>
  <rect x="3.5" y="4" width="17" height="11.5" rx="5.75" />
  <path d="M8.2 15.3 6.8 19.6l4.9-4.1" />
</>);

/** Projects — folder with a notched tab and lid line. */
export const TroveProjectsIcon = defineIcon("TroveProjectsIcon", <>
  <path d="M3.5 7.2A2.2 2.2 0 0 1 5.7 5h4l2.2 2.6h6.4a2.2 2.2 0 0 1 2.2 2.2v7a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2z" />
  <path d="M3.5 10.4h17" />
</>);

/** Docs — page with folded corner and text lines. */
export const TroveDocsIcon = defineIcon("TroveDocsIcon", <>
  <path d="M6.5 3.5h7l4 4v13h-11z" />
  <path d="M13.5 3.5V8h4" />
  <path d="M9.3 11.5h5.4 M9.3 14.8h5.4" />
</>);

/** Sheets — grid with a header row and one softly highlighted cell. */
export const TroveSheetsIcon = defineIcon("TroveSheetsIcon", <>
  <rect x="4" y="4.5" width="16" height="15" rx="2.5" />
  <path d="M4 9.5h16 M9.3 9.5V19.5 M14.7 9.5V19.5" />
  <rect x="10" y="10.2" width="4" height="3.2" rx="1" fill="currentColor" stroke="none" opacity="0.28" />
</>);

/** Decks — stacked slides with a play mark. */
export const TroveDecksIcon = defineIcon("TroveDecksIcon", <>
  <path d="M7.5 3.5H16a3 3 0 0 1 3 3v9.5" />
  <rect x="4.5" y="7.5" width="12.5" height="13" rx="2.5" />
  <path d="M9.7 11.6l4 2.7-4 2.7z" fill="currentColor" stroke="none" />
</>);

/** Design — classic pen nib, diagonal. */
export const TroveDesignIcon = defineIcon("TroveDesignIcon", <>
  <path d="M4 20l1.1-4.1L16.6 4.4a2.12 2.12 0 0 1 3 3L8.1 18.9z" />
  <path d="M14.6 6.4l3 3" />
</>);

/** Sites — clean globe: meridian ellipse and two latitude lines. */
export const TroveSitesIcon = defineIcon("TroveSitesIcon", <>
  <circle cx="12" cy="12" r="8" />
  <ellipse cx="12" cy="12" rx="3.8" ry="8" />
  <path d="M4.2 9.5h15.6 M4.2 14.5h15.6" />
</>);

/** Tros — spark bot head with antenna. */
export const TroveTrosIcon = defineIcon("TroveTrosIcon", <>
  <rect x="6" y="9.5" width="12" height="8.5" rx="4" />
  <path d="M12 9.5V7" />
  <circle cx="12" cy="5.6" r="1.2" fill="currentColor" stroke="none" />
  <circle cx="9.7" cy="13.2" r="1.05" fill="currentColor" stroke="none" />
  <circle cx="14.3" cy="13.2" r="1.05" fill="currentColor" stroke="none" />
  <path d="M10.2 15.7a2.6 2.6 0 0 0 3.6 0" />
</>);

/** Artifacts — isometric cube. */
export const TroveArtifactsIcon = defineIcon("TroveArtifactsIcon", <>
  <path d="M12 3.8 18.8 7.6 12 11.4 5.2 7.6z" />
  <path d="M5.2 7.6v8L12 19.4v-8" />
  <path d="M18.8 7.6v8L12 19.4v-8" />
</>);

/** Search — magnifier. */
export const TroveSearchIcon = defineIcon("TroveSearchIcon", <>
  <circle cx="11" cy="11" r="6.3" />
  <path d="M15.7 15.7 20 20" />
</>);

/** New chat — compose square with a pen nib. */
export const TroveNewChatIcon = defineIcon("TroveNewChatIcon", <>
  <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" />
  <path d="M13.2 8.2l2.6 2.6L10 16.6l-3 .8.8-3z" />
</>);

/** Settings — sun gear. */
export const TroveSettingsIcon = defineIcon("TroveSettingsIcon", <>
  <circle cx="12" cy="12" r="3.2" />
  <path d="M17.4 12h2.2 M15.82 15.82l1.55 1.55 M12 17.4v2.2 M8.18 15.82l-1.55 1.55 M6.6 12H4.4 M8.18 8.18 6.63 6.63 M12 6.6V4.4 M15.82 8.18l1.55-1.55" />
</>);

/** Billing — card with a chip. */
export const TroveBillingIcon = defineIcon("TroveBillingIcon", <>
  <rect x="3" y="6" width="18" height="12.5" rx="3" />
  <path d="M3 9.8h18" />
  <rect x="5.8" y="12.6" width="3.6" height="2.6" rx="0.9" fill="currentColor" stroke="none" opacity="0.9" />
</>);

/** Account — user with shoulders. */
export const TroveAccountIcon = defineIcon("TroveAccountIcon", <>
  <circle cx="12" cy="8.6" r="3.4" />
  <path d="M5.8 19.4a6.4 6.4 0 0 1 12.4 0" />
</>);

/** Log out — door with an exit arrow. */
export const TroveLogoutIcon = defineIcon("TroveLogoutIcon", <>
  <path d="M9.5 4.5H6.8a2.3 2.3 0 0 0-2.3 2.3v10.4a2.3 2.3 0 0 0 2.3 2.3h2.7" />
  <path d="M13.5 8.5 17.5 12l-4 3.5 M17.5 12H9.8" />
</>);

/** Close — X in a ring. */
export const TroveCloseIcon = defineIcon("TroveCloseIcon", <>
  <circle cx="12" cy="12" r="8.6" />
  <path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" />
</>);

/** Collapse sidebar — panel with a chevron. */
export const TroveCollapseIcon = defineIcon("TroveCollapseIcon", <>
  <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
  <path d="M9.3 4.5v15" />
  <path d="M14.4 9.2 12.6 12l1.8 2.8" />
</>);

/** Chevron right — for expand affordances. */
export const TroveChevronRightIcon = defineIcon("TroveChevronRightIcon", <>
  <path d="M9.5 5.5 16 12l-6.5 6.5" />
</>);

/** Help — circled question mark. */
export const TroveHelpIcon = defineIcon("TroveHelpIcon", <>
  <circle cx="12" cy="12" r="8.6" />
  <path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.1.8-1.1 1.7" />
  <circle cx="12" cy="16.4" r="1.15" fill="currentColor" stroke="none" />
</>);
