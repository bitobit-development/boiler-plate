'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { overrideCustomerOTP } from '@/app/actions/pos-customer';
import { Subscriber, OtpOverrideReason } from '@/lib/db/schema';
import { toast } from 'sonner';

interface OTPOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Subscriber | null;
  onSuccess: (customer: Subscriber) => void;
}

const OVERRIDE_REASONS: { value: OtpOverrideReason; label: string; description: string }[] = [
  {
    value: 'sms_delivery_failure',
    label: 'SMS Delivery Failure',
    description: 'SMS service is down or messages not being delivered'
  },
  {
    value: 'network_issues',
    label: 'Network Issues',
    description: 'Customer has no network coverage or connectivity issues'
  },
  {
    value: 'customer_phone_issues',
    label: 'Customer Phone Issues',
    description: 'Phone is broken, lost, or unable to receive SMS'
  },
  {
    value: 'international_number',
    label: 'International Number',
    description: 'Customer has an international number that cannot receive local SMS'
  },
  {
    value: 'elderly_assistance',
    label: 'Elderly Assistance',
    description: 'Customer needs assistance due to age-related challenges'
  },
  {
    value: 'disability_accommodation',
    label: 'Disability Accommodation',
    description: 'Accessibility accommodation for customer with disabilities'
  },
  {
    value: 'technical_error',
    label: 'Technical Error',
    description: 'System error or technical issue preventing OTP verification'
  },
  {
    value: 'manager_approval',
    label: 'Manager Approval',
    description: 'Special case approved by store manager'
  }
];

export function OTPOverrideDialog({
  open,
  onOpenChange,
  customer,
  onSuccess
}: OTPOverrideDialogProps) {
  const [user, setUser] = useState<any>(null);
  const [reason, setReason] = useState<OtpOverrideReason | ''>('');
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Get user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('posUser');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleSubmit = async () => {
    if (!reason || !explanation.trim() || !customer || !user) {
      setError('Please select a reason and provide an explanation');
      return;
    }

    if (explanation.trim().length < 10) {
      setError('Explanation must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const shopUserId = user.id;

      const result = await overrideCustomerOTP(
        customer.id,
        reason,
        explanation.trim(),
        shopUserId
      );

      if (result.success && result.customer) {
        toast.success(result.message);
        onSuccess(result.customer);
        onOpenChange(false);
        // Reset form
        setReason('');
        setExplanation('');
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Failed to override OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReason = OVERRIDE_REASONS.find(r => r.value === reason);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            OTP Override Authorization
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Override OTP verification for customer{' '}
            {customer && (
              <span className="font-medium text-slate-300">
                {customer.name} {customer.surname}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert className="bg-yellow-950/30 border-yellow-800 text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action will be logged for audit purposes. Only use this option when
              OTP verification is genuinely not possible. Misuse may result in
              disciplinary action.
            </AlertDescription>
          </Alert>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-200">
              Override Reason
            </Label>
            <Select value={reason} onValueChange={(value) => setReason(value as OtpOverrideReason)}>
              <SelectTrigger
                id="reason"
                className="bg-slate-800 border-slate-600 text-white"
              >
                <SelectValue placeholder="Select a reason for override" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {OVERRIDE_REASONS.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    className="text-white hover:bg-slate-800"
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason && (
              <p className="text-sm text-slate-400">{selectedReason.description}</p>
            )}
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation" className="text-slate-200">
              Additional Explanation
              <span className="text-red-400 ml-1">*</span>
            </Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Provide detailed explanation for this override (minimum 10 characters)..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 min-h-[100px]"
              required
            />
            <p className="text-xs text-slate-500">
              {explanation.length}/10 characters minimum
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert className="bg-red-950/50 border-red-900 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason || explanation.trim().length < 10}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authorizing...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Authorize Override
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}