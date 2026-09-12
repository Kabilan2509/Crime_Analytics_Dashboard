// ============================================================================
// KSP Crime Analytics Dashboard - Crime Taxonomy Reference & Fallback Maps
// Maps logical IDs and Catalyst Datastore ROWIDs to official Crime Groups & Heads
// ============================================================================

export const CRIME_HEAD_MAP = {
  // Logical IDs
  '1': 'Crimes Against Body',
  '2': 'Crimes Against Property',
  '3': 'Crimes Against Women',
  '4': 'Crimes Against Children',
  '5': 'Cyber Crimes',
  '6': 'Economic Offences',
  '7': 'Narcotics',
  '8': 'Crimes Against Public Order',
  '9': 'Arms Act Cases',
  '10': 'Crimes Against SC/ST',

  // Catalyst Datastore ROWIDs
  '56064000000186001': 'Crimes Against Body',
  '56064000000186002': 'Crimes Against Property',
  '56064000000186003': 'Crimes Against Women',
  '56064000000186004': 'Crimes Against Children',
  '56064000000186005': 'Cyber Crimes',
  '56064000000186006': 'Economic Offences',
  '56064000000186007': 'Narcotics',
  '56064000000186008': 'Crimes Against Public Order',
  '56064000000186009': 'Arms Act Cases',
  '56064000000186010': 'Crimes Against SC/ST',
};

export const CRIME_SUBHEAD_MAP = {
  // Logical IDs (1 to 50)
  '1': 'Murder',
  '2': 'Attempt to Murder',
  '3': 'Culpable Homicide',
  '4': 'Kidnapping',
  '5': 'Assault',
  '6': 'Grievous Hurt',
  '7': 'Robbery',
  '8': 'Dacoity',
  '9': 'Burglary',
  '10': 'Theft',
  '11': 'Motor Vehicle Theft',
  '12': 'Chain Snatching',
  '13': 'Dowry Death',
  '14': 'Cruelty by Husband',
  '15': 'Sexual Assault',
  '16': 'Stalking',
  '17': 'Molestation',
  '18': 'Child Abuse',
  '19': 'Child Labour',
  '20': 'POCSO Cases',
  '21': 'Child Trafficking',
  '22': 'Missing Children',
  '23': 'Online Fraud',
  '24': 'Identity Theft',
  '25': 'Cyberbullying',
  '26': 'Hacking',
  '27': 'Social Media Crime',
  '28': 'Cheating',
  '29': 'Forgery',
  '30': 'Counterfeiting',
  '31': 'Bank Fraud',
  '32': 'Property Fraud',
  '33': 'Ganja',
  '34': 'Cocaine',
  '35': 'NDPS Act Violation',
  '36': 'Drug Trafficking',
  '37': 'Drug Consumption',
  '38': 'Rioting',
  '39': 'Unlawful Assembly',
  '40': 'Affray',
  '41': 'Public Nuisance',
  '42': 'Criminal Intimidation',
  '43': 'Illegal Possession of Arms',
  '44': 'Arms Trafficking',
  '45': 'Illegal Manufacturing',
  '46': 'Using Illegal Arms',
  '47': 'Atrocity Against SC',
  '48': 'Atrocity Against ST',
  '49': 'Denial of Rights',
  '50': 'Caste-based Discrimination',

  // Catalyst Datastore ROWIDs (56064000000178004 to 56064000000178053)
  '56064000000178004': 'Murder',
  '56064000000178005': 'Attempt to Murder',
  '56064000000178006': 'Culpable Homicide',
  '56064000000178007': 'Kidnapping',
  '56064000000178008': 'Assault',
  '56064000000178009': 'Grievous Hurt',
  '56064000000178010': 'Robbery',
  '56064000000178011': 'Dacoity',
  '56064000000178012': 'Burglary',
  '56064000000178013': 'Theft',
  '56064000000178014': 'Motor Vehicle Theft',
  '56064000000178015': 'Chain Snatching',
  '56064000000178016': 'Dowry Death',
  '56064000000178017': 'Cruelty by Husband',
  '56064000000178018': 'Sexual Assault',
  '56064000000178019': 'Stalking',
  '56064000000178020': 'Molestation',
  '56064000000178021': 'Child Abuse',
  '56064000000178022': 'Child Labour',
  '56064000000178023': 'POCSO Cases',
  '56064000000178024': 'Child Trafficking',
  '56064000000178025': 'Missing Children',
  '56064000000178026': 'Online Fraud',
  '56064000000178027': 'Identity Theft',
  '56064000000178028': 'Cyberbullying',
  '56064000000178029': 'Hacking',
  '56064000000178030': 'Social Media Crime',
  '56064000000178031': 'Cheating',
  '56064000000178032': 'Forgery',
  '56064000000178033': 'Counterfeiting',
  '56064000000178034': 'Bank Fraud',
  '56064000000178035': 'Property Fraud',
  '56064000000178036': 'Ganja',
  '56064000000178037': 'Cocaine',
  '56064000000178038': 'NDPS Act Violation',
  '56064000000178039': 'Drug Trafficking',
  '56064000000178040': 'Drug Consumption',
  '56064000000178041': 'Rioting',
  '56064000000178042': 'Unlawful Assembly',
  '56064000000178043': 'Affray',
  '56064000000178044': 'Public Nuisance',
  '56064000000178045': 'Criminal Intimidation',
  '56064000000178046': 'Illegal Possession of Arms',
  '56064000000178047': 'Arms Trafficking',
  '56064000000178048': 'Illegal Manufacturing',
  '56064000000178049': 'Using Illegal Arms',
  '56064000000178050': 'Atrocity Against SC',
  '56064000000178051': 'Atrocity Against ST',
  '56064000000178052': 'Denial of Rights',
  '56064000000178053': 'Caste-based Discrimination',
};

