// Top US Metropolitan Statistical Areas with HMDA MSAMD codes
// Source: FFIEC/Census Bureau MSA definitions
export interface MSA {
  code: string;
  name: string;
  states: string[]; // primary state codes
}

export const MSAS: MSA[] = [
  { code: "12060", name: "Atlanta-Sandy Springs-Roswell, GA", states: ["GA"] },
  { code: "12420", name: "Austin-Round Rock, TX", states: ["TX"] },
  { code: "12580", name: "Baltimore-Columbia-Towson, MD", states: ["MD"] },
  { code: "13820", name: "Birmingham-Hoover, AL", states: ["AL"] },
  { code: "14460", name: "Boston-Cambridge-Newton, MA-NH", states: ["MA", "NH"] },
  { code: "15380", name: "Buffalo-Cheektowaga-Niagara Falls, NY", states: ["NY"] },
  { code: "16740", name: "Charlotte-Concord-Gastonia, NC-SC", states: ["NC", "SC"] },
  { code: "16980", name: "Chicago-Naperville-Elgin, IL-IN-WI", states: ["IL", "IN", "WI"] },
  { code: "17460", name: "Cincinnati, OH-KY-IN", states: ["OH", "KY", "IN"] },
  { code: "17820", name: "Cleveland-Elyria, OH", states: ["OH"] },
  { code: "18140", name: "Columbus, OH", states: ["OH"] },
  { code: "19100", name: "Dallas-Fort Worth-Arlington, TX", states: ["TX"] },
  { code: "19740", name: "Denver-Aurora-Lakewood, CO", states: ["CO"] },
  { code: "19820", name: "Detroit-Warren-Dearborn, MI", states: ["MI"] },
  { code: "22180", name: "Fayetteville, NC", states: ["NC"] },
  { code: "26420", name: "Houston-The Woodlands-Sugar Land, TX", states: ["TX"] },
  { code: "26900", name: "Indianapolis-Carmel-Anderson, IN", states: ["IN"] },
  { code: "27260", name: "Jacksonville, FL", states: ["FL"] },
  { code: "28140", name: "Kansas City, MO-KS", states: ["MO", "KS"] },
  { code: "29820", name: "Las Vegas-Henderson-Paradise, NV", states: ["NV"] },
  { code: "31080", name: "Los Angeles-Long Beach-Anaheim, CA", states: ["CA"] },
  { code: "31140", name: "Louisville/Jefferson County, KY-IN", states: ["KY", "IN"] },
  { code: "32820", name: "Memphis, TN-MS-AR", states: ["TN", "MS", "AR"] },
  { code: "33100", name: "Miami-Fort Lauderdale-West Palm Beach, FL", states: ["FL"] },
  { code: "33340", name: "Milwaukee-Waukesha-West Allis, WI", states: ["WI"] },
  { code: "33460", name: "Minneapolis-St. Paul-Bloomington, MN-WI", states: ["MN", "WI"] },
  { code: "34980", name: "Nashville-Davidson-Murfreesboro-Franklin, TN", states: ["TN"] },
  { code: "35380", name: "New Orleans-Metairie, LA", states: ["LA"] },
  { code: "35620", name: "New York-Newark-Jersey City, NY-NJ-PA", states: ["NY", "NJ", "PA"] },
  { code: "36420", name: "Oklahoma City, OK", states: ["OK"] },
  { code: "36740", name: "Orlando-Kissimmee-Sanford, FL", states: ["FL"] },
  { code: "37980", name: "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD", states: ["PA", "NJ", "DE", "MD"] },
  { code: "38060", name: "Phoenix-Mesa-Scottsdale, AZ", states: ["AZ"] },
  { code: "38300", name: "Pittsburgh, PA", states: ["PA"] },
  { code: "38900", name: "Portland-Vancouver-Hillsboro, OR-WA", states: ["OR", "WA"] },
  { code: "39580", name: "Raleigh, NC", states: ["NC"] },
  { code: "40060", name: "Richmond, VA", states: ["VA"] },
  { code: "40140", name: "Riverside-San Bernardino-Ontario, CA", states: ["CA"] },
  { code: "40900", name: "Sacramento-Roseville-Arden-Arcade, CA", states: ["CA"] },
  { code: "41180", name: "St. Louis, MO-IL", states: ["MO", "IL"] },
  { code: "41620", name: "Salt Lake City, UT", states: ["UT"] },
  { code: "41700", name: "San Antonio-New Braunfels, TX", states: ["TX"] },
  { code: "41740", name: "San Diego-Carlsbad, CA", states: ["CA"] },
  { code: "41860", name: "San Francisco-Oakland-Hayward, CA", states: ["CA"] },
  { code: "41940", name: "San Jose-Sunnyvale-Santa Clara, CA", states: ["CA"] },
  { code: "42660", name: "Seattle-Tacoma-Bellevue, WA", states: ["WA"] },
  { code: "45300", name: "Tampa-St. Petersburg-Clearwater, FL", states: ["FL"] },
  { code: "47260", name: "Virginia Beach-Norfolk-Newport News, VA-NC", states: ["VA", "NC"] },
  { code: "47900", name: "Washington-Arlington-Alexandria, DC-VA-MD-WV", states: ["DC", "VA", "MD", "WV"] },
];

export function getMSAsForState(stateCode: string): MSA[] {
  return MSAS.filter((m) => m.states.includes(stateCode));
}
