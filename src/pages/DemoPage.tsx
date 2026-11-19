import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { Card, Spinner, buttonClasses } from '../components/ui';
import { markRoomCreator } from '../lib/session';
import {
  buildRoomPath,
  createRoomPayload,
  encodeRoomPayload,
  generateDemoRoomId,
} from '../lib/validation';

const SAMPLE_PROJECT = {
  title: 'Nebula Notes',
  url: 'https://example.com',
  pitch: 'Turns messy meeting notes into clear action items in seconds.',
};

export default function DemoPage() {
  const navigate = useNavigate();
  const [target] = useState<string | null>(() => {
    const payload = createRoomPayload(SAMPLE_PROJECT);
    const encoded = payload ? encodeRoomPayload(payload) : null;
    if (!encoded) return null;
    const roomId = generateDemoRoomId();
    markRoomCreator(roomId);
    return buildRoomPath(roomId, encoded);
  });

  useEffect(() => {
    if (target) navigate(target, { replace: true });
  }, [navigate, target]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid min-h-[60vh] w-full max-w-xl place-items-center px-4 py-12 sm:px-6">
        <Card className="w-full text-center">
          {target ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Spinner label="Preparing your demo room…" />
              <p className="text-sm text-ink-300">
                A fresh demo room is being opened for you.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              <h1 className="text-xl font-semibold">The demo is unavailable.</h1>
              <p className="text-sm text-ink-300">
                The sample room could not be created in this browser.
              </p>
              <Link to="/" className={buttonClasses('primary', 'md')}>
                Back home
              </Link>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
