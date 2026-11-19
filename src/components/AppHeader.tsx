import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-lg text-sm font-semibold text-ink-100"
          aria-label="PitchRoast Live home"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-500/15">
            <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden="true">
              <path
                d="M32 8c7 9 12 14 12 22a12 12 0 0 1-24 0c0-4 2-7 5-11 1 4 3 6 5 7-1-7 0-12 2-18Z"
                fill="#818cf8"
              />
              <path
                d="M32 50a6 6 0 0 0 6-6c0-3-2-5-6-9-4 4-6 6-6 9a6 6 0 0 0 6 6Z"
                fill="#f59e0b"
              />
            </svg>
          </span>
          <span>
            PitchRoast <span className="text-ink-300">Live</span>
          </span>
        </Link>
        {children ? <div className="flex min-w-0 items-center gap-2">{children}</div> : null}
      </div>
    </header>
  );
}
