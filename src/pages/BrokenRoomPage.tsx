import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { Card, buttonClasses } from '../components/ui';

export default function BrokenRoomPage() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main
        className="mx-auto grid min-h-[60vh] w-full max-w-xl place-items-center px-4 py-12 sm:px-6"
        data-testid="broken-room"
      >
        <Card className="w-full text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tag-fix">
            Room link error
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink-100">
            This room link looks broken.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            The room details are missing, incomplete or no longer valid. Ask the host for
            a fresh link, or create your own room.
          </p>
          <Link to="/" className={`${buttonClasses('primary', 'md')} mt-5`}>
            Back home
          </Link>
        </Card>
      </main>
    </div>
  );
}
