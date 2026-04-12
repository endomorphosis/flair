"use client";

import { useEffect, useState } from "react";

interface CaseLawResult {
  opinion_id: string;
  case_name: string;
  court_name?: string;
  court_abbreviation?: string;
  jurisdiction: string;
  date_filed: string | null;
  snippet: string;
}

interface StatuteResult {
  header: string;
  citation_tag: string;
  url: string;
  excerpt: string;
  relevance_score: number;
  result_type: string;
}

interface Props {
  lenderName: string;
}

export default function LegalSidebar({ lenderName }: Props) {
  const [cases, setCases] = useState<CaseLawResult[]>([]);
  const [statutes, setStatutes] = useState<StatuteResult[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [statutesLoading, setStatutesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [statutesError, setStatutesError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/midpage?lender=${encodeURIComponent(lenderName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setCasesError(data.error);
        } else {
          setCases(data.results || []);
        }
      })
      .catch((e) => setCasesError(String(e)))
      .finally(() => setCasesLoading(false));

    fetch("/api/trustfoundry")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatutesError(data.error);
        } else {
          setStatutes(data.results || []);
        }
      })
      .catch((e) => setStatutesError(String(e)))
      .finally(() => setStatutesLoading(false));
  }, [lenderName]);

  return (
    <div className="space-y-6">
      {/* Case Law Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Related Case Law
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          ECOA/FHA cases mentioning {lenderName} — powered by Midpage
        </p>

        {casesLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            Searching federal case law...
          </div>
        )}

        {casesError && (
          <p className="text-sm text-amber-600 py-2">
            Case law search unavailable: {casesError}
          </p>
        )}

        {!casesLoading && !casesError && cases.length === 0 && (
          <p className="text-sm text-slate-500 py-2">
            No ECOA/FHA cases found naming this lender. This doesn&apos;t mean no
            claims exist — it may indicate the lender hasn&apos;t been previously
            sued under these statutes.
          </p>
        )}

        {cases.length > 0 && (
          <div className="space-y-3">
            {cases.map((c) => (
              <div
                key={c.opinion_id}
                className="border-l-2 border-blue-200 pl-3 py-1"
              >
                <p className="font-medium text-sm text-slate-900">
                  {c.case_name}
                </p>
                <p className="text-xs text-slate-500">
                  {c.court_abbreviation || c.court_name} | {c.jurisdiction}
                  {c.date_filed && ` | ${c.date_filed}`}
                </p>
                {c.snippet && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {c.snippet}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statutory Provisions Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Statutory Provisions
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Relevant ECOA, FHA, and regulatory provisions — powered by TrustFoundry
        </p>

        {statutesLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            Searching statutes and regulations...
          </div>
        )}

        {statutesError && (
          <p className="text-sm text-amber-600 py-2">
            Statutory search unavailable: {statutesError}
          </p>
        )}

        {!statutesLoading && !statutesError && statutes.length === 0 && (
          <p className="text-sm text-slate-500 py-2">
            No statutory provisions returned.
          </p>
        )}

        {statutes.length > 0 && (
          <div className="space-y-3">
            {statutes.map((s, i) => (
              <div
                key={i}
                className="border-l-2 border-emerald-200 pl-3 py-1"
              >
                <p className="font-medium text-sm text-slate-900">
                  {s.header}
                </p>
                <p className="text-xs text-slate-500">
                  {s.result_type === "law" ? "Statute" : s.result_type === "reg" ? "Regulation" : "Case"}
                </p>
                {s.excerpt && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                    {s.excerpt}
                  </p>
                )}
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    View source
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
