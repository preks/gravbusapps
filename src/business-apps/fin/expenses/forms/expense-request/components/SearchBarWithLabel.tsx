import React, { useState, useRef, useEffect } from 'react';
import { CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';

interface SearchBarWithLabelProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  label: string;
}

/**
 * SearchBar component with label that disappears when expanded
 */
const SearchBarWithLabel: React.FC<SearchBarWithLabelProps> = ({ onSearch, placeholder = 'Search...', label }) => {
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(inputValue);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [inputValue, onSearch]);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (expanded && !inputValue) {
          setExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expanded, inputValue]);

  const handleClick = () => {
    setExpanded(true);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onSearch('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="gba:searchBarWithLabelContainer" data-testid="search-bar-with-label-container">
      <div 
        className={`gba:searchBar ${expanded ? 'gba:expanded' : ''}`} 
        onClick={handleClick}
        ref={containerRef}
        data-testid="plan-search-bar"
      >
        <input 
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="gba:searchInput"
          data-testid="plan-search-input"
        />
        {inputValue && (
          <div 
            className="gba:clearIcon" 
            onClick={handleClear}
            data-testid="plan-search-clear"
          >
            <CloseCircleOutlined data-testid="plan-search-clear-icon" />
          </div>
        )}
        <div className="gba:searchIconContainer" data-testid="plan-search-icon-container">
          <SearchOutlined data-testid="plan-search-icon" />
        </div>
      </div>
      {!expanded && (
        <div className="gba:planCountText" data-testid="plan-count-text">
          {label}
        </div>
      )}
    </div>
  );
};

export default SearchBarWithLabel;
