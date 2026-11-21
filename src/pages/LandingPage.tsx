import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import Icon from '../components/icons';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Field,
  TagPill,
  TextArea,
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
  decodeRoomPayload,
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

const TAG_EXPLAINERS = [
  {
    tag: 'hook' as const,
    question: 'Is it catchy?',
    quote: '“The one-liner got me, but lead with the 5-minute benefit.”',
  },
  {
    tag: 'clarity' as const,
    question: 'Is it easy to understand?',
    quote: '“I didn’t understand what ‘verified trails’ meant until the second screen.”',
  },
  {
    tag: 'fix' as const,
    question: 'What should change?',
    quote: '“The Sign up button is below the fold on mobile.”',
  },
];

const STEPS = [
  {
    title: 'Create a room',
    body: 'Add your project title, live URL and a one-line pitch.',
  },
  {
    title: 'Share the link',
    body: 'Reviewers open it, type a display name and start commenting.',
  },
  {
    title: 'Ship the fixes',
    body: 'Upvote the best comments, then copy everything as a Markdown to-do list.',
  },
];

function validateForm(title: string, url: string, pitch: string): FormErrors {
  const errors: FormErrors = {};

  if (!normalizeTitle(title)) {
    errors.title = title.trim()
      ? `Keep the title to ${LIMITS.titleMax} characters.`
      : 'Add a project title.';
  }
  if (!normalizeUrl(url)) {
    errors.url = url.trim() ? 'Enter a full link, like https://nebula.app.' : 'Add your project link.';
  }
  if (!normalizePitch(pitch)) {
    errors.pitch = pitch.trim()
      ? `Keep the pitch to ${LIMITS.pitchMax} characters.`
      : 'Add a pitch.';
  }

  return errors;
}

function hostOf(rawUrl: string | undefined): string {
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl).host;
  } catch {
    return rawUrl;
  }
}

