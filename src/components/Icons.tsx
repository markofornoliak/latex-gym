import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true };
export const HomeIcon=(p:P)=><svg {...base} {...p}><path d="M3.5 10.5 12 3.7l8.5 6.8v9.2h-6v-5.8h-5v5.8h-6z"/></svg>;
export const BookIcon=(p:P)=><svg {...base} {...p}><path d="M4.5 4.2c2.7-.6 5.2-.1 7.5 1.4v14c-2.3-1.5-4.8-2-7.5-1.4z"/><path d="M19.5 4.2c-2.7-.6-5.2-.1-7.5 1.4v14c2.3-1.5 4.8-2 7.5-1.4z"/></svg>;
export const PenIcon=(p:P)=><svg {...base} {...p}><path d="m4 20 3.8-1 10-10-2.8-2.8-10 10z"/><path d="m13.8 7.4 2.8 2.8"/></svg>;
export const ReferenceIcon=(p:P)=><svg {...base} {...p}><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>;
export const BookmarkIcon=(p:P)=><svg {...base} {...p}><path d="M6.5 3.5h11v17L12 17l-5.5 3.5z"/></svg>;
export const BackIcon=(p:P)=><svg {...base} {...p}><path d="m15 5-7 7 7 7"/></svg>;
export const ChevronIcon=(p:P)=><svg {...base} {...p}><path d="m9 5 7 7-7 7"/></svg>;
export const CheckIcon=(p:P)=><svg {...base} {...p}><path d="m5 12 4 4 10-10"/></svg>;
export const SearchIcon=(p:P)=><svg {...base} {...p}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
export const CopyIcon=(p:P)=><svg {...base} {...p}><rect x="8" y="8" width="11" height="11" rx="1"/><path d="M16 8V5H5v11h3"/></svg>;
export const PlayIcon=(p:P)=><svg {...base} {...p}><path d="m8 5 11 7-11 7z"/></svg>;
export const ExpandIcon=(p:P)=><svg {...base} {...p}><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>;
export const SettingsIcon=(p:P)=><svg {...base} {...p}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 14.8 6l-.3-2.5h-5L9.2 6a7 7 0 0 0-1.7 1.1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A7 7 0 0 0 9.2 18l.3 2.5h5l.3-2.5a7 7 0 0 0 1.7-1.1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/></svg>;
export const DownloadIcon=(p:P)=><svg {...base} {...p}><path d="M12 3v12m-4-4 4 4 4-4M5 20h14"/></svg>;
