import { useEffect, useLayoutEffect, useRef, useState, type FC, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
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
  /** Single-select only: the value can be emptied (by the clear button or by picking the selected option again). */
  clearable?: boolean;
  /** Shows the search field; `true` unless turned off for short lists. */
  searchable?: boolean;
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
  clearable,
  searchable = true,
  onChange,
}) => {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [alignEnd, setAlignEnd] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const visible = options.filter((option) => matchesSearch(option.label, query));
  const canCreate =
    createLabel != null &&
    trimmed !== '' &&
    !options.some((option) => option.label.toLowerCase() === trimmed.toLowerCase()) &&
    !selected.some((value) => value.toLowerCase() === trimmed.toLowerCase());

  const canClear = selected.length > 0 && (multiple || clearable);

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

    onChange(selected.includes(value) ? (clearable ? [] : selected) : [value]);
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

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const root = rootRef.current;

    if (!open || !panel || !root) {
      setAlignEnd(false);

      return;
    }

    const panelLeft = root.getBoundingClientRect().left;

    setAlignEnd(panelLeft + panel.offsetWidth > document.documentElement.clientWidth);
  }, [open, query, selected.length]);

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
        className={`search-select__control${canClear ? ' search-select__control--clearable' : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className="search-select__summary">{summary}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {canClear ? (
        <button
          type="button"
          className="search-select__clear"
          aria-label={t('gallery.filter.selectClear')}
          onClick={() => {
            onChange([]);
            close();
          }}
        >
          <X size={12} />
        </button>
      ) : null}

      {open ? (
        <div ref={panelRef} className={`search-select__panel${alignEnd ? ' search-select__panel--end' : ''}`}>
          {searchable ? (
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
          ) : null}

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
                    <span className={`search-select__check${multiple ? '' : ' search-select__check--radio'}`}>{isSelected ? multiple ? <Check size={12} /> : <span className="search-select__dot" /> : null}</span>
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
