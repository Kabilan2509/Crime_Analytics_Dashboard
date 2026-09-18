import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { QUICK_LOOKUP_INDEX } from '../../data/quickLookupIndex';

const FILLER_WORDS = new Set([
  "of", "the", "a", "an", "show", "me", "list", "all", "my", "find", "get", "view", "see"
]);

const popularSearches = [
  { title: 'Crime Statistics', path: '/statistics' },
  { title: 'Reports', path: '/reports' },
  { title: 'AI Copilot', path: '/copilot' },
  { title: 'Case Overview', path: '/cases' }
];

// Scoring function for fuzzy search matching and ranking
function getMatchScore(item, activeTokens, queryLower) {
  let score = 0;
  let hasExactMatch = false;
  let hasTitleMatch = false;
  let hasKeywordMatch = false;
  let hasDescriptionMatch = false;

  const titleLower = item.title.toLowerCase();
  const descLower = item.description.toLowerCase();
  const keywordsLower = item.keywords.map(k => k.toLowerCase());

  // 1. Exact Match Check (Highest Priority: 1000)
  if (titleLower === queryLower) {
    hasExactMatch = true;
    score += 1000;
  }
  for (const kw of keywordsLower) {
    if (kw === queryLower) {
      hasExactMatch = true;
      score += 1000;
      break;
    }
  }

  // 2. Title Match Check (High Priority: 500)
  // Check if query is in title, or any token (2+ chars) is a substring of the title (forward check only)
  if (titleLower.includes(queryLower)) {
    hasTitleMatch = true;
    score += 500;
  } else {
    for (const token of activeTokens) {
      if (token.length >= 2 && titleLower.includes(token)) {
        hasTitleMatch = true;
        score += 500;
        break;
      }
    }
  }

  // 3. Primary Keyword Match Check (Medium Priority: 200)
  // Check if any keyword matches the query, or token (2+ chars) is a substring of any keyword
  if (!hasExactMatch) {
    for (const kw of keywordsLower) {
      if (kw.includes(queryLower)) {
        hasKeywordMatch = true;
        score += 200;
        break;
      }
    }
    if (!hasKeywordMatch) {
      for (const token of activeTokens) {
        if (token.length >= 2) {
          for (const kw of keywordsLower) {
            if (kw.includes(token)) {
              hasKeywordMatch = true;
              score += 200;
              break;
            }
          }
          if (hasKeywordMatch) break;
        }
      }
    }
  }

  // 4. Description-only Match Check (Lowest Priority: 10)
  // The query or any token (2+ chars) is a substring of the description
  if (!hasExactMatch && !hasTitleMatch && !hasKeywordMatch) {
    if (descLower.includes(queryLower)) {
      hasDescriptionMatch = true;
      score += 10;
    } else {
      for (const token of activeTokens) {
        if (token.length >= 2 && descLower.includes(token)) {
          hasDescriptionMatch = true;
          score += 10;
          break;
        }
      }
    }
  }

  // Token overlap bonus (minor boost to break ties)
  let overlapCount = 0;
  for (const token of activeTokens) {
    if (token.length >= 2) {
      if (titleLower.includes(token) || keywordsLower.some(kw => kw.includes(token))) {
        overlapCount++;
      }
    }
  }
  score += overlapCount * 5;

  return {
    score,
    matchTypes: {
      exact: hasExactMatch,
      title: hasTitleMatch,
      keyword: hasKeywordMatch,
      description: hasDescriptionMatch
    }
  };
}

