import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import Icon, { type IconName } from './icons';
import type { FeedbackTag } from '../lib/protocol';

export const TAG_META: Record<
  FeedbackTag,
  { label: string; icon: IconName; chip: string; dot: string; selected: string }
> = {
  hook: {
    label: 'Hook',
    icon: 'zap',
    chip: 'border-tag-hook/30 bg-tag-hook/10 text-tag-hook',
    dot: 'bg-tag-hook',
    selected: 'border-tag-hook/70 bg-tag-hook/10 text-tag-hook',
  },
  clarity: {
    label: 'Clarity',
    icon: 'eye',
    chip: 'border-tag-clarity/30 bg-tag-clarity/10 text-tag-clarity',
    dot: 'bg-tag-clarity',
    selected: 'border-tag-clarity/70 bg-tag-clarity/10 text-tag-clarity',
  },
  fix: {
    label: 'Fix',
    icon: 'wrench',
    chip: 'border-tag-fix/30 bg-tag-fix/10 text-tag-fix',
    dot: 'bg-tag-fix',
    selected: 'border-tag-fix/70 bg-tag-fix/10 text-tag-fix',
  },
};

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-500 text-white hover:bg-accent-600',
  secondary:
    'border border-ink-700 bg-ink-850 text-ink-100 hover:border-ink-500 hover:bg-ink-800',
  ghost: 'text-ink-300 hover:bg-ink-850 hover:text-ink-100',
  danger: 'border border-tag-fix/40 bg-tag-fix/10 text-tag-fix hover:bg-tag-fix/20',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
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
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'aside';
}) {
  return (
    <Tag className={`rounded-xl border border-ink-800 bg-ink-900 ${className}`}>
      {children}
    </Tag>
  );
}

export function Field({
  id,
  label,
  hint,
  hintTone = 'muted',
  error,
  counter,
  counterOver = false,
  counterWarn = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  hintTone?: 'muted' | 'success';
  error?: string | null;
  counter?: string;
  counterOver?: boolean;
  counterWarn?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink-100">
          {label}
        </label>
        {counter ? (
          <span
            className={`text-xs tabular-nums ${
              counterOver
                ? 'font-semibold text-tag-fix'
                : counterWarn
                  ? 'font-semibold text-tag-hook'
                  : 'text-ink-500'
            }`}
          >
            {counter}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs text-tag-fix"
        >
          <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className={`flex items-center gap-1 text-xs ${
            hintTone === 'success' ? 'text-ok' : 'text-ink-500'
          }`}
        >
          {hintTone === 'success' ? <Icon name="check" className="h-3.5 w-3.5" /> : null}
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const INPUT_CLASSES =
  'w-full rounded-lg border border-field/70 bg-ink-950 px-3 text-base text-ink-100 placeholder:text-ink-500 transition-colors hover:border-field focus:border-accent-400 focus:ring-[3px] focus:ring-accent-400/25 sm:text-[15px]';

export function TextInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${INPUT_CLASSES} h-12 ${className}`} {...rest} />;
}

export function TextArea({
  className = '',
  compact = false,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { compact?: boolean }) {
  return (
    <textarea
      className={`${INPUT_CLASSES} ${
        compact ? 'min-h-[44px] resize-none py-2.5' : 'min-h-[6.5rem] resize-y py-3'
      } leading-relaxed ${className}`}
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
  title,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  testId?: string;
  title?: string;
  icon?: IconName;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      data-testid={testId}
      title={title}
      className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors sm:h-9 ${
        selected
          ? 'border-accent-500 bg-accent-500 text-white'
          : 'border-ink-800 bg-ink-900 text-ink-300 hover:border-ink-700 hover:text-ink-100'
      }`}
    >
      {icon ? <Icon name={icon} className="h-3.5 w-3.5" /> : null}
      {children}
      {typeof count === 'number' ? (
        <span
          className={`hidden text-[11px] tabular-nums sm:inline ${
            selected ? 'text-white/90' : 'text-ink-500'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function TagPill({ tag, className = '' }: { tag: FeedbackTag; className?: string }) {
  const meta = TAG_META[tag];
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] font-semibold ${meta.chip} ${className}`}
    >
      <Icon name={meta.icon} className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export function TagOption({
  tag,
  selected,
  onClick,
  className = '',
}: {
  tag: FeedbackTag;
  selected: boolean;
  onClick: () => void;
  className?: string;
}) {
  const meta = TAG_META[tag];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      data-testid={`tag-${tag}`}
      className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors sm:h-10 ${
        selected
          ? meta.selected
          : 'border-ink-800 bg-ink-850 text-ink-300 hover:border-ink-700 hover:text-ink-100'
      } ${className}`}
    >
      <Icon name={selected ? 'check' : meta.icon} className="h-3.5 w-3.5" />
      {meta.label}
    </button>
  );
}

export function Banner({
  tone = 'info',
  children,
  action,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success';
  children: ReactNode;
  action?: ReactNode;
}) {
  const tones = {
    info: 'border-accent-400/30 bg-accent-700/40 text-ink-100',
    warning: 'border-tag-hook/40 bg-tag-hook/10 text-ink-100',
    error: 'border-tag-fix/40 bg-tag-fix/10 text-ink-100',
    success: 'border-ok/30 bg-ok/10 text-ink-100',
  } as const;
  const icons: Record<keyof typeof tones, IconName> = {
    info: 'refresh',
    warning: 'zap',
    error: 'alert',
    success: 'check',
  };

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${tones[tone]}`}
    >
      <Icon
        name={icons[tone]}
        className={`h-4 w-4 shrink-0 ${
          tone === 'warning'
            ? 'text-tag-hook'
            : tone === 'error'
              ? 'text-tag-fix'
              : tone === 'success'
                ? 'text-ok'
                : 'text-accent-300'
        }`}
      />
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

const AVATAR_TONES = [
  'border-tag-hook/40 bg-tag-hook/15 text-tag-hook',
  'border-ok/40 bg-ok/15 text-ok',
  'border-tag-fix/40 bg-tag-fix/15 text-tag-fix',
  'border-tag-clarity/40 bg-tag-clarity/15 text-tag-clarity',
  'border-accent-300/40 bg-accent-300/15 text-accent-300',
];

const AVATAR_SIZES = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-lg',
};

export function avatarTone(name: string): string {
  let hash = 0;
  for (const char of name.trim().toLowerCase()) {
    hash = (hash * 31 + char.codePointAt(0)!) % 997;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function Avatar({
  name,
  size = 'md',
  className = '',
  square = false,
}: {
  name: string;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
  square?: boolean;
}) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?';
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center border font-semibold ${avatarTone(name)} ${
        square ? 'rounded-lg' : 'rounded-full'
      } ${AVATAR_SIZES[size]} ${className}`}
    >
      {initial}
    </span>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-900 p-4 motion-safe:animate-pulse"
        >
          <div className="h-9 w-9 shrink-0 rounded-full bg-ink-850" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-32 rounded bg-ink-850" />
            <div className="mt-3 h-3 w-full rounded bg-ink-850" />
            <div className="mt-2 h-3 w-2/3 rounded bg-ink-850" />
          </div>
          <div className="h-10 w-10 shrink-0 rounded-lg bg-ink-850" />
        </div>
      ))}
    </div>
  );
}
