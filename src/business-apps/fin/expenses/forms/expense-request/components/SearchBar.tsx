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
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', borderRadius: '40px', padding: '4px 8px', transition: 'width 0.3s, padding 0.3s, background-color 0.3s', cursor: 'pointer', width: expanded ? '300px' : '44px', border: '2px solid #EBEBEB', background: expanded ? '#F7F7F7' : '#EBEBEB', position: 'relative', overflow: 'hidden', height: '32px', justifyContent: expanded ? 'flex-start' : 'center' }}
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
        style={{ border: 'none', outline: 'none', width: expanded ? '100%' : '0', opacity: expanded ? '1' : '0', transition: 'opacity 0.3s, width 0.3s', backgroundColor: 'transparent', paddingLeft: '30px', color: '#333' }}
        data-testid="plan-search-input"
      />
      {inputValue && (
        <div 
          style={{ position: 'absolute', right: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: '1' }}
          onClick={handleClear}
          data-testid="plan-search-clear"
        >
          <CloseCircleOutlined />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', position: 'absolute', right: expanded ? 'auto' : '12px', left: expanded ? '10px' : 'auto', transition: 'right 0.3s, left 0.3s' }}>
        <SearchOutlined />
      </div>
    </div>
  );
};

export default SearchBar;
