export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f7fb] px-4 py-6 sm:px-6 sm:py-8 md:flex md:items-center md:justify-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_62%)]" />
        <div className="absolute -left-20 top-24 h-56 w-56 rounded-full bg-[#d7f0ff] blur-3xl" />
        <div className="absolute -right-16 bottom-16 h-64 w-64 rounded-full bg-[#e6f7ec] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.45]" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>
      <div className="relative mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
