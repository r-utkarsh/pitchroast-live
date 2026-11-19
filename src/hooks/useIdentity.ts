import { useCallback, useState } from 'react';
import {
  generateUserId,
  normalizeName,
} from '../lib/validation';
import {
  readIdentity,
  readLastName,
  writeIdentity,
  writeLastName,
  type Identity,
} from '../lib/session';

export type ClaimResult =
  | { ok: true; identity: Identity }
  | { ok: false; error: string };

/**
 * Session identity for this tab. `forceNew` supports "Open as another
 * reviewer": the cloned tab ignores the inherited identity and asks for a name.
 */
export default function useIdentity({ forceNew = false }: { forceNew?: boolean } = {}) {
  const [identity, setIdentity] = useState<Identity | null>(() =>
    forceNew ? null : readIdentity(),
  );
  const [lastName] = useState(() => readLastName());

  const claim = useCallback((rawName: string): ClaimResult => {
    const name = normalizeName(rawName);
    if (!name) {
      return { ok: false, error: 'Enter a name between 2 and 24 characters.' };
    }

    const next: Identity = { userId: generateUserId(), name };
    writeIdentity(next);
    writeLastName(name);
    setIdentity(next);
    return { ok: true, identity: next };
  }, []);

  return { identity, lastName, claim };
}
