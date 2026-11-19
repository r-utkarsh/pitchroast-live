import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import type { FeedbackTag } from '../lib/protocol';

export const TAG_META: Record<
  FeedbackTag,
  { label: string; chip: string; dot: string; selected: string }
> = {
  hook: {
    label: 'Hook',
    chip: 'border-tag-hook/40 bg-tag-hook/10 text-tag-hook',
    dot: 'bg-tag-hook',
    selected: 'border-tag-hook bg-tag-hook text-ink-950',
  },
  clarity: {
    label: 'Clarity',
    chip: 'border-tag-clarity/40 bg-tag-clarity/10 text-tag-clarity',
    dot: 'bg-tag-clarity',
    selected: 'border-tag-clarity bg-tag-clarity text-ink-950',
  },
  fix: {
    label: 'Fix',
    chip: 'border-tag-fix/40 bg-tag-fix/10 text-tag-fix',
    dot: 'bg-tag-fix',
    selected: 'border-tag-fix bg-tag-fix text-ink-950',
  },
};

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-500 text-white hover:bg-accent-600',
  secondary:
    'border border-ink-700 bg-ink-850 text-ink-100 hover:border-ink-500 hover:bg-ink-800',
  ghost: 'text-ink-300 hover:bg-ink-850 hover:text-ink-100',
  danger: 'border border-tag-fix/40 bg-tag-fix/10 text-tag-fix hover:bg-tag-fix/20',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return [BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], extra]
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={buttonClasses(variant, size, className)}
      {...rest}
    />
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-ink-700/80 bg-ink-900 p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  counter,
  counterOver = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  counter?: string;
  counterOver?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink-100">
          {label}
        </label>
        {counter ? (
          <span
            className={`text-xs tabular-nums ${
              counterOver ? 'text-tag-fix' : 'text-ink-300'
            }`}
          >
            {counter}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-tag-fix">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-300">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const INPUT_CLASSES =
  'w-full rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 transition-colors hover:border-ink-500 focus:border-accent-400';

export function TextInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${INPUT_CLASSES} ${className}`} {...rest} />;
}

export function TextArea({
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${INPUT_CLASSES} min-h-[5.5rem] resize-y leading-relaxed ${className}`}
      {...rest}
    />
  );
}

export function FilterChip({
  selected,
  onClick,
  children,
  count,
  testId,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        selected
          ? 'border-accent-400 bg-accent-500/15 text-accent-400'
          : 'border-ink-700 bg-ink-950 text-ink-300 hover:border-ink-500 hover:text-ink-100'
      }`}
    >
      {children}
      {typeof count === 'number' ? (
        <span className="text-[11px] tabular-nums opacity-70">{count}</span>
      ) : null}
    </button>
  );
}

export function TagPill({ tag, className = '' }: { tag: FeedbackTag; className?: string }) {
  const meta = TAG_META[tag];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${meta.chip} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function TagOption({
  tag,
  selected,
  onClick,
}: {
  tag: FeedbackTag;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = TAG_META[tag];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      data-testid={`tag-${tag}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        selected
          ? meta.selected
          : 'border-ink-700 bg-ink-950 text-ink-300 hover:border-ink-500 hover:text-ink-100'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-ink-950' : meta.dot}`}
        aria-hidden="true"
      />
      {meta.label}
    </button>
  );
}

export function Banner({
  tone = 'info',
  children,
  action,
}: {
  tone?: 'info' | 'error' | 'success';
  children: ReactNode;
  action?: ReactNode;
}) {
  const tones = {
    info: 'border-accent-400/30 bg-accent-500/10 text-ink-100',
    error: 'border-tag-fix/40 bg-tag-fix/10 text-ink-100',
    success: 'border-emerald-400/30 bg-emerald-500/10 text-ink-100',
  } as const;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${tones[tone]}`}
    >
      <div className="min-w-0 flex-1 break-words">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-300">
      <svg
        className="h-4 w-4 motion-safe:animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span>{label}</span>
    </span>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="motion-safe:animate-pulse rounded-2xl border border-ink-700/60 bg-ink-900 p-4"
        >
          <div className="h-3 w-28 rounded bg-ink-800" />
          <div className="mt-3 h-3 w-full rounded bg-ink-800" />
          <div className="mt-2 h-3 w-2/3 rounded bg-ink-800" />
        </div>
      ))}
    </div>
  );
}
