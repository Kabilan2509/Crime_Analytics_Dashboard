/**
 * similarityEngine.js — Forensic Modus Operandi (MO) & Case Linkage Engine
 * 
 * Accurately correlates criminal cases based on:
 * 1. Verified named suspects (excluding "Unknown" / placeholders)
 * 2. Specific Crime Sub-Head matching (e.g. "Motor Vehicle Theft", "Burglary")
 * 3. Shared IPC / Act penal sections (e.g. IPC 379, 392, 420)
 * 4. Modus Operandi (MO) keywords in BriefFacts
 * 5. Spatial and temporal cluster proximity
 * 
 * Mathematical threshold prevents broad categories or generic "Unknown"
 * records from generating spurious links.
 */

// Placeholder strings that must NEVER be treated as real named entities
const GENERIC_ENTITIES = new Set([
  'unknown', 'not known', 'unidentified', 'na', 'n/a', 'none', 'pending',
  'unidentified person', 'unknown person', 'nil', 'unassigned', 'suspect',
  'victim', 'accused', 'complainant', 'police sub-inspector', 'psi',
  'head constable', 'hc', 'police constable', 'pc', 'investigating officer',
  'not specified', 'null', 'undefined', 'not available'
]);

// Crime MO keyword dictionary for text similarity
const MO_KEYWORDS = [
  // Vehicle Theft MO
  'motorcycle', 'bike', 'two-wheeler', 'scooter', 'car', 'auto', 'vehicle', 'parking', 'helmet', 'handle lock',
  // Burglary / Breaking MO
  'night', 'window', 'grill', 'lock', 'latch', 'break-in', 'almirah', 'safe', 'temple', 'shop', 'godown', 'cutter',
  // Robbery / Snatching MO
  'chain', 'gold', 'pendant', 'necklace', 'snatch', 'pillion', 'knife', 'dagger', 'threat', 'pistol', 'isolated', 'speeding',
  // Cyber / Online MO
  'otp', 'apk', 'telegram', 'whatsapp', 'investment', 'part-time', 'crypto', 'credit card', 'debit card', 'link', 'phishing', 'fake job', 'qr code',
  // Economic / Cheating MO
  'cheating', 'fake documents', 'property', 'land', 'loan', 'chit fund', 'stamp paper', 'agreement', 'impersonation',
  // Violent Crimes
  'extortion', 'ransom', 'bar', 'highway', 'gang', 'country-made', 'assault', 'fatal'
];

/**
 * Checks if an entity name is specific and verified (not a placeholder).
 */
export function isSpecificEntity(name) {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim().toLowerCase();
  if (clean.length < 3) return false;
  return !GENERIC_ENTITIES.has(clean);
}

/**
 * Extracts normalized section codes from a case object.
 */
export function extractSections(caseObj) {
  const sections = new Set();
  if (!caseObj) return sections;

  if (Array.isArray(caseObj.actSections)) {
    caseObj.actSections.forEach(item => {
      const code = item?.section?.SectionCode || item?.SectionCode || item?.SectionID;
      if (code && String(code).trim() !== '' && String(code).toLowerCase() !== 'unknown') {
        sections.add(String(code).trim().toUpperCase());
      }
    });
  }

  // Also check string fields
  const str = caseObj.ActSection || caseObj.Sections || caseObj.sections;
  if (typeof str === 'string') {
    const matches = str.match(/\b\d+[A-Z]?\b/g);
    if (matches) {
      matches.forEach(m => sections.add(m.trim().toUpperCase()));
    }
  }

  return sections;
}

/**
 * Extracts characteristic MO keywords found in case facts or descriptions.
 */
export function extractMOKeywords(text) {
  const found = new Set();
  if (!text || typeof text !== 'string') return found;
  const lower = text.toLowerCase();

  MO_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      found.add(kw);
    }
  });

  return found;
}

/**
 * Calculates a multi-factor forensic similarity score between two cases (0 - 100).
 * Threshold for a valid pattern link is 60 points.
 */
