export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-honey">
      <div className="px-3 sm:px-6 md:px-10 lg:px-14 bg-paper dark:bg-paper-dark min-h-screen">
        {children}
      </div>
    </div>
  );
}