'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { ActionPanel } from '@/components/admin/ActionPanel';
import { SummaryPanel } from '@/components/admin/SummaryPanel';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { ErrorState } from '@/components/ui/ErrorState';
import { queryKeys } from '@/lib/query/queryKeys';
import {
  createAdminLandingContentBlock,
  createAdminLandingCountry,
  createAdminLandingFeaturedItem,
  createAdminLandingTestimonial,
  deleteAdminLandingContentBlock,
  deleteAdminLandingCountry,
  deleteAdminLandingFeaturedItem,
  deleteAdminLandingMediaSlot,
  deleteAdminLandingTestimonial,
  getAdminLanding,
  getAdminProducts,
  updateAdminLandingMediaSlot,
  updateAdminLandingContentBlock,
  updateAdminLandingCountry,
  updateAdminLandingFeaturedItem,
  updateAdminLandingSettings,
  updateAdminLandingStats,
  updateAdminLandingTestimonial
} from '@/lib/services/admin';
import { compressImageFile } from '@/lib/utils/imageUpload';
import { resolveMediaUrl } from '@/lib/utils/media';

const sectionKeys = ['hero', 'featured', 'benefits', 'details', 'testimonials', 'stats', 'countries', 'footer'];
const contentSectionOptions = ['benefits', 'details'];
const layoutOptions = ['icon-card', 'image-left', 'image-right'];

const emptyFeaturedForm = {
  productId: '',
  title: '',
  description: '',
  imageUrl: '',
  priceLabel: '',
  promoText: '',
  ctaText: '',
  targetLink: '',
  sortOrder: 0,
  isActive: true
};

const emptyBlockForm = {
  sectionKey: 'benefits',
  title: '',
  subtitle: '',
  bodyText: '',
  imageUrl: '',
  iconName: '',
  accentLabel: '',
  ctaText: '',
  targetLink: '',
  layoutStyle: 'icon-card',
  sortOrder: 0,
  isActive: true
};

const emptyTestimonialForm = {
  reviewerName: '',
  reviewerRole: '',
  reviewText: '',
  rating: 5,
  avatarUrl: '',
  sortOrder: 0,
  isActive: true
};

const emptyCountryForm = {
  countryCode: '',
  countryName: '',
  flagEmoji: '',
  sortOrder: 0,
  isActive: true
};

function coerceNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className={`w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text ${props.className || ''}`} />;
}

function TextArea(props) {
  return <textarea {...props} className={`w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text ${props.className || ''}`} />;
}

function normalizeMediaForms(slots = []) {
  return (Array.isArray(slots) ? slots : []).reduce((accumulator, slot) => {
    accumulator[slot.slotKey] = {
      previewUrl: slot.imageUrl || '',
      imageDataUrl: '',
      altText: slot.altText || ''
    };
    return accumulator;
  }, {});
}

function validateLandingImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP files are supported');
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error('Image must be 3MB or smaller');
  }
}

