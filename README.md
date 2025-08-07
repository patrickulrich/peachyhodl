# PeachyHODL - Peachy's Personal Nostr Website

A decentralized personal website and social platform built entirely on Nostr protocols, showcasing Bitcoin music, live streaming, blog content, and community features.

![Peachy's Nostr Website](https://img.shields.io/badge/Nostr-Powered-purple?style=for-the-badge) ![Bitcoin](https://img.shields.io/badge/Bitcoin-Native-orange?style=for-the-badge) ![Lightning](https://img.shields.io/badge/Lightning-Enabled-yellow?style=for-the-badge)

## 🎵 Features

### **Core Nostr Integration**
- **Complete Profile System** - NIP-05 identity verification and profile management
- **Social Features** - Follow/unfollow with NIP-02, post comments with NIP-22
- **Lightning Zaps** - Support Peachy with instant Bitcoin payments via NIP-57
- **Decentralized Storage** - All content lives on Nostr relays, no central servers

### **Music & Entertainment**
- **🎧 Wavlake Music Integration** - Stream Bitcoin music with NIP-51 playlists
- **🎵 Audio Player** - Full-featured music player with playlist support
- **📻 Live Audio Rooms** - Real-time voice chat using experimental NIP-100 WebRTC
- **🎥 Live Streaming** - NIP-53 live events with chat integration

### **Content & Media**
- **📝 Long-form Blog** - NIP-23 articles with rich content and images  
- **📸 Photo Galleries** - NIP-68 picture feeds with zoomable images
- **📅 Event Calendar** - Upcoming live streams and events via NIP-53
- **💬 Comments System** - Threaded discussions on all content

### **Admin Features**
- **Content Management** - Special admin controls when Peachy is signed in
- **List Management** - Create and manage music playlists and curations
- **Moderation Tools** - Voice chat moderation with kick/ban functionality
- **Real-time Updates** - Live content updates across all sections

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
- **NIP Standards** - Implements 15+ NIPs for comprehensive functionality
- **TanStack Query** - Powerful data fetching and caching for Nostr events
- **Multi-Relay Support** - Query multiple relays with automatic failover

### **Audio & Media**
- **HTML5 Audio** - Native browser audio with full playback controls
- **WebRTC** - Peer-to-peer voice chat for audio rooms
- **Image Optimization** - Responsive images with lazy loading
- **File Upload** - Blossom server integration for media storage

## 📋 Supported NIPs

| NIP | Feature | Implementation |
|-----|---------|----------------|
| [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) | Basic Protocol | ✅ Core events, signatures, and relay communication |
| [NIP-02](https://github.com/nostr-protocol/nips/blob/master/02.md) | Follow Lists | ✅ Follow/unfollow functionality |
| [NIP-04](https://github.com/nostr-protocol/nips/blob/master/04.md) | Encrypted DMs | ✅ Private messaging support |
| [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) | NIP-05 Verification | ✅ Internet identifier verification |
| [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md) | Browser Extension | ✅ Web browser wallet integration |
| [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md) | bech32 Entities | ✅ npub, note, naddr addressing |
| [NIP-22](https://github.com/nostr-protocol/nips/blob/master/22.md) | Comments | ✅ Threaded comment system |
| [NIP-23](https://github.com/nostr-protocol/nips/blob/master/23.md) | Long-form Content | ✅ Blog articles and rich content |
| [NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) | Lists | ✅ Music playlists and curation sets |
| [NIP-53](https://github.com/nostr-protocol/nips/blob/master/53.md) | Live Activities | ✅ Live streams and events |
| [NIP-57](https://github.com/nostr-protocol/nips/blob/master/57.md) | Lightning Zaps | ✅ Bitcoin micropayments |
| [NIP-68](https://github.com/nostr-protocol/nips/blob/master/68.md) | Picture Feeds | ✅ Photo galleries and media |
| [NIP-94](https://github.com/nostr-protocol/nips/blob/master/94.md) | File Metadata | ✅ Media file handling |
| [NIP-96](https://github.com/nostr-protocol/nips/blob/master/96.md) | File Storage | ✅ Blossom server uploads |
| [NIP-100](https://github.com/nostr-protocol/nips/pull/1043) | WebRTC Audio | ✅ Real-time voice chat (experimental) |

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
- **Pages** - Create new pages in `src/pages/` and update routing
- **Hooks** - Build custom React hooks for Nostr data in `src/hooks/`

## 🔧 Development

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── music/          # Music player components
│   ├── auth/           # Authentication components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── contexts/           # React context providers
└── lib/                # Utility functions
```

### Key Components
- **`MusicPlayer`** - Full-featured audio player with playlist support
- **`TrackList`** - Interactive track listing with play controls
- **`AudioRoom`** - WebRTC voice chat implementation
- **`CommentsSection`** - Threaded comment system for any content
- **`LoginArea`** - Complete authentication interface

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

## 🎯 Use Cases

### Personal Websites
- **Content Creators** - Share blogs, music, and media on a decentralized platform
- **Musicians** - Showcase music with Bitcoin monetization
- **Podcasters** - Host live audio events with audience interaction

### Community Platforms
- **Bitcoin Communities** - Value-for-value content with Lightning integration
- **Open Source Projects** - Decentralized project communication and updates
- **Educational Content** - Share knowledge with built-in monetization

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following the existing code style
4. **Run tests** (`npm test`) to ensure everything works
5. **Commit changes** (`git commit -m 'Add amazing feature'`)
6. **Push to branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Development Guidelines
- **Follow TypeScript best practices** - Proper typing throughout
- **Write tests** for new functionality
- **Update documentation** for significant changes
- **Follow NIP standards** when implementing Nostr features

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **MKStack** - Original template and foundation
- **Nostr Community** - Protocol development and standards
- **Wavlake** - Music streaming platform integration  
- **shadcn/ui** - Beautiful component library
- **Nostrify** - Modern Nostr framework

## 📞 Support

- **Issues** - [GitHub Issues](https://github.com/patrickulrich/peachyhodl/issues)
- **Discussions** - [GitHub Discussions](https://github.com/patrickulrich/peachyhodl/discussions)
- **Nostr** - Follow [@peachy](https://primal.net/peachy) on Nostr
- **Lightning** - Support development with Bitcoin tips

---

**Built with ❤️ on Nostr** | **Powered by Bitcoin** | **Vibed with [MKStack](https://soapbox.pub/mkstack)**