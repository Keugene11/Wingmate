export default function Offline() {
  return (
    <main className="min-h-app max-w-md mx-auto flex items-center justify-center px-5">
      <div className="text-center">
        <h1 className="font-display text-[28px] font-bold tracking-tight mb-3">
          You're offline
        </h1>
        <p className="text-text-muted text-[16px]">
          Check your connection and try again.
        </p>
      </div>
    </main>
  );
}
