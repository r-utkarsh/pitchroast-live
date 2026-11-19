import type { FeedbackTag } from './protocol';
import { voteCount, type RoomState } from './reducer';

export interface DigestInput {
  title: string;
  pitch: string;
  url: string;
  state: RoomState;
  now?: Date | number;
}

const SECTION_ORDER: ReadonlyArray<{ tag: FeedbackTag; heading: string }> = [
  { tag: 'fix', heading: 'Fix' },
  { tag: 'clarity', heading: 'Clarity' },
  { tag: 'hook', heading: 'Hook' },
];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatCollected(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function resolveDate(now: DigestInput['now']): Date {
  if (now === undefined) return new Date();
  if (now instanceof Date) return now;
  return new Date(now);
}

/** Markdown digest with the exact structure from SPEC section 5. */
export function buildDigest(input: DigestInput): string {
  const state = input.state;
  const lines: string[] = [
    `# PitchRoast feedback: ${oneLine(input.title)}`,
    `${oneLine(input.pitch)}  Link: ${input.url}`,
    `Collected: ${formatCollected(resolveDate(input.now))} | ${state.feedback.length} comments | ${state.reviewers.length} reviewers`,
  ];

  for (const section of SECTION_ORDER) {
    const items = state.feedback
      .filter((item) => item.tag === section.tag)
      .slice()
      .sort((a, b) => {
        const votes = voteCount(state, b.id) - voteCount(state, a.id);
        if (votes !== 0) return votes;
        return a.createdAt - b.createdAt;
      });

    if (items.length === 0) continue;

    lines.push(`## ${section.heading} (${items.length})`);
    for (const item of items) {
      lines.push(
        `- [ ] ${oneLine(item.text)} (+${voteCount(state, item.id)}) by ${oneLine(item.authorName)}`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}
