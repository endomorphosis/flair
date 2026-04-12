// Census ACS 5-Year API for county-level demographics
// B03002_001E = total population
// B03002_003E = Not Hispanic or Latino, White alone (non-Hispanic White)

const CENSUS_BASE = "https://api.census.gov/data/2022/acs/acs5";

// State FIPS codes
const STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
  DE: "10", DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17",
  IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24",
  MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31",
  NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38",
  OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46",
  TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
  WI: "55", WY: "56",
};

export interface CountyDemographics {
  fips: string; // 5-digit FIPS (state + county)
  name: string;
  totalPop: number;
  nhWhitePop: number;
  minorityPct: number;
  isMajorityMinority: boolean;
}

export interface ClassifiedCounties {
  majorityMinority: CountyDemographics[];
  majorityWhite: CountyDemographics[];
  majorityMinorityFips: string[]; // for HMDA query
  majorityWhiteFips: string[]; // for HMDA query
}

const demographicsCache = new Map<string, ClassifiedCounties>();

export async function getCountyDemographics(stateCode: string): Promise<ClassifiedCounties> {
  const cached = demographicsCache.get(stateCode);
  if (cached) return cached;

  const stateFips = STATE_FIPS[stateCode];
  if (!stateFips) throw new Error(`Unknown state code: ${stateCode}`);

  const url = `${CENSUS_BASE}?get=NAME,B03002_001E,B03002_003E&for=county:*&in=state:${stateFips}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census API error: ${res.status}`);

  const data: string[][] = await res.json();
  // data[0] is header: ["NAME","B03002_001E","B03002_003E","state","county"]

  const counties: CountyDemographics[] = data.slice(1).map((row) => {
    const totalPop = parseInt(row[1]) || 0;
    const nhWhitePop = parseInt(row[2]) || 0;
    const minorityPct = totalPop > 0 ? ((totalPop - nhWhitePop) / totalPop) * 100 : 0;
    return {
      fips: row[3] + row[4], // state FIPS + county FIPS
      name: row[0],
      totalPop,
      nhWhitePop,
      minorityPct,
      isMajorityMinority: minorityPct > 50,
    };
  });

  const result: ClassifiedCounties = {
    majorityMinority: counties.filter((c) => c.isMajorityMinority),
    majorityWhite: counties.filter((c) => !c.isMajorityMinority),
    majorityMinorityFips: counties.filter((c) => c.isMajorityMinority).map((c) => c.fips),
    majorityWhiteFips: counties.filter((c) => !c.isMajorityMinority).map((c) => c.fips),
  };

  demographicsCache.set(stateCode, result);
  return result;
}
