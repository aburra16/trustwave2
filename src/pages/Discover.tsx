import { useSeoMeta } from '@unhead/react';
import { Radio, Music, Users, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { SongCard } from '@/components/songs/SongCard';
import { MusicianCard } from '@/components/musicians/MusicianCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSongsList, useMusiciansList } from '@/hooks/useDecentralizedList';
import { useListCounts } from '@/hooks/useListCounts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '@/lib/constants';
import { LoginArea } from '@/components/auth/LoginArea';

export default function Discover() {
  useSeoMeta({
    title: APP_NAME,
    description: APP_DESCRIPTION,
  });
  
  const { user } = useCurrentUser();
  const { data: songs, isLoading: loadingSongs } = useSongsList();
  const { data: musicians, isLoading: loadingMusicians } = useMusiciansList();
  const { data: counts } = useListCounts(); // Simple counts without scoring
  
  const topSongs = songs?.slice(0, 6) || [];
  const topMusicians = musicians?.slice(0, 5) || [];
  
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-tw-purple/10 via-background to-background" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-tw-purple/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-tw-cyan/20 rounded-full blur-3xl" />
        
        <div className="relative container mx-auto px-4 py-20 text-center">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-tw-purple to-tw-cyan flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20 animate-pulse-glow">
            <Radio className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">{APP_NAME}</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {APP_TAGLINE}. Decentralized music discovery powered by Web-of-Trust.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/songs">
                <Music className="w-5 h-5 mr-2" />
                Explore Songs
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/search">
                <Sparkles className="w-5 h-5 mr-2" />
                Add Music
              </Link>
            </Button>
          </div>
          
          {/* Stats */}
          <div className="flex justify-center gap-8 mt-12">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">{counts?.songs || 0}</div>
              <div className="text-sm text-muted-foreground">Songs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">{counts?.musicians || 0}</div>
              <div className="text-sm text-muted-foreground">Artists</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">100%</div>
              <div className="text-sm text-muted-foreground">V4V</div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 rounded-2xl bg-card border border-border/50">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-tw-purple/20 to-tw-purple/5 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-tw-purple" />
            </div>
            <h3 className="font-semibold mb-2">Trust-Based Discovery</h3>
            <p className="text-sm text-muted-foreground">
              Only see music curated by people in your trusted network. No algorithms, no spam.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-2xl bg-card border border-border/50">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-tw-cyan/20 to-tw-cyan/5 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-7 h-7 text-tw-cyan" />
            </div>
            <h3 className="font-semibold mb-2">Community Ranking</h3>
            <p className="text-sm text-muted-foreground">
              Upvote and downvote tracks. The best music rises to the top through consensus.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-2xl bg-card border border-border/50">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-tw-orange/20 to-tw-orange/5 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-tw-orange" />
            </div>
            <h3 className="font-semibold mb-2">Value for Value</h3>
            <p className="text-sm text-muted-foreground">
              Support artists directly with Bitcoin Lightning. 100% goes to the creator.
            </p>
          </div>
        </div>
      </section>
      
      {/* Top Songs */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Music className="w-6 h-6 text-primary" />
            Trending Songs
          </h2>
          <Button variant="ghost" asChild>
            <Link to="/songs">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
        
        {loadingSongs ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : topSongs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topSongs.map((song, index) => (
              <SongCard 
                key={song.id} 
                song={song} 
                index={index}
                queue={topSongs}
                variant="grid" 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No songs yet. Be the first to add some!</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/search">Search Music</Link>
            </Button>
          </div>
        )}
      </section>
      
      {/* Top Musicians */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Featured Artists
          </h2>
          <Button variant="ghost" asChild>
            <Link to="/musicians">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
        
        {loadingMusicians ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : topMusicians.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {topMusicians.map(musician => (
              <MusicianCard key={musician.id} musician={musician} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No artists yet. Be the first to add some!</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/search">Search Artists</Link>
            </Button>
          </div>
        )}
      </section>
      
      {/* CTA */}
      {!user && (
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center p-8 rounded-2xl bg-gradient-to-br from-tw-purple/10 to-tw-cyan/10 border border-primary/20">
            <h2 className="text-2xl font-bold mb-2">Join the Community</h2>
            <p className="text-muted-foreground mb-6">
              Log in with Nostr to curate music, vote on tracks, and support artists directly.
            </p>
            <LoginArea className="justify-center" />
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t border-border/50">
        <p>
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
      </footer>
    </MainLayout>
  );
}
