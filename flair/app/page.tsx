import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-3rem)]">
      <main className="max-w-xl mx-auto px-6 pt-20 pb-16">
        <h1 className="text-4xl font-bold tracking-tight text-[#111] mb-2">
          Fair Lending AI Radar
        </h1>
        <p className="text-neutral-500 text-base mb-12">
          Turn federal mortgage data into fair lending evidence — in seconds.
        </p>

        <SearchForm />
      </main>
    </div>
  );
}
