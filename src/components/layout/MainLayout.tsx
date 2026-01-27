import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Radio, Plus, Settings, ListChecks, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoginArea } from '@/components/auth/LoginArea';
import { PersonalizeButton } from '@/components/PersonalizeButton';
import { AudioPlayer } from '@/components/player/AudioPlayer';
import { usePlayer } from '@/contexts/PlayerContext';
import { APP_NAME } from '@/lib/constants';

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Discover', icon: Radio },
  { path: '/browse', label: 'Browse', icon: ListMusic },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/add-music', label: 'Add', icon: Plus },
  { path: '/curate', label: 'Curate', icon: ListChecks },
];

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { state } = usePlayer();
  const hasCurrentTrack = !!state.currentTrack;
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tw-purple to-tw-cyan flex items-center justify-center group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text hidden sm:block">
                {APP_NAME}
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            
            {/* Right side - Personalize, Settings & Login */}
            <div className="flex items-center gap-3">
              <PersonalizeButton />
              <Link
                to="/settings"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <LoginArea className="max-w-48" />
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50" style={{ paddingBottom: hasCurrentTrack ? '80px' : '0' }}>
        <div className="flex items-center justify-around h-16">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* Main Content */}
      <main className={cn(
        'flex-1 pb-20 md:pb-4',
        hasCurrentTrack && 'pb-40 md:pb-24'
      )}>
        {children}
      </main>
      
      {/* Audio Player */}
      <AudioPlayer />
    </div>
  );
}