export default function AdminLandingPage() {
  const queryClient = useQueryClient();
  const [settingsForm, setSettingsForm] = useState(null);
  const [statsForm, setStatsForm] = useState(null);
  const [mediaForms, setMediaForms] = useState({});
  const [featuredForm, setFeaturedForm] = useState(emptyFeaturedForm);
  const [featuredEditingId, setFeaturedEditingId] = useState('');
  const [blockForm, setBlockForm] = useState(emptyBlockForm);
  const [blockEditingId, setBlockEditingId] = useState('');
  const [testimonialForm, setTestimonialForm] = useState(emptyTestimonialForm);
  const [testimonialEditingId, setTestimonialEditingId] = useState('');
  const [countryForm, setCountryForm] = useState(emptyCountryForm);
  const [countryEditingId, setCountryEditingId] = useState('');

  const landingQuery = useQuery({
    queryKey: queryKeys.adminLanding,
    queryFn: getAdminLanding
  });

  const productsQuery = useQuery({
    queryKey: [...queryKeys.adminProducts, 'landing-selector'],
    queryFn: () => getAdminProducts({ page: 1, limit: 10, isActive: 'true' })
  });

  useEffect(() => {
    const payload = landingQuery.data?.data;
    if (!payload) return;
    setSettingsForm({
      heroBadge: payload.settings.heroBadge || '',
      heroHeadline: payload.settings.heroHeadline || '',
      heroSubheadline: payload.settings.heroSubheadline || '',
      heroPrimaryCtaText: payload.settings.heroPrimaryCtaText || '',
      heroSecondaryCtaText: payload.settings.heroSecondaryCtaText || '',
      heroImageUrl: payload.settings.heroImageUrl || '',
      heroBackgroundNote: payload.settings.heroBackgroundNote || '',
      featuredSectionTitle: payload.settings.featuredSectionTitle || '',
      benefitsSectionTitle: payload.settings.benefitsSectionTitle || '',
      detailsSectionTitle: payload.settings.detailsSectionTitle || '',
      testimonialsSectionTitle: payload.settings.testimonialsSectionTitle || '',
      statsSectionTitle: payload.settings.statsSectionTitle || '',
      countriesSectionTitle: payload.settings.countriesSectionTitle || '',
      footerSupportText: payload.settings.footerSupportText || '',
      footerContactEmail: payload.settings.footerContactEmail || '',
      sectionOrder: Array.isArray(payload.settings.sectionOrder) ? payload.settings.sectionOrder : sectionKeys,
      sectionVisibility: payload.settings.sectionVisibility || {}
    });
    setStatsForm({
      totalVisitors: payload.stats.totalVisitors || 0,
      totalVisitorsOverride: payload.stats.totalVisitorsOverride ?? '',
      totalReviewsOverride: payload.stats.totalReviewsOverride ?? '',
      totalMembersOverride: payload.stats.totalMembersOverride ?? ''
    });
    setMediaForms(normalizeMediaForms(payload.mediaSlots));
  }, [landingQuery.data]);

  const refreshLanding = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminLanding });
    await queryClient.invalidateQueries({ queryKey: queryKeys.landingPage });
  };

  const settingsMutation = useMutation({
    mutationFn: () => updateAdminLandingSettings(settingsForm),
    onSuccess: async (result) => {
      toast.success(result.message || 'Landing settings updated');
      await refreshLanding();
    },
    onError: (error) => toast.error(error.message || 'Failed to update landing settings')
  });

  const statsMutation = useMutation({
    mutationFn: () => updateAdminLandingStats({
      totalVisitors: coerceNumber(statsForm.totalVisitors, 0),
      totalVisitorsOverride: parseNullableNumber(statsForm.totalVisitorsOverride),
      totalReviewsOverride: parseNullableNumber(statsForm.totalReviewsOverride),
      totalMembersOverride: parseNullableNumber(statsForm.totalMembersOverride)
    }),
    onSuccess: async (result) => {
      toast.success(result.message || 'Landing stats updated');
      await refreshLanding();
    },
    onError: (error) => toast.error(error.message || 'Failed to update landing stats')
  });

  const mediaMutation = useMutation({
    mutationFn: ({ slotKey, payload }) => updateAdminLandingMediaSlot(slotKey, payload),
    onSuccess: async (result) => {
      toast.success(result.message || 'Landing image updated');
      await refreshLanding();
    },
    onError: (error) => toast.error(error.message || 'Failed to update landing image')
  });

  const featuredMutation = useMutation({
    mutationFn: () => {
      const payload = {
        productId: featuredForm.productId || null,
        title: featuredForm.title || undefined,
        description: featuredForm.description || undefined,
        imageUrl: featuredForm.imageUrl || undefined,
        priceLabel: featuredForm.priceLabel || undefined,
        promoText: featuredForm.promoText || undefined,
        ctaText: featuredForm.ctaText || undefined,
        targetLink: featuredForm.targetLink || undefined,
        sortOrder: coerceNumber(featuredForm.sortOrder, 0),
        isActive: Boolean(featuredForm.isActive)
      };
      return featuredEditingId ? updateAdminLandingFeaturedItem(featuredEditingId, payload) : createAdminLandingFeaturedItem(payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || (featuredEditingId ? 'Featured item updated' : 'Featured item created'));
      setFeaturedForm(emptyFeaturedForm);
      setFeaturedEditingId('');
      await refreshLanding();
    },
    onError: (error) => toast.error(error.message || 'Failed to save featured item')
  });

  const contentBlockMutation = useMutation({
    mutationFn: () => {
      const payload = {
        sectionKey: blockForm.sectionKey,
        title: blockForm.title,
        subtitle: blockForm.subtitle || undefined,
        bodyText: blockForm.bodyText || undefined,
        imageUrl: blockForm.imageUrl || undefined,
        iconName: blockForm.iconName || undefined,
        accentLabel: blockForm.accentLabel || undefined,
        ctaText: blockForm.ctaText || undefined,
        targetLink: blockForm.targetLink || undefined,
        layoutStyle: blockForm.layoutStyle,
        sortOrder: coerceNumber(blockForm.sortOrder, 0),
        isActive: Boolean(blockForm.isActive)
      };
      return blockEditingId ? updateAdminLandingContentBlock(blockEditingId, payload) : createAdminLandingContentBlock(payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || (blockEditingId ? 'Content block updated' : 'Content block created'));
      setBlockForm(emptyBlockForm);
      setBlockEditingId('');
      await refreshLanding();
    },
    onError: (error) => toast.error(error.message || 'Failed to save content block')
  });

  const testimonialMutation = useMutation({
    mutationFn: () => {
      const payload = {
        reviewerName: testimonialForm.reviewerName,
        reviewerRole: testimonialForm.reviewerRole || undefined,
        reviewText: testimonialForm.reviewText,
        rating: coerceNumber(testimonialForm.rating, 5),
        avatarUrl: testimonialForm.avatarUrl || undefined,
        sortOrder: coerceNumber(testimonialForm.sortOrder, 0),
        isActive: Boolean(testimonialForm.isActive)
      };
      return testimonialEditingId ? updateAdminLandingTestimonial(testimonialEditingId, payload) : createAdminLandingTestimonial(payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || (testimonialEditingId ? 'Testimonial updated' : 'Testimonial created'));
      setTestimonialForm(emptyTestimonialForm);
      setTestimonialEditingId('');
      await refreshLanding();
    },
    onError: (error) => toast.error(error.message || 'Failed to save testimonial')
  });

  const countryMutation = useMutation({
    mutationFn: () => {
      const payload = {
        countryCode: countryForm.countryCode,
        countryName: countryForm.countryName,
        flagEmoji: countryForm.flagEmoji,
        sortOrder: coerceNumber(countryForm.sortOrder, 0),
        isActive: Boolean(countryForm.isActive)
      };
      return countryEditingId ? updateAdminLandingCountry(countryEditingId, payload) : createAdminLandingCountry(payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || (countryEditingId ? 'Country updated' : 'Country created'));
      setCountryForm(emptyCountryForm);
      setCountryEditingId('');
      await refreshLanding();
    },
    onError: (error) => toast.error(error.message || 'Failed to save country entry')
  });

  const products = useMemo(() => {
    const envelope = productsQuery.data || {};
    return Array.isArray(envelope.data) ? envelope.data : [];
  }, [productsQuery.data]);

  if (landingQuery.isLoading || !settingsForm || !statsForm) return <AdminShellSkeleton />;
  if (landingQuery.isError) return <ErrorState message="Unable to load landing page admin data." onRetry={landingQuery.refetch} />;

  const payload = landingQuery.data?.data || {};
  const mediaSlots = Array.isArray(payload.mediaSlots) ? payload.mediaSlots : [];
  const featuredItems = Array.isArray(payload.featuredItems) ? payload.featuredItems : [];
  const contentBlocks = Array.isArray(payload.contentBlocks) ? payload.contentBlocks : [];
  const testimonials = Array.isArray(payload.testimonials) ? payload.testimonials : [];
  const countries = Array.isArray(payload.countries) ? payload.countries : [];

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Landing Page CMS" subtitle="Control the public homepage hero, featured offers, highlights, testimonials, stats, and country marquee." />

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryPanel title="Landing Summary" items={[
          { label: 'Image slots', value: mediaSlots.length },
          { label: 'Featured items', value: featuredItems.length },
          { label: 'Content blocks', value: contentBlocks.length },
          { label: 'Testimonials', value: testimonials.length },
          { label: 'Countries', value: countries.length }
        ]} />
        <SummaryPanel title="Public Stats" items={[
          { label: 'Visitors base', value: payload.stats.totalVisitors },
          { label: 'Actual reviews', value: payload.stats.actualReviews },
          { label: 'Actual members', value: payload.stats.actualMembers },
          { label: 'Displayed visitors', value: payload.stats.display.totalVisitors }
        ]} />
        <SummaryPanel title="Section Visibility" items={sectionKeys.map((key) => ({ label: key, value: settingsForm.sectionVisibility[key] === false ? 'Hidden' : 'Visible' }))} />
      </div>

      <ActionPanel title="Landing Media" description="Upload and replace the image slots used across the public landing page without code changes.">
        <div className="grid gap-4 lg:grid-cols-2">
          {mediaSlots.map((slot) => {
            const form = mediaForms[slot.slotKey] || { previewUrl: slot.imageUrl || '', imageDataUrl: '', altText: slot.altText || '' };
            const previewUrl = resolveMediaUrl(form.previewUrl);
            const saving = mediaMutation.isPending && mediaMutation.variables?.slotKey === slot.slotKey;

            return (
              <div key={slot.slotKey} className="rounded-2xl border border-white/10 bg-cardSoft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">{slot.title}</p>
                    <p className="mt-1 text-xs text-muted">{slot.sectionKey.replace(/_/g, ' ')} • {slot.slotKey}</p>
                    <p className="mt-2 text-xs text-muted">{slot.description}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-muted">
                    {slot.imageUrl ? 'Configured' : 'Empty'}
                  </span>
                </div>

                <div className="mt-3">
                  {previewUrl ? (
                    <img src={previewUrl} alt={form.altText || slot.title} className="h-40 w-full rounded-xl border border-white/10 object-cover" />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#111827] text-xs text-muted">
                      No image uploaded
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="w-full rounded-xl border border-white/10 bg-card px-3 py-2 text-sm"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        validateLandingImageFile(file);
                        const imageUrl = await compressImageFile(file, {
                          maxWidth: 1600,
                          maxHeight: 1200,
                          mimeType: file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
                        });
                        setMediaForms((prev) => ({
                          ...prev,
                          [slot.slotKey]: {
                            ...(prev[slot.slotKey] || {}),
                            previewUrl: imageUrl,
                            imageDataUrl: imageUrl
                          }
                        }));
                        toast.success(`${slot.title} ready to save`);
                      } catch (error) {
                        toast.error(error.message || 'Image upload failed');
                      } finally {
                        event.target.value = '';
                      }
                    }}
                  />
                  <TextInput
                    value={form.altText}
                      onChange={(e) => setMediaForms((prev) => ({
                        ...prev,
                        [slot.slotKey]: {
                          ...(prev[slot.slotKey] || {}),
                          previewUrl: (prev[slot.slotKey]?.previewUrl ?? slot.imageUrl ?? ''),
                          imageDataUrl: (prev[slot.slotKey]?.imageDataUrl ?? ''),
                          altText: e.target.value
                        }
                      }))}
                    placeholder="Alt text (optional)"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => mediaMutation.mutate({
                        slotKey: slot.slotKey,
                        payload: {
                          imageDataUrl: form.imageDataUrl || undefined,
                          altText: form.altText || null
                        }
                      })}
                      disabled={saving}
                      className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : slot.imageUrl ? 'Replace / Save' : 'Save Image'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteAdminLandingMediaSlot(slot.slotKey);
                          setMediaForms((prev) => ({
                            ...prev,
                            [slot.slotKey]: { previewUrl: '', imageDataUrl: '', altText: '' }
                          }));
                          toast.success('Landing image removed');
                          await refreshLanding();
                        } catch (error) {
                          toast.error(error.message || 'Failed to remove landing image');
                        }
                      }}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ActionPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActionPanel title="Hero And Page Settings" description="Update the landing page brand story, hero content, section headings, and ordering.">
          <div className="space-y-3">
            <TextInput value={settingsForm.heroBadge} onChange={(e) => setSettingsForm((prev) => ({ ...prev, heroBadge: e.target.value }))} placeholder="Hero badge" />
            <TextArea value={settingsForm.heroHeadline} onChange={(e) => setSettingsForm((prev) => ({ ...prev, heroHeadline: e.target.value }))} rows={2} placeholder="Hero headline" />
            <TextArea value={settingsForm.heroSubheadline} onChange={(e) => setSettingsForm((prev) => ({ ...prev, heroSubheadline: e.target.value }))} rows={3} placeholder="Hero subheadline" />
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInput value={settingsForm.heroPrimaryCtaText} onChange={(e) => setSettingsForm((prev) => ({ ...prev, heroPrimaryCtaText: e.target.value }))} placeholder="Primary CTA" />
              <TextInput value={settingsForm.heroSecondaryCtaText} onChange={(e) => setSettingsForm((prev) => ({ ...prev, heroSecondaryCtaText: e.target.value }))} placeholder="Secondary CTA" />
            </div>
            <TextInput value={settingsForm.heroBackgroundNote} onChange={(e) => setSettingsForm((prev) => ({ ...prev, heroBackgroundNote: e.target.value }))} placeholder="Hero note" />
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInput value={settingsForm.featuredSectionTitle} onChange={(e) => setSettingsForm((prev) => ({ ...prev, featuredSectionTitle: e.target.value }))} placeholder="Featured section title" />
              <TextInput value={settingsForm.benefitsSectionTitle} onChange={(e) => setSettingsForm((prev) => ({ ...prev, benefitsSectionTitle: e.target.value }))} placeholder="Benefits section title" />
              <TextInput value={settingsForm.detailsSectionTitle} onChange={(e) => setSettingsForm((prev) => ({ ...prev, detailsSectionTitle: e.target.value }))} placeholder="Details section title" />
              <TextInput value={settingsForm.testimonialsSectionTitle} onChange={(e) => setSettingsForm((prev) => ({ ...prev, testimonialsSectionTitle: e.target.value }))} placeholder="Testimonials section title" />
              <TextInput value={settingsForm.statsSectionTitle} onChange={(e) => setSettingsForm((prev) => ({ ...prev, statsSectionTitle: e.target.value }))} placeholder="Stats section title" />
              <TextInput value={settingsForm.countriesSectionTitle} onChange={(e) => setSettingsForm((prev) => ({ ...prev, countriesSectionTitle: e.target.value }))} placeholder="Countries section title" />
            </div>
            <TextArea value={settingsForm.footerSupportText} onChange={(e) => setSettingsForm((prev) => ({ ...prev, footerSupportText: e.target.value }))} rows={2} placeholder="Footer support text" />
            <TextInput value={settingsForm.footerContactEmail} onChange={(e) => setSettingsForm((prev) => ({ ...prev, footerContactEmail: e.target.value }))} placeholder="Footer contact email" />
            <TextInput value={settingsForm.sectionOrder.join(', ')} onChange={(e) => setSettingsForm((prev) => ({ ...prev, sectionOrder: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} placeholder="Section order, comma separated" />
            <div className="grid gap-2 sm:grid-cols-2">
              {sectionKeys.map((key) => (
                <Toggle key={key} label={`Show ${key}`} checked={settingsForm.sectionVisibility[key] !== false} onChange={(checked) => setSettingsForm((prev) => ({ ...prev, sectionVisibility: { ...prev.sectionVisibility, [key]: checked } }))} />
              ))}
            </div>
            <button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending} className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">
              {settingsMutation.isPending ? 'Saving...' : 'Save Landing Settings'}
            </button>
          </div>
        </ActionPanel>

        <ActionPanel title="Public Stats Overrides" description="Edit base visitor count or apply override values when you need manual display control.">
          <div className="space-y-3">
            <TextInput type="number" value={statsForm.totalVisitors} onChange={(e) => setStatsForm((prev) => ({ ...prev, totalVisitors: e.target.value }))} placeholder="Tracked visitors" />
            <TextInput type="number" value={statsForm.totalVisitorsOverride} onChange={(e) => setStatsForm((prev) => ({ ...prev, totalVisitorsOverride: e.target.value }))} placeholder="Visitors override" />
            <TextInput type="number" value={statsForm.totalReviewsOverride} onChange={(e) => setStatsForm((prev) => ({ ...prev, totalReviewsOverride: e.target.value }))} placeholder="Reviews override" />
            <TextInput type="number" value={statsForm.totalMembersOverride} onChange={(e) => setStatsForm((prev) => ({ ...prev, totalMembersOverride: e.target.value }))} placeholder="Members override" />
            <p className="text-xs text-muted">Leave any override blank to fall back to tracked or calculated data.</p>
            <button onClick={() => statsMutation.mutate()} disabled={statsMutation.isPending} className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">
              {statsMutation.isPending ? 'Saving...' : 'Save Stats'}
            </button>
          </div>
        </ActionPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActionPanel title={featuredEditingId ? 'Edit Featured Item' : 'Create Featured Item'} description="Choose an existing product or create a standalone public showcase card.">
          <div className="space-y-3">
            <select value={featuredForm.productId} onChange={(e) => setFeaturedForm((prev) => ({ ...prev, productId: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
              <option value="">Standalone item</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <TextInput value={featuredForm.title} onChange={(e) => setFeaturedForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title override" />
            <TextArea value={featuredForm.description} onChange={(e) => setFeaturedForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} placeholder="Description" />
            <TextInput value={featuredForm.imageUrl} onChange={(e) => setFeaturedForm((prev) => ({ ...prev, imageUrl: e.target.value }))} placeholder="Image URL" />
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInput value={featuredForm.priceLabel} onChange={(e) => setFeaturedForm((prev) => ({ ...prev, priceLabel: e.target.value }))} placeholder="Price or label" />
              <TextInput value={featuredForm.promoText} onChange={(e) => setFeaturedForm((prev) => ({ ...prev, promoText: e.target.value }))} placeholder="Promo text" />
              <TextInput value={featuredForm.ctaText} onChange={(e) => setFeaturedForm((prev) => ({ ...prev, ctaText: e.target.value }))} placeholder="CTA text" />
              <TextInput value={featuredForm.targetLink} onChange={(e) => setFeaturedForm((prev) => ({ ...prev, targetLink: e.target.value }))} placeholder="Target link" />
              <TextInput type="number" value={featuredForm.sortOrder} onChange={(e) => setFeaturedForm((prev) => ({ ...prev, sortOrder: e.target.value }))} placeholder="Sort order" />
            </div>
            <Toggle label="Active" checked={featuredForm.isActive} onChange={(checked) => setFeaturedForm((prev) => ({ ...prev, isActive: checked }))} />
            <div className="flex gap-2">
              <button onClick={() => featuredMutation.mutate()} disabled={featuredMutation.isPending} className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">
                {featuredMutation.isPending ? 'Saving...' : featuredEditingId ? 'Update Item' : 'Create Item'}
              </button>
              {featuredEditingId ? <button onClick={() => { setFeaturedEditingId(''); setFeaturedForm(emptyFeaturedForm); }} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted">Cancel</button> : null}
            </div>
          </div>
        </ActionPanel>

        <ActionPanel title="Featured Items" description="Current featured cards shown on the public homepage.">
          <div className="space-y-3">
            {featuredItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-cardSoft p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{item.title || item.product_name || 'Untitled item'}</p>
                    <p className="mt-1 text-xs text-muted">Order {item.sort_order} • {item.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setFeaturedEditingId(item.id); setFeaturedForm({ productId: item.product_id || '', title: item.title || '', description: item.description || '', imageUrl: item.image_url || '', priceLabel: item.price_label || '', promoText: item.promo_text || '', ctaText: item.cta_text || '', targetLink: item.target_link || '', sortOrder: item.sort_order || 0, isActive: Boolean(item.is_active) }); }} className="rounded-lg bg-white px-2 py-1 text-xs text-text">Edit</button>
                    <button onClick={async () => { if (!window.confirm('Delete this featured item?')) return; await deleteAdminLandingFeaturedItem(item.id); toast.success('Featured item deleted'); await refreshLanding(); }} className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-200">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ActionPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActionPanel title={blockEditingId ? 'Edit Content Block' : 'Create Content Block'} description="Manage benefits cards and richer promo/detail blocks for the public homepage.">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <select value={blockForm.sectionKey} onChange={(e) => setBlockForm((prev) => ({ ...prev, sectionKey: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
                {contentSectionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select value={blockForm.layoutStyle} onChange={(e) => setBlockForm((prev) => ({ ...prev, layoutStyle: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
                {layoutOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <TextInput value={blockForm.title} onChange={(e) => setBlockForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" />
            <TextInput value={blockForm.subtitle} onChange={(e) => setBlockForm((prev) => ({ ...prev, subtitle: e.target.value }))} placeholder="Subtitle" />
            <TextArea value={blockForm.bodyText} onChange={(e) => setBlockForm((prev) => ({ ...prev, bodyText: e.target.value }))} rows={4} placeholder="Content text" />
            <TextInput value={blockForm.imageUrl} onChange={(e) => setBlockForm((prev) => ({ ...prev, imageUrl: e.target.value }))} placeholder="Image URL" />
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInput value={blockForm.iconName} onChange={(e) => setBlockForm((prev) => ({ ...prev, iconName: e.target.value }))} placeholder="Icon name" />
              <TextInput value={blockForm.accentLabel} onChange={(e) => setBlockForm((prev) => ({ ...prev, accentLabel: e.target.value }))} placeholder="Accent label" />
              <TextInput value={blockForm.ctaText} onChange={(e) => setBlockForm((prev) => ({ ...prev, ctaText: e.target.value }))} placeholder="CTA text" />
              <TextInput value={blockForm.targetLink} onChange={(e) => setBlockForm((prev) => ({ ...prev, targetLink: e.target.value }))} placeholder="Target link" />
              <TextInput type="number" value={blockForm.sortOrder} onChange={(e) => setBlockForm((prev) => ({ ...prev, sortOrder: e.target.value }))} placeholder="Sort order" />
            </div>
            <Toggle label="Active" checked={blockForm.isActive} onChange={(checked) => setBlockForm((prev) => ({ ...prev, isActive: checked }))} />
            <div className="flex gap-2">
              <button onClick={() => contentBlockMutation.mutate()} disabled={contentBlockMutation.isPending} className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">
                {contentBlockMutation.isPending ? 'Saving...' : blockEditingId ? 'Update Block' : 'Create Block'}
              </button>
              {blockEditingId ? <button onClick={() => { setBlockEditingId(''); setBlockForm(emptyBlockForm); }} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted">Cancel</button> : null}
            </div>
          </div>
        </ActionPanel>

        <ActionPanel title="Content Blocks" description="Editable rows for benefits and product-detail messaging.">
          <div className="space-y-3">
            {contentBlocks.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-cardSoft p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{item.title}</p>
                    <p className="mt-1 text-xs text-muted">{item.section_key} • {item.layout_style} • order {item.sort_order}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setBlockEditingId(item.id); setBlockForm({ sectionKey: item.section_key || 'benefits', title: item.title || '', subtitle: item.subtitle || '', bodyText: item.body_text || '', imageUrl: item.image_url || '', iconName: item.icon_name || '', accentLabel: item.accent_label || '', ctaText: item.cta_text || '', targetLink: item.target_link || '', layoutStyle: item.layout_style || 'icon-card', sortOrder: item.sort_order || 0, isActive: Boolean(item.is_active) }); }} className="rounded-lg bg-white px-2 py-1 text-xs text-text">Edit</button>
                    <button onClick={async () => { if (!window.confirm('Delete this content block?')) return; await deleteAdminLandingContentBlock(item.id); toast.success('Content block deleted'); await refreshLanding(); }} className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-200">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ActionPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActionPanel title={testimonialEditingId ? 'Edit Testimonial' : 'Create Testimonial'} description="Manage public reviews and social proof cards.">
          <div className="space-y-3">
            <TextInput value={testimonialForm.reviewerName} onChange={(e) => setTestimonialForm((prev) => ({ ...prev, reviewerName: e.target.value }))} placeholder="Reviewer name" />
            <TextInput value={testimonialForm.reviewerRole} onChange={(e) => setTestimonialForm((prev) => ({ ...prev, reviewerRole: e.target.value }))} placeholder="Reviewer role" />
            <TextArea value={testimonialForm.reviewText} onChange={(e) => setTestimonialForm((prev) => ({ ...prev, reviewText: e.target.value }))} rows={4} placeholder="Review text" />
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInput type="number" min="1" max="5" value={testimonialForm.rating} onChange={(e) => setTestimonialForm((prev) => ({ ...prev, rating: e.target.value }))} placeholder="Rating" />
              <TextInput type="number" value={testimonialForm.sortOrder} onChange={(e) => setTestimonialForm((prev) => ({ ...prev, sortOrder: e.target.value }))} placeholder="Sort order" />
            </div>
            <TextInput value={testimonialForm.avatarUrl} onChange={(e) => setTestimonialForm((prev) => ({ ...prev, avatarUrl: e.target.value }))} placeholder="Avatar URL (optional)" />
            <Toggle label="Active" checked={testimonialForm.isActive} onChange={(checked) => setTestimonialForm((prev) => ({ ...prev, isActive: checked }))} />
            <div className="flex gap-2">
              <button onClick={() => testimonialMutation.mutate()} disabled={testimonialMutation.isPending} className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">
                {testimonialMutation.isPending ? 'Saving...' : testimonialEditingId ? 'Update Testimonial' : 'Create Testimonial'}
              </button>
              {testimonialEditingId ? <button onClick={() => { setTestimonialEditingId(''); setTestimonialForm(emptyTestimonialForm); }} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted">Cancel</button> : null}
            </div>
          </div>
        </ActionPanel>

        <ActionPanel title="Testimonials" description="Current review cards on the public landing page.">
          <div className="space-y-3">
            {testimonials.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-cardSoft p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{item.reviewer_name}</p>
                    <p className="mt-1 text-xs text-muted">{item.reviewer_role || 'Hope member'} • rating {item.rating}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setTestimonialEditingId(item.id); setTestimonialForm({ reviewerName: item.reviewer_name || '', reviewerRole: item.reviewer_role || '', reviewText: item.review_text || '', rating: item.rating || 5, avatarUrl: item.avatar_url || '', sortOrder: item.sort_order || 0, isActive: Boolean(item.is_active) }); }} className="rounded-lg bg-white px-2 py-1 text-xs text-text">Edit</button>
                    <button onClick={async () => { if (!window.confirm('Delete this testimonial?')) return; await deleteAdminLandingTestimonial(item.id); toast.success('Testimonial deleted'); await refreshLanding(); }} className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-200">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ActionPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActionPanel title={countryEditingId ? 'Edit Country Entry' : 'Create Country Entry'} description="Control the country flag marquee at the bottom of the public landing page.">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInput value={countryForm.countryCode} onChange={(e) => setCountryForm((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))} placeholder="Country code" />
              <TextInput value={countryForm.flagEmoji} onChange={(e) => setCountryForm((prev) => ({ ...prev, flagEmoji: e.target.value }))} placeholder="Flag emoji" />
            </div>
            <TextInput value={countryForm.countryName} onChange={(e) => setCountryForm((prev) => ({ ...prev, countryName: e.target.value }))} placeholder="Country name" />
            <TextInput type="number" value={countryForm.sortOrder} onChange={(e) => setCountryForm((prev) => ({ ...prev, sortOrder: e.target.value }))} placeholder="Sort order" />
            <Toggle label="Active" checked={countryForm.isActive} onChange={(checked) => setCountryForm((prev) => ({ ...prev, isActive: checked }))} />
            <div className="flex gap-2">
              <button onClick={() => countryMutation.mutate()} disabled={countryMutation.isPending} className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">
                {countryMutation.isPending ? 'Saving...' : countryEditingId ? 'Update Country' : 'Create Country'}
              </button>
              {countryEditingId ? <button onClick={() => { setCountryEditingId(''); setCountryForm(emptyCountryForm); }} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted">Cancel</button> : null}
            </div>
          </div>
        </ActionPanel>

        <ActionPanel title="Country Marquee Entries" description="Enabled countries appear in the animated flag strip.">
          <div className="space-y-3">
            {countries.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-cardSoft p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{item.flag_emoji} {item.country_name}</p>
                    <p className="mt-1 text-xs text-muted">{item.country_code} • order {item.sort_order}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setCountryEditingId(item.id); setCountryForm({ countryCode: item.country_code || '', countryName: item.country_name || '', flagEmoji: item.flag_emoji || '', sortOrder: item.sort_order || 0, isActive: Boolean(item.is_active) }); }} className="rounded-lg bg-white px-2 py-1 text-xs text-text">Edit</button>
                    <button onClick={async () => { if (!window.confirm('Delete this country entry?')) return; await deleteAdminLandingCountry(item.id); toast.success('Country entry deleted'); await refreshLanding(); }} className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-200">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ActionPanel>
      </div>
    </div>
  );
}
