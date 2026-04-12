/**
 * Fair Lending Enforcement Actions Database
 *
 * Curated database of DOJ, CFPB, HUD, State AG, and private fair lending
 * enforcement actions (2011-2026). Each entry includes the specific
 * disparity metric cited in the complaint or settlement where available.
 *
 * Sources: DOJ press releases, CFPB enforcement actions, court filings,
 * and news reporting. All settlement amounts and statistics are drawn
 * from official government announcements.
 */

export type EnforcementType = "DOJ" | "CFPB" | "DOJ/CFPB" | "DOJ/CFPB/OCC" | "HUD" | "State AG" | "Private" | "DOJ/HUD" | "DOJ/State AG" | "DOJ/CFPB/State AG";

export type LegalTheory =
  | "redlining"
  | "pricing discrimination"
  | "underwriting discrimination"
  | "reverse redlining"
  | "steering"
  | "disparate impact"
  | "disparate treatment"
  | "REO maintenance discrimination"
  | "predatory lending"
  | "national origin discrimination";

export interface EnforcementCase {
  id: string;
  caseName: string;
  defendant: string;
  year: number;
  settlementAmount: number; // in dollars
  type: EnforcementType;
  disparityMetric: string;
  racialGroupAffected: string[];
  legalTheory: LegalTheory[];
  geography: string;
  description: string;
  sourceUrl?: string;
}