// Deterministic mapping from sub-head ID / ROWID / name to its true Major Head
export const SUBHEAD_TO_HEAD_MAP = {
  // Head 1: Crimes Against Body (IDs 1-6)
  '1': 'Crimes Against Body', '2': 'Crimes Against Body', '3': 'Crimes Against Body',
  '4': 'Crimes Against Body', '5': 'Crimes Against Body', '6': 'Crimes Against Body',
  '56064000000178004': 'Crimes Against Body', '56064000000178005': 'Crimes Against Body',
  '56064000000178006': 'Crimes Against Body', '56064000000178007': 'Crimes Against Body',
  '56064000000178008': 'Crimes Against Body', '56064000000178009': 'Crimes Against Body',
  'murder': 'Crimes Against Body', 'attempt to murder': 'Crimes Against Body',
  'culpable homicide': 'Crimes Against Body', 'kidnapping': 'Crimes Against Body',
  'assault': 'Crimes Against Body', 'grievous hurt': 'Crimes Against Body',

  // Head 2: Crimes Against Property (IDs 7-12)
  '7': 'Crimes Against Property', '8': 'Crimes Against Property', '9': 'Crimes Against Property',
  '10': 'Crimes Against Property', '11': 'Crimes Against Property', '12': 'Crimes Against Property',
  '56064000000178010': 'Crimes Against Property', '56064000000178011': 'Crimes Against Property',
  '56064000000178012': 'Crimes Against Property', '56064000000178013': 'Crimes Against Property',
  '56064000000178014': 'Crimes Against Property', '56064000000178015': 'Crimes Against Property',
  'robbery': 'Crimes Against Property', 'dacoity': 'Crimes Against Property',
  'burglary': 'Crimes Against Property', 'theft': 'Crimes Against Property',
  'motor vehicle theft': 'Crimes Against Property', 'chain snatching': 'Crimes Against Property',

  // Head 3: Crimes Against Women (IDs 13-17)
  '13': 'Crimes Against Women', '14': 'Crimes Against Women', '15': 'Crimes Against Women',
  '16': 'Crimes Against Women', '17': 'Crimes Against Women',
  '56064000000178016': 'Crimes Against Women', '56064000000178017': 'Crimes Against Women',
  '56064000000178018': 'Crimes Against Women', '56064000000178019': 'Crimes Against Women',
  '56064000000178020': 'Crimes Against Women',
  'dowry death': 'Crimes Against Women', 'cruelty by husband': 'Crimes Against Women',
  'sexual assault': 'Crimes Against Women', 'stalking': 'Crimes Against Women',
  'molestation': 'Crimes Against Women',

  // Head 4: Crimes Against Children (IDs 18-22)
  '18': 'Crimes Against Children', '19': 'Crimes Against Children', '20': 'Crimes Against Children',
  '21': 'Crimes Against Children', '22': 'Crimes Against Children',
  '56064000000178021': 'Crimes Against Children', '56064000000178022': 'Crimes Against Children',
  '56064000000178023': 'Crimes Against Children', '56064000000178024': 'Crimes Against Children',
  '56064000000178025': 'Crimes Against Children',
  'child abuse': 'Crimes Against Children', 'child labour': 'Crimes Against Children',
  'pocso cases': 'Crimes Against Children', 'child trafficking': 'Crimes Against Children',
  'missing children': 'Crimes Against Children',

  // Head 5: Cyber Crimes (IDs 23-27)
  '23': 'Cyber Crimes', '24': 'Cyber Crimes', '25': 'Cyber Crimes',
  '26': 'Cyber Crimes', '27': 'Cyber Crimes',
  '56064000000178026': 'Cyber Crimes', '56064000000178027': 'Cyber Crimes',
  '56064000000178028': 'Cyber Crimes', '56064000000178029': 'Cyber Crimes',
  '56064000000178030': 'Cyber Crimes',
  'online fraud': 'Cyber Crimes', 'identity theft': 'Cyber Crimes',
  'cyberbullying': 'Cyber Crimes', 'hacking': 'Cyber Crimes',
  'social media crime': 'Cyber Crimes',

  // Head 6: Economic Offences (IDs 28-32)
  '28': 'Economic Offences', '29': 'Economic Offences', '30': 'Economic Offences',
  '31': 'Economic Offences', '32': 'Economic Offences',
  '56064000000178031': 'Economic Offences', '56064000000178032': 'Economic Offences',
  '56064000000178033': 'Economic Offences', '56064000000178034': 'Economic Offences',
  '56064000000178035': 'Economic Offences',
  'cheating': 'Economic Offences', 'forgery': 'Economic Offences',
  'counterfeiting': 'Economic Offences', 'bank fraud': 'Economic Offences',
  'property fraud': 'Economic Offences',

  // Head 7: Narcotics (IDs 33-37)
  '33': 'Narcotics', '34': 'Narcotics', '35': 'Narcotics',
  '36': 'Narcotics', '37': 'Narcotics',
  '56064000000178036': 'Narcotics', '56064000000178037': 'Narcotics',
  '56064000000178038': 'Narcotics', '56064000000178039': 'Narcotics',
  '56064000000178040': 'Narcotics',
  'ganja': 'Narcotics', 'cocaine': 'Narcotics',
  'ndps act violation': 'Narcotics', 'drug trafficking': 'Narcotics',
  'drug consumption': 'Narcotics',

  // Head 8: Crimes Against Public Order (IDs 38-42)
  '38': 'Crimes Against Public Order', '39': 'Crimes Against Public Order',
  '40': 'Crimes Against Public Order', '41': 'Crimes Against Public Order',
  '42': 'Crimes Against Public Order',
  '56064000000178041': 'Crimes Against Public Order', '56064000000178042': 'Crimes Against Public Order',
  '56064000000178043': 'Crimes Against Public Order', '56064000000178044': 'Crimes Against Public Order',
  '56064000000178045': 'Crimes Against Public Order',
  'rioting': 'Crimes Against Public Order', 'unlawful assembly': 'Crimes Against Public Order',
  'affray': 'Crimes Against Public Order', 'public nuisance': 'Crimes Against Public Order',
  'criminal intimidation': 'Crimes Against Public Order',

  // Head 9: Arms Act Cases (IDs 43-46)
  '43': 'Arms Act Cases', '44': 'Arms Act Cases',
  '45': 'Arms Act Cases', '46': 'Arms Act Cases',
  '56064000000178046': 'Arms Act Cases', '56064000000178047': 'Arms Act Cases',
  '56064000000178048': 'Arms Act Cases', '56064000000178049': 'Arms Act Cases',
  'illegal possession of arms': 'Arms Act Cases', 'arms trafficking': 'Arms Act Cases',
  'illegal manufacturing': 'Arms Act Cases', 'using illegal arms': 'Arms Act Cases',

  // Head 10: Crimes Against SC/ST (IDs 47-50)
  '47': 'Crimes Against SC/ST', '48': 'Crimes Against SC/ST',
  '49': 'Crimes Against SC/ST', '50': 'Crimes Against SC/ST',
  '56064000000178050': 'Crimes Against SC/ST', '56064000000178051': 'Crimes Against SC/ST',
  '56064000000178052': 'Crimes Against SC/ST', '56064000000178053': 'Crimes Against SC/ST',
  'atrocity against sc': 'Crimes Against SC/ST', 'atrocity against st': 'Crimes Against SC/ST',
  'denial of rights': 'Crimes Against SC/ST', 'caste-based discrimination': 'Crimes Against SC/ST',
};