// Perform static search matching and ranking
const performStaticSearch = (query) => {
  const queryLower = query.toLowerCase().trim();
  if (queryLower.length < 2) {
    return [];
  }

  const allTokens = queryLower.split(/\s+/).filter(Boolean);
  const meaningfulTokens = allTokens.filter(t => !FILLER_WORDS.has(t));
  const activeTokens = meaningfulTokens.length > 0 ? meaningfulTokens : allTokens;

  if (activeTokens.length === 0) {
    return [];
  }

  const results = [];
  let hasStrongMatch = false;

  for (const item of QUICK_LOOKUP_INDEX) {
    const { score, matchTypes } = getMatchScore(item, activeTokens, queryLower);
    if (score > 0) {
      const isStrong = matchTypes.exact || matchTypes.title || matchTypes.keyword;
      if (isStrong) {
        hasStrongMatch = true;
      }
      results.push({ ...item, score, isStrong });
    }
  }

  // If there is any strong match, filter out description-only matches
  const filteredResults = hasStrongMatch 
    ? results.filter(r => r.isStrong) 
    : results;

  // Sort by score descending, then by title alphabetically
  filteredResults.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.title.localeCompare(b.title);
  });

  return filteredResults;
};

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Suggestions-fetching logic (allows easy extension for Phase 2 backend calls)
  const fetchSuggestions = async (searchQuery) => {
    const trimmed = searchQuery.trim().toLowerCase();
    
    if (trimmed.length < 2) {
      return [];
    }

    // 1. Static page search
    const staticMatches = performStaticSearch(trimmed);
    
    // 2. [Future Phase 2] Live record database search goes here
    
    return staticMatches;
  };

  // Fetch suggestions when query changes
  useEffect(() => {
    let active = true;
    fetchSuggestions(query).then(results => {
      if (active) {
        setSuggestions(results);
        
        // Highlight first item only if it passes the strong match threshold (score >= 200)
        if (results.length > 0 && results[0].score >= 200) {
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex(-1);
        }
      }
    });
    return () => { active = false; };
  }, [query]);

  // Sections order mapping
  const sectionsOrder = ['Operations', 'AI Intelligence', 'Investigation', 'Admin'];

  // Group suggestions by section
  const groupedSuggestions = useMemo(() => {
    const groups = {};
    for (const item of suggestions) {
      const sec = item.section || 'Operations';
      if (!groups[sec]) {
        groups[sec] = [];
      }
      groups[sec].push(item);
    }
    return groups;
  }, [suggestions]);

  // Flattened rendered suggestions matching the visual order on screen
  const renderedSuggestions = useMemo(() => {
    const flat = [];
    for (const sec of sectionsOrder) {
      if (groupedSuggestions[sec]) {
        flat.push(...groupedSuggestions[sec]);
      }
    }
    return flat;
  }, [groupedSuggestions]);

  // Keydown event handling for suggestions navigation
  const handleKeyDown = (e) => {
    // Only handle keyboard navigation if results are shown
    if (renderedSuggestions.length === 0) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        if (prev === -1) return 0;
        return prev < renderedSuggestions.length - 1 ? prev + 1 : prev;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        if (prev === -1) return renderedSuggestions.length - 1;
        return prev > 0 ? prev - 1 : prev;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < renderedSuggestions.length) {
        handleSelect(renderedSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item) => {
    navigate(item.path);
    onClose();
  };

  if (!isOpen) return null;

  // Track absolute index offset as we loop over sections
  let absoluteIndex = 0;

  const showEmptyState = query.trim().length < 2;

  // Render to document.body using a React Portal for a clean viewport overlay
  return createPortal(
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Container */}
        <div className="command-palette-search-container">
          <Search size={16} strokeWidth={1.5} className="command-palette-icon" style={{ color: 'var(--text-secondary)' }} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search features by name or keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="command-palette-badge">ESC</span>
        </div>

        {/* Search Results / Suggestions Body or Empty State */}
        <div className="command-palette-body">
          {showEmptyState ? (
            <div className="command-palette-empty-state">
              <div className="command-palette-prompt">
                <Search size={18} strokeWidth={1.5} className="command-palette-prompt-icon" style={{ color: 'var(--text-muted)' }} />
                <span>Start typing to search features...</span>
              </div>
              <div className="command-palette-popular-section">
                <div className="command-palette-popular-title">Suggested Searches</div>
                <div className="command-palette-chips-container">
                  {popularSearches.map((item) => (
                    <button
                      key={item.path}
                      className="command-palette-chip"
                      onClick={() => handleSelect(item)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : renderedSuggestions.length > 0 ? (
            sectionsOrder.map((section) => {
              const items = groupedSuggestions[section];
              if (!items || items.length === 0) return null;

              return (
                <div key={section} className="command-palette-section">
                  <div className="command-palette-section-header">{section}</div>
                  {items.map((item) => {
                    const currentIdx = absoluteIndex++;
                    const isHighlighted = currentIdx === highlightedIndex;

                    return (
                      <div
                        key={item.path}
                        className={`command-palette-item ${isHighlighted ? 'highlighted' : ''}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setHighlightedIndex(currentIdx)}
                      >
                        <div className="command-palette-item-title">{item.title}</div>
                        <div className="command-palette-item-description">{item.description}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="command-palette-no-results">
              No matching feature found for '{query}'
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
