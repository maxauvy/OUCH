// Cited by number in the report's method sections and key points, and
// listed with summaries in Settings. Kept in their original language, as a
// bibliography would be. Append only: footnote numbers refer to the position.
export interface Reference {
  citation: string
  /** PubMed identifier; absent for the HAS guideline, which is not indexed. */
  pmid?: string
}

export const REFERENCES: Reference[] = [
  {
    citation:
      'Dworkin RH, Turk DC, Farrar JT, et al. Core outcome measures for chronic pain clinical trials: IMMPACT recommendations. Pain. 2005;113(1-2):9-19.',
    pmid: '15621359',
  },
  {
    citation:
      'Farrar JT, Young JP Jr, LaMoreaux L, Werth JL, Poole MR. Clinical importance of changes in chronic pain intensity measured on an 11-point numerical pain rating scale. Pain. 2001;94(2):149-158.',
    pmid: '11690728',
  },
  {
    citation:
      'Haute Autorité de santé. Douleur chronique : reconnaître le syndrome douloureux chronique, l’évaluer et orienter le patient. Recommandations professionnelles, décembre 2008.',
  },
  {
    citation:
      'Dworkin RH, Turk DC, Wyrwich KW, et al. Interpreting the clinical importance of treatment outcomes in chronic pain clinical trials: IMMPACT recommendations. J Pain. 2008;9(2):105-121.',
    pmid: '18055266',
  },
  {
    citation:
      'Boonstra AM, Stewart RE, Köke AJA, et al. Cut-off points for mild, moderate, and severe pain on the numeric rating scale for pain in patients with chronic musculoskeletal pain. Front Psychol. 2016;7:1466.',
    pmid: '27746750',
  },
  {
    citation:
      'Broderick JE, Schwartz JE, Vikingstad G, et al. The accuracy of pain and fatigue items across different reporting periods. Pain. 2008;139(1):146-157.',
    pmid: '18455312',
  },
  {
    citation:
      'Dixon WG, Beukenhorst AL, Yimer BB, et al. How the weather affects the pain of citizen scientists using a smartphone app. NPJ Digit Med. 2019;2:105.',
    pmid: '31667359',
  },
  {
    citation:
      'Salaffi F, Stancati A, Silvestri CA, Ciapetti A, Grassi W. Minimal clinically important changes in chronic musculoskeletal pain intensity measured on a numerical rating scale. Eur J Pain. 2004;8(4):283-291.',
    pmid: '15207508',
  },
  {
    citation:
      'Ostelo RWJG, Deyo RA, Stratford P, et al. Interpreting change scores for pain and functional status in low back pain: towards international consensus regarding minimal important change. Spine. 2008;33(1):90-94.',
    pmid: '18165753',
  },
  {
    citation:
      'Hawker GA, Mian S, Kendzerska T, French M. Measures of adult pain. Arthritis Care Res. 2011;63(S11):S240-S252.',
    pmid: '22588748',
  },
  {
    citation:
      'Beukenhorst AL, Schultz DM, McBeth J, Sergeant JC, Dixon WG. Are weather conditions associated with chronic musculoskeletal pain? Review of results and methodologies. Pain. 2020;161(4):668-683.',
    pmid: '32195783',
  },
  {
    citation:
      'Smedslund G, Hagen KB. Does rain really cause pain? A systematic review of the associations between weather factors and severity of pain in people with rheumatoid arthritis. Eur J Pain. 2011;15(1):5-10.',
    pmid: '20570193',
  },
  {
    citation:
      'Steffens D, Maher CG, Li Q, et al. Effect of weather on back pain: results from a case-crossover study. Arthritis Care Res. 2014;66(12):1867-1872.',
    pmid: '25044376',
  },
  {
    citation:
      'Finan PH, Goodin BR, Smith MT. The association of sleep and pain: an update and a path forward. J Pain. 2013;14(12):1539-1552.',
    pmid: '24290442',
  },
  {
    citation:
      'Andrews NE, Strong J, Meredith PJ. Activity pacing, avoidance, endurance, and associations with patient functioning in chronic pain: a systematic review and meta-analysis. Arch Phys Med Rehabil. 2012;93(11):2109-2121.',
    pmid: '22728699',
  },
]
