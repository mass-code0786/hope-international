export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8 md:flex md:items-center md:justify-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(217,119,6,0.14),transparent_26%),linear-gradient(180deg,rgba(248,250,252,0.92),rgba(238,244,248,0.82))] dark:bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_22%),linear-gradient(180deg,rgba(7,16,25,0.96),rgba(12,21,33,0.96))]" />
        <div className="absolute left-[-10%] top-24 h-72 w-72 rounded-full bg-teal-200/50 blur-3xl dark:bg-teal-400/10" />
        <div className="absolute bottom-10 right-[-8%] h-80 w-80 rounded-full bg-amber-200/50 blur-3xl dark:bg-amber-300/10" />
      </div>
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="grid gap-6 md:grid-cols-[1.05fr,minmax(0,480px)] md:items-center">
          <div className="hidden md:block">
            <div className="max-w-xl">
              <span className="hope-kicker mb-5">Hope International</span>
              <h1 className="text-5xl font-semibold tracking-[-0.06em] text-text">Premium commerce, referral growth, and member operations in one platform.</h1>
              <p className="mt-6 text-base leading-8 text-muted">The refreshed Hope interface is built around faster actions, cleaner data hierarchy, and a more polished member experience across mobile and desktop.</p>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
