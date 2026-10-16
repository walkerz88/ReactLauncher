import { useEffect, useRef, useState, type FC, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';

import { matchesSearch } from '@/app/lib/searchMatch';

import './SearchSelect.css';

export interface SearchSelectOption {
  value: string;
  label: string;
}

export interface SearchSelectProps {
  options: SearchSelectOption[];
  /** Selected option values; a single-select keeps at most one. */
  selected: string[];
  /** Text of the closed control while nothing is selected. */
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  ariaLabel: string;
  /** Lets the user add a value that is not in `options`; receives the typed text for the button label. */
  createLabel?: (query: string) => string;
  multiple?: boolean;
  onChange: (selected: string[]) => void;
}

export const SearchSelect: FC<SearchSelectProps> = ({
  options,
  selected,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  ariaLabel,
  createLabel,
  multiple,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const visible = options.filter((option) => matchesSearch(option.label, query));
  const canCreate =
    createLabel != null &&
    trimmed !== '' &&
    !options.some((option) => option.label.toLowerCase() === trimmed.toLowerCase()) &&
    !selected.some((value) => value.toLowerCase() === trimmed.toLowerCase());

  const labelOf = (value: string) => options.find((option) => option.value === value)?.label ?? value;
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected.map(labelOf).join(', ')
        : `${labelOf(selected[0])} +${selected.length - 1}`;

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const toggle = (value: string) => {
    if (multiple) {
      onChange(selected.includes(value) ? selected.filter((entry) => entry !== value) : [...selected, value]);

      return;
    }

    onChange(selected.includes(value) ? [] : [value]);
    close();
  };

  const create = () => {
    onChange(multiple ? [...selected, trimmed] : [trimmed]);
    setQuery('');

    if (!multiple) {
      close();
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (canCreate) {
        create();
      } else if (visible.length === 1) {
        toggle(visible[0].value);
      }
    }
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    searchRef.current?.focus();
    document.addEventListener('mousedown', handlePointerDown);

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div className="search-select" ref={rootRef} data-id="SearchSelect">
      <button
        type="button"
        className={`search-select__control${selected.length > 0 ? ' search-select__control--active' : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className="search-select__summary">{summary}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open ? (
        <div className="search-select__panel">
          <div className="search-select__search">
            <Search size={14} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          <ul className="search-select__list">
            {canCreate ? (
              <li>
                <button type="button" className="search-select__option search-select__option--create" onClick={create}>
                  <Plus size={14} aria-hidden="true" />
                  {createLabel(trimmed)}
                </button>
              </li>
            ) : null}

            {visible.map((option) => {
              const isSelected = selected.includes(option.value);

              return (
                <li key={option.value}>
                  <button
                    type="button"
                    className={`search-select__option${isSelected ? ' search-select__option--selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => toggle(option.value)}
                  >
                    <span className={`search-select__check${multiple ? ' search-select__check--box' : ''}`}>{isSelected ? <Check size={12} /> : null}</span>
                    {option.label}
                  </button>
                </li>
              );
            })}

            {visible.length === 0 && !canCreate ? <li className="search-select__empty">{emptyLabel}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
