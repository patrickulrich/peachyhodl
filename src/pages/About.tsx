import { useSeoMeta } from '@unhead/react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FollowButton } from '@/components/FollowButton';
import { ZapDialog } from '@/components/ZapDialog';
import { useAuthor } from '@/hooks/useAuthor';
import { Bitcoin, Zap, Users, Globe } from 'lucide-react';
import type { Event } from 'nostr-tools';

// Peachy's vanity npub decoded to hex
// npub1peachy0e223un984r54xnu9k93mcjk92mp27zrl03qfmcwpwmqsqt2agsv
const PEACHY_PUBKEY = "0e7b8b91f952a3c994f51d2a69f0b62c778958aad855e10fef8813bc382ed820";

const About = () => {
  useSeoMeta({
    title: 'About Peachy - Bitcoin Advocate',
    description: 'Learn more about Peachy, a passionate Bitcoin advocate and content creator on Nostr.',
  });

  const author = useAuthor(PEACHY_PUBKEY);
  const metadata = author.data?.metadata;

  // Create a mock profile event for zapping Peachy
  const peachyProfileEvent: Event = {
    id: 'peachy-profile-mock',
    pubkey: PEACHY_PUBKEY,
    created_at: Math.floor(Date.now() / 1000),
    kind: 0,
    tags: [],
    content: JSON.stringify(metadata || {}),
    sig: '',
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Card>
            <CardContent className="pt-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={metadata?.picture} alt="Peachy" />
                  <AvatarFallback>P</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold mb-2">
                    {metadata?.display_name || metadata?.name || 'Peachy'}
                  </h1>
                  <p className="text-xl text-muted-foreground mb-4">
                    Bitcoin is the future and it's just peachy.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                    <Badge variant="secondary">
                      <Bitcoin className="h-3 w-3 mr-1" />
                      Bitcoin Maximalist
                    </Badge>
                    <Badge variant="secondary">
                      <Zap className="h-3 w-3 mr-1" />
                      Lightning Network
                    </Badge>
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      Community Builder
                    </Badge>
                  </div>
                  <div className="flex gap-3 justify-center md:justify-start">
                    <FollowButton 
                      pubkey={PEACHY_PUBKEY}
                      petname="Peachy"
                    />
                    <ZapDialog target={peachyProfileEvent}>
                      <Button variant="outline">
                        <Zap className="h-4 w-4 mr-2" />
                        Zap
                      </Button>
                    </ZapDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bitcoin className="h-5 w-5 text-primary" />
                Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Spreading awareness about Bitcoin's transformative power and helping people understand
                why it's the most important innovation of our time. Through content, education, and
                community building, we're working towards a decentralized future.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Connect
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metadata?.website && (
                  <div>
                    <span className="text-sm text-muted-foreground">Website:</span>
                    <a href={metadata.website} target="_blank" rel="noopener noreferrer" 
                       className="ml-2 text-primary hover:underline">
                      {metadata.website}
                    </a>
                  </div>
                )}
                {metadata?.nip05 && (
                  <div>
                    <span className="text-sm text-muted-foreground">NIP-05:</span>
                    <span className="ml-2">{metadata.nip05}</span>
                  </div>
                )}
                {metadata?.lud16 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Lightning:</span>
                    <span className="ml-2">{metadata.lud16}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {metadata?.about || 
              `Welcome to my corner of the Nostr network! I'm passionate about Bitcoin and believe it represents the future of money and freedom.

Join me for live streams, discussions, and content about:
• Bitcoin education and adoption
• Lightning Network developments  
• Nostr protocol and decentralized social media
• Building sovereign communities
• Financial freedom and self-sovereignty

Let's make the future peachy together! 🍑⚡`}
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default About;