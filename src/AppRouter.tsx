import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Discover from "./pages/Discover";
import Songs from "./pages/Songs";
import Musicians from "./pages/Musicians";
import MusicianDetail from "./pages/MusicianDetail";
import Search from "./pages/Search";
import Curate from "./pages/Curate";
import Settings from "./pages/Settings";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Discover />} />
        <Route path="/songs" element={<Songs />} />
        <Route path="/musicians" element={<Musicians />} />
        <Route path="/musician/:artistSlug" element={<MusicianDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/curate" element={<Curate />} />
        <Route path="/settings" element={<Settings />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
