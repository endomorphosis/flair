export const HMDA_BASE = "https://ffiec.cfpb.gov";

export const RACES = [
  "White",
  "Black or African American",
  "Asian",
  "American Indian or Alaska Native",
  "Native Hawaiian or Other Pacific Islander",
] as const;

export const ETHNICITIES = [
  "Hispanic or Latino",
  "Not Hispanic or Latino",
] as const;

// action_taken codes
export const ACTION_ORIGINATED = "1";
export const ACTION_DENIED = "3";

export const RACE_LABELS: Record<string, string> = {
  "White": "White",
  "Black or African American": "Black",
  "Asian": "Asian",
  "American Indian or Alaska Native": "Native American",
  "Native Hawaiian or Other Pacific Islander": "Pacific Islander",
  "Hispanic or Latino": "Hispanic/Latino",
};

export const RACE_COLORS: Record<string, string> = {
  "White": "#6b7280",
  "Black or African American": "#2563eb",
  "Asian": "#16a34a",
  "American Indian or Alaska Native": "#d97706",
  "Native Hawaiian or Other Pacific Islander": "#9333ea",
  "Hispanic or Latino": "#dc2626",
};

export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

export const DEFAULT_YEAR = 2023;
export const AVAILABLE_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
