interface TopBarProps {
  onMenuToggle?: () => void;
}

const TopBar = ({ onMenuToggle }: TopBarProps) => (
  <header className="sticky top-0 z-20 flex items-center justify-between bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
    <button
      type="button"
      onClick={onMenuToggle}
      className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      aria-label="Toggle navigation"
    >
      ☰
    </button>
  </header>
);

export default TopBar;
