import './Tabs.css';

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

export interface TabsProps<T extends string> {
  tabs: ReadonlyArray<TabItem<T>>;
  activeTab: T;
  ariaLabel: string;
  onChange: (tab: T) => void;
}

/** Underlined tab row (same look as the home page's). Generic over the tab ids, so it can't be typed as `FC<Props>`. */
export const Tabs = <T extends string>({ tabs, activeTab, ariaLabel, onChange }: TabsProps<T>) => {
  return (
    <nav className="tabs" aria-label={ariaLabel} data-id="Tabs">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={['tabs__item', id === activeTab ? 'active' : ''].filter(Boolean).join(' ')}
          aria-pressed={id === activeTab}
          onClick={() => onChange(id)}
          data-gamepad-focusable
        >
          {label}
        </button>
      ))}
    </nav>
  );
};
