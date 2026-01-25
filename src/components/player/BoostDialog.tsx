import { useState } from 'react';
import { Zap, Loader2, AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePodcastIndexValue } from '@/hooks/usePodcastIndex';
import { usePlayer } from '@/contexts/PlayerContext';
import type { PodcastValueDestination } from '@/lib/types';

interface BoostDialogProps {
  feedId?: string;
  children: React.ReactNode;
}

const BOOST_AMOUNTS = [100, 500, 1000, 5000, 10000];

export function BoostDialog({ feedId, children }: BoostDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostSuccess, setBoostSuccess] = useState(false);
  
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { state } = usePlayer();
  const { hasWallet, sendPayment } = useWallet();
  
  // Get value info for the current track's feed
  const trackFeedId = feedId || state.currentTrack?.feedId;
  const { data: valueInfo, isLoading: loadingValue } = usePodcastIndexValue(trackFeedId, open);
  
  const handleAmountClick = (amt: number) => {
    setAmount(amt);
    setCustomAmount('');
  };
  
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
    }
  };
  
  const calculateSplits = (totalAmount: number, destinations: PodcastValueDestination[]) => {
    // Calculate how much each destination receives
    const totalSplit = destinations.reduce((sum, d) => sum + d.split, 0);
    
    return destinations.map(dest => ({
      ...dest,
      satsAmount: Math.floor((dest.split / totalSplit) * totalAmount),
    }));
  };
  
  const handleBoost = async () => {
    if (!hasWallet) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect a Lightning wallet to send boosts.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!valueInfo?.destinations?.length) {
      toast({
        title: 'No Payment Info',
        description: 'This track does not have Value-for-Value payment information.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsBoosting(true);
    setBoostSuccess(false);
    
    try {
      const splits = calculateSplits(amount, valueInfo.destinations);
      
      // For simplicity, we'll pay the primary recipient (highest split)
      // In a full implementation, you would split payments to all destinations
      const primaryRecipient = splits.sort((a, b) => b.satsAmount - a.satsAmount)[0];
      
      if (!primaryRecipient.address) {
        throw new Error('No Lightning address found');
      }
      
      // Create a keysend or lnurl payment
      // Note: This is simplified - real implementation would use proper keysend with TLV records
      await sendPayment({
        destination: primaryRecipient.address,
        amount: amount,
        comment: `Boost for ${state.currentTrack?.songTitle || 'Unknown Track'}`,
      });
      
      setBoostSuccess(true);
      toast({
        title: 'Boost Sent!',
        description: `${amount} sats sent to ${primaryRecipient.name || 'artist'}`,
      });
      
      // Close dialog after success
      setTimeout(() => {
        setOpen(false);
        setBoostSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Boost failed:', error);
      toast({
        title: 'Boost Failed',
        description: error instanceof Error ? error.message : 'Failed to send payment',
        variant: 'destructive',
      });
    } finally {
      setIsBoosting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-tw-orange" />
            Boost Artist
          </DialogTitle>
          <DialogDescription>
            Send sats directly to the artist via Lightning
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Current Track Info */}
          {state.currentTrack && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary">
                {state.currentTrack.songArtwork ? (
                  <img 
                    src={state.currentTrack.songArtwork}
                    alt={state.currentTrack.songTitle || 'Track'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-tw-purple/20 to-tw-cyan/20" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{state.currentTrack.songTitle || 'Unknown Track'}</p>
                <p className="text-sm text-muted-foreground truncate">{state.currentTrack.songArtist}</p>
              </div>
            </div>
          )}
          
          {/* Loading Value Info */}
          {loadingValue && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {/* No Value Info */}
          {!loadingValue && !valueInfo?.destinations?.length && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                This track doesn't have V4V payment info. The artist may not accept Lightning payments.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Value Info Available */}
          {!loadingValue && valueInfo?.destinations?.length > 0 && (
            <>
              {/* Preset Amounts */}
              <div className="space-y-2">
                <Label>Select Amount (sats)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {BOOST_AMOUNTS.map(amt => (
                    <Button
                      key={amt}
                      variant={amount === amt && !customAmount ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAmountClick(amt)}
                    >
                      {amt >= 1000 ? `${amt / 1000}k` : amt}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Custom Amount */}
              <div className="space-y-2">
                <Label htmlFor="customAmount">Custom Amount</Label>
                <Input
                  id="customAmount"
                  type="number"
                  placeholder="Enter custom amount"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  min={1}
                />
              </div>
              
              {/* Recipients */}
              <div className="space-y-2">
                <Label>Recipients</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {calculateSplits(amount, valueInfo.destinations).map((dest, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30"
                    >
                      <span className="truncate">{dest.name || 'Unknown'}</span>
                      <span className="text-muted-foreground">{dest.satsAmount} sats ({dest.split}%)</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* No Wallet Warning */}
              {!hasWallet && (
                <Alert>
                  <Wallet className="w-4 h-4" />
                  <AlertDescription>
                    Connect a Lightning wallet (WebLN or NWC) in Settings to send boosts.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Success Message */}
              {boostSuccess && (
                <Alert className="border-tw-success/50 bg-tw-success/10">
                  <CheckCircle2 className="w-4 h-4 text-tw-success" />
                  <AlertDescription className="text-tw-success">
                    Boost sent successfully!
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Boost Button */}
              <Button 
                className="w-full gap-2 bg-gradient-to-r from-tw-orange to-tw-pink"
                onClick={handleBoost}
                disabled={isBoosting || !hasWallet || boostSuccess}
              >
                {isBoosting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {boostSuccess ? 'Sent!' : `Boost ${amount.toLocaleString()} sats`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
