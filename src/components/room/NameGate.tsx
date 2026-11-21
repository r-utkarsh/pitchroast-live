import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../icons';
import { Avatar, Button, Card, Field, TextInput } from '../ui';
import type { ClaimResult } from '../../hooks/useIdentity';
import { LIMITS, textLength } from '../../lib/validation';

export default function NameGate({
  title,
  lastName,
  onClaim,
}: {
  title: string;
  lastName: string;
  onClaim: (name: string) => ClaimResult;
}) {
  const [name, setName] = useState(lastName);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onClaim(name);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <Card className="w-full max-w-[520px] rounded-2xl p-6 shadow-raise">
        <Link
          to="/"
          className="flex w-fit items-center gap-2 rounded-lg text-[15px] font-extrabold tracking-[-0.02em] text-ink-100"
          aria-label="PitchRoast Live home"
        >
          <Icon name="flame" className="h-4 w-4 text-flame" filled />
          <span className="lowercase">pitchroast</span>
        </Link>

        <h1 className="mt-4 text-[28px] font-extrabold leading-[34px] tracking-[-0.02em] text-ink-100">
          Join the roast
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-ink-300" data-testid="gate-title">
          You’re reviewing <span className="font-semibold text-ink-100">{title}</span>.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <Field
            id="reviewer-name"
            label="Display name"
            hint="No account needed. Your name shows next to your comments."
            counter={`${textLength(name)}/${LIMITS.nameMax}`}
            counterOver={textLength(name) > LIMITS.nameMax}
            counterWarn={textLength(name) >= LIMITS.nameMax * 0.9 && textLength(name) <= LIMITS.nameMax}
            error={error}
          >
            <div className="relative">
              <Avatar
                name={name.trim() || '?'}
                size="sm"
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"
              />
              <TextInput
                id="reviewer-name"
                data-testid="name-input"
                className="pl-11"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                placeholder="Your name"
                autoComplete="nickname"
                autoFocus
                dir="auto"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'reviewer-name-error' : 'reviewer-name-hint'}
              />
            </div>
          </Field>

          <Button
            type="submit"
            size="lg"
            className="w-full shadow-glow"
            data-testid="name-submit"
          >
            Enter room
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
