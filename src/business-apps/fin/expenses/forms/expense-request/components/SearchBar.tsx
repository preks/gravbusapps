import React, { useState, useRef, useEffect } from 'react';
import { CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';

interface SearchBarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
}

/**
 * SearchBar component with expand/collapse animation
 */
const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = 'Search...' }) => {
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
          <CloseCircleOutlined />
        </div>
      )}
      <div className="gba:searchIconContainer">
        <SearchOutlined />
      </div>
    </div>
  );
};

export default SearchBar;