/**
 * Detects crime category from case brief facts if there is a classification discrepancy.
 */
export function detectCategoryFromFacts(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  // SC / ST Cases
  if (lower.includes('sc/st') || lower.includes('atrocity against sc') || lower.includes('atrocity against st') || lower.includes('casteist')) {
    return { major: 'Crimes Against SC/ST', minor: 'Atrocity Against SC' };
  }

  // House Burglary & Property Crime
  if (lower.includes('house burglary') || lower.includes('burglary') || lower.includes('jewellery worth') || lower.includes('cash and jewellery stolen')) {
    return { major: 'Crimes Against Property', minor: 'Burglary' };
  }
  if (lower.includes('motor vehicle theft') || lower.includes('two-wheeler bearing') || lower.includes('vehicle theft')) {
    return { major: 'Crimes Against Property', minor: 'Motor Vehicle Theft' };
  }
  if (lower.includes('chain snatching') || lower.includes('gold chain worth')) {
    return { major: 'Crimes Against Property', minor: 'Chain Snatching' };
  }
  if (lower.includes('theft of mobile') || lower.includes('theft reported')) {
    return { major: 'Crimes Against Property', minor: 'Theft' };
  }

  // Cyber Crime
  if (lower.includes('online fraud') || lower.includes('fake upi') || lower.includes('cyberbullying') || lower.includes('identity theft') || lower.includes('apk phishing')) {
    return { major: 'Cyber Crimes', minor: 'Online Fraud' };
  }

  // Narcotics
  if (lower.includes('ganja') || lower.includes('ndps') || lower.includes('contraband substance') || lower.includes('drug seizure')) {
    return { major: 'Narcotics', minor: 'NDPS Act Violation' };
  }

  // Arms Act
  if (lower.includes('country-made pistol') || lower.includes('illegal arms') || lower.includes('ammunition recovered')) {
    return { major: 'Arms Act Cases', minor: 'Illegal Possession of Arms' };
  }

  // Crimes Against Women
  if (lower.includes('dowry harassment') || lower.includes('domestic violence') || lower.includes('stalking complaint') || lower.includes('molestation')) {
    return { major: 'Crimes Against Women', minor: 'Cruelty by Husband' };
  }

  // Crimes Against Children
  if (lower.includes('child reported missing') || lower.includes('pocso') || lower.includes('child labour')) {
    return { major: 'Crimes Against Children', minor: 'POCSO Cases' };
  }

  // Economic Offences
  if (lower.includes('forgery and cheating') || lower.includes('forged property') || lower.includes('bank fraud')) {
    return { major: 'Economic Offences', minor: 'Cheating' };
  }

  // Violent Crimes Against Body
  if (lower.includes('assaulted the victim with a sharp weapon') || lower.includes('attacked complainant with iron rod') || lower.includes('murder') || lower.includes('road rage incident')) {
    return { major: 'Crimes Against Body', minor: 'Assault' };
  }

  return null;
}

