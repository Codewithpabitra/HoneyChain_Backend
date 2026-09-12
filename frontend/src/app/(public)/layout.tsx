export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-honey overflow-x-hidden">
      <div className="mx-2 sm:mx-4 md:mx-6 lg:mx-8 bg-paper dark:bg-paper-dark min-h-screen overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}