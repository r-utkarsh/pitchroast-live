import { useState, type FormEvent } from 'react';
import AppHeader from '../AppHeader';
import { Button, Card, Field, TextInput } from '../ui';
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
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid min-h-[60vh] w-full max-w-xl place-items-center px-4 py-12 sm:px-6">
        <Card className="w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
            Joining a roast room
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink-100" data-testid="gate-title">
            Review <span className="text-accent-400">{title}</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            Pick a display name so the host knows who left each note. No account needed.
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              id="reviewer-name"
              label="Display name"
              hint="2–24 characters. Stored in this tab only."
              counter={`${textLength(name)}/${LIMITS.nameMax}`}
              counterOver={textLength(name) > LIMITS.nameMax}
              error={error}
            >
              <TextInput
                id="reviewer-name"
                data-testid="name-input"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                placeholder="e.g. Ana"
                autoComplete="nickname"
                autoFocus
                dir="auto"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'reviewer-name-error' : 'reviewer-name-hint'}
              />
            </Field>

            <Button type="submit" className="w-full" data-testid="name-submit">
              Enter room
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
