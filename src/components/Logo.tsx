export function Logo({ size = 40, word = true }: { size?: number; word?: boolean }) {
  return (
    <span className="logo" aria-label="ClientX">
      <span className="logo-mark" style={{ width: size, height: size, fontSize: size * 0.5 }} aria-hidden="true">
        C<span>×</span>
      </span>
      {word && (
        <span className="logo-word" style={{ fontSize: size * 0.56 }} aria-hidden="true">
          Client<b>X</b>
        </span>
      )}
    </span>
  );
}