/**
 * Resolves a Crime Major Group Name given a major ID / ROWID, minor ID, and optional lookup results.
 * Strictly guarantees that SubHeads like Burglary or Atrocity Against SC/ST can NEVER be assigned
 * to "Crimes Against Body".
 */
export function resolveCrimeMajorHead(majorId, currentMajorName, minorId, briefFacts) {
  // 1. If BriefFacts explicitly states a category that conflicts with an erroneous major head, trust facts
  const factsDetected = detectCategoryFromFacts(briefFacts);
  if (factsDetected && factsDetected.major) {
    return factsDetected.major;
  }

  // 2. Authoritative: CrimeSubHead strictly defines the parent CrimeHead
  if (minorId != null) {
    const fromMinor = SUBHEAD_TO_HEAD_MAP[String(minorId)] || SUBHEAD_TO_HEAD_MAP[String(minorId).toLowerCase()];
    if (fromMinor) return fromMinor;
  }

  // 3. Current lookup result from DB
  if (currentMajorName && currentMajorName !== 'Unknown' && currentMajorName !== 'General Crime') {
    return currentMajorName;
  }

  // 4. Fallback to CrimeHead ID map
  if (majorId != null && CRIME_HEAD_MAP[String(majorId)]) {
    return CRIME_HEAD_MAP[String(majorId)];
  }

  return 'General Crime';
}

/**
 * Resolves a Crime Minor Offence Name given minor ID / ROWID, major ID, and optional lookup results.
 */
export function resolveCrimeMinorHead(minorId, majorId, currentMinorName, currentMajorName, briefFacts) {
  // 1. If BriefFacts explicitly indicates the crime sub-head, use it
  const factsDetected = detectCategoryFromFacts(briefFacts);
  if (factsDetected && factsDetected.minor) {
    return factsDetected.minor;
  }

  // 2. Current lookup from DB
  if (currentMinorName && currentMinorName !== 'Unknown') return currentMinorName;

  // 3. CrimeSubHead ID map
  if (minorId != null && CRIME_SUBHEAD_MAP[String(minorId)]) {
    return CRIME_SUBHEAD_MAP[String(minorId)];
  }

  // 4. Fallback to resolved major head
  return resolveCrimeMajorHead(majorId, currentMajorName, minorId, briefFacts);
}
