import type { SVGProps } from 'react';

export type IconName =
  | 'flame'
  | 'zap'
  | 'eye'
  | 'wrench'
  | 'copy'
  | 'download'
  | 'link'
  | 'userPlus'
  | 'external'
  | 'chevronUp'
  | 'chevronDown'
  | 'arrowRight'
  | 'arrowUp'
  | 'check'
  | 'x'
  | 'alert'
  | 'refresh'
  | 'users'
  | 'file'
  | 'plus'
  | 'clock'
  | 'send';

const PATHS: Record<IconName, string> = {
  flame:
    'M12 2.5c1.4 2.9 4.5 5.1 4.5 8.5a4.5 4.5 0 0 1-9 0c0-1.6.6-2.9 1.7-4.2.4 1 .9 1.7 1.6 2.2.1-2.4.5-4.4 1.2-6.5Z',
  zap: 'M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H13l0-8.5Z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 9.2A2.8 2.8 0 1 0 12 14.8 2.8 2.8 0 0 0 12 9.2Z',
  wrench:
    'M14.7 6.3a4.4 4.4 0 0 0-5.9 5.9L3 18l3 3 5.8-5.8a4.4 4.4 0 0 0 5.9-5.9l-2.5 2.5-2.4-2.4 2.4-2.4Z',
  copy: 'M8 8h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2',
  download: 'M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19.5h16',
  link: 'M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.3 M14 10.5a4 4 0 0 0-5.7 0L5.5 13.3a4 4 0 0 0 5.7 5.7l1.3-1.3',
  userPlus:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2.5 21a6.5 6.5 0 0 1 13 0 M19 8v6M16 11h6',
  external: 'M9 5h10v10M19 5 8 16M5 9v10h10',
  chevronUp: 'M6 14.5 12 8.5l6 6',
  chevronDown: 'M6 9.5 12 15.5l6-6',
  arrowRight: 'M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5',
  arrowUp: 'M12 20V5m0 0-5.5 5.5M12 5l5.5 5.5',
  check: 'M4.5 12.5 10 18l9.5-11',
  x: 'M6 6l12 12M18 6 6 18',
  alert: 'M12 3.5 22 20H2L12 3.5Z M12 9.5v5M12 17.5h.01',
  refresh:
    'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  users:
    'M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M1.5 20a6.5 6.5 0 0 1 13 0 M16 11a3.2 3.2 0 1 0 0-6.4 M17.5 14a5.6 5.6 0 0 1 5 6',
  file: 'M6 2.5h8l4 4v15H6V2.5Z M14 2.5v4h4 M9 12h6M9 16h6',
  plus: 'M12 5v14M5 12h14',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3.5 2',
  send: 'M12 20V5m0 0-6 6M12 5l6 6',
};

export default function Icon({
  name,
  className = 'h-4 w-4',
  filled = false,
  ...rest
}: { name: IconName; className?: string; filled?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
