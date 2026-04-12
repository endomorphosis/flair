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
    setMsa("");
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

  const inputClass =
    "w-full px-0 py-3 border-0 border-b border-neutral-300 bg-transparent text-base focus:ring-0 focus:border-[#111] outline-none transition-colors placeholder:text-neutral-400";
  const selectClass =
    "w-full px-0 py-3 border-0 border-b border-neutral-300 bg-transparent text-base focus:ring-0 focus:border-[#111] outline-none transition-colors appearance-none cursor-pointer";

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="space-y-6">
        <div>
          <label htmlFor="lender" className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
            Lender Name
          </label>
          <input
            id="lender"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Wells Fargo, Bank of America..."
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <label htmlFor="state" className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
              State
            </label>
            <select
              id="state"
              value={state}
              onChange={(e) => handleStateChange(e.target.value)}
              className={selectClass}
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
            <label htmlFor="year" className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
              Year
            </label>
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={selectClass}
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
            <label htmlFor="msa" className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
              Metro Area <span className="normal-case tracking-normal font-normal text-neutral-400">(optional)</span>
            </label>
            <select
              id="msa"
              value={msa}
              onChange={(e) => setMsa(e.target.value)}
              className={selectClass}
            >
              <option value="">Statewide</option>
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
          className="w-full py-3 bg-[#111] text-white text-sm font-medium tracking-wide uppercase hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {searched && lenders.length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-400">
          No lenders found matching &ldquo;{query}&rdquo; for {year}.
        </p>
      )}

      {lenders.length > 0 && (
        <div className="mt-10">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-3">
            {lenders.length} result{lenders.length !== 1 ? "s" : ""}
          </p>
          <div className="divide-y divide-neutral-200">
            {lenders.map((l) => (
              <button
                key={l.lei}
                onClick={() => selectLender(l)}
                className="w-full text-left py-3 hover:bg-neutral-100 transition-colors -mx-2 px-2"
              >
                <span className="text-sm font-medium text-[#111]">{l.name}</span>
                <span className="ml-2 text-[11px] text-neutral-400 font-mono">
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
