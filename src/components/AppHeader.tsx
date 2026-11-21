import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Icon from './icons';

/**
 * Top bar shared by every screen. Landing pages use the 1120px content width;
 * a room uses the wider 1280px canvas so the chat and rail fit side by side.
 */
export default function AppHeader({
  children,
  wide = false,
}: {
  children?: ReactNode;
  wide?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
      <div
        className={`mx-auto flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-8 ${
          wide ? 'max-w-[1280px]' : 'max-w-[1120px]'
        }`}
      >
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-lg text-[17px] font-extrabold tracking-[-0.02em] text-ink-100"
          aria-label="PitchRoast Live home"
        >
          <Icon name="flame" className="h-5 w-5 text-flame" filled />
          <span className="lowercase">pitchroast</span>
          <span className="rounded-sm bg-accent-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-300">
            Live
          </span>
        </Link>
        {children ? <div className="flex min-w-0 items-center gap-2">{children}</div> : null}
      </div>
    </header>
  );
}
