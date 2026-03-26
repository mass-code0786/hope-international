export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg p-4 md:flex md:items-center md:justify-center">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
