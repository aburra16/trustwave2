import { useSeoMeta } from '@unhead/react';
import { Settings as SettingsIcon, User, Server, Info } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EditProfileForm } from '@/components/EditProfileForm';
import { RelayListManager } from '@/components/RelayListManager';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { APP_NAME, DCOSL_RELAY, NIP85_RELAY, GENESIS_CURATOR_PUBKEY } from '@/lib/constants';
import { nip19 } from 'nostr-tools';

export default function Settings() {
  useSeoMeta({
    title: `Settings | ${APP_NAME}`,
    description: 'Manage your profile, relays, and app settings.',
  });
  
  const { user, metadata } = useCurrentUser();
  
  const genesisCuratorNpub = nip19.npubEncode(GENESIS_CURATOR_PUBKEY);
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20">
              <SettingsIcon className="w-6 h-6 text-primary" />
            </div>
            Settings
          </h1>
        </div>
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="relays" className="gap-2">
              <Server className="w-4 h-4" />
              Relays
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2">
              <Info className="w-4 h-4" />
              About
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            {user ? (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Profile</CardTitle>
                  <CardDescription>
                    Update your Nostr profile information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EditProfileForm />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="text-center">
                  <CardTitle>Login Required</CardTitle>
                  <CardDescription>
                    Log in with Nostr to manage your profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <LoginArea className="max-w-xs" />
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Relays Tab */}
          <TabsContent value="relays">
            <Card>
              <CardHeader>
                <CardTitle>Relay Configuration</CardTitle>
                <CardDescription>
                  Manage your Nostr relay connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RelayListManager />
              </CardContent>
            </Card>
            
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>TrustWave Relays</CardTitle>
                <CardDescription>
                  These relays are used specifically by TrustWave
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm">Decentralized Lists</p>
                    <p className="text-xs text-muted-foreground font-mono">{DCOSL_RELAY}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-tw-success/20 text-tw-success">
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm">Trust Assertions (NIP-85)</p>
                    <p className="text-xs text-muted-foreground font-mono">{NIP85_RELAY}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-tw-success/20 text-tw-success">
                    Connected
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* About Tab */}
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>About {APP_NAME}</CardTitle>
                <CardDescription>
                  Decentralized music discovery powered by Web-of-Trust
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">How It Works</h3>
                  <p className="text-sm text-muted-foreground">
                    TrustWave is a decentralized music discovery application that replaces opaque 
                    algorithms with a transparent Web-of-Trust. Music is sourced from Podcast Index 
                    RSS feeds, organized through Nostr-based decentralized lists, and filtered 
                    through your social graph.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Technology Stack</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Content:</strong> Podcast Index API (V4V-enabled RSS feeds)</li>
                    <li>• <strong>Identity:</strong> Nostr Protocol (NIP-07, NIP-46)</li>
                    <li>• <strong>Organization:</strong> Decentralized Lists NIP</li>
                    <li>• <strong>Trust:</strong> NIP-85 Trusted Assertions</li>
                    <li>• <strong>Reactions:</strong> NIP-25 (Thumbs up/down)</li>
                    <li>• <strong>Payments:</strong> Lightning Network (Value-for-Value)</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Genesis Curator</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    When you're not logged in, or haven't set your own trust preferences, 
                    the app uses the genesis curator's trust data:
                  </p>
                  <code className="text-xs bg-secondary px-2 py-1 rounded break-all">
                    {genesisCuratorNpub}
                  </code>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Open Source</h3>
                  <p className="text-sm text-muted-foreground">
                    TrustWave is built on open protocols and standards. All music data is 
                    decentralized and censorship-resistant. Artists receive 100% of the 
                    value through direct Lightning payments.
                  </p>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    Vibed with{' '}
                    <a 
                      href="https://shakespeare.diy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Shakespeare
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
