import { useState, type FormEvent, type KeyboardEvent } from 'react';
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
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-ink-800 p-3 sm:p-4"
      data-testid="composer"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-ink-300" id="composer-tag-label">
          Tag
        </span>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-labelledby="composer-tag-label"
        >
          {FEEDBACK_TAGS.map((option) => (
            <TagOption
              key={option}
              tag={option}
              selected={tag === option}
              onClick={() => setTag(option)}
            />
          ))}
        </div>
      </div>

      <label htmlFor="composer-text" className="sr-only">
        Add feedback
      </label>
      <TextArea
        id="composer-text"
        data-testid="composer-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          locked
            ? 'This roast round has ended. The host can start a new one.'
            : ready
              ? 'What landed? What confused you? What should change?'
              : 'Connecting to the room…'
        }
        rows={3}
        disabled={sending || locked}
        dir="auto"
        aria-describedby="composer-counter composer-hint"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-ink-500" id="composer-hint">
          {locked
            ? 'Roast ended. Feedback is locked until the next round.'
            : 'Enter sends · Shift+Enter adds a line · / focuses'}
        </div>
        <div className="flex items-center gap-3">
          <span
            id="composer-counter"
            data-testid="composer-counter"
            className={`text-xs tabular-nums ${
              overLimit ? 'font-semibold text-tag-fix' : 'text-ink-300'
            }`}
          >
            {length}/{LIMITS.feedbackMax}
          </span>
          <Button
            type="submit"
            disabled={!canSend}
            data-testid="composer-send"
            size="sm"
          >
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </form>
  );
}
