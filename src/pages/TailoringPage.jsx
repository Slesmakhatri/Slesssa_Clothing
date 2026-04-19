import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SectionTitle from '../components/common/SectionTitle';
import TailorMapPicker from '../components/tailoring/TailorMapPicker';
import { storefrontProducts } from '../data/storefront';
import { createMeasurement, createTailoringRequest, getDesignSuggestion, getMeasurementSuggestion, getTailorRecommendation, hasAuthSession, listTailorProfiles, listTailoringRequests } from '../services/api';
import { getSuggestedSustainableFabrics, getSustainabilityGuidanceForFabric } from '../services/sustainability';

const clothingTypes = ['Custom Dress', 'Kurta Set', 'Formal Shirt', 'Coat / Jacket', 'Blazer', 'Suit', 'Skirt', 'Sherwani', 'Daura Suruwal'];
const fabrics = ['Premium Cotton', 'Linen Blend', 'Silk Blend', 'Wool Blend', 'Satin Finish', 'Soft Denim'];
const colors = ['Ivory', 'Black', 'Rose', 'Camel', 'Navy', 'Olive', 'Blush', 'Stone'];
const occasions = ['Everyday Wear', 'Office Wear', 'Party Wear', 'Bridal', 'Festive', 'Travel', 'Evening Event'];
const styles = ['Minimal', 'Traditional', 'Formal', 'Modern Fusion', 'Soft Feminine', 'Structured Tailoring'];
const deliveryOptions = ['Standard Delivery', 'Priority Delivery', 'Need by specific date'];
const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Custom Measurements'];
const cityCenters = {
  Kathmandu: { label: 'Kathmandu', latitude: 27.7172, longitude: 85.324 },
  Lalitpur: { label: 'Lalitpur', latitude: 27.6644, longitude: 85.3188 },
  Bhaktapur: { label: 'Bhaktapur', latitude: 27.671, longitude: 85.4298 },
  Pokhara: { label: 'Pokhara', latitude: 28.2096, longitude: 83.9856 },
  Butwal: { label: 'Butwal', latitude: 27.7006, longitude: 83.4483 },
  Biratnagar: { label: 'Biratnagar', latitude: 26.4525, longitude: 87.2718 }
};

function buildReferencePayload(product) {
  if (!product) return null;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name || product.title,
    image: product.image,
    vendor: product.vendor_detail?.id || product.vendor || product.vendor_id || null,
    vendorName: product.vendor_detail?.brand_name || product.vendor_name || '',
    category: product.category,
    garmentType: product.garmentType,
    audience: product.audience,
    colors: product.colors || [],
    description: product.description || ''
  };
}

function formatAssignment(request) {
  if (request.is_self_tailor) return `Custom Tailor${request.self_tailor_name ? ` - ${request.self_tailor_name}` : ''}`;
  if (request.tailor_profile_detail?.full_name || request.assigned_tailor_detail?.full_name) {
    return request.tailor_profile_detail?.full_name || request.assigned_tailor_detail?.full_name || request.assigned_tailor_detail?.email;
  }
  if (request.vendor_detail?.brand_name) return `${request.vendor_detail.brand_name} team`;
  return 'Assigned internally';
}

function firstError(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return firstError(value[0]);
  if (typeof value === 'object') return firstError(Object.values(value)[0]);
  return String(value);
}

function mapTailoringApiErrors(payload = {}) {
  const fieldMap = {
    clothing_type: 'clothingType',
    fabric: 'fabric',
    color: 'color',
    design_notes: 'designNotes',
    inspiration_image: 'inspiration',
    measurement: 'measurements'
  };

  return Object.entries(fieldMap).reduce((mapped, [apiField, formField]) => {
    const message = firstError(payload?.[apiField]);
    return message ? { ...mapped, [formField]: message } : mapped;
  }, {});
}

function matchClothingType(garmentType, fallback) {
  const normalized = String(garmentType || '').toLowerCase();
  if (!normalized) return fallback;
  return clothingTypes.find((item) => item.toLowerCase().includes(normalized) || normalized.includes(item.toLowerCase().split(' ')[0])) || fallback;
}

function matchStylePreference(styleDirection, fallback) {
  const normalized = String(styleDirection || '').toLowerCase();
  if (!normalized) return fallback;
  return styles.find((item) => normalized.includes(item.toLowerCase().split(' ')[0])) || fallback;
}

function buildDesignBrief(suggestion) {
  if (!suggestion) return '';
  return [
    `AI design suggestion: ${suggestion.title}`,
    `Style: ${suggestion.style_direction}`,
    `Fabric: ${suggestion.fabric}`,
    `Color: ${(suggestion.colors || []).join(', ')}`,
    `Fit: ${suggestion.fit || 'Regular made-to-measure fit'}`,
    `Neckline: ${suggestion.neckline || 'Clean neckline'}`,
    suggestion.pattern_ideas?.length ? `Details: ${suggestion.pattern_ideas.join(', ')}` : '',
    suggestion.notes ? `Notes: ${suggestion.notes}` : ''
  ].filter(Boolean).join('\n');
}

function TailoringPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeReference = useMemo(() => buildReferencePayload(location.state?.referenceProduct), [location.state]);
  const [requests, setRequests] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [tailorsLoading, setTailorsLoading] = useState(false);
  const [tailorError, setTailorError] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [tailorSelectionMode, setTailorSelectionMode] = useState('auto');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [selectedTailorId, setSelectedTailorId] = useState(null);
  const [customerLocation, setCustomerLocation] = useState({
    city: 'Kathmandu',
    label: cityCenters.Kathmandu.label,
    latitude: cityCenters.Kathmandu.latitude,
    longitude: cityCenters.Kathmandu.longitude
  });
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState(routeReference);
  const [form, setForm] = useState({
    clothingType: routeReference?.category || 'Custom Dress',
    fabric: 'Premium Cotton',
    color: routeReference?.colors?.[0] || 'Ivory',
    standardSize: 'M',
    chest: '',
    waist: '',
    hip: '',
    shoulder: '',
    sleeveLength: '',
    inseam: '',
    neck: '',
    height: '',
    occasionPreference: 'Everyday Wear',
    stylePreference: 'Minimal',
    deliveryPreference: 'Standard Delivery',
    preferredDeliveryDate: '',
    designNotes: routeReference ? `I want this inspired by ${routeReference.name}, with my own fit and finish.` : '',
    inspirationImage: null
  });
  const [measurementProfile, setMeasurementProfile] = useState({
    gender: 'female',
    height: '165',
    weight: '60',
    bodyType: 'average',
    fitPreference: 'regular'
  });
  const [measurementSuggestion, setMeasurementSuggestion] = useState(null);
  const [measurementSuggestionLoading, setMeasurementSuggestionLoading] = useState(false);
  const [measurementSuggestionError, setMeasurementSuggestionError] = useState('');
  const [designPrompt, setDesignPrompt] = useState('modern kurta for wedding');
  const [designSuggestion, setDesignSuggestion] = useState(null);
  const [designSuggestionLoading, setDesignSuggestionLoading] = useState(false);
  const [designSuggestionError, setDesignSuggestionError] = useState('');

  useEffect(() => {
    listTailoringRequests().then(setRequests).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!routeReference) return;
    setSelectedSuggestion(routeReference);
    setForm((current) => ({
      ...current,
      clothingType: routeReference.category || current.clothingType,
      color: routeReference.colors?.[0] || current.color,
      designNotes: current.designNotes || `I want this inspired by ${routeReference.name}, with my own fit and finish.`
    }));
  }, [routeReference]);

  useEffect(() => {
    if (!form.inspirationImage) {
      setPreviewUrl('');
      return undefined;
    }
    const nextPreviewUrl = URL.createObjectURL(form.inspirationImage);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [form.inspirationImage]);

  useEffect(() => {
    let active = true;
    async function loadTailors() {
      setTailorsLoading(true);
      setTailorError('');
      try {
        const items = await listTailorProfiles({
          available: true,
          city: customerLocation.city,
          latitude: customerLocation.latitude,
          longitude: customerLocation.longitude
        });
        if (!active) return;
        setTailors(items);
        setSelectedTailorId((current) => (current && items.some((item) => item.user === current) ? current : null));
      } catch {
        if (!active) return;
        setTailors([]);
        setTailorError('Could not load nearby tailors right now.');
      } finally {
        if (active) setTailorsLoading(false);
      }
    }
    loadTailors();
    return () => {
      active = false;
    };
  }, [customerLocation]);

  useEffect(() => {
    let active = true;
    async function loadRecommendation() {
      if (!tailors.length) {
        setRecommendation(null);
        setRecommendationError('');
        if (tailorSelectionMode === 'auto') setSelectedTailorId(null);
        return;
      }
      setRecommendationLoading(true);
      setRecommendationError('');
      try {
        const result = await getTailorRecommendation({
          clothing_type: form.clothingType,
          style_preference: form.stylePreference,
          preferred_delivery_date: form.preferredDeliveryDate || null,
          city: customerLocation.city,
          latitude: customerLocation.latitude,
          longitude: customerLocation.longitude
        });
        if (!active) return;
        const recommendedUserId = result?.recommended_tailor?.user || null;
        setRecommendation(result);
        if (tailorSelectionMode === 'auto' && recommendedUserId) {
          setSelectedTailorId(recommendedUserId);
        }
      } catch {
        if (!active) return;
        setRecommendation(null);
        setRecommendationError('Could not generate a tailor recommendation right now. You can still choose manually.');
      } finally {
        if (active) setRecommendationLoading(false);
      }
    }
    loadRecommendation();
    return () => {
      active = false;
    };
  }, [
    customerLocation.city,
    customerLocation.latitude,
    customerLocation.longitude,
    form.clothingType,
    form.stylePreference,
    form.preferredDeliveryDate,
    tailorSelectionMode,
    tailors.length
  ]);

  const suggestionCards = useMemo(() => {
    const keyword = String(form.clothingType || '').toLowerCase();
    const baseSlug = selectedSuggestion?.slug;
    const matches = storefrontProducts.filter((product) => {
      if (product.slug === baseSlug) return false;
      const haystack = [product.category, product.garmentType, ...(product.tags || [])].join(' ').toLowerCase();
      return !keyword || haystack.includes(keyword.split(' ')[0]);
    });
    return (matches.length ? matches : storefrontProducts.filter((product) => product.slug !== baseSlug)).slice(0, 6);
  }, [form.clothingType, selectedSuggestion]);

  const estimatedRange = useMemo(() => {
    if (/coat|jacket|sherwani/i.test(form.clothingType)) return 'NPR 8,500 - 12,000';
    if (/dress|blazer|kurta/i.test(form.clothingType)) return 'NPR 6,800 - 10,200';
    return 'NPR 4,500 - 7,900';
  }, [form.clothingType]);
  const fabricSustainability = useMemo(
    () => getSustainabilityGuidanceForFabric(form.fabric, { forTailoring: true }),
    [form.fabric]
  );
  const sustainableFabricAlternatives = useMemo(
    () => getSuggestedSustainableFabrics(fabrics, form.fabric),
    [form.fabric]
  );

  const hasMeasurements = Boolean(form.standardSize || form.chest || form.waist || form.hip || form.shoulder || form.sleeveLength || form.inseam || form.neck || form.height);
  const selectedTailor = tailors.find((item) => item.user === selectedTailorId) || null;
  const recommendedTailor = tailors.find((item) => item.user === recommendation?.recommended_tailor?.user) || recommendation?.recommended_tailor || null;

  function handleSelectTailor(tailorUserId, mode = 'manual') {
    setSelectedTailorId(tailorUserId);
    setTailorSelectionMode(mode);
  }

  function handleAcceptRecommendation() {
    if (!recommendedTailor?.user) return;
    setSelectedTailorId(recommendedTailor.user);
    setTailorSelectionMode('recommended');
    setStatus(`Recommended tailor selected: ${recommendedTailor.full_name || recommendedTailor.user_detail?.full_name || recommendedTailor.user_detail?.email}.`);
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '', inspiration: '', measurements: '' }));
    setStatus('');
  }

  function handleSelectSuggestion(product) {
    const reference = buildReferencePayload(product);
    setSelectedSuggestion(reference);
    setErrors((current) => ({ ...current, inspiration: '' }));
    setDesignPrompt(`${product.audience || ''} ${product.category || product.garmentType || 'custom outfit'} inspired by ${product.name}`.trim());
    setDesignSuggestionError('');
    setForm((current) => ({
      ...current,
      clothingType: product.category || current.clothingType,
      color: product.colors?.[0] || current.color,
      designNotes: current.designNotes || `Use ${reference.name} as the starting point, then personalize the silhouette and fit for me.`
    }));
  }

  function updateMeasurementProfile(name, value) {
    setMeasurementProfile((current) => ({ ...current, [name]: value }));
    setMeasurementSuggestionError('');
  }

  async function handleGenerateMeasurements() {
    if (!hasAuthSession()) {
      setStatus('Please log in before using the smart measurement assistant.');
      navigate('/login', { state: { from: '/tailoring', message: 'Please log in before using the smart measurement assistant.' } });
      return;
    }

    setMeasurementSuggestionLoading(true);
    setMeasurementSuggestionError('');
    try {
      const suggestion = await getMeasurementSuggestion({
        gender: measurementProfile.gender,
        height: measurementProfile.height || null,
        weight: measurementProfile.weight || null,
        body_type: measurementProfile.bodyType,
        fit_preference: measurementProfile.fitPreference,
        standard_size: form.standardSize,
        clothing_type: form.clothingType
      });
      const measurements = suggestion.measurements || {};
      setMeasurementSuggestion(suggestion);
      setForm((current) => ({
        ...current,
        standardSize: current.standardSize || 'Custom Measurements',
        chest: measurements.chest ?? current.chest,
        waist: measurements.waist ?? current.waist,
        hip: measurements.hip ?? current.hip,
        shoulder: measurements.shoulder ?? current.shoulder,
        sleeveLength: measurements.sleeve_length ?? current.sleeveLength,
        inseam: measurements.inseam ?? current.inseam,
        neck: measurements.neck ?? current.neck,
        height: measurements.height ?? current.height
      }));
      setErrors((current) => ({ ...current, measurements: '' }));
      setStatus('Smart measurement estimate added. Review and edit the values before submitting.');
    } catch (error) {
      setMeasurementSuggestion(null);
      setMeasurementSuggestionError(error?.message || 'Could not generate measurement estimates right now.');
    } finally {
      setMeasurementSuggestionLoading(false);
    }
  }

  async function handleGenerateDesignSuggestion() {
    const prompt = designPrompt.trim();
    if (!prompt) {
      setDesignSuggestionError('Describe the design you want, for example: modern kurta for wedding.');
      return;
    }

    setDesignSuggestionLoading(true);
    setDesignSuggestionError('');
    try {
      const payload = await getDesignSuggestion({
        prompt,
        occasion: form.occasionPreference,
        preferred_colors: form.color ? [form.color] : []
      });
      const suggestion = payload?.suggestion || payload;
      if (!suggestion?.title) {
        throw new Error(payload?.message || 'Design suggestion response was empty.');
      }
      setDesignSuggestion(suggestion);
      setForm((current) => ({
        ...current,
        clothingType: matchClothingType(suggestion.garment_type, current.clothingType),
        fabric: suggestion.fabric || current.fabric,
        color: suggestion.colors?.[0] || current.color,
        stylePreference: matchStylePreference(suggestion.style_direction, current.stylePreference),
        designNotes: buildDesignBrief(suggestion)
      }));
      setErrors((current) => ({ ...current, designNotes: '', clothingType: '', fabric: '', color: '' }));
      setStatus('AI design suggestion applied to your tailoring brief. You can edit every field.');
    } catch (error) {
      setDesignSuggestion(null);
      setDesignSuggestionError(error?.message || 'Could not generate a design suggestion right now.');
    } finally {
      setDesignSuggestionLoading(false);
    }
  }

  function renderDesignRecommendationPanel() {
    const shouldShowResult = designSuggestionLoading || designSuggestionError || designSuggestion;

    return (
      <section className="tailoring-group-card ai-design-stage-card">
        <div className="tailoring-group-head">
          <span className="section-eyebrow">AI Design Recommendation</span>
          <h5>Generate a design brief from your inspiration</h5>
          <p>Type your idea or select a similar design above, then generate a structured recommendation before customizing the details.</p>
        </div>
        <div className="ai-tailoring-panel">
          <div>
            <h6>Turn a short idea into a structured tailoring brief</h6>
            <p>Example: modern kurta for wedding, minimal ivory blazer, or relaxed festive dress.</p>
          </div>
          <div className="ai-tailoring-controls">
            <input
              className="form-control premium-input"
              value={designPrompt}
              onChange={(event) => {
                setDesignPrompt(event.target.value);
                setDesignSuggestionError('');
              }}
              placeholder="Describe the design you want"
            />
            <button type="button" className="btn btn-slessaa btn-slessaa-primary" onClick={handleGenerateDesignSuggestion} disabled={designSuggestionLoading}>
              {designSuggestionLoading ? 'Generating...' : 'Generate Design'}
            </button>
          </div>
          {shouldShowResult ? (
            <div className="ai-design-result-slot">
              {designSuggestionError ? <div className="invalid-feedback d-block">{designSuggestionError}</div> : null}
              {designSuggestionLoading ? (
                <div className="ai-suggestion-card ai-suggestion-card--loading">
                  <div className="design-visual-placeholder" aria-hidden="true">
                    <span></span>
                  </div>
                  <strong>Generating your design direction and image</strong>
                  <p>Reading the prompt and matching it to style, fabric, fit, neckline, color guidance, and a visual preview.</p>
                </div>
              ) : null}
              {designSuggestion ? (
                <div className="ai-suggestion-card ai-suggestion-card--revealed">
                  {designSuggestion.image_url ? (
                    <div className="design-suggestion-visual">
                      <img src={designSuggestion.image_url} alt={`${designSuggestion.title} visual design`} />
                      <small>
                        {designSuggestion.image_generation_status === 'fallback'
                          ? 'Fallback visual based on your prompt'
                          : designSuggestion.image_source
                            ? `Image source: ${designSuggestion.image_source}`
                            : 'Generated visual design'}
                      </small>
                    </div>
                  ) : (
                    <div className="design-visual-fallback">
                      <strong>Visual preview unavailable</strong>
                      <p>The design brief is still ready to use.</p>
                    </div>
                  )}
                  <div>
                    <strong>{designSuggestion.title}</strong>
                    <span>{designSuggestion.occasion}</span>
                  </div>
                  <div className="tailoring-sustainability-chips">
                    <span className="chip">{designSuggestion.style_direction}</span>
                    <span className="chip">{designSuggestion.fabric}</span>
                    <span className="chip">{designSuggestion.fit}</span>
                    <span className="chip">{designSuggestion.neckline}</span>
                    {(designSuggestion.colors || []).slice(0, 2).map((item) => <span key={item} className="chip">{item}</span>)}
                  </div>
                  <p>{designSuggestion.notes}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  function handleCityChange(nextCity) {
    const preset = cityCenters[nextCity];
    setCustomerLocation({ city: nextCity, label: preset.label, latitude: preset.latitude, longitude: preset.longitude });
  }

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus('Live geolocation is not available in this browser. Use the city selector instead.');
      return;
    }
    setDetectingLocation(true);
    setStatus('');
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }));
      setCustomerLocation((current) => ({
        ...current,
        label: 'Current location',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }));
    } catch {
      setStatus('Could not detect your location. Showing nearby tailors from the selected city instead.');
    } finally {
      setDetectingLocation(false);
    }
  }

  function validateForm() {
    const nextErrors = {};
    if (!selectedSuggestion && !form.inspirationImage && !designSuggestion) nextErrors.inspiration = 'Please upload an inspiration image, choose a similar design, or generate an AI design suggestion.';
    if (!form.clothingType) nextErrors.clothingType = 'Please choose a clothing type.';
    if (!form.fabric.trim()) nextErrors.fabric = 'Please choose or enter a fabric preference.';
    if (!form.color.trim()) nextErrors.color = 'Please choose or enter a color preference.';
    if (!hasMeasurements) nextErrors.measurements = 'Please add a standard size or at least one measurement.';
    if (!form.designNotes.trim()) nextErrors.designNotes = 'Please tell us how you want the piece personalized.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) {
      setStatus('Please complete the highlighted customization details.');
      return;
    }

    if (!hasAuthSession()) {
      setStatus('Please log in before submitting your customization request.');
      navigate('/login', { state: { from: '/tailoring', message: 'Please log in before submitting your customization request.' } });
      return;
    }

    try {
      let measurementId = null;
      const measurementNotes = [];
      if (form.standardSize) measurementNotes.push(`Preferred size: ${form.standardSize}`);
      if (selectedTailor?.location_name || selectedTailor?.city) measurementNotes.push(`Nearby tailor preference: ${selectedTailor?.location_name || selectedTailor?.city}`);
      if (form.designNotes) measurementNotes.push(`Design brief: ${form.designNotes}`);

      if (hasMeasurements) {
        const measurement = await createMeasurement({
          chest: form.chest || null,
          waist: form.waist || null,
          hip: form.hip || null,
          shoulder: form.shoulder || null,
          sleeve_length: form.sleeveLength || null,
          inseam: form.inseam || null,
          neck: form.neck || null,
          height: form.height || null,
          source: measurementSuggestion ? 'smart_measurement_assistant' : 'manual',
          confidence_score: measurementSuggestion?.measurements?.confidence_score || null,
          suggestion_explanation: measurementSuggestion?.explanation || '',
          suggestion_basis: measurementSuggestion?.basis || [],
          body_profile: measurementSuggestion?.input_summary || {},
          notes: measurementNotes.join('\n')
        });
        measurementId = measurement.id;
      }

      const data = new FormData();
      data.append('clothing_type', form.clothingType);
      data.append('fabric', form.fabric);
      data.append('color', form.color);
      data.append('standard_size', form.standardSize);
      data.append('occasion_preference', form.occasionPreference);
      data.append('style_preference', form.stylePreference);
      data.append('delivery_preference', form.deliveryPreference);
      data.append('design_notes', form.designNotes);
      if (form.preferredDeliveryDate) data.append('preferred_delivery_date', form.preferredDeliveryDate);
      if (measurementId) data.append('measurement', measurementId);
      if (selectedTailorId) data.append('assigned_tailor', selectedTailorId);
      if (typeof selectedSuggestion?.vendor === 'number') data.append('vendor', selectedSuggestion.vendor);
      if (typeof selectedSuggestion?.id === 'number') data.append('reference_product_id', selectedSuggestion.id);
      if (selectedSuggestion?.slug) data.append('reference_product_slug', selectedSuggestion.slug);
      if (selectedSuggestion?.name) data.append('reference_product_name', selectedSuggestion.name);
      if (selectedSuggestion?.image) data.append('reference_product_image', selectedSuggestion.image);
      if (form.inspirationImage) data.append('inspiration_image', form.inspirationImage);

      const created = await createTailoringRequest(data);
      setRequests((current) => [created, ...current]);
      const assignedTailorName = created.assigned_tailor_detail?.full_name || created.assigned_tailor_detail?.email;
      const assignedVendorName = created.vendor_detail?.brand_name;
      const successMessage = assignedTailorName
        ? `Your customization request has been created and assigned to ${assignedTailorName}.`
        : assignedVendorName
          ? `Your customization request has been created and routed to ${assignedVendorName}.`
          : 'Your customization request has been created. Our team will review it and assign the right maker internally.';
      setStatus(successMessage);
      setErrors({});
    } catch (error) {
      const authMessage = error?.status === 401 ? 'Your session expired. Please log in again to submit the customization request.' : '';
      const apiFieldErrors = mapTailoringApiErrors(error?.payload);
      if (Object.keys(apiFieldErrors).length) {
        setErrors((current) => ({ ...current, ...apiFieldErrors }));
      }
      setStatus(authMessage || error?.message || 'Could not submit your customization request. Please review the details and try again.');
    }
  }

  return (
    <>
      <section className="page-hero compact-hero customization-hero">
        <div className="container">
          <span className="section-eyebrow">Personal Customization</span>
          <h1>Customized only for you</h1>
          <p>Choose a similar design, personalize the details, and pick a nearby tailor if you want location-aware support.</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container customization-shell">
          <div className="customization-story-card">
            <div className="customization-story-copy">
              <span className="section-eyebrow">Made To Match Your Style</span>
              <h3>Start from a design you love, then shape it into your own perfect fit.</h3>
              <p>This flow now supports nearby tailor discovery. You can choose a tailor yourself or leave routing to the internal workflow.</p>
            </div>
            <div className="customization-story-points">
              <div><strong>1</strong><span>Pick a similar design or upload an image</span></div>
              <div><strong>2</strong><span>Find nearby tailors on the map</span></div>
              <div><strong>3</strong><span>Submit measurements and request details</span></div>
            </div>
          </div>

          <div className="row g-4 align-items-start">
            <div className="col-lg-8">
              <form className="tailoring-form-card customization-form-card" onSubmit={(event) => event.preventDefault()}>
                <SectionTitle eyebrow="Customization Request" title="Personalize your perfect fit" text="Upload a photo or choose a similar style suggestion first, then choose the tailor option that works best for you." align="start" />
                {status ? <div className="alert alert-info">{status}</div> : null}

                <div className="tailoring-form-grid">
                  <section className="tailoring-group-card inspiration-stage-card">
                    <div className="tailoring-group-head">
                      <h5>Inspiration image or similar design</h5>
                      <p>This is the main reference for your custom request.</p>
                    </div>
                    <div className="premium-upload-box">
                      <div>
                        <strong>Upload your inspiration</strong>
                        <p>Share a picture of the look, silhouette, or detail you want recreated in your own way.</p>
                      </div>
                      <input className="form-control premium-input" type="file" accept="image/*" onChange={(event) => updateField('inspirationImage', event.target.files?.[0] || null)} />
                    </div>

                    {(selectedSuggestion || previewUrl) ? (
                      <div className="customization-reference-preview">
                        {previewUrl ? (
                          <div className="customization-preview-block">
                            <span className="customization-preview-label">Uploaded inspiration</span>
                            <img src={previewUrl} alt="Uploaded inspiration" className="customization-preview-image" />
                          </div>
                        ) : null}
                        {selectedSuggestion ? (
                          <div className="customization-preview-block product">
                            <span className="customization-preview-label">Selected similar design</span>
                            <div className="selected-design-card">
                              <img src={selectedSuggestion.image} alt={selectedSuggestion.name} className="customization-preview-image" />
                              <div>
                                <h4>{selectedSuggestion.name}</h4>
                                <p>{selectedSuggestion.category} - {selectedSuggestion.audience}</p>
                                <small>{selectedSuggestion.description}</small>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {errors.inspiration ? <div className="invalid-feedback d-block">{errors.inspiration}</div> : null}
                  </section>

                  {renderDesignRecommendationPanel()}

                  <section className="tailoring-group-card">
                    <div className="tailoring-group-head">
                      <h5>Choose a similar design</h5>
                      <p>Pick a fashion reference to prefill your request and keep the visual direction clear.</p>
                    </div>
                    <div className="customization-suggestion-grid">
                      {suggestionCards.map((product) => {
                        const active = selectedSuggestion?.slug === product.slug;
                        return (
                          <button key={product.slug} type="button" className={`customization-suggestion-card ${active ? 'active' : ''}`} onClick={() => handleSelectSuggestion(product)}>
                            <img src={product.image} alt={product.name} />
                            <div>
                              <strong>{product.name}</strong>
                              <span>{product.category}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="tailoring-group-card">
                    <div className="tailoring-group-head">
                      <h5>Find nearby tailors</h5>
                      <p>Use smart recommendation first, then override manually any time from the map or shortlist.</p>
                    </div>
                    <div className="tailor-location-toolbar">
                      <div className="row g-3 align-items-end">
                        <div className="col-md-6">
                          <label className="premium-label">Your area</label>
                          <select className="form-select premium-input" value={customerLocation.city} onChange={(event) => handleCityChange(event.target.value)}>
                            {Object.keys(cityCenters).map((city) => <option key={city} value={city}>{city}</option>)}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <button type="button" className="btn btn-slessaa btn-slessaa-outline w-100" onClick={handleUseCurrentLocation} disabled={detectingLocation}>
                            {detectingLocation ? 'Detecting location...' : 'Use Current Location'}
                          </button>
                        </div>
                      </div>
                      <div className="tailor-location-meta">
                        <span>Reference point: {customerLocation.label}</span>
                        <span>{customerLocation.latitude.toFixed(3)}, {customerLocation.longitude.toFixed(3)}</span>
                      </div>
                    </div>
                    <div className="tailor-recommendation-panel">
                      <div className="tailor-recommendation-head">
                        <div>
                          <span className="section-eyebrow">Smart Tailor Match</span>
                          <h6>Recommended tailor for this request</h6>
                        </div>
                        {recommendation?.score ? <span className="request-status-pill">Match score {Math.round(recommendation.score)}/100</span> : null}
                      </div>
                      {recommendationLoading ? (
                        <div className="filter-empty-state mb-0">
                          <h4>Scoring available tailors</h4>
                          <p>Comparing rating, workload, experience, and delivery speed for your request.</p>
                        </div>
                      ) : recommendedTailor ? (
                        <div className="tailor-recommendation-body">
                          <div className="tailor-recommendation-summary">
                            <div>
                              <strong>{recommendedTailor.full_name || recommendedTailor.user_detail?.full_name || recommendedTailor.user_detail?.email}</strong>
                              <span>{recommendedTailor.specialization || 'Custom tailoring specialist'}</span>
                            </div>
                            <div className="tailor-nearby-meta compact">
                              <span>{recommendedTailor.rating ? `${recommendedTailor.rating}/5 rating` : 'New profile'}</span>
                              <span>{recommendedTailor.years_of_experience || 0}+ yrs exp</span>
                              <span>
                                {recommendation?.delivery_metrics?.average_turnaround_days != null
                                  ? `${recommendation.delivery_metrics.average_turnaround_days} day avg delivery`
                                  : 'Delivery speed estimated from current availability'}
                              </span>
                            </div>
                          </div>
                          <p className="tailor-recommendation-copy">{recommendation.explanation}</p>
                          {recommendation?.reasons?.length ? (
                            <div className="tailoring-sustainability-chips">
                              {recommendation.reasons.map((reason) => (
                                <span key={reason} className="chip">{reason}</span>
                              ))}
                            </div>
                          ) : null}
                          {recommendation?.score_breakdown ? (
                            <div className="tailor-score-grid">
                              <div><span>Rating</span><strong>{Math.round(recommendation.score_breakdown.rating)}</strong></div>
                              <div><span>Workload</span><strong>{Math.round(recommendation.score_breakdown.workload)}</strong></div>
                              <div><span>Experience</span><strong>{Math.round(recommendation.score_breakdown.experience)}</strong></div>
                              <div><span>Delivery</span><strong>{Math.round(recommendation.score_breakdown.delivery_time)}</strong></div>
                            </div>
                          ) : null}
                          <div className="tailor-recommendation-actions">
                            <button type="button" className="btn btn-slessaa btn-slessaa-primary" onClick={handleAcceptRecommendation}>
                              Accept Recommendation
                            </button>
                            <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={() => setTailorSelectionMode('manual')}>
                              Choose Manually
                            </button>
                          </div>
                          {recommendation?.alternatives?.length ? (
                            <div className="tailor-recommendation-alt">
                              <strong>Also worth considering</strong>
                              <div className="tailor-recommendation-alt-list">
                                {recommendation.alternatives.map((item) => (
                                  <button
                                    key={item.tailor.id}
                                    type="button"
                                    className="tailor-alt-pill"
                                    onClick={() => handleSelectTailor(item.tailor.user, 'manual')}
                                  >
                                    {item.tailor.full_name || item.tailor.user_detail?.full_name || item.tailor.user_detail?.email}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="filter-empty-state mb-0">
                          <h4>No recommendation available yet</h4>
                          <p>{recommendationError || 'We could not score a tailor right now, but you can still choose manually below.'}</p>
                        </div>
                      )}
                    </div>
                    <TailorMapPicker tailors={tailors} selectedTailorId={selectedTailorId} onSelectTailor={(tailor) => handleSelectTailor(tailor.user, 'manual')} customerLocation={customerLocation} />
                    {tailorError ? <div className="alert alert-warning mt-3 mb-0">{tailorError}</div> : null}
                    <div className="tailor-nearby-grid">
                      {tailorsLoading ? (
                        <div className="filter-empty-state">
                          <h4>Loading nearby tailors</h4>
                          <p>Checking the closest available tailoring partners for your selected area.</p>
                        </div>
                      ) : tailors.length ? (
                        tailors.map((tailor) => {
                          const active = tailor.user === selectedTailorId;
                          return (
                            <button key={tailor.id} type="button" className={`tailor-nearby-card ${active ? 'active' : ''}`} onClick={() => handleSelectTailor(tailor.user, 'manual')}>
                              <div className="tailor-nearby-head">
                                <div>
                                  <strong>{tailor.full_name || tailor.user_detail?.full_name || tailor.user_detail?.email}</strong>
                                  <span>{tailor.specialization || 'Custom tailoring specialist'}</span>
                                </div>
                                {tailor.distance_km != null ? <span className="request-status-pill">{tailor.distance_km.toFixed(1)} km</span> : null}
                              </div>
                              <p>{tailor.location_name || tailor.address || tailor.city || 'Location available on map'}</p>
                              <div className="tailor-nearby-meta">
                                <span>{tailor.city || 'City not set'}</span>
                                <span>{tailor.years_of_experience || 0}+ yrs</span>
                                <span>{tailor.rating ? `${tailor.rating}/5` : 'New profile'}</span>
                              </div>
                              {recommendedTailor?.user === tailor.user ? <small className="tailor-recommended-flag">Recommended by the smart scoring assistant</small> : null}
                            </button>
                          );
                        })
                      ) : (
                        <div className="filter-empty-state">
                          <h4>No nearby tailors found</h4>
                          <p>Try another city or continue without choosing a tailor. The internal workflow still works.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="tailoring-group-card">
                    <div className="tailoring-group-head">
                      <h5>Personalize the clothing</h5>
                      <p>Tell us what to change, refine, or elevate for your version.</p>
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="premium-label">Clothing Type *</label>
                        <select className={`form-select premium-input ${errors.clothingType ? 'is-invalid' : ''}`} value={form.clothingType} onChange={(event) => updateField('clothingType', event.target.value)}>
                          {clothingTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        {errors.clothingType ? <div className="invalid-feedback d-block">{errors.clothingType}</div> : null}
                      </div>
                      <div className="col-md-3">
                        <label className="premium-label">Preferred Color *</label>
                        <input className={`form-control premium-input ${errors.color ? 'is-invalid' : ''}`} list="customization-colors" value={form.color} onChange={(event) => updateField('color', event.target.value)} />
                        {errors.color ? <div className="invalid-feedback d-block">{errors.color}</div> : null}
                      </div>
                      <div className="col-md-3">
                        <label className="premium-label">Preferred Fabric *</label>
                        <input className={`form-control premium-input ${errors.fabric ? 'is-invalid' : ''}`} list="customization-fabrics" value={form.fabric} onChange={(event) => updateField('fabric', event.target.value)} />
                        {errors.fabric ? <div className="invalid-feedback d-block">{errors.fabric}</div> : null}
                      </div>
                      <div className="col-md-4">
                        <label className="premium-label">Occasion</label>
                        <select className="form-select premium-input" value={form.occasionPreference} onChange={(event) => updateField('occasionPreference', event.target.value)}>
                          {occasions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="premium-label">Style Preference</label>
                        <select className="form-select premium-input" value={form.stylePreference} onChange={(event) => updateField('stylePreference', event.target.value)}>
                          {styles.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="premium-label">Delivery Preference</label>
                        <select className="form-select premium-input" value={form.deliveryPreference} onChange={(event) => updateField('deliveryPreference', event.target.value)}>
                          {deliveryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="premium-label">Preferred Delivery Date</label>
                        <input className="form-control premium-input" type="date" value={form.preferredDeliveryDate} onChange={(event) => updateField('preferredDeliveryDate', event.target.value)} />
                      </div>
                      <div className="col-md-6">
                        <label className="premium-label">Preferred Size</label>
                        <select className="form-select premium-input" value={form.standardSize} onChange={(event) => updateField('standardSize', event.target.value)}>
                          {sizeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="premium-label">Design Notes *</label>
                        <textarea className={`form-control premium-input premium-textarea ${errors.designNotes ? 'is-invalid' : ''}`} rows="4" value={form.designNotes} onChange={(event) => updateField('designNotes', event.target.value)} placeholder="Describe neckline, silhouette, sleeve preference, embroidery, finishing, or anything else you want personalized."></textarea>
                        {errors.designNotes ? <div className="invalid-feedback d-block">{errors.designNotes}</div> : null}
                      </div>
                    </div>
                    <div className="tailoring-sustainability-card">
                      <div className="tailoring-sustainability-head">
                        <div>
                          <span className="section-eyebrow">Estimated Sustainability Guidance</span>
                          <h6>{fabricSustainability.label}</h6>
                        </div>
                        {fabricSustainability.leafScore ? (
                          <div className="sustainability-leaf-score compact">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <i
                                key={index}
                                className={`bi ${index < fabricSustainability.leafScore ? 'bi-leaf-fill active' : 'bi-leaf'}`}
                              ></i>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="sustainability-meta-row">
                        <span className="value-pill">{fabricSustainability.impactBand}</span>
                        {fabricSustainability.badge ? <span className="value-pill subtle">{fabricSustainability.badge}</span> : null}
                      </div>
                      <p>{fabricSustainability.note}</p>
                      {fabricSustainability.tailoringBenefit ? <small>{fabricSustainability.tailoringBenefit}</small> : null}
                      {sustainableFabricAlternatives.length ? (
                        <div className="tailoring-sustainability-alt">
                          <strong>More eco-conscious fabric ideas</strong>
                          <div className="tailoring-sustainability-chips">
                            {sustainableFabricAlternatives.map(({ fabric, guidance }) => (
                              <button
                                key={fabric}
                                type="button"
                                className="chip selectable"
                                onClick={() => updateField('fabric', fabric)}
                              >
                                {fabric} · {guidance.impactBand}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <datalist id="customization-fabrics">
                      {fabrics.map((item) => <option key={item} value={item} />)}
                    </datalist>
                    <datalist id="customization-colors">
                      {colors.map((item) => <option key={item} value={item} />)}
                    </datalist>
                  </section>

                  <section className="tailoring-group-card">
                    <div className="tailoring-group-head">
                      <h5>Size or measurements</h5>
                      <p>Share your standard size or add detailed measurements for a more precise fit.</p>
                    </div>
                    <div className="ai-tailoring-panel">
                      <div>
                        <span className="section-eyebrow">Smart Measurement Assistant</span>
                        <h6>Estimate editable measurements from basic profile inputs</h6>
                        <p>This uses transparent sizing rules, not black-box ML. Review the output before final submission.</p>
                      </div>
                      <div className="row g-3">
                        <div className="col-md-3">
                          <label className="premium-label">Gender</label>
                          <select className="form-select premium-input" value={measurementProfile.gender} onChange={(event) => updateMeasurementProfile('gender', event.target.value)}>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="premium-label">Height cm</label>
                          <input className="form-control premium-input" value={measurementProfile.height} onChange={(event) => updateMeasurementProfile('height', event.target.value)} />
                        </div>
                        <div className="col-md-3">
                          <label className="premium-label">Weight kg</label>
                          <input className="form-control premium-input" value={measurementProfile.weight} onChange={(event) => updateMeasurementProfile('weight', event.target.value)} />
                        </div>
                        <div className="col-md-3">
                          <label className="premium-label">Body Type</label>
                          <select className="form-select premium-input" value={measurementProfile.bodyType} onChange={(event) => updateMeasurementProfile('bodyType', event.target.value)}>
                            {['lean', 'average', 'curvy', 'athletic', 'broad', 'petite', 'plus-size'].map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="premium-label">Fit Preference</label>
                          <select className="form-select premium-input" value={measurementProfile.fitPreference} onChange={(event) => updateMeasurementProfile('fitPreference', event.target.value)}>
                            <option value="slim">Slim</option>
                            <option value="regular">Regular</option>
                            <option value="relaxed">Relaxed</option>
                          </select>
                        </div>
                        <div className="col-md-6 d-flex align-items-end">
                          <button type="button" className="btn btn-slessaa btn-slessaa-primary w-100" onClick={handleGenerateMeasurements} disabled={measurementSuggestionLoading}>
                            {measurementSuggestionLoading ? 'Estimating...' : 'Estimate Measurements'}
                          </button>
                        </div>
                      </div>
                      {measurementSuggestionError ? <div className="invalid-feedback d-block mt-2">{measurementSuggestionError}</div> : null}
                      {measurementSuggestion ? (
                        <div className="ai-suggestion-card">
                          <div>
                            <strong>{measurementSuggestion.confidence_label} confidence estimate</strong>
                            <span>{measurementSuggestion.explanation}</span>
                          </div>
                          <div className="tailoring-sustainability-chips">
                            {(measurementSuggestion.basis || []).map((item) => <span key={item} className="chip">{item}</span>)}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="row g-3">
                      <div className="col-md-4"><input className="form-control premium-input" placeholder="Chest" value={form.chest} onChange={(event) => updateField('chest', event.target.value)} /></div>
                      <div className="col-md-4"><input className="form-control premium-input" placeholder="Waist" value={form.waist} onChange={(event) => updateField('waist', event.target.value)} /></div>
                      <div className="col-md-4"><input className="form-control premium-input" placeholder="Hip" value={form.hip} onChange={(event) => updateField('hip', event.target.value)} /></div>
                      <div className="col-md-4"><input className="form-control premium-input" placeholder="Shoulder" value={form.shoulder} onChange={(event) => updateField('shoulder', event.target.value)} /></div>
                      <div className="col-md-4"><input className="form-control premium-input" placeholder="Sleeve Length" value={form.sleeveLength} onChange={(event) => updateField('sleeveLength', event.target.value)} /></div>
                      <div className="col-md-4"><input className="form-control premium-input" placeholder="Inseam" value={form.inseam} onChange={(event) => updateField('inseam', event.target.value)} /></div>
                      <div className="col-md-4"><input className="form-control premium-input" placeholder="Neck" value={form.neck} onChange={(event) => updateField('neck', event.target.value)} /></div>
                      <div className="col-md-4"><input className="form-control premium-input" placeholder="Height" value={form.height} onChange={(event) => updateField('height', event.target.value)} /></div>
                    </div>
                    {errors.measurements ? <div className="invalid-feedback d-block mt-2">{errors.measurements}</div> : null}
                  </section>
                </div>
              </form>
            </div>

            <div className="col-lg-4">
              <aside className="summary-card sticky-summary customization-summary-card">
                <span className="section-eyebrow">Customization Summary</span>
                <h4>Made to match your style</h4>
                <ul className="summary-list">
                  <li>Inspiration image or similar design reference</li>
                  <li>Map-based nearby tailor discovery</li>
                  <li>Optional customer-selected tailor assignment</li>
                </ul>
                <div className="summary-total">
                  <span>Estimated Starting Range</span>
                  <strong>{estimatedRange}</strong>
                </div>
                <div className="tailor-selection-summary sustainability-summary-block">
                  <span>Fabric Sustainability</span>
                  <strong>{fabricSustainability.label}</strong>
                  <small>{fabricSustainability.note}</small>
                </div>
                <div className="tailor-selection-summary">
                  <span>Selected Tailor</span>
                  <strong>{selectedTailor ? (selectedTailor.full_name || selectedTailor.user_detail?.full_name || selectedTailor.user_detail?.email) : 'Internal assignment later'}</strong>
                  <small>
                    {selectedTailor
                      ? `${selectedTailor.location_name || selectedTailor.address || selectedTailor.city}${selectedTailor.distance_km != null ? ` - ${selectedTailor.distance_km.toFixed(1)} km away` : ''}${tailorSelectionMode === 'recommended' ? ' - selected from recommendation' : tailorSelectionMode === 'manual' ? ' - manually selected' : ''}`
                      : 'You can still submit without choosing a tailor.'}
                  </small>
                </div>
                <button className="btn btn-slessaa btn-slessaa-primary w-100" onClick={handleSubmit}>Create Custom Request</button>
              </aside>
            </div>
          </div>

          <div className="table-card mt-5">
            <SectionTitle eyebrow="Your Requests" title="Continue your customization discussion any time" align="start" />
            <table className="table align-middle mb-0">
              <thead>
                <tr><th>Design</th><th>Reference</th><th>Status</th><th>Assignment</th><th>Open</th></tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.clothing_type}</td>
                    <td>{request.reference_product_name || (request.inspiration_image ? 'Uploaded inspiration' : 'Original custom brief')}</td>
                    <td>{request.status.replaceAll('_', ' ')}</td>
                    <td>{formatAssignment(request)}</td>
                    <td><Link to={`/tailoring/requests/${request.id}`}>Open Thread</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

export default TailoringPage;
