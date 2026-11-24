import { Navbar } from './components/layout/Navbar';
import { GeodlePage } from './pages/GeodlePage';

export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex-1">
        <GeodlePage />
      </div>
    </div>
  );
}
