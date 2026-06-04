import React, { useState, useEffect } from 'react';
import { Search, Loader2, ChevronRight, ChevronDown, FileCode, CaseSensitive, Regex } from 'lucide-react';
import { searchFilesAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

const SearchPanel = ({ onSelectFile }) => {
  const [query, setQuery] = useState('');
  const [isCaseInsensitive, setIsCaseInsensitive] = useState(true);
  const [isRegex, setIsRegex] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState({});
  const [error, setError] = useState(null);

  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchFilesAPI(debouncedQuery, isCaseInsensitive, isRegex);
        if (data && data.success) {
          // Group matches by file
          const grouped = data.matches.reduce((acc, match) => {
            if (!acc[match.file]) acc[match.file] = [];
            acc[match.file].push(match);
            return acc;
          }, {});

          const groupedArray = Object.keys(grouped).map(file => ({
            file,
            matches: grouped[file]
          }));

          setResults(groupedArray);
          
          // Auto-expand all by default
          const expanded = {};
          groupedArray.forEach(g => expanded[g.file] = true);
          setExpandedFiles(expanded);
        } else {
          setError('Search failed to return results.');
        }
      } catch (err) {
        console.error("Search error", err);
        setError('An error occurred while searching.');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, isCaseInsensitive, isRegex]);

  const toggleExpand = (file) => {
    setExpandedFiles(prev => ({
      ...prev,
      [file]: !prev[file]
    }));
  };

  const handleSelectMatch = (file, line) => {
    onSelectFile({ path: file, line: line });
  };

  return (
    <div className="search-panel">
      <div className="search-header">
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="search-toggles">
            <button 
              className={`toggle-btn ${isCaseInsensitive ? 'active' : ''}`} 
              onClick={() => setIsCaseInsensitive(!isCaseInsensitive)}
              title="Match Case (Aa)"
            >
              <CaseSensitive size={14} />
            </button>
            <button 
              className={`toggle-btn ${isRegex ? 'active' : ''}`} 
              onClick={() => setIsRegex(!isRegex)}
              title="Use Regular Expression (.*)"
            >
              <Regex size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="search-results">
        {loading && (
          <div className="search-loading">
            <Loader2 size={20} className="spin" />
            <span>Searching...</span>
          </div>
        )}

        {error && !loading && (
          <div className="search-error">{error}</div>
        )}

        {!loading && !error && debouncedQuery && results.length === 0 && (
          <div className="search-empty">No results found.</div>
        )}

        {!loading && results.map((result) => (
          <div key={result.file} className="search-result-group">
            <div 
              className="search-result-file" 
              onClick={() => toggleExpand(result.file)}
            >
              {expandedFiles[result.file] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <FileCode size={14} className="file-icon" />
              <span className="file-name">{result.file.split('/').pop()}</span>
              <span className="file-path">{result.file}</span>
              <span className="match-badge">{result.matches.length}</span>
            </div>

            {expandedFiles[result.file] && (
              <div className="search-result-matches">
                {result.matches.map((match, idx) => (
                  <div 
                    key={idx} 
                    className="search-result-match"
                    onClick={() => handleSelectMatch(result.file, match.line)}
                  >
                    <span className="match-line-num">{match.line}</span>
                    <span className="match-content">{match.content.trim()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchPanel;
