// Link label with the slide-up / slide-in duplicate hover used across the site.
export default function TextHover({ children, className = '' }) {
  return (
    <span className={`text-hover ${className}`}>
      <span>{children}</span>
      <span aria-hidden>{children}</span>
    </span>
  );
}
