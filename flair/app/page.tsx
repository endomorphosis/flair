import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-3.5rem)]">
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Fair Lending AI Report
          </h1>
          <p className="text-slate-600 max-w-lg mx-auto">
            Turn federal mortgage data into fair lending evidence — in seconds.
          </p>
        </div>

        <SearchForm />
      </main>
    </div>
  );
}
