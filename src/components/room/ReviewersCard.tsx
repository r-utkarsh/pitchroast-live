import type { FeedbackItem, Reviewer } from '../../lib/reducer';
import Icon from '../icons';
import { Avatar } from '../ui';

export default function ReviewersCard({
  reviewers,
  feedback,
}: {
  reviewers: Reviewer[];
  feedback: FeedbackItem[];
}) {
  const counts = new Map<string, number>();
  for (const item of feedback) {
    counts.set(item.authorId, (counts.get(item.authorId) ?? 0) + 1);
  }

  return (
    <section className="rounded-card border border-ink-800 bg-ink-900 p-4" aria-label="Reviewers">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink-100">
          <Icon name="users" className="h-4 w-4 text-ink-500" />
          Reviewers
        </h2>
        <span className="text-xs text-ink-500">{reviewers.length} in the room</span>
      </div>

      {reviewers.length === 0 ? (
        <p className="mt-3 text-xs text-ink-500">Just you so far. Share the room link.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {reviewers.map((reviewer) => {
            const count = counts.get(reviewer.userId) ?? 0;
            return (
              <li key={reviewer.userId} className="flex items-center gap-2.5">
                <Avatar name={reviewer.name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-100">
                  {reviewer.name}
                </span>
                <span className="shrink-0 text-xs text-ink-500">
                  {count} {count === 1 ? 'comment' : 'comments'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