export const ENFORCEMENT_CASES: EnforcementCase[] = [
  // ============================================================
  //  DOJ CASES (including Combating Redlining Initiative)
  // ============================================================
  {
    id: "countrywide-2011",
    caseName: "United States v. Countrywide Financial Corp.",
    defendant: "Countrywide Financial / Bank of America",
    year: 2011,
    settlementAmount: 335_000_000,
    type: "DOJ",
    disparityMetric:
      "200,000+ Black and Hispanic borrowers charged higher rates than similarly qualified White borrowers; in IL, minority borrowers were 3x as likely to be placed in subprime loans as similarly situated White borrowers",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["pricing discrimination", "steering"],
    geography: "Nationwide (36+ states)",
    description:
      "Largest residential fair lending settlement in history. Countrywide charged higher interest rates and fees to over 200,000 minority borrowers and steered more than 10,000 into costlier subprime loans despite qualifying for prime products.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-reaches-335-million-settlement-resolve-allegations-lending-discrimination",
  },
  {
    id: "wells-fargo-2012",
    caseName: "United States v. Wells Fargo Bank, N.A.",
    defendant: "Wells Fargo",
    year: 2012,
    settlementAmount: 175_000_000,
    type: "DOJ",
    disparityMetric:
      "34,000+ Black and Hispanic borrowers charged higher rates or steered into subprime loans; discrimination documented across 36 states",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["pricing discrimination", "steering"],
    geography: "Nationwide (36 states + DC)",
    description:
      "Second-largest fair lending settlement at the time. Wells Fargo pushed minority borrowers into costlier subprime loans or charged them higher fees than comparable White borrowers.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-reaches-settlement-wells-fargo-resulting-more-175-million-relief",
  },
  {
    id: "chevy-chase-2013",
    caseName: "United States v. Chevy Chase Bank, F.S.B.",
    defendant: "Chevy Chase Bank (Capital One)",
    year: 2013,
    settlementAmount: 2_850_000,
    type: "DOJ",
    disparityMetric:
      "Bank avoided marketing mortgage services in majority-Black neighborhoods in the Washington, D.C. metro area from 2006-2009; approximately 3,100 victims identified",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Washington, D.C. metro area",
    description:
      "Chevy Chase Bank engaged in redlining by avoiding serving qualified African-American and Hispanic borrowers in majority-minority neighborhoods.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-reaches-fair-lending-settlement-chevy-chase-bank-resulting-285-million",
  },
  {
    id: "national-city-2013",
    caseName: "United States and CFPB v. National City Bank",
    defendant: "National City Bank (PNC)",
    year: 2013,
    settlementAmount: 35_000_000,
    type: "DOJ/CFPB",
    disparityMetric:
      "Black and Hispanic borrowers systematically charged higher mortgage prices than similarly creditworthy White borrowers from 2002-2008",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["pricing discrimination"],
    geography: "Nationwide",
    description:
      "National City Bank violated ECOA by allowing discretionary pricing that resulted in Black and Hispanic borrowers paying more for mortgage loans than similarly qualified White borrowers.",
    sourceUrl:
      "https://www.consumerfinance.gov/about-us/newsroom/cfpb-and-doj-take-action-against-national-city-bank-for-discriminatory-mortgage-pricing/",
  },
  {
    id: "ally-financial-2013",
    caseName: "United States and CFPB v. Ally Financial Inc.",
    defendant: "Ally Financial / Ally Bank",
    year: 2013,
    settlementAmount: 98_000_000,
    type: "DOJ/CFPB",
    disparityMetric:
      "235,000 Black, Hispanic, and Asian/Pacific Islander borrowers charged higher auto loan interest rates than White borrowers; average victim paid $200-$300 extra over the loan term",
    racialGroupAffected: ["Black", "Hispanic", "Asian/Pacific Islander"],
    legalTheory: ["pricing discrimination", "disparate impact"],
    geography: "Nationwide",
    description:
      "Largest auto lending discrimination settlement in history. Ally's dealer markup policy resulted in minority borrowers systematically paying higher interest rates. First joint DOJ/CFPB fair lending enforcement action.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-and-consumer-financial-protection-bureau-reach-98-million-settlementto",
  },
  {
    id: "hudson-city-2015",
    caseName: "United States and CFPB v. Hudson City Savings Bank",
    defendant: "Hudson City Savings Bank",
    year: 2015,
    settlementAmount: 33_000_000,
    type: "DOJ/CFPB",
    disparityMetric:
      "90%+ of branches opened/acquired during 2004-2010 expansion were outside majority-Black-and-Hispanic neighborhoods; bank drew redline excluding 4 New York counties with majority minority residents",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "NY, NJ, CT metro areas",
    description:
      "Largest DOJ redlining settlement at the time. Hudson City avoided providing mortgage services to majority-Black and Hispanic neighborhoods during a major expansion, drawing a semi-circular redline that excluded minority communities.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-and-consumer-financial-protection-bureau-reach-settlement-hudson-city",
  },
  {
    id: "associated-bank-2015",
    caseName: "HUD v. Associated Bank",
    defendant: "Associated Bank",
    year: 2015,
    settlementAmount: 200_000_000,
    type: "HUD",
    disparityMetric:
      "Compared to peer lenders, Associated made far fewer loans in majority-minority census tracts in Chicago, Milwaukee, and Minneapolis metro areas despite actively lending in nearby predominantly White tracts (2008-2010)",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Chicago, Milwaukee, Minneapolis metro areas",
    description:
      "Largest HUD fair lending settlement ever. HUD found Associated Bank denied mortgage loans to Black and Hispanic applicants at higher rates and failed to serve majority-minority neighborhoods while actively lending in nearby White neighborhoods.",
    sourceUrl:
      "https://archives.hud.gov/news/2015/pr15-064b.cfm",
  },
  {
    id: "bancorpsouth-2016",
    caseName: "United States and CFPB v. BancorpSouth Bank",
    defendant: "BancorpSouth Bank",
    year: 2016,
    settlementAmount: 10_600_000,
    type: "DOJ/CFPB",
    disparityMetric:
      "Only 3.2% of applications from high-minority neighborhoods vs. 17.6% for peers; BancorpSouth received 91% of applications from majority-White neighborhoods (which represent only 48.4% of Memphis tracts); matched-pair testing showed Black testers treated less favorably",
    racialGroupAffected: ["Black"],
    legalTheory: ["redlining", "underwriting discrimination", "pricing discrimination"],
    geography: "Memphis, TN MSA",
    description:
      "Comprehensive case combining redlining, underwriting discrimination, pricing disparities, and an explicitly discriminatory loan denial policy. CFPB used mystery shoppers to document disparate treatment.",
    sourceUrl:
      "https://www.consumerfinance.gov/about-us/newsroom/consumer-financial-protection-bureau-and-department-justice-action-requires-bancorpsouth-pay-106-million-address-discriminatory-mortgage-lending-practices/",
  },
  {
    id: "trustmark-2021",
    caseName: "United States, CFPB, and OCC v. Trustmark National Bank",
    defendant: "Trustmark National Bank",
    year: 2021,
    settlementAmount: 9_000_000,
    type: "DOJ/CFPB/OCC",
    disparityMetric:
      "From 2014-2018, Trustmark avoided marketing and providing mortgage services in majority-Black and Hispanic neighborhoods in Memphis; failed to locate branches or hire loan officers in minority communities",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Memphis, TN",
    description:
      "First settlement under DOJ's Combating Redlining Initiative launched in October 2021. Trustmark deliberately avoided serving minority neighborhoods and failed to monitor fair lending compliance.",
    sourceUrl:
      "https://www.consumerfinance.gov/about-us/newsroom/cfpb-doj-and-occ-take-action-against-trustmark-national-bank-for-deliberate-discrimination-against-black-and-hispanic-families/",
  },
  {
    id: "midwest-bankcentre-2022",
    caseName: "United States v. Midwest BankCentre",
    defendant: "Midwest BankCentre",
    year: 2022,
    settlementAmount: 1_450_000,
    type: "DOJ",
    disparityMetric:
      "Bank avoided providing mortgage lending services in majority-African-American neighborhoods in the St. Louis metro area",
    racialGroupAffected: ["Black"],
    legalTheory: ["redlining"],
    geography: "St. Louis, MO",
    description:
      "Midwest BankCentre agreed to open a full-service branch in an African-American neighborhood and invest approximately $1.45 million in majority-African-American areas.",
    sourceUrl:
      "https://www.justice.gov/opa/pr/justice-department-reaches-settlement-midwest-bankcentre-regarding-alleged-lending",
  },
  {
    id: "trident-mortgage-2022",
    caseName: "United States, CFPB, and State AGs v. Trident Mortgage Co.",
    defendant: "Trident Mortgage Co. (Berkshire Hathaway)",
    year: 2022,
    settlementAmount: 22_000_000,
    type: "DOJ/CFPB/State AG",
    disparityMetric:
      "Only 12% of applications from majority-minority neighborhoods, though 25%+ of Philadelphia MSA neighborhoods are majority-minority; 51 of 53 offices in majority-White neighborhoods; in 80%+ minority neighborhoods, more than half of applications were from White applicants",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Philadelphia, PA / Camden, NJ / Wilmington, DE",
    description:
      "First-ever redlining settlement against a non-bank lender. Joint action with PA, NJ, and DE Attorneys General. Trident concentrated offices and marketing in White neighborhoods while ignoring majority-minority areas.",
    sourceUrl:
      "https://www.consumerfinance.gov/about-us/newsroom/cfpb-doj-order-trident-mortgage-company-to-pay-more-than-22-million-for-deliberate-discrimination-against-minority-families/",
  },
  {
    id: "lakeland-bank-2022",
    caseName: "United States v. Lakeland Bank",
    defendant: "Lakeland Bank",
    year: 2022,
    settlementAmount: 13_000_000,
    type: "DOJ",
    disparityMetric:
      "Bank failed to serve majority-Black and Hispanic neighborhoods in Newark metro area while actively lending in nearby majority-White neighborhoods",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Newark, NJ metro area",
    description:
      "Third-largest DOJ redlining settlement at the time. Lakeland must invest $12M in a loan fund for residents of Black and Hispanic neighborhoods, plus advertising and community partnerships.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-secures-agreement-lakeland-bank-address-discriminatory-redlining",
  },
  {
    id: "city-national-2023",
    caseName: "United States v. City National Bank",
    defendant: "City National Bank (RBC subsidiary)",
    year: 2023,
    settlementAmount: 31_000_000,
    type: "DOJ",
    disparityMetric:
      "From 2017-2020, peer banks received 6x the number of mortgage applications in majority-Black and Latino LA neighborhoods compared to City National; bank opened just one branch in a majority-minority neighborhood in 20 years and assigned no mortgage loan officers there",
    racialGroupAffected: ["Black", "Hispanic/Latino"],
    legalTheory: ["redlining"],
    geography: "Los Angeles County, CA",
    description:
      "Largest DOJ redlining settlement in history at the time. City National avoided marketing and underwriting in majority-Black and Latino neighborhoods in Los Angeles.",
    sourceUrl:
      "https://www.justice.gov/usao-cdca/pr/justice-department-secures-over-31-million-city-national-bank-address-lending",
  },
  {
    id: "park-national-2023",
    caseName: "United States v. Park National Bank",
    defendant: "Park National Bank",
    year: 2023,
    settlementAmount: 9_000_000,
    type: "DOJ",
    disparityMetric:
      "From 2015-2021, the bank avoided providing mortgage lending services to majority-Black and Hispanic neighborhoods in the Columbus, OH metro area",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Columbus, OH",
    description:
      "Sixth settlement under the DOJ Combating Redlining Initiative. Park National failed to serve majority-minority neighborhoods despite having branches throughout the Columbus metro area.",
    sourceUrl:
      "https://justice.gov/opa/pr/justice-department-secures-9-million-park-national-bank-address-lending-discrimination",
  },
  {
    id: "washington-trust-2023",
    caseName: "United States v. Washington Trust Company",
    defendant: "Washington Trust Company",
    year: 2023,
    settlementAmount: 9_000_000,
    type: "DOJ",
    disparityMetric:
      "Peer banks received nearly 4x as many applications annually in majority-Black and Hispanic neighborhoods compared to Washington Trust over a 6-year period; disparities were statistically significant in every year examined",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Rhode Island",
    description:
      "Washington Trust redlined majority-Black and Hispanic neighborhoods in Rhode Island. Peer comparison showed the bank was a dramatic outlier in serving minority communities.",
    sourceUrl:
      "https://www.justice.gov/archives/usao-ri/blog/justice-department-secures-9-million-agreement-washington-trust-company-resolve",
  },
  {
    id: "ameris-bank-2023",
    caseName: "United States v. Ameris Bank",
    defendant: "Ameris Bank",
    year: 2023,
    settlementAmount: 9_000_000,
    type: "DOJ",
    disparityMetric:
      "Peer lenders generated applications in majority-Black and Hispanic neighborhoods at 3x the rate of Ameris; despite operating 18 branches in Jacksonville, Ameris never operated a branch in a majority-minority neighborhood",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Jacksonville, FL",
    description:
      "Ameris Bank redlined predominantly Black and Hispanic neighborhoods in Jacksonville despite extensive branch presence in the area. No branches in any majority-minority neighborhood.",
    sourceUrl:
      "https://www.justice.gov/usao-mdfl/combatting-redlining-initiative-ameris-bank",
  },
  {
    id: "patriot-bank-2024",
    caseName: "United States v. Patriot Bank",
    defendant: "Patriot Bank",
    year: 2024,
    settlementAmount: 1_900_000,
    type: "DOJ",
    disparityMetric:
      "From 2015-2020, peer banks received nearly 3.5x as many loan applications in majority-Black and Hispanic neighborhoods in Memphis as Patriot Bank",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Memphis, TN",
    description:
      "Patriot Bank avoided providing mortgage lending services to majority-Black and Hispanic neighborhoods in Memphis, the same geography addressed in the earlier Trustmark settlement.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-secures-agreement-patriot-bank-resolve-lending-discrimination-claims",
  },
  {
    id: "first-national-bank-pa-2024",
    caseName: "United States and State of NC v. First National Bank of PA",
    defendant: "First National Bank of Pennsylvania",
    year: 2024,
    settlementAmount: 13_500_000,
    type: "DOJ/State AG",
    disparityMetric:
      "Peer lenders generated applications in minority neighborhoods at 2.5x the rate of FNB in Charlotte and 4x the rate in Winston-Salem (2017-2021); bank closed branches in majority-minority neighborhoods",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Charlotte and Winston-Salem, NC",
    description:
      "Joint DOJ and North Carolina AG action. FNB closed branches in majority-minority neighborhoods and failed to serve Black and Latino potential borrowers. 13th Combating Redlining Initiative settlement.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-and-state-north-carolina-secure-135-million-agreement-first-national-bank",
  },
  {
    id: "oceanfirst-2024",
    caseName: "United States and HUD v. OceanFirst Bank",
    defendant: "OceanFirst Bank",
    year: 2024,
    settlementAmount: 15_000_000,
    type: "DOJ/HUD",
    disparityMetric:
      "From 2018-2022, OceanFirst disproportionately focused outreach on majority-White communities, operated branches only in majority-White neighborhoods, and closed its only locations in majority-minority areas of Middlesex, Monmouth, and Ocean counties",
    racialGroupAffected: ["Black", "Hispanic", "Asian"],
    legalTheory: ["redlining"],
    geography: "Middlesex, Monmouth, and Ocean Counties, NJ",
    description:
      "Joint DOJ/HUD action. OceanFirst failed to provide mortgage services to predominantly minority neighborhoods in central New Jersey, closing its only locations in those areas.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-and-department-housing-and-urban-development-secure-over-15m-oceanfirst",
  },
  {
    id: "fairway-mortgage-2024",
    caseName: "United States and CFPB v. Fairway Independent Mortgage Corp.",
    defendant: "Fairway Independent Mortgage Corp.",
    year: 2024,
    settlementAmount: 8_000_000,
    type: "DOJ/CFPB",
    disparityMetric:
      "Only 3.7% of Fairway's applications were for properties in majority-Black areas vs. 12.2% for peers; in neighborhoods 80%+ Black, Fairway granted loans at less than 1/8 the rate of competitors; less than 3% of direct mail advertising reached majority-Black areas",
    racialGroupAffected: ["Black"],
    legalTheory: ["redlining"],
    geography: "Birmingham, AL",
    description:
      "Fairway concentrated offices in majority-White areas, directed almost no marketing to Black neighborhoods, and internal emails mocked Black areas. Second non-depository lender redlining settlement.",
    sourceUrl:
      "https://www.consumerfinance.gov/about-us/newsroom/cfpb-and-justice-department-take-action-against-fairway-for-redlining-black-neighborhoods-in-birmingham-alabama/",
  },
  {
    id: "citadel-fcu-2024",
    caseName: "United States v. Citadel Federal Credit Union",
    defendant: "Citadel Federal Credit Union",
    year: 2024,
    settlementAmount: 6_500_000,
    type: "DOJ",
    disparityMetric:
      "Only 3% of Citadel's HMDA loans went to majority-Black/Hispanic areas vs. 10% for peers (2017-2021); peer lenders generated applications and originated loans in minority neighborhoods at 3x+ the rate of Citadel; no branches in Philadelphia despite 75% of majority-minority neighborhoods being located there",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Philadelphia, PA metro area",
    description:
      "First-ever DOJ redlining settlement with a credit union. Citadel had almost no branch presence in Philadelphia, where the vast majority of minority neighborhoods in its market area are located.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-secures-over-65m-citadel-federal-credit-union-address-redlining-black-and",
  },
  {
    id: "mortgage-firm-2025",
    caseName: "United States v. The Mortgage Firm, Inc.",
    defendant: "The Mortgage Firm, Inc.",
    year: 2025,
    settlementAmount: 1_750_000,
    type: "DOJ",
    disparityMetric:
      "From 2016-2021, The Mortgage Firm located offices in predominantly White neighborhoods and took inadequate steps to market to Black and Hispanic neighborhoods across Miami-Dade, Broward, and Palm Beach counties",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Miami-Fort Lauderdale-West Palm Beach, FL",
    description:
      "16th Combating Redlining Initiative settlement and third against a non-depository mortgage company. Over $153M total secured under the initiative at this point.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-secures-third-settlement-non-depository-mortgage-company-resolve",
  },
  {
    id: "colony-ridge-2026",
    caseName: "United States, Texas, and CFPB v. Colony Ridge Development",
    defendant: "Colony Ridge Development LLC",
    year: 2026,
    settlementAmount: 68_000_000,
    type: "DOJ/CFPB",
    disparityMetric:
      "Roughly 1-in-4 Colony Ridge loans ended in foreclosure; company targeted Hispanic borrowers with deceptive Spanish-language marketing and steered them into high-rate seller-financed mortgages on undeveloped, flood-prone land",
    racialGroupAffected: ["Hispanic/Latino"],
    legalTheory: ["predatory lending", "reverse redlining"],
    geography: "Liberty County, TX",
    description:
      "Joint DOJ, Texas, and CFPB action against a Texas land developer. Colony Ridge targeted Hispanic borrowers with bait-and-switch land sales and predatory financing, then repurchased properties after foreclosure to resell.",
    sourceUrl:
      "https://www.justice.gov/opa/pr/civil-rights-division-secures-68m-settlement-predatory-land-sales-and-lending-lawsuit",
  },

  // ============================================================
  //  CFPB-LED CASES
  // ============================================================
  {
    id: "citibank-2023",
    caseName: "CFPB v. Citibank, N.A.",
    defendant: "Citibank, N.A.",
    year: 2023,
    settlementAmount: 25_900_000,
    type: "CFPB",
    disparityMetric:
      "From 2015-2021, Citibank systematically denied or applied stricter criteria to credit card applicants with Armenian surnames (ending in '-ian'/'-yan') and applicants in or near Glendale, CA; employees instructed to hide discrimination by not discussing practices in writing or on recorded lines",
    racialGroupAffected: ["Armenian American"],
    legalTheory: ["national origin discrimination", "disparate treatment"],
    geography: "Nationwide (targeting Glendale, CA area)",
    description:
      "Citibank intentionally discriminated against Armenian American credit card applicants. Bank supervisors conspired to conceal the discrimination and employees provided false denial reasons.",
    sourceUrl:
      "https://www.consumerfinance.gov/enforcement/actions/citibank-n-a/",
  },
  {
    id: "townstone-2024",
    caseName: "CFPB v. Townstone Financial, Inc.",
    defendant: "Townstone Financial, Inc.",
    year: 2024,
    settlementAmount: 105_000,
    type: "CFPB",
    disparityMetric:
      "Townstone discouraged prospective Black applicants through derogatory statements on radio shows and podcasts, referring to Chicago's South Side as 'hoodlum weekend' and a grocery store in a Black neighborhood as 'Jungle Jewel'",
    racialGroupAffected: ["Black"],
    legalTheory: ["redlining", "disparate treatment"],
    geography: "Chicago, IL MSA",
    description:
      "First-ever redlining case against a nonbank mortgage lender/broker. Townstone used radio broadcasts and podcasts to discourage Black applicants. Court refused to vacate settlement despite joint request from CFPB and Townstone in 2025.",
    sourceUrl:
      "https://www.consumerfinance.gov/about-us/newsroom/cfpb-files-suit-against-mortgage-creditor-discriminatory-mortgage-lending-practices/",
  },
  {
    id: "draper-kramer-2025",
    caseName: "CFPB v. Draper & Kramer Mortgage Corp.",
    defendant: "Draper & Kramer Mortgage Corp.",
    year: 2025,
    settlementAmount: 1_500_000,
    type: "CFPB",
    disparityMetric:
      "Peers generated applications in majority-Black and Hispanic Chicago neighborhoods at 2.5x the rate of Draper & Kramer (2019-2021); all offices located in majority-White neighborhoods; no Spanish-language marketing until May 2021",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["redlining"],
    geography: "Chicago and Boston MSAs",
    description:
      "Draper & Kramer avoided marketing to majority-minority neighborhoods and concentrated all offices in majority-White areas. Company subsequently ceased mortgage lending operations in 2024.",
    sourceUrl:
      "https://www.chicagobusiness.com/residential-real-estate/draper-kramer-pay-15m-settle-cfpb-redlining-lawsuit",
  },

  // ============================================================
  //  PRIVATE ACTIONS AND NFHA CASES
  // ============================================================
  {
    id: "nfha-v-fannie-mae-2022",
    caseName: "NFHA et al. v. Fannie Mae",
    defendant: "Fannie Mae",
    year: 2022,
    settlementAmount: 53_000_000,
    type: "Private",
    disparityMetric:
      "Investigation of 2,300+ Fannie-owned foreclosed properties (2011-2015) with 49,000 photos showed homes in Black and Latino neighborhoods were 2-2.5x more likely to be poorly maintained than homes in White communities",
    racialGroupAffected: ["Black", "Hispanic/Latino"],
    legalTheory: ["REO maintenance discrimination"],
    geography: "39 metropolitan areas nationwide",
    description:
      "Largest REO maintenance discrimination settlement and first case establishing that fair housing laws cover maintenance and marketing of foreclosed homes. NFHA and 20 fair housing organizations documented systematic neglect.",
    sourceUrl:
      "https://nationalfairhousing.org/nfha-reaches-historic-settlement-with-fannie-mae/",
  },
  {
    id: "wells-fargo-philadelphia-2019",
    caseName: "City of Philadelphia v. Wells Fargo",
    defendant: "Wells Fargo",
    year: 2019,
    settlementAmount: 10_000_000,
    type: "Private",
    disparityMetric:
      "23.3% of loans to minority borrowers were high-cost/high-risk vs. 7.6% for White borrowers; Black borrowers 2.1x more likely to receive high-cost loans; Black borrowers with FICO > 660 were 2.5x more likely; loans in minority neighborhoods 4.7x more likely to result in foreclosure",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["pricing discrimination", "steering", "disparate impact"],
    geography: "Philadelphia, PA",
    description:
      "City of Philadelphia sued Wells Fargo for steering minorities into high-cost, higher-risk mortgage loans. Detailed statistical analysis showed discrimination persisted even after controlling for creditworthiness.",
    sourceUrl:
      "https://whyy.org/articles/wells-fargo-will-pay-philadelphia-10m-to-settle-citys-discriminatory-lending-lawsuit/",
  },
  {
    id: "miami-v-wells-fargo-boa-2017",
    caseName: "City of Miami v. Wells Fargo & Co.; City of Miami v. Bank of America Corp.",
    defendant: "Wells Fargo; Bank of America",
    year: 2017,
    settlementAmount: 0,
    type: "Private",
    disparityMetric:
      "Banks targeted predatory practices at Black and Latino neighborhoods, lending on worse terms than equally creditworthy non-minority borrowers, inducing defaults by failing to extend fair refinancing and loan modifications",
    racialGroupAffected: ["Black", "Hispanic/Latino"],
    legalTheory: ["reverse redlining", "disparate impact", "pricing discrimination"],
    geography: "Miami, FL",
    description:
      "Landmark Supreme Court case (2017) establishing that cities can sue banks under the Fair Housing Act for discriminatory lending that reduces tax revenue. Case remanded on proximate cause; not a final settlement but a critical precedent.",
    sourceUrl:
      "https://www.naacpldf.org/case-issue/bank-america-corp-v-city-miami-wells-fargo-co-v-city-miami/",
  },
  {
    id: "nfha-v-boa-2017",
    caseName: "NFHA v. Bank of America (South Carolina)",
    defendant: "Bank of America",
    year: 2017,
    settlementAmount: 336_380,
    type: "Private",
    disparityMetric:
      "Secret-shopper testing revealed Hispanic prospective mortgage borrowers received inferior loan options compared to non-Hispanic prospective borrowers at a Bank of America branch in Charleston, SC",
    racialGroupAffected: ["Hispanic"],
    legalTheory: ["disparate treatment"],
    geography: "Charleston, SC",
    description:
      "NFHA used matched-pair testing to document that Bank of America employees offered Hispanic testers worse mortgage terms than similarly situated non-Hispanic testers.",
    sourceUrl:
      "https://www.housingwire.com/articles/40174-bank-of-america-settles-lending-discrimination-claims-brought-by-national-fair-housing-alliance/",
  },

  // ============================================================
  //  OLDER DOJ CASES (pre-CRI, still significant)
  // ============================================================
  {
    id: "gfi-mortgage-2012",
    caseName: "United States v. GFI Mortgage Bankers, Inc.",
    defendant: "GFI Mortgage Bankers, Inc.",
    year: 2012,
    settlementAmount: 3_555_000,
    type: "DOJ",
    disparityMetric:
      "Approximately 600 Black and Hispanic borrowers charged more for loans based on race or national origin",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["pricing discrimination"],
    geography: "New York metro area",
    description:
      "GFI charged Black and Hispanic borrowers higher prices for mortgage loans than similarly situated non-Hispanic White borrowers through discretionary pricing policies.",
    sourceUrl:
      "https://www.justice.gov/archives/opa/pr/justice-department-reaches-lending-discrimination-settlement-gfi-mortgage-bankers-inc",
  },
  {
    id: "long-beach-mortgage-1996",
    caseName: "United States v. Long Beach Mortgage Co.",
    defendant: "Long Beach Mortgage Co.",
    year: 1996,
    settlementAmount: 3_000_000,
    type: "DOJ",
    disparityMetric:
      "Statistical analysis showed Black, Hispanic, female, and older borrowers systematically charged higher prices for mortgage loans than younger White male borrowers (1991-1994)",
    racialGroupAffected: ["Black", "Hispanic"],
    legalTheory: ["pricing discrimination", "disparate impact"],
    geography: "Southern California",
    description:
      "Early DOJ fair lending case. Long Beach Mortgage discriminated in home equity, home purchase, and refinancing loans. $3M fund established for approximately 1,200 identified victims.",
    sourceUrl:
      "https://www.justice.gov/archive/opa/pr/1996/Sept96/429cr.htm",
  },
];

