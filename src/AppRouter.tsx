import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { PersistentMusicPlayer } from "./components/music/PersistentMusicPlayer";

import Index from "./pages/Index";
import Photos from "./pages/Photos";
import About from "./pages/About";
import AudioRooms from "./pages/AudioRooms";
import Events from "./pages/Events";
import WavlakePicks from "./pages/WavlakePicks";
import Blog from "./pages/Blog";
import WavlakeArtist from "./pages/WavlakeArtist";
import WavlakeAlbum from "./pages/WavlakeAlbum";
import WavlakeTrack from "./pages/WavlakeTrack";
import WavlakeExplore from "./pages/WavlakeExplore";
import WavlakeRadio from "./pages/WavlakeRadio";
import WeeklySongsLeaderboard from "./pages/WeeklySongsLeaderboard";
import PartyView from "./pages/PartyView";
import LeaderboardPartyView from "./pages/LeaderboardPartyView";
import { NotificationsPage } from "./pages/NotificationsPage";
import { EditProfile } from "./pages/EditProfile";
import { NIP19Page } from "./pages/NIP19Page";
import { ChatPage } from "./pages/ChatPage";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  // Get base path from environment, remove trailing slash if present
  const basename = import.meta.env.VITE_BASE_PATH?.replace(/\/$/, '') || "";
  
  return (
    <BrowserRouter 
      basename={basename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/about" element={<About />} />
        <Route path="/audio-rooms" element={<AudioRooms />} />
        <Route path="/events" element={<Events />} />
        <Route path="/wavlake-picks" element={<WavlakePicks />} />
        <Route path="/wavlake-pics" element={<WavlakePicks />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/explore-wavlake" element={<WavlakeExplore />} />
        <Route path="/explore-wavlake/radio" element={<WavlakeRadio />} />
        <Route path="/weekly-songs-leaderboard" element={<WeeklySongsLeaderboard />} />
        <Route path="/party-view" element={<PartyView />} />
        <Route path="/leaderboard-party" element={<LeaderboardPartyView />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/artist/:artistId" element={<WavlakeArtist />} />
        <Route path="/album/:albumId" element={<WavlakeAlbum />} />
        <Route path="/wavlake/:trackId" element={<WavlakeTrack />} />
        <Route path="/stream/chat" element={<ChatPage />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PersistentMusicPlayer />
    </BrowserRouter>
  );
}
export default AppRouter;