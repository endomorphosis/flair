import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            FLAIR
          </h1>
          <p className="text-lg text-slate-300 mb-1">
            Fair Lending AI Report
          </p>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Look up any mortgage lender. See racial disparities in loan denials
            backed by federal HMDA data. Identify outliers. Connect to the legal
            framework.
          </p>
        </div>
      </header>

      {/* Context banner */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-6 py-3 text-sm text-amber-800">
          <strong>Why this matters:</strong> Executive Order 14281 ended federal
          disparate impact enforcement. Private fair lending litigation under
          ECOA and the Fair Housing Act remains viable — but advocates lost their
          investigative partner. This tool democratizes the same HMDA analysis
          federal regulators use.
        </div>
      </div>

      {/* Search */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            Search for a Lender
          </h2>
          <p className="text-slate-600">
            Enter a lender name, select a state and year, then see their
            disparity profile.
          </p>
        </div>

        <SearchForm />

        {/* How it works */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="text-3xl mb-3">1</div>
            <h3 className="font-semibold text-slate-900 mb-1">Search</h3>
            <p className="text-sm text-slate-600">
              Enter a lender name and geography. We resolve it to their HMDA
              identifier.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-3xl mb-3">2</div>
            <h3 className="font-semibold text-slate-900 mb-1">Analyze</h3>
            <p className="text-sm text-slate-600">
              We pull denial rates by race from federal HMDA data, compute
              disparity ratios, and compare against peers.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-3xl mb-3">3</div>
            <h3 className="font-semibold text-slate-900 mb-1">Act</h3>
            <p className="text-sm text-slate-600">
              Use the disparity profile to assess potential ECOA/FHA claims, file
              HUD complaints, or refer cases to DOJ.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Data source: CFPB HMDA Data Browser | Built for LLM x Law Hackathon #6 at Stanford CodeX
      </footer>
    </div>
  );
}
