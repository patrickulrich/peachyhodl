import { useState, useEffect } from 'react';
import { Zap, ExternalLink, Copy, Check, Sparkle, Sparkles, Star, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/useToast';
import type { MusicTrack } from '@/hooks/useMusicLists';
import QRCode from 'qrcode';

interface WavlakeZapDialogProps {
  track: MusicTrack;
  children?: React.ReactNode;
  className?: string;
}

const presetAmounts = [
  { amount: 21, icon: Sparkle },
  { amount: 100, icon: Sparkles },
  { amount: 500, icon: Zap },
  { amount: 1000, icon: Star },
  { amount: 2100, icon: Rocket },
];

export function WavlakeZapDialog({ track, children, className }: WavlakeZapDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUser();
  const { webln, hasWebLN, detectWebLN } = useWallet();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState<number | string>(100);
  const [comment, setComment] = useState('');
  const [invoice, setInvoice] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Generate QR code when invoice changes
  useEffect(() => {
    if (!invoice) {
      setQrCodeUrl('');
      return;
    }

    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(invoice.toUpperCase(), {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    };

    generateQR();
  }, [invoice]);

  // Detect WebLN when dialog opens
  useEffect(() => {
    if (open && !hasWebLN) {
      detectWebLN();
    }
  }, [open, hasWebLN, detectWebLN]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setAmount(100);
      setComment('Thanks for the amazing music! 🎵');
      setInvoice(null);
      setCopied(false);
      setQrCodeUrl('');
    }
  }, [open]);

  const handleGenerateInvoice = async () => {
    if (!track.id) {
      toast({
        title: 'Error',
        description: 'Track ID not found',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { wavlakeAPI } = await import('@/lib/wavlake');
      const finalAmount = typeof amount === 'string' ? parseInt(amount, 10) : amount;
      
      // Step 1: Get LNURL from Wavlake API
      console.log('Requesting LNURL for track:', track.id, 'with appId: peachyhodl');
      const lnurlResponse = await wavlakeAPI.getLnurl(track.id, 'peachyhodl');
      
      if (!lnurlResponse.lnurl) {
        throw new Error('No LNURL found for this track');
      }

      // Step 2: Decode LNURL (bech32 encoded)
      const { bech32 } = await import('bech32');
      const decoded = bech32.decode(lnurlResponse.lnurl, 2000);
      const lnurlPayUrl = Buffer.from(bech32.fromWords(decoded.words)).toString();

      // Step 3: Fetch LNURL-pay parameters
      const lnurlPayResponse = await fetch(lnurlPayUrl);
      if (!lnurlPayResponse.ok) {
        throw new Error('Failed to fetch LNURL-pay parameters');
      }
      
      const lnurlPayData = await lnurlPayResponse.json();
      
      if (lnurlPayData.status === 'ERROR') {
        throw new Error(lnurlPayData.reason || 'LNURL-pay error');
      }

      // Validate amount is within allowed range
      const milliSatAmount = finalAmount * 1000;
      if (milliSatAmount < lnurlPayData.minSendable || milliSatAmount > lnurlPayData.maxSendable) {
        throw new Error(`Amount must be between ${lnurlPayData.minSendable / 1000} and ${lnurlPayData.maxSendable / 1000} sats`);
      }

      // Step 4: Request invoice from callback URL
      const callbackUrl = new URL(lnurlPayData.callback);
      callbackUrl.searchParams.set('amount', milliSatAmount.toString());
      if (comment && lnurlPayData.commentAllowed && comment.length <= lnurlPayData.commentAllowed) {
        callbackUrl.searchParams.set('comment', comment);
      }

      const invoiceResponse = await fetch(callbackUrl.toString());
      if (!invoiceResponse.ok) {
        throw new Error('Failed to generate invoice');
      }

      const invoiceData = await invoiceResponse.json();
      
      if (invoiceData.status === 'ERROR') {
        throw new Error(invoiceData.reason || 'Invoice generation error');
      }

      if (!invoiceData.pr) {
        throw new Error('No payment request returned');
      }

      // Step 5: Set the invoice for payment
      setInvoice(invoiceData.pr);
      
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate payment. Try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (invoice) {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      toast({
        title: 'Invoice copied',
        description: 'Lightning invoice copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWebLNPay = async () => {
    if (!invoice || !webln) return;

    setIsPaying(true);
    try {
      await webln.sendPayment(invoice);
      toast({
        title: 'Payment sent!',
        description: 'Your zap has been sent successfully.',
      });
      setOpen(false);
    } catch (error) {
      console.error('Payment failed:', error);
      toast({
        title: 'Payment failed',
        description: 'Please try again or use another wallet.',
        variant: 'destructive',
      });
    } finally {
      setIsPaying(false);
    }
  };

  // Don't show if no user
  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className={`cursor-pointer ${className || ''}`}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Zap Track
          </DialogTitle>
          <DialogDescription>
            Send Lightning payments directly to support this track on Wavlake
          </DialogDescription>
        </DialogHeader>

        {invoice ? (
          // Payment view
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{amount} sats</div>
              <div className="text-sm text-muted-foreground">{track.title} - {track.artist}</div>
            </div>

            {qrCodeUrl && (
              <div className="flex justify-center">
                <Card className="p-4">
                  <img src={qrCodeUrl} alt="Payment QR Code" className="w-48 h-48" />
                </Card>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={invoice}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {hasWebLN && (
                <Button onClick={handleWebLNPay} disabled={isPaying} className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  {isPaying ? 'Processing...' : 'Pay with WebLN'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => window.open(`lightning:${invoice}`, '_blank')}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Wallet
              </Button>
              <Button variant="ghost" onClick={() => setInvoice(null)} className="w-full">
                Back
              </Button>
            </div>
          </div>
        ) : (
          // Amount selection view
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Zapping</div>
              <div className="font-semibold">{track.title}</div>
              <div className="text-sm text-muted-foreground">by {track.artist}</div>
            </div>

            <ToggleGroup
              type="single"
              value={String(amount)}
              onValueChange={(value) => value && setAmount(parseInt(value, 10))}
              className="grid grid-cols-5 gap-2"
            >
              {presetAmounts.map(({ amount: presetAmount, icon: Icon }) => (
                <ToggleGroupItem
                  key={presetAmount}
                  value={String(presetAmount)}
                  className="flex flex-col h-auto py-3"
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <span className="text-xs">{presetAmount}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Custom amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Textarea
                placeholder="Add a comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              onClick={handleGenerateInvoice}
              disabled={isGenerating}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating Lightning Invoice...' : `Generate Invoice for ${amount} sats`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}