function nearLimit(value: string, max: number): boolean {
  const length = textLength(value);
  return length >= max * 0.9 && length <= max;
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

  // Textareas do not submit implicitly: Enter creates the room (matching the
  // create button), while Shift+Enter is left alone to insert a line break.
  function handlePitchKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function forgetRoom(roomId: string) {
    setRecent(removeRecentRoom(roomId));
  }

  return (
    <div className="min-h-screen">
      <AppHeader>
        <nav className="hidden items-center gap-6 text-sm text-ink-300 sm:flex">
          <a href="#how-it-works" className="transition-colors hover:text-ink-100">
            How it works
          </a>
          {recent.length > 0 ? (
            <a href="#recent-rooms" className="transition-colors hover:text-ink-100">
              Recent rooms
            </a>
          ) : null}
        </nav>
      </AppHeader>

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-14 sm:px-8">
        <section className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-12 lg:py-14">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent-400/40 bg-accent-700/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-300">
              <Icon name="flame" className="h-3.5 w-3.5 text-flame" filled />
              Constructive roasting
            </span>
            <h1 className="mt-5 max-w-[560px] text-[40px] font-extrabold leading-[1.03] tracking-[-0.03em] text-ink-100 sm:text-[56px] sm:leading-[60px]">
              Share your project.
              <br />
              Get roasted,
              <br />
              usefully.
            </h1>
            <p className="mt-5 max-w-[520px] text-[17px] leading-7 text-ink-300">
              Create a roast room, send the link, and reviewers leave short comments tagged
              Hook, Clarity or Fix. No accounts. No setup.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link to="/demo" className={buttonClasses('secondary', 'lg')} data-testid="try-demo">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-ink-800">
                  <svg viewBox="0 0 16 16" className="ml-0.5 h-3 w-3 text-ink-100" aria-hidden="true">
                    <path d="M4 2.5 13 8l-9 5.5v-11Z" fill="currentColor" />
                  </svg>
                </span>
                Try the demo
              </Link>
              <span className="text-xs text-ink-500">
                A live demo room with a sample project. No sign-up.
              </span>
            </div>
          </div>

          <Card className="rounded-2xl p-5 shadow-raise sm:p-6">
            <div>
              <h2 className="text-[20px] font-bold leading-[26px] text-ink-100">
                Create a roast room
              </h2>
              <p className="mt-1 text-sm text-ink-300">Takes about 20 seconds.</p>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
              <Field
                id="room-title"
                label="Project title"
                counter={`${textLength(title)}/${LIMITS.titleMax}`}
                counterOver={textLength(title) > LIMITS.titleMax}
                counterWarn={nearLimit(title, LIMITS.titleMax)}
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
                  placeholder="What are you building?"
                  autoComplete="off"
                  dir="auto"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'room-title-error' : undefined}
                />
              </Field>

              <Field
                id="room-url"
                label="Project URL"
                hintTone={url.trim() && normalizeUrl(url) ? 'success' : 'muted'}
                hint={
                  url.trim() && normalizeUrl(url)
                    ? 'Link looks good.'
                    : 'http or https. We add https:// if you forget it.'
                }
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
                  placeholder="https://"
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
                hint="Shift+Enter adds a line · Enter creates the room."
                counter={`${textLength(pitch)}/${LIMITS.pitchMax}`}
                counterOver={textLength(pitch) > LIMITS.pitchMax}
                counterWarn={nearLimit(pitch, LIMITS.pitchMax)}
                error={errors.pitch}
              >
                <TextArea
                  id="room-pitch"
                  data-testid="create-pitch"
                  value={pitch}
                  onChange={(event) => {
                    setPitch(event.target.value);
                    setErrors((current) => ({ ...current, pitch: undefined }));
                  }}
                  onKeyDown={handlePitchKeyDown}
                  rows={2}
                  className="min-h-[4.5rem]"
                  placeholder="Say it in one sentence"
                  autoComplete="off"
                  dir="auto"
                  aria-invalid={Boolean(errors.pitch)}
                  aria-describedby={`room-pitch-hint${errors.pitch ? ' room-pitch-error' : ''}`}
                />
              </Field>

              {formError ? <Banner tone="error">{formError}</Banner> : null}

              <Button
                type="submit"
                size="lg"
                className="w-full shadow-glow"
                data-testid="create-submit"
              >
                Create roast room
                <Icon name="arrowRight" className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </section>

        <section aria-labelledby="tags-heading">
          <h2
            id="tags-heading"
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500"
          >
            Every comment carries one tag
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {TAG_EXPLAINERS.map((item) => (
              <Card
                key={item.tag}
                className="flex items-center gap-3 rounded-card p-4 sm:block"
              >
                <div className="shrink-0">
                  <TagPill tag={item.tag} />
                </div>
                <h3 className="text-[15px] font-bold text-ink-100 sm:mt-3">{item.question}</h3>
                <p className="mt-1.5 hidden text-sm leading-6 text-ink-300 sm:block">
                  {item.quote}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mt-12 scroll-mt-20" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-[28px] font-extrabold tracking-[-0.02em] text-ink-100">
            How it works
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-xl border border-ink-800 bg-ink-900 p-4 sm:block sm:p-5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-700 font-semibold text-accent-300">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-ink-100 sm:mt-3">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink-300 sm:mt-1.5">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {recent.length > 0 ? (
          <section
            id="recent-rooms"
            className="mt-12 scroll-mt-20"
            aria-labelledby="recent-heading"
          >
            <div className="flex items-end justify-between gap-3">
              <h2
                id="recent-heading"
                className="text-[28px] font-extrabold tracking-[-0.02em] text-ink-100"
              >
                Recent rooms
              </h2>
              <p className="pb-1 text-xs text-ink-500">Saved on this device</p>
            </div>
            <Card className="mt-4 overflow-hidden p-0">
              <ul className="divide-y divide-ink-800">
                {recent.map((room) => {
                  const payload = room.payload ? decodeRoomPayload(room.payload) : null;
                  const content = (
                    <>
                      <Avatar
                        name={room.title}
                        size="md"
                        square
                        className="rounded-lg"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-100">
                          {room.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-500">
                          {[hostOf(payload?.u), new Date(room.updatedAt).toLocaleDateString()]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </>
                  );

                  return (
                    <li key={room.roomId} className="flex items-center gap-3 px-4 py-3">
                      {room.payload ? (
                        <Link
                          to={buildRoomPath(room.roomId, room.payload)}
                          className="flex min-w-0 flex-1 items-center gap-3"
                          data-testid="recent-room"
                        >
                          {content}
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4 shrink-0 text-ink-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="m9 5 7 7-7 7" />
                          </svg>
                        </Link>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-ink-500 hover:text-ink-100"
                        onClick={() => forgetRoom(room.roomId)}
                        aria-label={`Forget ${room.title}`}
                        title="Forget this room"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-ink-800">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-1 px-4 py-6 text-xs text-ink-500 sm:px-8">
          <p className="font-semibold text-ink-300">
            PitchRoast Live — for builders who can take a joke.
          </p>
          <p>Rooms are public to anyone with the link. Live chat runs on the Nexconn Chat SDK.</p>
          <p>No accounts, no trackers, no third-party scripts.</p>
        </div>
      </footer>
    </div>
  );
}
