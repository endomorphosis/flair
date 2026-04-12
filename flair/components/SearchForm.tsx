"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { US_STATES, AVAILABLE_YEARS, DEFAULT_YEAR } from "@/lib/constants";
import { getMSAsForState } from "@/lib/msas";

interface Lender {
  lei: string;
  name: string;
  period: string;
}

export default function SearchForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("CA");
  const [msa, setMsa] = useState("");
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const msaOptions = useMemo(() => getMSAsForState(state), [state]);

  function handleStateChange(newState: string) {
    setState(newState);
    setMsa(""); // reset MSA when state changes
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.length < 2) return;
    setLoading(true);
    setSearched(false);
    try {
      const res = await fetch(
        `/api/lenders?q=${encodeURIComponent(query)}&year=${year}`
      );
      const data = await res.json();
      setLenders(data.lenders || []);
      setSearched(true);
    } catch {
      setLenders([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  function selectLender(lender: Lender) {
    const params = new URLSearchParams({
      lei: lender.lei,
      name: lender.name,
      state,
      year: String(year),
    });
    if (msa) {
      params.set("msa", msa);
      const msaObj = msaOptions.find((m) => m.code === msa);
      if (msaObj) params.set("msaName", msaObj.name);
    }
    router.push(`/results?${params.toString()}`);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <label htmlFor="lender" className="block text-sm font-medium text-slate-700 mb-1">
            Lender Name
          </label>
          <input
            id="lender"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "Wells Fargo", "Bank of America"'
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1">
              State
            </label>
            <select
              id="state"
              value={state}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {Object.entries(US_STATES)
                .sort(([, a], [, b]) => a.localeCompare(b))
                .map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1">
              Year
            </label>
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {AVAILABLE_YEARS.slice().reverse().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {msaOptions.length > 0 && (
          <div>
            <label htmlFor="msa" className="block text-sm font-medium text-slate-700 mb-1">
              Metro Area{" "}
              <span className="font-normal text-slate-400">(optional — narrows peer comparison to MSA level)</span>
            </label>
            <select
              id="msa"
              value={msa}
              onChange={(e) => setMsa(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">Statewide (all lenders in {US_STATES[state]})</option>
              {msaOptions.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || query.length < 2}
          className="w-full py-3 px-6 bg-slate-900 text-white rounded-lg text-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Searching..." : "Search Lender"}
        </button>
      </form>

      {searched && lenders.length === 0 && (
        <p className="mt-6 text-center text-slate-500">
          No lenders found matching &ldquo;{query}&rdquo; for {year}.
        </p>
      )}

      {lenders.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">
            Select a lender ({lenders.length} result{lenders.length !== 1 ? "s" : ""})
          </h3>
          <div className="space-y-2">
            {lenders.map((l) => (
              <button
                key={l.lei}
                onClick={() => selectLender(l)}
                className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors"
              >
                <span className="font-medium text-slate-900">{l.name}</span>
                <span className="ml-2 text-xs text-slate-400 font-mono">
                  {l.lei}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
