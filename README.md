# PeachyHODL - Peachy's Personal Nostr Website

A decentralized personal website and social platform built entirely on Nostr protocols, showcasing Bitcoin music, live streaming, blog content, and community features.

![Peachy's Nostr Website](https://img.shields.io/badge/Nostr-Powered-purple?style=for-the-badge) ![Bitcoin](https://img.shields.io/badge/Bitcoin-Native-orange?style=for-the-badge) ![Lightning](https://img.shields.io/badge/Lightning-Enabled-yellow?style=for-the-badge)

## 🎵 Features

### **Core Nostr Integration**
- **Complete Profile System** - NIP-05 identity verification and profile management
- **Social Features** - Follow/unfollow with NIP-02, post comments with NIP-22
- **Custom Emoji Support** - NIP-30 custom emoji rendering in posts, profiles, and reactions
- **Lightning Zaps** - Support Peachy with instant Bitcoin payments via NIP-57
- **Client Attribution** - Automatic client tags on all published events for proper attribution
- **Decentralized Storage** - All content lives on Nostr relays, no central servers

### **Music & Entertainment**
- **🎧 Wavlake Music Integration** - Stream Bitcoin music with NIP-51 playlists and full track/artist/album browsing
- **🎵 Advanced Music Player** - Full-featured music player with playlist support, next/previous controls, and persistent state
- **📻 Live Audio Rooms** - Real-time voice chat using NIP-100 WebRTC with moderation tools and participant management
- **🎥 Live Streaming** - NIP-53 live events with integrated chat and streaming controls
- **🎶 Party View** - Full-screen music experience with artist info and Lightning QR codes for zapping
- **⚡ Lightning Zaps** - Direct LNURL integration with Wavlake for seamless Bitcoin payments to artists
- **🏆 Weekly Song Leaderboard** - Community-driven voting system for top tracks using kind 30003 events
- **🎉 Top 3 Countdown Party View** - Full-screen countdown experience with the most voted tracks (3rd → 2nd → 1st place)
- **🎤 Single-Vote System** - One vote per user for authentic community-driven music rankings using NIP-51 replaceable events
- **💡 Track Suggestions** - Users can suggest tracks to Peachy with messaging system

### **Content & Media**
- **📝 Long-form Blog** - NIP-23 articles with rich content, images, and featured post highlighting
- **📸 Photo Galleries** - NIP-68 picture feeds with responsive grid layout and lightbox viewing
- **📅 Event Calendar** - Upcoming and past live events via NIP-53 with status tracking
- **💬 Advanced Comments System** - Threaded discussions on all content using NIP-22
- **❤️ Interactive Reactions** - NIP-25 reactions on live chat messages with tap-to-like and long-press emoji selector (shows only top reaction)
- **⚡ Chat Zapping** - Lightning zap individual chat messages with instant total display and 21 sats preset option
- **🛡️ Chat Moderation** - Peachy can moderate live chat by reacting with ❌ to hide inappropriate messages instantly
- **🚀 Real-time Updates** - Instant chat message, reaction, and zap updates using Nostr req() subscriptions
- **🖼️ Image Previews** - Click-to-view image rendering for .png/.jpg/.gif/.webp links in chat messages
- **🔍 Smart Mentions** - @ mention search/sort functionality with real-time participant filtering
- **💙 Mention Highlighting** - Messages that @ mention the current user are highlighted with distinctive blue styling
- **😀 Custom Emoji** - NIP-30 custom emoji support with :shortcode: rendering in all text content
- **🔗 NIP-19 Routing** - Direct access to any Nostr content via npub, note, nevent, naddr URLs
- **📱 Unified Chat** - Global livestream chat system with real-time messaging and reactions

### **Admin Features** 
- **Content Management** - Special admin controls when Peachy is signed in
- **Music List Management** - Create, manage, and update Wavlake music playlists with NIP-51
- **Chat Moderation** - One-click message moderation using ❌ reactions to hide inappropriate content in LiveChat
- **Audio Room Moderation** - Voice chat moderation with kick/ban functionality and moderator permissions
- **Track Suggestion Notifications** - Dedicated notification system for track suggestions from users
- **Profile Management** - Complete profile editing with NIP-05 verification support
- **Real-time Updates** - Live content updates across all sections with optimistic caching

## 🏗️ Technology Stack

### **Frontend Framework**
- **React 18.x** - Latest React with concurrent rendering and hooks
- **TypeScript** - Full type safety throughout the application
- **Vite** - Lightning-fast build tool and development server
- **TailwindCSS 3.x** - Utility-first CSS framework for responsive design

### **UI Components**
- **shadcn/ui** - 40+ beautiful, accessible components built on Radix UI
- **Lucide Icons** - Comprehensive icon library for modern interfaces
- **Custom Components** - Specialized music players, photo galleries, and more

### **Nostr Integration**
- **Nostrify** - Modern Nostr framework for web applications
- **NIP Standards** - Implements 20+ NIPs for comprehensive functionality
- **TanStack Query** - Powerful data fetching and caching for Nostr events
- **Multi-Relay Support** - Query multiple relays with automatic failover

### **Audio & Media**
- **HTML5 Audio** - Native browser audio with full playback controls and waveform visualization
- **WebRTC** - Peer-to-peer voice chat for audio rooms with NRTC implementation patterns
- **Image Optimization** - Responsive images with lazy loading and progressive enhancement
- **Click-to-View Images** - Automatic image preview rendering in chat messages with lazy loading
- **File Upload** - Blossom server integration for media storage with NIP-96 support
- **Lightning Integration** - LNURL payment processing for direct artist support via Wavlake API

## 📋 Supported NIPs

| NIP | Feature | Implementation | Where Used |
|-----|---------|----------------|------------|
| [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) | Basic Protocol | ✅ Core events, signatures, and relay communication | **Hooks**: `useNostr`, `useNostrPublish`, `useAuthor` **Pages**: All pages **Core**: Foundation for all Nostr functionality |
| [NIP-02](https://github.com/nostr-protocol/nips/blob/master/02.md) | Follow Lists | ✅ Follow/unfollow functionality | **Component**: `FollowButton` **Hook**: `useFollows` **Pages**: About, Index, LiveStreamToolbar |
| [NIP-04](https://github.com/nostr-protocol/nips/blob/master/04.md) | Encrypted DMs | ✅ Content encryption for WebRTC signaling | **Component**: `AudioRoom` **Hook**: `useNIP100` **Lib**: WebRTC signaling encryption |
| [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) | NIP-05 Verification | ✅ Internet identifier verification | **Component**: `EditProfileForm` **Pages**: About, profile display **Feature**: Identity verification |
| [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md) | Browser Extension | ✅ Web browser wallet integration | **Component**: `LoginArea` **Hook**: `useCurrentUser` **Core**: All signing operations via browser extension |
| [NIP-08](https://github.com/nostr-protocol/nips/blob/master/08.md) | Mentions | ✅ User mention detection via p tags | **Lib**: `mentions.ts` **Feature**: Mention highlighting supports both NIP-08 p-tags and NIP-27 text mentions |
| [NIP-10](https://github.com/nostr-protocol/nips/blob/master/10.md) | Text Events and Threads | ✅ Reply references for comments and threading | **Component**: `NoteContent` **Hook**: `usePostComment` **Feature**: Comment threading structure |
| [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) | Private DMs | ✅ Secure track suggestions via gift wrap | **Components**: `SuggestTrackModal`, `SuggestTrackModalControlled` **Hook**: `useTrackSuggestionNotifications` **Lib**: `nip17-proper.ts` |
| [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md) | bech32 Entities | ✅ Root-level routing for npub, note, nevent, naddr | **Page**: `NIP19Page` **Router**: `AppRouter.tsx` **Components**: `NoteContent`, URL handling throughout app |
| [NIP-21](https://github.com/nostr-protocol/nips/blob/master/21.md) | URI Scheme | ✅ nostr: URI parsing and handling | **Component**: `NoteContent` **Feature**: URL parsing and link handling |
| [NIP-27](https://github.com/nostr-protocol/nips/blob/master/27.md) | Text Note References | ✅ Mention notifications and user tagging with highlighting | **Lib**: `mentions.ts` **Components**: `LiveStreamToolbar`, `LiveChat`, `UnifiedLivestreamChat` **Feature**: User mentions with blue highlight styling |
| [NIP-30](https://github.com/nostr-protocol/nips/blob/master/30.md) | Custom Emoji | ✅ Custom emoji rendering in all text content | **Lib**: `customEmoji.ts` **Components**: `ProfileText`, `ReactionContent`, `NoteContent` **Feature**: :shortcode: custom emoji in posts, profiles, and reactions |
| [NIP-22](https://github.com/nostr-protocol/nips/blob/master/22.md) | Comments | ✅ Threaded comment system | **Component**: `CommentsSection` **Hooks**: `useComments`, `usePostComment` **Feature**: Comments on all content types |
| [NIP-23](https://github.com/nostr-protocol/nips/blob/master/23.md) | Long-form Content | ✅ Blog articles and rich content | **Page**: `Blog` **Hook**: `useBlogPosts` **Kind**: 30023 for articles |
| [NIP-25](https://github.com/nostr-protocol/nips/blob/master/25.md) | Reactions | ✅ Like and emoji reactions on chat messages | **Component**: `ReactionButton` **Hook**: `useReactions` **Pages**: LiveChat, UnifiedLivestreamChat **Feature**: Interactive message reactions with tap-to-like and long-press emoji selector |
| [NIP-31](https://github.com/nostr-protocol/nips/blob/master/31.md) | Unknown Events | ✅ Alt tag descriptions for custom events | **Hook**: `useNotificationReadStatus` **Feature**: Human-readable event descriptions |
| [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) | Lists | ✅ Music playlists and curation sets | **Components**: `ManagePicksDialog`, `AddToPlaylistButton` **Hook**: `useMusicLists` **Pages**: WeeklySongsLeaderboard, WavlakePicks |
| [NIP-53](https://github.com/nostr-protocol/nips/blob/master/53.md) | Live Activities | ✅ Live streams and events | **Pages**: Events, live streaming **Hooks**: `useLiveEvents`, `useLiveStream`, `useLiveChat` **Components**: Live chat systems |
| [NIP-57](https://github.com/nostr-protocol/nips/blob/master/57.md) | Lightning Zaps | ✅ Bitcoin micropayments | **Component**: `ZapButton` **Hooks**: `useZaps`, `useZapNotifications` **Pages**: PartyView, music pages **Feature**: Lightning payments |
| [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) | Versioned Encryption | ✅ Modern encryption for private messages | **Components**: Track suggestion modals **Lib**: `nip17-proper.ts` **Feature**: Secure private messaging |
| [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) | Remote Signing | ✅ Bunker URI support for remote signers | **Hook**: `useCurrentUser`, `useLoginActions` **Component**: `LoginArea` **Feature**: Remote wallet connections |
| [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) | Gift Wrapping | ✅ Privacy-preserving message sealing | **Lib**: `nip17-proper.ts`, `nip17.ts` **Feature**: Encrypted message wrapping for NIP-17 |
| [NIP-68](https://github.com/nostr-protocol/nips/blob/master/68.md) | Picture Feeds | ✅ Photo galleries with imeta tags | **Page**: `Photos` **Hook**: `usePictures` **Kind**: 20 for picture events **Component**: `PictureGrid` |
| [NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md) | App Data | ✅ Notification read status persistence | **Hook**: `useNotificationReadStatus` **Page**: NotificationsPage **Feature**: Read status tracking |
| [NIP-89](https://github.com/nostr-protocol/nips/blob/master/89.md) | Client Tags | ✅ Automatic client attribution on published events | **Hook**: `useNostrPublish` **Feature**: Automatic client tagging on all published events |
| [NIP-94](https://github.com/nostr-protocol/nips/blob/master/94.md) | File Metadata | ✅ Media file handling | **Hook**: `useUploadFile` **Components**: File upload components **Feature**: Media metadata |
| [NIP-96](https://github.com/nostr-protocol/nips/blob/master/96.md) | File Storage | ✅ Blossom server uploads | **Hook**: `useUploadFile` **Components**: `EditProfileForm`, `IconSelector`, `SignupDialog` **Feature**: File storage |
| [NIP-98](https://github.com/nostr-protocol/nips/blob/master/98.md) | HTTP Auth | ✅ Authentication for file storage servers | **Hook**: `useUploadFile` **Feature**: Secure file uploads to Blossom servers |
| [NIP-100](https://github.com/chakany/nips/blob/webrtc/100.md) | WebRTC Audio | ✅ Real-time voice chat with moderation | **Component**: `AudioRoom` **Hook**: `useNIP100` **Page**: AudioRooms **Kind**: 25050 for signaling |

## 🎯 Event Kinds Reference

This table shows all Nostr event kinds used throughout the application with their specific implementations:

| Kind | Type | NIP | Description | Primary Usage | Implementation |
|------|------|-----|-------------|---------------|----------------|
| **0** | Replaceable | [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) | User metadata/profile | Profile information with NIP-30 custom emoji support | **Hook**: `useAuthor` **Components**: `EditProfileForm`, `SignupDialog`, `ProfileText` **Feature**: User profiles with custom emoji in names/bios |
| **1** | Regular | [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) | Short text notes | Social posts, messages with NIP-30 custom emoji | **Component**: `LiveStreamToolbar`, `NoteContent` **Hook**: `useNostrPublish` **Feature**: Social posting with custom emoji |
| **3** | Replaceable | [NIP-02](https://github.com/nostr-protocol/nips/blob/master/02.md) | Contact/follow lists | Follow relationships | **Hook**: `useFollows` **Component**: `FollowButton` **Feature**: Social connections |
| **4** | Regular | [NIP-04](https://github.com/nostr-protocol/nips/blob/master/04.md) | Encrypted DMs (legacy) | Fallback encrypted messaging | **Lib**: `nip17.ts` **Feature**: Legacy encrypted messaging |
| **5** | Regular | [NIP-09](https://github.com/nostr-protocol/nips/blob/master/09.md) | Event deletion | Remove reactions and content | **Hook**: `useReactions` **Feature**: Reaction removal via deletion events |
| **7** | Regular | [NIP-25](https://github.com/nostr-protocol/nips/blob/master/25.md) | Reactions | Like and emoji reactions with NIP-30 custom emoji | **Hook**: `useReactions` **Component**: `ReactionButton`, `ReactionContent` **Feature**: Interactive message reactions with custom emoji support |
| **13** | Regular | [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) | Seal (encrypted) | Gift wrap message sealing | **Lib**: `nip17-proper.ts` **Feature**: Message privacy layer |
| **14** | Regular | [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) | Chat message (rumor) | Private message content | **Lib**: `nip17-proper.ts` **Feature**: Private message payload |
| **20** | Regular | [NIP-68](https://github.com/nostr-protocol/nips/blob/master/68.md) | Picture events | Photo galleries | **Hook**: `usePictures` **Page**: Photos **Component**: `PictureGrid` |
| **1059** | Regular | [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) | Gift wrap | Private message envelope | **Lib**: `nip17-proper.ts` **Hook**: `useTrackSuggestionNotifications` **Feature**: Encrypted message delivery |
| **1111** | Regular | [NIP-22](https://github.com/nostr-protocol/nips/blob/master/22.md) | Comments | Threaded discussions | **Hook**: `useComments`, `usePostComment` **Component**: `CommentsSection` **Feature**: Comment system |
| **1311** | Regular | [NIP-53](https://github.com/nostr-protocol/nips/blob/master/53.md) | Live chat messages | Livestream chat with NIP-30 custom emoji | **Hook**: `useLiveChat` **Components**: `LiveChat`, `UnifiedLivestreamChat`, `NoteContent` **Feature**: Live chat with custom emoji and mention highlighting |
| **9735** | Regular | [NIP-57](https://github.com/nostr-protocol/nips/blob/master/57.md) | Zap receipts | Lightning payment confirmations | **Hook**: `useZaps`, `useZapNotifications` **Component**: `ZapButton` **Feature**: Payment tracking |
| **25050** | Regular | [NIP-100](https://github.com/chakany/nips/blob/webrtc/100.md) | WebRTC signaling | Voice chat coordination | **Hook**: `useNIP100` **Component**: `AudioRoom` **Feature**: Real-time voice communication |
| **30003** | Addressable | [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) | Bookmark sets | Community voting system for tracks | **Hook**: `usePeachyLinktree` **Pages**: WeeklySongsLeaderboard, WavlakeTrack, WavlakeExplore **Feature**: Single-vote track rankings with d-tag "peachy-song-vote" |
| **30004** | Addressable | [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) | Curation sets | Music playlists and collections | **Hook**: `useMusicLists` **Component**: `ManagePicksDialog` **Feature**: Music curation |
| **30005** | Addressable | [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) | Interest sets | Topic-based collections | **Hook**: `useMusicLists` **Feature**: Content categorization (potential) |
| **30023** | Addressable | [NIP-23](https://github.com/nostr-protocol/nips/blob/master/23.md) | Long-form articles | Blog posts and articles | **Hook**: `useBlogPosts` **Page**: Blog **Feature**: Long-form content publishing |
| **30024** | Addressable | [NIP-23](https://github.com/nostr-protocol/nips/blob/master/23.md) | Draft articles | Unpublished blog content | **Hook**: `useBlogPosts` **Feature**: Draft content management |
| **30078** | Addressable | [NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md) | App-specific data | Notification read status | **Hook**: `useNotificationReadStatus` **Page**: NotificationsPage **Feature**: App state persistence |
| **30311** | Addressable | [NIP-53](https://github.com/nostr-protocol/nips/blob/master/53.md) | Live events | Livestream definitions | **Hook**: `useLiveEvents`, `useLiveStream` **Pages**: Events, Index **Feature**: Live streaming events |
| **32123** | Addressable | [Custom Kind](./NIP.md#nip-32123-music-track-events-wavlake-compatibility) | Wavlake music compatibility | NOM specification with JSON metadata in content | **Hook**: `useMusicLists` **Pages**: WavlakeTrack, WavlakeAlbum, WavlakeArtist **Feature**: Full Bitcoin music platform integration |

### Event Kind Categories

- **Regular Events** (1000 ≤ kind < 10000): Stored permanently by relays
- **Replaceable Events** (10000 ≤ kind < 20000): Only latest per pubkey+kind is kept  
- **Addressable Events** (30000 ≤ kind < 40000): Latest per pubkey+kind+d-tag combination
- **Legacy Kinds** (<1000): Special cases with individual storage rules

## 📁 File Storage - Blossom Integration

PeachyHODL leverages [Blossom](https://github.com/hzrd149/blossom) servers for decentralized file storage, implementing the NIP-96 standard for HTTP File Storage Integration.

### Features

| Feature | Description | Implementation | NIP Reference |
|---------|-------------|----------------|---------------|
| **Secure Upload** | NIP-98 HTTP Auth for authenticated uploads | ✅ Authentication headers with signed Nostr events | [NIP-98](https://github.com/nostr-protocol/nips/blob/master/98.md) |
| **File Metadata** | NIP-94 compatible tags for media information | ✅ SHA-256 hashes, MIME types, dimensions, alt text | [NIP-94](https://github.com/nostr-protocol/nips/blob/master/94.md) |
| **Multi-server Support** | Upload to multiple Blossom servers for redundancy | ✅ Configurable server endpoints | [NIP-96](https://github.com/nostr-protocol/nips/blob/master/96.md) |
| **Image Processing** | Automatic resizing and format optimization | ✅ Server-side transformations with original hash preservation | [NIP-96](https://github.com/nostr-protocol/nips/blob/master/96.md) |

### Usage in Components

- **Profile Pictures**: `EditProfileForm`, `SignupDialog` - Avatar and banner uploads
- **Link Icons**: `IconSelector` - Custom icons for LinkTree entries  
- **Media Content**: Future support for photo galleries and rich media

### Security & Privacy

- **Authenticated Uploads**: All uploads require NIP-98 signed authentication
- **Hash Verification**: SHA-256 hashes ensure file integrity
- **Decentralized Storage**: No single point of failure with multiple server support
- **User Ownership**: Files are cryptographically linked to user's public key

### Technical Implementation

The `useUploadFile` hook handles the complete Blossom upload flow:
1. **Authentication**: Creates NIP-98 signed authorization header
2. **Upload**: POST to Blossom server with multipart form data
3. **Metadata**: Returns NIP-94 compatible tags with URLs and hashes
4. **Integration**: Tags can be directly used in Nostr events

### Custom Features

| Feature | Description | Implementation | Technical Details |
|---------|-------------|----------------|-------------------|
| **Custom Kind 32123** | Wavlake music compatibility using NOM specification | ✅ Full integration with Bitcoin music platform | **Format**: JSON metadata in content field following NOM spec **Data**: title, creator, duration, enclosure URL, GUID **Integration**: Direct streaming from Wavlake with album art and waveform data |
| **Single-Vote System** | Community-driven track rankings with one vote per user | ✅ Replaceable events ensure fair voting | **Mechanism**: Kind 30003 addressable events with d-tag "peachy-song-vote" **Voting**: Each user's vote replaces previous vote, preventing spam **Leaderboard**: Real-time aggregation of votes across all users for weekly rankings |

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+** - Latest LTS version recommended
- **npm or yarn** - Package manager
- **Git** - Version control

### Installation

```bash
# Clone the repository
git clone https://github.com/patrickulrich/peachyhodl.git
cd peachyhodl

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Build for Production

```bash
# Create optimized build
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## 🎨 Customization

### Configuration
- **Relay Settings** - Configure default Nostr relays in `src/contexts/AppContext.ts`
- **Theme System** - Customize colors and styling in `tailwind.config.ts`
- **User Settings** - Modify user preferences and app behavior

### Adding Features
- **New NIPs** - Extend Nostr functionality by implementing additional NIPs
- **Components** - Add custom UI components in `src/components/`
- **Pages** - Create new pages in `src/pages/` and update routing (20+ pages currently implemented)
- **Hooks** - Build custom React hooks for Nostr data in `src/hooks/` (25+ specialized hooks available)
- **WebRTC Integration** - Implement NIP-100 compatible voice chat following chakany's specification

## 🔧 Development

### Project Structure

```
src/
├── components/                    # Reusable UI components (50+ components)
│   ├── ui/                       # shadcn/ui base components (40+ components)
│   │   ├── button.tsx           # Button with variants and sizes
│   │   ├── card.tsx             # Container components
│   │   ├── dialog.tsx           # Modal overlays
│   │   ├── form.tsx             # Form validation components
│   │   ├── input.tsx            # Text input fields
│   │   ├── skeleton.tsx         # Loading placeholders
│   │   └── ...                  # 35+ more shadcn/ui components
│   ├── music/                    # Music-specific components
│   │   ├── MusicPlayer.tsx      # Main audio player with voting
│   │   ├── TrackList.tsx        # Track display components  
│   │   ├── ManagePicksDialog.tsx # Playlist management
│   │   ├── AddToPlaylistButton.tsx
│   │   ├── SuggestTrackModal.tsx # NIP-17 track suggestions
│   │   └── SuggestTrackModalControlled.tsx
│   ├── auth/                     # Authentication components
│   │   ├── LoginArea.tsx        # Main auth interface
│   │   ├── LoginDialog.tsx      # Login modal
│   │   ├── SignupDialog.tsx     # Account creation
│   │   └── FollowButton.tsx     # Social following
│   ├── audio/                    # WebRTC voice chat (NIP-100)
│   │   ├── AudioRoom.tsx        # Voice chat implementation
│   │   └── AudioRoomBrowser.tsx # Room discovery
│   ├── comments/                 # Comment system (NIP-22)
│   │   └── CommentsSection.tsx  # Threaded discussions
│   ├── reactions/                # Reaction system (NIP-25)
│   │   └── ReactionButton.tsx   # Interactive tap-to-like and long-press emoji reactions
│   ├── livestream/               # Live streaming (NIP-53)
│   │   ├── LiveChat.tsx         # Live chat interface
│   │   ├── LiveStreamToolbar.tsx # Stream controls
│   │   ├── UnifiedLivestreamChat.tsx
│   │   └── LivestreamChat.tsx   # Chat message handling
│   └── ...                      # Layout, NoteContent, EditProfileForm, etc.
├── hooks/                        # Custom React hooks (25+ specialized hooks)
│   ├── useNostr.ts              # Core Nostr integration
│   ├── useNostrPublish.ts       # Event publishing with client tags
│   ├── useAuthor.ts             # Profile data fetching
│   ├── useCurrentUser.ts        # Authentication state
│   ├── useFollows.ts            # Social relationships (NIP-02)
│   ├── useComments.ts           # Comment queries (NIP-22)
│   ├── usePostComment.ts        # Comment publishing
│   ├── useBlogPosts.ts          # Long-form content (NIP-23)
│   ├── usePictures.ts           # Photo galleries (NIP-68)
│   ├── useLiveEvents.ts         # Live streaming (NIP-53)
│   ├── useLiveStream.ts         # Stream queries
│   ├── useLiveChat.ts           # Live chat messages
│   ├── useZaps.ts               # Lightning payments (NIP-57)
│   ├── useZapNotifications.ts   # Zap receipt handling
│   ├── useMusicLists.ts         # Playlist management (NIP-51)
│   ├── useNIP100.ts             # WebRTC signaling
│   ├── useTrackSuggestionNotifications.ts # NIP-17 private messages
│   ├── useNotificationReadStatus.ts # NIP-78 app data
│   ├── useReactions.ts          # NIP-25 reactions (likes and emojis)
│   ├── useMessageModeration.ts  # Chat moderation via ❌ reactions
│   ├── useUploadFile.ts         # File uploads (NIP-96)
│   └── ...                      # 10+ additional specialized hooks
├── pages/                        # Page components (20+ pages)
│   ├── Index.tsx                # Home page with live streams
│   ├── About.tsx                # Profile page
│   ├── Blog.tsx                 # Long-form content (NIP-23)
│   ├── Photos.tsx               # Photo gallery (NIP-68)
│   ├── Events.tsx               # Event calendar (NIP-53)
│   ├── AudioRooms.tsx           # Voice chat rooms (NIP-100)
│   ├── WavlakePicks.tsx         # Curated music (NIP-51)
│   ├── WavlakeTrack.tsx         # Individual tracks
│   ├── WavlakeAlbum.tsx         # Album pages
│   ├── WavlakeArtist.tsx        # Artist profiles
│   ├── WavlakeExplore.tsx       # Music discovery
│   ├── WeeklySongsLeaderboard.tsx # Community voting
│   ├── PartyView.tsx            # Full-screen music player
│   ├── LeaderboardPartyView.tsx # Top 3 countdown party mode
│   ├── EditProfile.tsx          # Profile editing
│   ├── NotificationsPage.tsx    # Admin notifications
│   ├── NIP19Page.tsx            # NIP-19 route handler
│   ├── NotFound.tsx             # 404 page
│   └── ...                      # Chat, LiveStreamPage
├── contexts/                     # React context providers
│   ├── AppContext.tsx           # Global app state and relay config
│   └── NWCContext.tsx           # Nostr Wallet Connect
├── lib/                         # Utility functions and libraries
│   ├── nip17-proper.ts          # NIP-17 implementation with NIP-59
│   ├── nip17.ts                 # Alternative NIP-17 implementation
│   ├── addTrackToPicks.ts       # Playlist utilities
│   ├── utils.ts                 # General utilities (cn, etc.)
│   └── ...                      # Date utils, formatters, etc.
├── test/                         # Testing utilities
│   └── TestApp.tsx              # Provider wrapper for tests
├── App.tsx                       # Main app with providers
├── AppRouter.tsx                 # React Router configuration
├── main.tsx                      # App entry point
└── index.css                     # Global styles and CSS variables
```

### Key Architectural Patterns

- **Hook-Based Architecture**: 25+ specialized hooks encapsulate Nostr functionality
- **Component Composition**: shadcn/ui base + specialized feature components  
- **Event-Driven**: Real-time Nostr subscriptions with TanStack Query caching
- **Type Safety**: Full TypeScript coverage with proper Nostr event typing
- **Provider Pattern**: Centralized state management with React contexts

### Key Components
- **`MusicPlayer`** - Full-featured audio player with playlist support, next/previous, and persistent state
- **`TrackList`** - Interactive track listing with play controls and zap integration
- **`AudioRoom`** - WebRTC voice chat implementation with NRTC patterns and moderation
- **`CommentsSection`** - Threaded comment system for any content using NIP-22
- **`LoginArea`** - Complete authentication interface with multi-account support
- **`LiveStreamPlayer`** - Live streaming with HLS support and participant tracking
- **`PictureGrid`** - Responsive photo gallery with lightbox functionality
- **`ManagePicksDialog`** - Music playlist management for content creators

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test src/hooks/useMusicLists.test.ts
```

## 🌐 Deployment

### GitHub Pages
Automatically deploys on push to `main` branch via GitHub Actions.

### Manual Deployment
```bash
# Build for production
npm run build

# Deploy dist/ folder to your hosting provider
```

### Environment Variables
```env
VITE_DEFAULT_RELAY_URL=wss://relay.nostr.band
VITE_BLOSSOM_SERVER_URL=https://blossom.server.com
```

## 🙏 Acknowledgments

- **MKStack** - Original template and foundation
- **Nostr Community** - Protocol development and standards
- **Wavlake** - Music streaming platform integration  
- **shadcn/ui** - Beautiful component library
- **Nostrify** - Modern Nostr framework


## 📞 Support

- **Issues** - [GitHub Issues](https://github.com/patrickulrich/peachyhodl/issues)
- **Wavlake** - [Official Wavlake Platform](https://wavlake.com) for Bitcoin music

---

**Built with ❤️ on Nostr** | **Powered by Bitcoin** | **Vibed with [MKStack](https://soapbox.pub/mkstack)**