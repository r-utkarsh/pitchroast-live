import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import {
  Banner,
  Button,
  Card,
  Field,
  TextInput,
  buttonClasses,
} from '../components/ui';
import {
  markRoomCreator,
  readRecentRooms,
  removeRecentRoom,
  type RecentRoom,
} from '../lib/session';
import {
  LIMITS,
  buildRoomPath,
  createRoomPayload,
  encodeRoomPayload,
  generateRoomId,
  normalizePitch,
  normalizeTitle,
  normalizeUrl,
  textLength,
} from '../lib/validation';

interface FormErrors {
  title?: string;
  url?: string;
  pitch?: string;
}

function validateForm(title: string, url: string, pitch: string): FormErrors {
  const errors: FormErrors = {};

  if (!normalizeTitle(title)) {
    errors.title = title.trim()
      ? `Keep the title to ${LIMITS.titleMax} characters.`
      : 'Add a project title.';
  }
  if (!normalizeUrl(url)) {
    errors.url = url.trim()
      ? 'Use an http or https link.'
      : 'Add your project link.';
  }
  if (!normalizePitch(pitch)) {
    errors.pitch = pitch.trim()
      ? `Keep the pitch to ${LIMITS.pitchMax} characters.`
      : 'Add a one-line pitch.';
  }

  return errors;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [pitch, setPitch] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentRoom[]>([]);

  useEffect(() => {
    setRecent(readRecentRooms());
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const nextErrors = validateForm(title, url, pitch);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = createRoomPayload({ title, url, pitch });
    const encoded = payload ? encodeRoomPayload(payload) : null;
    if (!payload || !encoded) {
      setFormError('This room could not be created. Check the fields and try again.');
      return;
    }

    const roomId = generateRoomId();
    markRoomCreator(roomId);
    navigate(buildRoomPath(roomId, encoded));
  }

  function forgetRoom(roomId: string) {
    setRecent(removeRecentRoom(roomId));
  }

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-10 sm:px-6 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <section className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
              Live pitch feedback
            </p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-ink-100 sm:text-5xl">
              Get <span className="text-accent-400">roasted</span> before you launch.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-300">
              Drop your project link. Reviewers join one live room and leave tagged,
              upvotable notes on your hook, clarity and fixes. Keep the sharpest ones as a
              Markdown to-do list.
            </p>

            <ol className="mt-8 max-w-xl space-y-4">
              {[
                'Create a room with your link and one-line pitch.',
                'Share the room link. Reviewers join in one click, no accounts.',
                'Upvote the best notes, then export them as a to-do list.',
              ].map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-ink-300">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-accent-400/40 bg-accent-500/10 text-xs font-semibold text-accent-400">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/demo" className={buttonClasses('secondary', 'lg')} data-testid="try-demo">
                Try the demo
              </Link>
              <span className="text-xs text-ink-500">
                No sign-up. Room details travel inside the link.
              </span>
            </div>
          </section>

          <div className="space-y-4">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink-100">Create a roast room</h2>
                  <p className="mt-1 text-sm text-ink-300">
                    One link for your project and its reviewers.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                  Free
                </span>
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
                <Field
                  id="room-title"
                  label="Project title"
                  counter={`${textLength(title)}/${LIMITS.titleMax}`}
                  counterOver={textLength(title) > LIMITS.titleMax}
                  error={errors.title}
                >
                  <TextInput
                    id="room-title"
                    data-testid="create-title"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setErrors((current) => ({ ...current, title: undefined }));
                    }}
                    placeholder="e.g. Nebula Notes"
                    autoComplete="off"
                    dir="auto"
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={errors.title ? 'room-title-error' : undefined}
                  />
                </Field>

                <Field
                  id="room-url"
                  label="Project URL"
                  hint="http or https. We add https:// if you forget it."
                  error={errors.url}
                >
                  <TextInput
                    id="room-url"
                    data-testid="create-url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setErrors((current) => ({ ...current, url: undefined }));
                    }}
                    placeholder="nebula.app"
                    inputMode="url"
                    autoComplete="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    dir="ltr"
                    aria-invalid={Boolean(errors.url)}
                    aria-describedby={errors.url ? 'room-url-error' : 'room-url-hint'}
                  />
                </Field>

                <Field
                  id="room-pitch"
                  label="One-line pitch"
                  counter={`${textLength(pitch)}/${LIMITS.pitchMax}`}
                  counterOver={textLength(pitch) > LIMITS.pitchMax}
                  error={errors.pitch}
                >
                  <TextInput
                    id="room-pitch"
                    data-testid="create-pitch"
                    value={pitch}
                    onChange={(event) => {
                      setPitch(event.target.value);
                      setErrors((current) => ({ ...current, pitch: undefined }));
                    }}
                    placeholder="Meetings in, clear action items out."
                    autoComplete="off"
                    dir="auto"
                    aria-invalid={Boolean(errors.pitch)}
                    aria-describedby={errors.pitch ? 'room-pitch-error' : undefined}
                  />
                </Field>

                {formError ? <Banner tone="error">{formError}</Banner> : null}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    className="sm:flex-1"
                    data-testid="create-submit"
                  >
                    Create room
                  </Button>
                  <Link
                    to="/demo"
                    className={buttonClasses('secondary', 'md', 'sm:flex-1')}
                  >
                    Try the demo
                  </Link>
                </div>
              </form>
            </Card>

            {recent.length > 0 ? (
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-ink-100">Recent rooms</h2>
                  <span className="text-xs text-ink-500">{recent.length}/5</span>
                </div>
                <ul className="mt-2 divide-y divide-ink-800">
                  {recent.map((room) => (
                    <li key={room.roomId} className="flex items-center gap-2 py-2.5">
                      {room.payload ? (
                        <Link
                          to={buildRoomPath(room.roomId, room.payload)}
                          className="min-w-0 flex-1 rounded-lg px-1 py-0.5"
                          data-testid="recent-room"
                        >
                          <span className="block truncate text-sm text-ink-100">
                            {room.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-ink-500">
                            /r/{room.roomId} · {new Date(room.updatedAt).toLocaleDateString()}
                          </span>
                        </Link>
                      ) : (
                        <div className="min-w-0 flex-1 px-1 py-0.5">
                          <span className="block truncate text-sm text-ink-100">
                            {room.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-ink-500">
                            Reopen from its original link
                          </span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => forgetRoom(room.roomId)}
                        aria-label={`Forget ${room.title}`}
                      >
                        Forget
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="border-t border-ink-800/80">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-ink-500 sm:px-6">
          Live chat runs on the Nexconn Chat SDK. No accounts, no trackers.
        </div>
      </footer>
    </div>
  );
}