export function calculateCaseSimilarity(caseA, caseB) {
  if (!caseA || !caseB) {
    return { score: 0, isSimilar: false, reasons: [], primaryReason: '', linkType: 'None', strength: 0 };
  }

  const idA = String(caseA.ROWID || caseA.CaseMasterID || '');
  const idB = String(caseB.ROWID || caseB.CaseMasterID || '');
  if (idA && idB && idA === idB) {
    return { score: 0, isSimilar: false, reasons: [], primaryReason: '', linkType: 'None', strength: 0 };
  }

  let score = 0;
  const reasons = [];
  let linkType = 'Modus Operandi';

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNAL 1: Shared Named Suspect (Highest Confidence: 60 pts)
  // ─────────────────────────────────────────────────────────────────────────
  const accusedA = (caseA.accused || []).map(a => a.AccusedName || a.Name || '').filter(isSpecificEntity);
  const accusedB = (caseB.accused || []).map(b => b.AccusedName || b.Name || '').filter(isSpecificEntity);

  const sharedSuspects = [];
  accusedA.forEach(nameA => {
    const normA = nameA.trim().toLowerCase();
    accusedB.forEach(nameB => {
      const normB = nameB.trim().toLowerCase();
      if (normA === normB || (normA.length > 5 && (normA.includes(normB) || normB.includes(normA)))) {
        sharedSuspects.push(nameA);
      }
    });
  });

  if (sharedSuspects.length > 0) {
    score += 60;
    linkType = 'Suspect';
    reasons.push(`Shared accused: ${[...new Set(sharedSuspects)].join(', ')}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY GATE: If cases belong to completely different major crime categories
  // (e.g. Crimes Against Body vs Crimes Against Property or Crimes Against SC/ST)
  // and do NOT share a verified named accused, they can NEVER be linked as similar
  // pattern / MO cases.
  // ─────────────────────────────────────────────────────────────────────────
  const majorA = String(caseA.majorHeadName || '').trim().toLowerCase();
  const majorB = String(caseB.majorHeadName || '').trim().toLowerCase();
  if (
    sharedSuspects.length === 0 &&
    majorA && majorB &&
    majorA !== 'unknown' && majorB !== 'unknown' &&
    majorA !== 'general crime' && majorB !== 'general crime' &&
    majorA !== majorB
  ) {
    return { score: 0, isSimilar: false, reasons: [], primaryReason: '', linkType: 'None', strength: 0 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNAL 2: Specific Crime Sub-Head Matching (High Confidence: 35 pts)
  // E.g. Both are "Motor Vehicle Theft", "Burglary", "Chain Snatching"
  // ─────────────────────────────────────────────────────────────────────────
  const minorA = String(caseA.minorHeadName || '').trim();
  const minorB = String(caseB.minorHeadName || '').trim();
  const isSpecificSubHead = (name) => name && name.toLowerCase() !== 'unknown' && name.toLowerCase() !== 'others';

  let hasExactSubHeadMatch = false;
  if (isSpecificSubHead(minorA) && isSpecificSubHead(minorB) && minorA.toLowerCase() === minorB.toLowerCase()) {
    score += 35;
    hasExactSubHeadMatch = true;
    reasons.push(`Identical offence: ${minorA}`);
  } else {
    // If only broad major category matches, give only 5 points (insufficient alone)
    const majorA = String(caseA.majorHeadName || '').trim().toLowerCase();
    const majorB = String(caseB.majorHeadName || '').trim().toLowerCase();
    if (majorA && majorA !== 'unknown' && majorA === majorB) {
      score += 5;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNAL 3: Shared Penal Legal Section (Weight: 25 pts)
  // E.g. Both charged under IPC 379, 392, 420, 302, etc.
  // ─────────────────────────────────────────────────────────────────────────
  const sectionsA = extractSections(caseA);
  const sectionsB = extractSections(caseB);
  const matchedSections = [];
  sectionsA.forEach(sec => {
    if (sectionsB.has(sec)) matchedSections.push(sec);
  });

  if (matchedSections.length > 0) {
    score += 25;
    reasons.push(`Shared section: IPC ${matchedSections.join(', ')}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNAL 4: BriefFacts / MO Keywords Overlap (Weight: 20 pts)
  // ─────────────────────────────────────────────────────────────────────────
  const factsA = caseA.BriefFacts || caseA.briefFacts || '';
  const factsB = caseB.BriefFacts || caseB.briefFacts || '';
  const kwA = extractMOKeywords(factsA);
  const kwB = extractMOKeywords(factsB);

  const matchedKeywords = [];
  kwA.forEach(kw => {
    if (kwB.has(kw)) matchedKeywords.push(kw);
  });

  if (matchedKeywords.length >= 2) {
    score += 20;
    reasons.push(`Shared MO markers: ${matchedKeywords.slice(0, 3).join(', ')}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNAL 5: Spatial Proximity (Weight: 8 - 15 pts)
  // ─────────────────────────────────────────────────────────────────────────
  const stA = caseA.policeStationName || caseA.unit?.UnitName || caseA.unit?.PoliceStationName || '';
  const stB = caseB.policeStationName || caseB.unit?.UnitName || caseB.unit?.PoliceStationName || '';
  const distA = caseA.districtName || caseA.district?.DistrictName || '';
  const distB = caseB.districtName || caseB.district?.DistrictName || '';

  if (stA && stB && stA.toLowerCase() !== 'unknown' && stA.toLowerCase() === stB.toLowerCase()) {
    score += 15;
  } else if (distA && distB && distA.toLowerCase() !== 'unknown' && distA.toLowerCase() === distB.toLowerCase()) {
    score += 8;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNAL 6: Temporal Proximity (Weight: 5 - 15 pts)
  // ─────────────────────────────────────────────────────────────────────────
  const dateA = new Date(caseA.registeredDateObj || caseA.RegisteredDate);
  const dateB = new Date(caseB.registeredDateObj || caseB.RegisteredDate);

  if (!Number.isNaN(dateA.valueOf()) && !Number.isNaN(dateB.valueOf())) {
    const diffDays = Math.abs(dateA - dateB) / 86400000;
    if (diffDays <= 7) {
      score += 15;
    } else if (diffDays <= 30) {
      score += 10;
    } else if (diffDays <= 60) {
      score += 5;
    }
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // ─────────────────────────────────────────────────────────────────────────
  // STRICT RELEVANCE GATE:
  // Must score >= 60 to be considered a genuine similar case link!
  // This guarantees that:
  // - Generic matching on station + major category alone (score ~35) is REJECTED.
  // - A link requires either a verified shared suspect OR identical sub-head +
  //   (shared sections OR shared MO keywords) + geographic/temporal proximity.
  // ─────────────────────────────────────────────────────────────────────────
  const isSimilar = score >= 60;

  let primaryReason = 'General Pattern';
  if (reasons.length > 0) {
    primaryReason = reasons[0];
  } else if (hasExactSubHeadMatch) {
    primaryReason = `MO Match: ${minorA}`;
  }

  const strength = Math.min(1, Math.max(0.2, score / 100));

  return {
    score,
    isSimilar,
    reasons,
    primaryReason,
    linkType,
    strength
  };
}

/**
 * Finds top similar cases to targetCase from a candidate list.
 */
export function findSimilarCases(targetCase, candidateCases, options = {}) {
  const { maxResults = 4, minScore = 60 } = options;
  if (!targetCase || !candidateCases) return [];

  const results = [];
  const targetId = String(targetCase.ROWID || targetCase.CaseMasterID || '');

  candidateCases.forEach(cand => {
    const candId = String(cand.ROWID || cand.CaseMasterID || '');
    if (candId === targetId) return;

    const sim = calculateCaseSimilarity(targetCase, cand);
    if (sim.score >= minScore) {
      results.push({
        caseObj: cand,
        caseId: cand.CaseMasterID || cand.ROWID,
        crimeNo: cand.displayCrimeNo || cand.CrimeNo || `FIR-${cand.CaseMasterID}`,
        score: sim.score,
        reasons: sim.reasons,
        reason: sim.primaryReason,
        type: sim.linkType,
        strength: sim.strength
      });
    }
  });

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
