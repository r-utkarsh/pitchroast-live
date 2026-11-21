import type { ChatStatus } from '../lib/chat';

const META: Record<
  ChatStatus,
  { label: string; tone: string; dot: string; pulse: boolean }
> = {
  idle: {
    label: 'Starting',
    tone: 'border-ink-700 bg-ink-850 text-ink-300',
    dot: 'bg-ink-500',
    pulse: false,
  },
  connecting: {
    label: 'Connecting',
    tone: 'border-accent-400/40 bg-accent-700/40 text-accent-300',
    dot: 'bg-accent-300',
    pulse: true,
  },
  connected: {
    label: 'Live',
    tone: 'border-ok/30 bg-ok/10 text-ok',
    dot: 'bg-ok',
    pulse: false,
  },
  reconnecting: {
    label: 'Reconnecting',
    tone: 'border-tag-hook/40 bg-tag-hook/10 text-tag-hook',
    dot: 'bg-tag-hook',
    pulse: true,
  },
  disconnected: {
    label: 'Offline',
    tone: 'border-tag-fix/40 bg-tag-fix/10 text-tag-fix',
    dot: 'bg-tag-fix',
    pulse: false,
  },
  kicked: {
    label: 'Session ended',
    tone: 'border-tag-fix/40 bg-tag-fix/10 text-tag-fix',
    dot: 'bg-tag-fix',
    pulse: false,
  },
  failed: {
    label: 'Connection failed',
    tone: 'border-tag-fix/40 bg-tag-fix/10 text-tag-fix',
    dot: 'bg-tag-fix',
    pulse: false,
  },
};

export default function StatusIndicator({
  status,
  className = '',
}: {
  status: ChatStatus | null;
  className?: string;
}) {
  const meta = status
    ? META[status]
    : { label: 'Not connected', tone: 'border-ink-700 bg-ink-850 text-ink-300', dot: 'bg-ink-500', pulse: false };

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="chat-status"
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${meta.tone} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${meta.pulse ? 'motion-safe:animate-pulse' : ''}`}
      />
      {meta.label}
    </span>
  );
}
