import Icon from '../icons';
import { Button } from '../ui';

export default function ExportCard({
  digest,
  copiedMarkdown,
  onCopyMarkdown,
  onDownload,
}: {
  digest: string;
  copiedMarkdown: boolean;
  onCopyMarkdown: () => void;
  onDownload: () => void;
}) {
  const preview = digest.split('\n').slice(0, 10).join('\n');

  return (
    <section
      className="rounded-card border border-ink-800 bg-ink-900 p-4"
      aria-label="Markdown export"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-100">Markdown export</h2>
        <span className="font-mono text-[11px] text-ink-500">feedback.md</span>
      </div>

      <pre className="mt-3 max-h-[168px] overflow-hidden whitespace-pre-wrap break-words rounded-lg border border-ink-800 bg-ink-950 p-3 font-mono text-[11px] leading-[19px] text-ink-300">
        {preview}
      </pre>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="whitespace-nowrap px-2"
          onClick={onCopyMarkdown}
          data-testid="copy-markdown"
        >
          <Icon name={copiedMarkdown ? 'check' : 'copy'} className="h-3.5 w-3.5" />
          {copiedMarkdown ? 'Copied!' : 'Copy Markdown'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="whitespace-nowrap px-2"
          onClick={onDownload}
          data-testid="download-markdown"
        >
          <Icon name="download" className="h-3.5 w-3.5" />
          Download .md
        </Button>
      </div>
    </section>
  );
}
