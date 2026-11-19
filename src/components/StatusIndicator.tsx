import type { ChatStatus } from '../lib/chat';

const META: Record<ChatStatus, { label: string; dot: string; pulse: boolean }> = {
  idle: { label: 'Starting', dot: 'bg-ink-500', pulse: false },
  connecting: { label: 'Connecting', dot: 'bg-amber-400', pulse: true },
  connected: { label: 'Live', dot: 'bg-emerald-400', pulse: false },
  reconnecting: { label: 'Reconnecting', dot: 'bg-amber-400', pulse: true },
  disconnected: { label: 'Offline', dot: 'bg-tag-fix', pulse: false },
  kicked: { label: 'Session ended', dot: 'bg-tag-fix', pulse: false },
  failed: { label: 'Connection failed', dot: 'bg-tag-fix', pulse: false },
};

export default function StatusIndicator({
  status,
  className = '',
}: {
  status: ChatStatus | null;
  className?: string;
}) {
  const meta = status ? META[status] : { label: 'Not connected', dot: 'bg-ink-500', pulse: false };

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="chat-status"
      className={`inline-flex items-center gap-1.5 rounded-full border border-ink-700/80 bg-ink-900 px-2.5 py-1 text-xs font-medium text-ink-300 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${meta.dot} ${meta.pulse ? 'motion-safe:animate-pulse' : ''}`}
      />
      {meta.label}
    </span>
  );
}
