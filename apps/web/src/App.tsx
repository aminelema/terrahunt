import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { TrueSizePage } from './pages/TrueSizePage';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<TrueSizePage />} />
            <Route path="/truesize" element={<TrueSizePage />} />
            <Route
              path="/georoute"
              element={
                <ComingSoonPage
                  title="GeoRoute — Connect Two Countries"
                  milestone="Milestone 2"
                  description="Connect a start country (e.g. Sweden) to a target country (e.g. Turkey) by naming bordering countries along the shortest path. The 640-edge neighbor graph is already seeded in PostgreSQL!"
                  modeType="georoute"
                />
              }
            />
            <Route
              path="/terrahunt"
              element={
                <ComingSoonPage
                  title="TerraHunt Classic — Hot/Cold + Compass"
                  milestone="Milestone 3"
                  description="Deduce the secret country using border-to-border km distances, spherical compass bearings, and interactive map heat tiers. All 38,809 country pairs are already seeded!"
                  modeType="terrahunt"
                />
              }
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
