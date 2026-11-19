import { useState } from 'react';
import { Button, Card } from '../ui';

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default function ProjectCard({
  title,
  pitch,
  url,
  roomId,
  createdAt,
  commentCount,
  reviewerCount,
  isDemo,
  copiedLink,
  copiedMarkdown,
  onCopyLink,
  onOpenAnother,
  onCopyMarkdown,
  onDownload,
}: {
  title: string;
  pitch: string;
  url: string;
  roomId: string;
  createdAt: number;
  commentCount: number;
  reviewerCount: number;
  isDemo: boolean;
  copiedLink: boolean;
  copiedMarkdown: boolean;
  onCopyLink: () => void;
  onOpenAnother: () => void;
  onCopyMarkdown: () => void;
  onDownload: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="lg:sticky lg:top-20">
      <div data-testid="project-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                Project
              </p>
              {isDemo ? (
                <span className="rounded-full border border-accent-400/40 bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-400">
                  Demo
                </span>
              ) : null}
            </div>
            <h1
              className="mt-1 break-words text-xl font-semibold leading-tight text-ink-100"
              dir="auto"
              data-testid="room-title"
            >
              {title}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 lg:hidden"
            aria-expanded={open}
            aria-controls="project-details"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Hide' : 'Details'}
          </Button>
        </div>

        <div
          id="project-details"
          className={`${open ? 'mt-3 block' : 'hidden'} lg:block`}
        >
          <p
            className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-300"
            dir="auto"
          >
            {pitch}
          </p>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex max-w-full items-center gap-1.5 text-xs text-accent-400 hover:text-accent-500"
            data-testid="open-project"
          >
            <span className="truncate">{hostOf(url)}</span>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <path
                d="M8 5h7v7m0-7-9 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="sr-only">Open live project in a new tab</span>
          </a>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-ink-800 bg-ink-950/50 px-2 py-2">
              <div className="text-base font-semibold tabular-nums text-ink-100">
                {commentCount}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-ink-500">comments</div>
            </div>
            <div className="rounded-xl border border-ink-800 bg-ink-950/50 px-2 py-2">
              <div className="text-base font-semibold tabular-nums text-ink-100">
                {reviewerCount}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-ink-500">reviewers</div>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-ink-500">
            Opened {new Date(createdAt).toLocaleDateString()} · <span className="font-mono">/r/{roomId}</span>
          </p>

          <div className="mt-4 space-y-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-600"
              data-testid="open-live-project"
            >
              Open live project
            </a>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={onCopyLink} data-testid="copy-link">
                {copiedLink ? 'Copied!' : 'Copy room link'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenAnother}
                data-testid="open-as-reviewer"
              >
                Open as another reviewer
              </Button>
            </div>
          </div>

          <div className="mt-4 border-t border-ink-800 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
              Export feedback
            </p>
            <div className="mt-2 space-y-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={onCopyMarkdown}
                data-testid="copy-markdown"
              >
                {copiedMarkdown ? 'Copied!' : 'Copy feedback as Markdown'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={onDownload}
                data-testid="download-markdown"
              >
                Download .md
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
