import { useState } from 'react';
import useMediaQuery from '../../hooks/useMediaQuery';
import Icon from '../icons';
import { Avatar, Button } from '../ui';

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
  reviewerCount,
  isDemo,
  copiedLink,
  onCopyLink,
  onOpenAnother,
  onDownload,
}: {
  title: string;
  pitch: string;
  url: string;
  roomId?: string;
  reviewerCount: number;
  isDemo: boolean;
  copiedLink: boolean;
  onCopyLink: () => void;
  onOpenAnother: () => void;
  onDownload?: () => void;
}) {
  const desktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);

  const actions = (
    <>
      <Button variant="secondary" size="sm" onClick={onCopyLink} data-testid="copy-link">
        <Icon name={copiedLink ? 'check' : 'link'} className="h-3.5 w-3.5" />
        {copiedLink ? 'Copied!' : 'Copy room link'}
      </Button>
      <Button variant="secondary" size="sm" onClick={onOpenAnother} data-testid="open-as-reviewer">
        <Icon name="userPlus" className="h-3.5 w-3.5" />
        Open as another reviewer
      </Button>
      {isDemo ? (
        <span
          className="inline-flex h-9 items-center rounded-lg border border-dashed border-ink-700 px-3 text-xs text-ink-500"
          data-testid="demo-project-note"
        >
          Demo project — no live site
        </span>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={url}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          data-testid="open-live-project"
        >
          Open live project
          <Icon name="external" className="h-3.5 w-3.5" />
        </a>
      )}
    </>
  );

  return (
    <section className="rounded-card border border-ink-800 bg-ink-900" data-testid="project-card">
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <Avatar name={title} size="lg" square className="hidden sm:grid" />
        <Avatar name={title} size="md" square className="sm:hidden" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1
              className="min-w-0 line-clamp-2 text-[17px] font-bold leading-6 text-ink-100 sm:text-[20px] md:line-clamp-1"
              dir="auto"
              title={title}
              data-testid="room-title"
            >
              {title}
            </h1>
            {!desktop ? (
              <button
                type="button"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-100"
                aria-expanded={open}
                aria-controls="project-details"
                aria-label={open ? 'Hide project details' : 'Show project details'}
                data-testid="project-toggle"
                onClick={() => setOpen((value) => !value)}
              >
                <Icon name={open ? 'chevronUp' : 'chevronDown'} className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <p className="mt-0.5 truncate text-xs text-ink-500">
            {isDemo ? (
              <>
                <span data-testid="demo-project-url">Sample project at example.com</span>
                {!desktop ? (
                  <>
                    <span className="mx-1.5 text-ink-700">·</span>
                    <span>
                      {reviewerCount} {reviewerCount === 1 ? 'reviewer' : 'reviewers'}
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={url}
                  className="text-accent-300 transition-colors hover:text-accent-400"
                  data-testid="open-project"
                >
                  {hostOf(url)}
                </a>
                <span className="mx-1.5 text-ink-700">·</span>
                {desktop ? (
                  <span>{pitch}</span>
                ) : (
                  <span>
                    {reviewerCount} {reviewerCount === 1 ? 'reviewer' : 'reviewers'}
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {desktop ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      {!desktop ? (
        <div
          id="project-details"
          className={`${open ? 'block' : 'hidden'} border-t border-ink-800 p-3 sm:p-4`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-300" dir="auto">
            {pitch}
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {isDemo ? (
              <div
                className="rounded-lg border border-dashed border-ink-700 px-3 py-2 text-center"
                data-testid="demo-project-note"
              >
                <p className="text-sm font-semibold text-ink-300">Demo project</p>
                <p className="text-[11px] text-ink-500">
                  No live site — create your own room to link one.
                </p>
              </div>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-500 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
                data-testid="open-live-project"
              >
                Open live project
                <Icon name="external" className="h-4 w-4" />
              </a>
            )}

            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={onCopyLink}
              data-testid="copy-link"
            >
              <Icon name={copiedLink ? 'check' : 'link'} className="h-3.5 w-3.5" />
              {copiedLink ? 'Copied!' : 'Copy room link'}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              {onDownload ? (
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full whitespace-nowrap px-2"
                  onClick={onDownload}
                  data-testid="download-markdown"
                >
                  <Icon name="download" className="h-3.5 w-3.5" />
                  Download .md
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="md"
                className={`w-full ${onDownload ? 'px-2' : 'col-span-2'}`}
                onClick={onOpenAnother}
                data-testid="open-as-reviewer"
              >
                <Icon name="userPlus" className="h-3.5 w-3.5" />
                Other reviewer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
