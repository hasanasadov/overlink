import type { ReactNode, SVGProps } from "react";

// Hand-drawn, SF-Symbols-inspired glyphs: 24px grid, rounded 1.7px strokes.
// (Apple's SF Symbols can't be redistributed on the web, so these mirror their weight and shapes.)
const P: Record<string, ReactNode> = {
  home: (<path d="M4 11.4 12 4.2l8 7.2V19a1.6 1.6 0 0 1-1.6 1.6H15v-5.1a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.1H5.6A1.6 1.6 0 0 1 4 19v-7.6Z" />),
  link: (<><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.1-3.1a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.1 3.1a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>),
  files: (<><path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M12 17v-5.5" /><path d="m9.6 13.4 2.4-2.4 2.4 2.4" /></>),
  doc: (<><path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M8 13h8M8 16.5h5" /></>),
  code: (<><path d="m8 7.5-4.5 4.5L8 16.5" /><path d="m16 7.5 4.5 4.5-4.5 4.5" /><path d="m13.6 5.5-3.2 13" /></>),
  screen: (<><rect x="3" y="4" width="18" height="12.5" rx="2.5" /><path d="M8.5 20.5h7M12 16.5v4" /></>),
  screenShare: (<><rect x="3" y="4" width="18" height="12.5" rx="2.5" /><path d="M8.5 20.5h7M12 16.5v4" /><path d="M12 13V8.2" /><path d="m9.8 10.2 2.2-2.2 2.2 2.2" /></>),
  person: (<><circle cx="12" cy="8.2" r="3.7" /><path d="M4.8 20c.9-3.6 3.8-5.4 7.2-5.4s6.3 1.8 7.2 5.4" /></>),
  personCircle: (<><circle cx="12" cy="12" r="9.2" /><circle cx="12" cy="9.6" r="3" /><path d="M6.4 18.4c1.2-2.2 3.2-3.3 5.6-3.3s4.4 1.1 5.6 3.3" /></>),
  people: (<><circle cx="9" cy="8.5" r="3.3" /><path d="M2.8 19.5c.7-3.2 3.1-4.9 6.2-4.9s5.5 1.7 6.2 4.9" /><path d="M15.6 5.4a3.3 3.3 0 0 1 0 6.2" /><path d="M18 14.9c1.7.7 2.8 2.1 3.2 4.6" /></>),
  sun: (<><circle cx="12" cy="12" r="4.2" /><path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5" /></>),
  moon: (<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z" />),
  auto: (<><circle cx="12" cy="12" r="8.8" /><path d="M12 3.2a8.8 8.8 0 0 1 0 17.6Z" fill="currentColor" stroke="none" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.5 3.9 5.5 3.9 9s-1.3 6.5-3.9 9c-2.6-2.5-3.9-5.5-3.9-9S9.4 5.5 12 3Z" /></>),
  copy: (<><rect x="8.5" y="8.5" width="12" height="12" rx="2.6" /><path d="M15.5 8.5V6.1a2.6 2.6 0 0 0-2.6-2.6H6.1a2.6 2.6 0 0 0-2.6 2.6v6.8a2.6 2.6 0 0 0 2.6 2.6h2.4" /></>),
  check: (<path d="m4.5 12.8 5 5L19.5 7" />),
  checkCircle: (<><circle cx="12" cy="12" r="9.2" /><path d="m8 12.4 2.9 2.9L16.2 9.5" /></>),
  xmark: (<path d="M6 6l12 12M18 6 6 18" />),
  xmarkCircle: (<><circle cx="12" cy="12" r="9.2" /><path d="m9 9 6 6M15 9l-6 6" /></>),
  trash: (<><path d="M4 7h16" /><path d="M9.5 7V4.8c0-.4.3-.8.8-.8h3.4c.5 0 .8.4.8.8V7" /><path d="M6.2 7l.9 12a2 2 0 0 0 2 1.8h5.8a2 2 0 0 0 2-1.8l.9-12" /><path d="M10 11v6M14 11v6" /></>),
  download: (<><path d="M12 3.5v11" /><path d="m7.8 10.8 4.2 4.2 4.2-4.2" /><path d="M4.5 16.5v1.2a2.6 2.6 0 0 0 2.6 2.6h9.8a2.6 2.6 0 0 0 2.6-2.6v-1.2" /></>),
  upload: (<><path d="M12 15V4" /><path d="m7.8 8.2 4.2-4.2 4.2 4.2" /><path d="M4.5 16.5v1.2a2.6 2.6 0 0 0 2.6 2.6h9.8a2.6 2.6 0 0 0 2.6-2.6v-1.2" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  chevronRight: (<path d="m9 5 7 7-7 7" />),
  chevronDown: (<path d="m5 9 7 7 7-7" />),
  chevronLeft: (<path d="m15 5-7 7 7 7" />),
  clock: (<><circle cx="12" cy="12" r="9.2" /><path d="M12 6.8V12l3.4 2" /></>),
  lock: (<><rect x="4.8" y="10.5" width="14.4" height="10" rx="2.6" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>),
  mail: (<><rect x="3" y="5.5" width="18" height="13" rx="2.8" /><path d="m4 8.4 7.1 4.9a1.7 1.7 0 0 0 1.8 0L20 8.4" /></>),
  key: (<><circle cx="8" cy="15.5" r="4.2" /><path d="m11.2 12.6 8.1-8.1M16 8l2.6 2.6M14 10l1.9 1.9" /></>),
  signOut: (<><path d="M14.5 4.5h2.7a2.3 2.3 0 0 1 2.3 2.3v10.4a2.3 2.3 0 0 1-2.3 2.3h-2.7" /><path d="M10.5 8 14.5 12l-4 4" /><path d="M14.5 12H4" /></>),
  message: (<path d="M12 4C7 4 3.2 7.2 3.2 11.2c0 2.1 1.1 4 2.8 5.3-.1 1.2-.7 2.3-1.6 3.1 1.9-.1 3.4-.8 4.5-1.8.9.3 1.9.4 3.1.4 5 0 8.8-3.2 8.8-7.1S17 4 12 4Z" />),
  send: (<><path d="M20.5 3.5 10.3 13.7" /><path d="m20.5 3.5-6.4 17-3.8-7.2L3.2 9.6l17.3-6.1Z" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0M12 17.7V21" /></>),
  speaker: (<><path d="M4 9.5v5h3.4l4.6 3.8V5.7L7.4 9.5H4Z" /><path d="M15.6 9a4.2 4.2 0 0 1 0 6M18.2 6.4a8 8 0 0 1 0 11.2" /></>),
  speakerOff: (<><path d="M4 9.5v5h3.4l4.6 3.8V5.7L7.4 9.5H4Z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></>),
  expand: (<><path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5" /></>),
  stop: (<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />),
  phoneDown: (<path d="M3.5 14.2c0-1.1.7-2 1.8-2.4 4.5-1.6 9.7-1.6 14.2 0 1.1.4 1.8 1.3 1.8 2.4v1.1c0 .8-.7 1.3-1.4 1.1l-3.1-.9a1.2 1.2 0 0 1-.9-1.1v-1.2a13 13 0 0 0-6.6 0v1.2c0 .5-.4 1-.9 1.1l-3.1.9c-.7.2-1.4-.3-1.4-1.1v-1.1Z" />),
  warning: (<><path d="M12 3.6 2.8 19.4a1 1 0 0 0 .9 1.5h16.6a1 1 0 0 0 .9-1.5L12 3.6Z" /><path d="M12 10v4.4M12 17.4v.1" /></>),
  info: (<><circle cx="12" cy="12" r="9.2" /><path d="M12 11v5.2M12 7.9v.1" /></>),
  photo: (<><rect x="3" y="4.5" width="18" height="15" rx="3" /><circle cx="8.6" cy="9.6" r="1.7" /><path d="m4 17.5 4.8-4.4a1.5 1.5 0 0 1 2 0l2.4 2.2 2-1.8a1.5 1.5 0 0 1 2 0L21 16.6" /></>),
  film: (<><rect x="3" y="4.5" width="18" height="15" rx="3" /><path d="M10 9.4v5.2l4.4-2.6L10 9.4Z" fill="currentColor" /></>),
  music: (<><path d="M9 17.5V6l10-2v11.5" /><circle cx="6.5" cy="17.5" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" /></>),
  archive: (<><rect x="3" y="4" width="18" height="4.5" rx="1.6" /><path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5M10 12.5h4" /></>),
  eye: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>),
  ellipsis: (<><circle cx="5.5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="18.5" cy="12" r="1.2" fill="currentColor" /></>),
  bolt: (<path d="M13 2.8 4.6 13.4a.8.8 0 0 0 .6 1.3h5.3l-1 6.5 8.4-10.6a.8.8 0 0 0-.6-1.3h-5.3l1-6.5Z" />),
  shield: (<><path d="M12 3 4.5 5.8v5.6c0 4.4 3 8.3 7.5 9.6 4.5-1.3 7.5-5.2 7.5-9.6V5.8L12 3Z" /><path d="m8.8 12 2.3 2.3 4.2-4.6" /></>),
  trashClock: (<><circle cx="12" cy="12" r="9.2" /><path d="M12 6.8V12l3.4 2" /></>),
  qr: (<><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.4" /><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.4" /><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.4" /><path d="M14 14h2.6v2.6H14zM18 18h2.5M18 14h2.5M14 18.5V20.5" /></>),
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, strokeWidth = 1.5, ...rest }: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {P[name]}
    </svg>
  );
}
