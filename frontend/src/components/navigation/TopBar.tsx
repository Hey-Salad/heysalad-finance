interface TopBarProps {
  onMenuToggle?: () => void;
}

const TopBar = ({ onMenuToggle }: TopBarProps) => (
  <header className="flex items-center justify-between bg-white px-4 py-3">
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onMenuToggle}
        className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Toggle navigation"
      >
        ☰
      </button>
    </div>
    <div className="flex items-center gap-4 text-sm text-slate-500" />
  </header>
);

export default TopBar;