// ============================================================
//  Helper functions
// ============================================================

/** Get all cases sorted by settlement amount (descending) */
export function getCasesByAmount(): EnforcementCase[] {
  return [...ENFORCEMENT_CASES].sort(
    (a, b) => b.settlementAmount - a.settlementAmount
  );
}

/** Get all cases of a given type */
export function getCasesByType(type: EnforcementType): EnforcementCase[] {
  return ENFORCEMENT_CASES.filter((c) => c.type === type || c.type.includes(type));
}

/** Get cases where a specific racial group was affected */
export function getCasesByRacialGroup(group: string): EnforcementCase[] {
  return ENFORCEMENT_CASES.filter((c) =>
    c.racialGroupAffected.some((g) =>
      g.toLowerCase().includes(group.toLowerCase())
    )
  );
}

/** Get cases by legal theory */
export function getCasesByLegalTheory(theory: LegalTheory): EnforcementCase[] {
  return ENFORCEMENT_CASES.filter((c) => c.legalTheory.includes(theory));
}

/** Get cases within a year range */
export function getCasesByYearRange(
  startYear: number,
  endYear: number
): EnforcementCase[] {
  return ENFORCEMENT_CASES.filter(
    (c) => c.year >= startYear && c.year <= endYear
  );
}

/** Total settlement dollars across all cases */
export function getTotalSettlementAmount(): number {
  return ENFORCEMENT_CASES.reduce((sum, c) => sum + c.settlementAmount, 0);
}

/** Summary statistics */
export function getEnforcementSummary() {
  const cases = ENFORCEMENT_CASES;
  const total = getTotalSettlementAmount();
  const redliningCases = getCasesByLegalTheory("redlining");
  const pricingCases = getCasesByLegalTheory("pricing discrimination");

  return {
    totalCases: cases.length,
    totalSettlementDollars: total,
    yearRange: {
      earliest: Math.min(...cases.map((c) => c.year)),
      latest: Math.max(...cases.map((c) => c.year)),
    },
    byType: {
      doj: cases.filter((c) => c.type.includes("DOJ")).length,
      cfpb: cases.filter((c) => c.type.includes("CFPB")).length,
      hud: cases.filter((c) => c.type.includes("HUD")).length,
      stateAG: cases.filter((c) => c.type.includes("State AG")).length,
      private: cases.filter((c) => c.type === "Private").length,
    },
    byTheory: {
      redlining: redliningCases.length,
      pricingDiscrimination: pricingCases.length,
      other: cases.length - redliningCases.length - pricingCases.length +
        cases.filter(
          (c) =>
            c.legalTheory.includes("redlining") &&
            c.legalTheory.includes("pricing discrimination")
        ).length,
    },
  };
}
