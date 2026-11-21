import { useState, type FormEvent, type KeyboardEvent } from 'react';
import Icon from '../icons';
import { Button, TagOption, TextArea } from '../ui';
import type { SendOutcome } from '../../hooks/useChatRoom';
import type { FeedbackTag } from '../../lib/protocol';
import { FEEDBACK_TAGS } from '../../lib/protocol';
import { LIMITS, textLength } from '../../lib/validation';

export default function Composer({
  ready,
  sending,
  locked = false,
  onSend,
}: {
  ready: boolean;
  sending: boolean;
  /** Set when a roast round ended; the composer stays visible but disabled. */
  locked?: boolean;
  onSend: (tag: FeedbackTag, text: string) => Promise<SendOutcome>;
}) {
  const [tag, setTag] = useState<FeedbackTag>('hook');
  const [text, setText] = useState('');

  const length = textLength(text);
  const overLimit = length > LIMITS.feedbackMax;
  const hasContent = textLength(text.trim()) >= 1;
  const canSend = ready && !sending && hasContent && !overLimit && !locked;

  async function submit() {
    if (!canSend) return;
    const outcome = await onSend(tag, text);
    if (outcome !== 'blocked') setText('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 rounded-card border border-ink-800 bg-ink-925 p-3 sm:p-4"
      data-testid="composer"
    >
      <div
        className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap"
        role="group"
        aria-label="Feedback tag"
        aria-labelledby="composer-tag-label"
      >
        <span id="composer-tag-label" className="sr-only">
          Tag
        </span>
        {FEEDBACK_TAGS.map((option) => (
          <TagOption
            key={option}
            tag={option}
            selected={tag === option}
            onClick={() => setTag(option)}
            className="w-full sm:w-auto"
          />
        ))}
      </div>

      <label htmlFor="composer-text" className="sr-only">
        Add feedback
      </label>
      <div className="mt-2 flex items-end gap-2">
        <div className="relative min-w-0 flex-1">
          <TextArea
            id="composer-text"
            data-testid="composer-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            compact
            rows={1}
            className="pr-16"
            placeholder={
              locked
                ? 'This roast round has ended. The host can start a new one.'
                : ready
                  ? 'Roast it, kindly…'
                  : 'Connecting to the room…'
            }
            disabled={sending || locked}
            dir="auto"
            aria-describedby="composer-counter composer-hint"
          />
          <span
            id="composer-counter"
            data-testid="composer-counter"
            className={`pointer-events-none absolute bottom-3.5 right-3 text-[11px] tabular-nums ${
              overLimit ? 'font-semibold text-tag-fix' : 'text-ink-500'
            }`}
          >
            {length}/{LIMITS.feedbackMax}
          </span>
        </div>
        <Button
          type="submit"
          disabled={!canSend}
          data-testid="composer-send"
          className="h-11 w-11 shrink-0 px-0 sm:w-auto sm:px-4"
          aria-label="Send feedback"
        >
          <span className="hidden sm:inline">Send</span>
          <Icon name="arrowUp" className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="hidden text-[11px] text-ink-500 sm:block" id="composer-hint">
          {locked
            ? 'Roast ended. Feedback is locked until the next round.'
            : 'Enter sends · Shift+Enter adds a line · / focuses'}
        </p>
        {sending ? <span className="text-[11px] text-ink-500">Sending…</span> : null}
      </div>
    </form>
  );
}
