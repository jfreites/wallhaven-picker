import { forwardRef } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange, onSubmit, placeholder = "Buscar wallpapers…" }, ref) => (
    <form
      className="searchbar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Search size={16} className="searchbar__icon" aria-hidden />
      <input
        ref={ref}
        className="searchbar__input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar wallpapers"
        aria-keyshortcuts="Meta+K"
        autoComplete="off"
        spellCheck={false}
      />
      <kbd className="searchbar__kbd" aria-hidden>⌘K</kbd>
    </form>
  ),
);
SearchBar.displayName = "SearchBar";
