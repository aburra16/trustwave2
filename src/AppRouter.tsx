import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Discover from "./pages/Discover";
import Browse from "./pages/Browse";
import Search from "./pages/Search";
import AddMusic from "./pages/AddMusic";
import MusicianDetail from "./pages/MusicianDetail";
import Curate from "./pages/Curate";
import Manage from "./pages/Manage";
import Settings from "./pages/Settings";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Discover />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/search" element={<Search />} />
        <Route path="/add-music" element={<AddMusic />} />
        <Route path="/musician/:artistSlug" element={<MusicianDetail />} />
        <Route path="/curate" element={<Curate />} />
        <Route path="/manage" element={<Manage />} />
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
