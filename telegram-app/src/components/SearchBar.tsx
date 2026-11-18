import { useEffect, useState } from "react";

interface Props {
  value: string;
  placeholder: string;
  onSearch: (q: string) => void;
  onFilter?: () => void; // shows the ⚙︎ button when given
  filterActive?: boolean;
  light?: boolean; // white field on a coloured header
}

/** Search field that waits until typing pauses, plus an optional filter button. */
export default function SearchBar({ value, placeholder, onSearch, onFilter, filterActive, light }: Props) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]); // e.g. cleared from outside

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === value) return;
    const timer = setTimeout(() => onSearch(trimmed), 350);
    return () => clearTimeout(timer);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="searchrow">
      <label className={`search ${light ? "search-light" : ""}`}>
        <span aria-hidden>🔍</span>
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        {text && (
          <button type="button" className="search-clear" aria-label="Clear" onClick={() => setText("")}>
            ✕
          </button>
        )}
      </label>
      {onFilter && (
        <button className={`filter-btn ${filterActive ? "on" : ""} ${light ? "search-light" : ""}`} aria-label="Filter" onClick={onFilter}>
          ⚙︎
        </button>
      )}
    </div>
  );
}
