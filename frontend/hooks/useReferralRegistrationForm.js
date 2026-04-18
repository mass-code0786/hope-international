'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import { getReferralPreview } from '@/lib/services/authService';
import {
  extractReferralInputContext,
  normalizePlacementSide,
  REGISTRATION_REFERRAL_REQUIRED_MESSAGE
} from '@/lib/utils/referralRegistration';

export function useReferralRegistrationForm({ referralPrefill = '', requestedSide = '', onSuccess } = {}) {
  const router = useRouter();
  const { registerMutation, error, setError } = useAuthMutations();
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [referralPreview, setReferralPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    mobileNumber: '',
    countryCode: '+44',
    email: '',
    password: '',
    referralCode: ''
  });

  const lockedReferralContext = useMemo(() => extractReferralInputContext(referralPrefill), [referralPrefill]);
  const sponsorLocked = Boolean(lockedReferralContext.referralCode);
  const lockedPreferredLeg = normalizePlacementSide(requestedSide) || lockedReferralContext.preferredLeg;
  const sideLocked = Boolean(sponsorLocked && lockedPreferredLeg);

  useEffect(() => {
    if (!sponsorLocked) return;

    setForm((current) => (
      current.referralCode === lockedReferralContext.referralCode
        ? current
        : { ...current, referralCode: lockedReferralContext.referralCode }
    ));
  }, [lockedReferralContext.referralCode, sponsorLocked]);

  const referralContext = useMemo(() => {
    if (sponsorLocked) {
      return {
        referralCode: lockedReferralContext.referralCode,
        preferredLeg: lockedPreferredLeg
      };
    }

    return extractReferralInputContext(form.referralCode);
  }, [form.referralCode, lockedPreferredLeg, lockedReferralContext.referralCode, sponsorLocked]);

  const effectiveReferralCode = referralContext.referralCode.trim();
  const effectivePreferredLeg = sideLocked ? lockedPreferredLeg : referralContext.preferredLeg;
  const referralMissing = !effectiveReferralCode;

  useEffect(() => {
    let ignore = false;
    let timeoutId = null;

    if (!effectiveReferralCode) {
      setReferralPreview(null);
      setPreviewError('');
      setPreviewLoading(false);
      return undefined;
    }

    if (!sponsorLocked && effectiveReferralCode.length < 3) {
      setReferralPreview(null);
      setPreviewError('');
      setPreviewLoading(false);
      return undefined;
    }

    const loadReferralPreview = async () => {
      setPreviewLoading(true);
      setPreviewError('');

      try {
        const data = await getReferralPreview({
          ref: effectiveReferralCode,
          side: effectivePreferredLeg || undefined
        });

        if (!ignore) {
          setReferralPreview(data || null);
        }
      } catch (err) {
        if (!ignore) {
          setReferralPreview(null);
          setPreviewError(err?.message || 'Referral link could not be verified.');
        }
      } finally {
        if (!ignore) {
          setPreviewLoading(false);
        }
      }
    };

    if (sponsorLocked) {
      void loadReferralPreview();
      return () => {
        ignore = true;
      };
    }

    timeoutId = window.setTimeout(() => {
      void loadReferralPreview();
    }, 280);

    return () => {
      ignore = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [effectivePreferredLeg, effectiveReferralCode, sponsorLocked]);

  const sponsorName = useMemo(() => {
    const sponsor = referralPreview?.sponsor;
    if (!sponsor) return '';
    return [sponsor.first_name, sponsor.last_name].filter(Boolean).join(' ').trim() || sponsor.username || '';
  }, [referralPreview]);

  async function submitRegistration(event) {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    setError('');

    if (referralMissing) {
      setError(REGISTRATION_REFERRAL_REQUIRED_MESSAGE);
      toast.error(REGISTRATION_REFERRAL_REQUIRED_MESSAGE);
      return;
    }

    if (previewError) {
      setError(previewError);
      toast.error(previewError);
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username: form.username.trim(),
      mobileNumber: form.mobileNumber.trim(),
      countryCode: form.countryCode.trim(),
      email: form.email.trim(),
      password: form.password,
      referralCode: sponsorLocked ? lockedReferralContext.referralCode : form.referralCode.trim(),
      ...(effectivePreferredLeg ? { preferredLeg: effectivePreferredLeg } : {})
    };

    try {
      await registerMutation.mutateAsync(payload);
      toast.success('Welcome to Hope International');

      if (typeof onSuccess === 'function') {
        await onSuccess();
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      toast.error(err?.message || 'Registration failed');
    }
  }

  return {
    form,
    setForm,
    useCustomCode,
    setUseCustomCode,
    error,
    previewLoading,
    previewError,
    referralPreview,
    sponsorName,
    sponsorLocked,
    sideLocked,
    effectivePreferredLeg,
    referralMissing,
    submitRegistration,
    isSubmitting: registerMutation.isPending,
    referralRequiredMessage: REGISTRATION_REFERRAL_REQUIRED_MESSAGE
  };
}
