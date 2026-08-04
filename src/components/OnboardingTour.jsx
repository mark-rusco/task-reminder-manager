import { Inbox, Sun, PlusSquare, ClipboardList } from 'lucide-react';

const STEPS = [
  {
    icon: Inbox,
    title: 'Your Inbox',
    body: 'Every task lives here. Tap a task to edit it, check the circle to mark it done, or pin it to push it to the top of your next shift.',
  },
  {
    icon: Sun,
    title: 'Today & next-shift priority',
    body: '“Today” shows what is due now. Pin important items and they’ll be waiting for you — with a summary banner — when your shift starts.',
  },
  {
    icon: PlusSquare,
    title: 'Add tasks in seconds',
    body: 'Use the + button (or press N) to add tasks, meetings, and report refreshes. Add due dates, reminders, recurrence, and categories.',
  },
  {
    icon: ClipboardList,
    title: 'Dashboards, LILO & RTO',
    body: 'Track your Power BI/Excel inventory, fill in your monthly LILO leave sheet, and keep an eye on your leave & return-to-office targets.',
  },
];

/** First-run onboarding tour. `step` is 1-based; 0/absent hides it. */
export default function OnboardingTour({ step = 0, onNext, onClose }) {
  if (!step) return null;
  const s = STEPS[step - 1];
  const Icon = s.icon;
  const last = step >= STEPS.length;
  return (
    <div className="tour-backdrop">
      <div className="tour-box">
        <span className="tour-step">{step} / {STEPS.length}</span>
        <div className="tour-icon"><Icon size={30} /></div>
        <h3>{s.title}</h3>
        <p>{s.body}</p>
        <div className="tour-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`tour-dot ${i === step - 1 ? 'on' : ''}`} />
          ))}
        </div>
        <div className="tour-actions">
          <button type="button" className="btn" onClick={onClose}>
            Skip
          </button>
          <button type="button" className="btn btn-primary" onClick={last ? onClose : () => onNext(step + 1)}>
            {last ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}