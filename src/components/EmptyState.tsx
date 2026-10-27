import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden>
        <span className="empty__frame empty__frame--back" />
        <span className="empty__frame empty__frame--front" />
        <span className="empty__icon">{icon}</span>
      </div>
      <h2 className="empty__title">{title}</h2>
      <p className="empty__text">{text}</p>
      {action}
    </div>
  );
}
