import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import RecommendationSections from '../components/common/RecommendationSections';
import ProductCard from '../components/shop/ProductCard';
import { useAuth } from '../context/AuthContext';
import {
  analyzeOutfitImage,
  getDesignSuggestion,
  getAiFashionRecommendation,
  getRecommendations,
  getWardrobePlan,
  getWeatherInsight,
  listSavedDesignSuggestions,
  listSavedOutfits,
  saveDesignSuggestion,
  saveOutfit
} from '../services/api';
import { getRecentViewedProductIds } from '../services/recentViews';

const defaultForm = {
  occasion: 'casual',
  weather: '',
  mood: 'minimal',
  body_type: 'average',
  budget: 'medium',
  city: 'Kathmandu'
};

const quickQuestions = [
  'What should I wear to a formal dinner in cool weather?',
  'Suggest a comfy college look for warm weather.',
  'Help me style a wedding-ready kurta outfit.',
];

const designPromptChips = [
  'I want modern kurta',
  'I want festive dress with traditional details',
  'Suggest a minimal blazer design',
];

function RecommendationsPage() {
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogMessage, setCatalogMessage] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [weatherResult, setWeatherResult] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState([]);
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [savedPreferences, setSavedPreferences] = useState(null);
  const [designPrompt, setDesignPrompt] = useState('I want modern kurta');
  const [designSuggestion, setDesignSuggestion] = useState(null);
  const [designLoading, setDesignLoading] = useState(false);
  const [designSaving, setDesignSaving] = useState(false);
  const [uploadAnalysis, setUploadAnalysis] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [recommendationSections, setRecommendationSections] = useState(null);
  const [sectionLoading, setSectionLoading] = useState(true);

  async function loadSavedOutfits() {
    if (!isAuthenticated) {
      setSavedOutfits([]);
      setSavedPreferences(null);
      return;
    }
    try {
      const payload = await listSavedOutfits();
      setSavedOutfits(payload.saved || []);
      setSavedPreferences(payload.preferences || null);
      const designPayload = await listSavedDesignSuggestions();
      setSavedDesigns(designPayload.saved || []);
    } catch {
      setSavedOutfits([]);
      setSavedPreferences(null);
      setSavedDesigns([]);
    }
  }

  async function handleRecommend(nextPayload) {
    const payload = nextPayload || form;
    setLoading(true);
    setMessage('');
    try {
      const response = await getAiFashionRecommendation(payload);
      setAiResult(response.recommendation || null);
      setCatalogResults(response.products || []);
      setWeeklyPlan(response.weekly_plan || []);
      setWeatherResult(response.weather || null);
      setMessage(response.message || 'AI recommendation generated.');
      setCatalogMessage('Matched products from your live catalog.');
    } catch (error) {
      setMessage(error?.payload?.detail || 'Could not generate AI recommendations right now.');
    } finally {
      setLoading(false);
    }

    try {
      const sectionPayload = await getRecommendations({
        occasion: payload.occasion,
        style_preference: payload.mood,
        recent_viewed_ids: getRecentViewedProductIds(),
      });
      setRecommendationSections(sectionPayload.sections || null);
    } catch {
      setRecommendationSections(null);
    } finally {
      setSectionLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const [catalogPayload] = await Promise.all([getRecommendations({ recent_viewed_ids: getRecentViewedProductIds() })]);
        if (!active) return;
        setCatalogResults(catalogPayload.recommended || []);
        setCatalogMessage(catalogPayload.message || 'Fresh catalog recommendations.');
        setRecommendationSections(catalogPayload.sections || null);
      } finally {
        if (active) {
          setSectionLoading(false);
          handleRecommend(defaultForm);
        }
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadSavedOutfits();
  }, [isAuthenticated, user?.id]);

  async function detectWeather() {
    setWeatherLoading(true);
    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }));
        const payload = await getWeatherInsight({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          city: form.city
        });
        setWeatherResult(payload);
        setForm((current) => ({ ...current, weather: payload.weather || current.weather }));
        return;
      }
      const payload = await getWeatherInsight({ city: form.city });
      setWeatherResult(payload);
      setForm((current) => ({ ...current, weather: payload.weather || current.weather }));
    } catch {
      setWeatherResult(null);
    } finally {
      setWeatherLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await handleRecommend(form);
  }

  async function handleSaveOutfit() {
    if (!aiResult || !isAuthenticated) {
      return;
    }
    setSaving(true);
    try {
      await saveOutfit({
        ...form,
        ...aiResult,
        notes: aiResult.style_note || ''
      });
      await loadSavedOutfits();
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploadError('');
    setUploadPreview(URL.createObjectURL(file));
    setAnalysisLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const payload = await analyzeOutfitImage(formData);
      setUploadAnalysis(payload);
    } catch (error) {
      setUploadAnalysis(null);
      setUploadError(error?.payload?.detail || 'Could not analyze this image.');
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function refreshWardrobePlan() {
    try {
      const payload = await getWardrobePlan(form);
      setWeeklyPlan(payload.weekly_plan || []);
    } catch {
      setWeeklyPlan([]);
    }
  }

  async function handleGenerateDesignSuggestion(event) {
    if (event) event.preventDefault();
    setDesignLoading(true);
    try {
      const payload = await getDesignSuggestion({ prompt: designPrompt });
      setDesignSuggestion(payload.suggestion || null);
    } catch (error) {
      setDesignSuggestion(null);
      setMessage(error?.payload?.detail || 'Could not generate a design suggestion right now.');
    } finally {
      setDesignLoading(false);
    }
  }

  async function handleSaveDesignSuggestion() {
    if (!designSuggestion || !isAuthenticated) return;
    setDesignSaving(true);
    try {
      await saveDesignSuggestion({
        prompt: designPrompt,
        ...designSuggestion
      });
      await loadSavedOutfits();
    } finally {
      setDesignSaving(false);
    }
  }

  const scorePills = useMemo(() => {
    if (!aiResult) return [];
    return [
      { label: 'Comfort', value: `${aiResult.comfort_score}/10` },
      { label: 'Breathability', value: `${aiResult.breathability}/10` },
      { label: 'Fit', value: aiResult.fit_type },
    ];
  }, [aiResult]);

  return (
    <>
      <section className="page-hero recommendation-hero ai-fashion-hero">
        <div className="container">
          <span className="section-eyebrow">AI Fashion & Fabric Recommendation System</span>
          <h1>Plan outfits, fabrics, and weekly looks with a smarter styling workspace</h1>
          <p>Use weather, mood, body type, and occasion to generate an AI outfit direction, visual inspiration, and live product matches from your current catalog.</p>
        </div>
      </section>

      <section className="section-space">
        <div className="container ai-fashion-shell">
          <div className="row g-4">
            <div className="col-xl-4">
              <aside className="filter-card ai-fashion-form-card">
                <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                  <div>
                    <span className="section-eyebrow">Input Form</span>
                    <h4 className="mb-1">Build your styling brief</h4>
                    <p className="mb-0">Mix wardrobe intent with current weather and budget.</p>
                  </div>
                  <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={detectWeather} disabled={weatherLoading}>
                    {weatherLoading ? 'Detecting...' : 'Auto Weather'}
                  </button>
                </div>

                <form className="d-grid gap-3" onSubmit={handleSubmit}>
                  <div>
                    <label className="premium-label">Occasion</label>
                    <select className="form-select premium-input" value={form.occasion} onChange={(event) => setForm((current) => ({ ...current, occasion: event.target.value }))}>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                      <option value="party">Party</option>
                      <option value="gym">Gym</option>
                      <option value="wedding">Wedding</option>
                      <option value="festive">Festive</option>
                    </select>
                  </div>
                  <div>
                    <label className="premium-label">Weather</label>
                    <select className="form-select premium-input" value={form.weather} onChange={(event) => setForm((current) => ({ ...current, weather: event.target.value }))}>
                      <option value="">Auto / No preference</option>
                      <option value="hot">Hot</option>
                      <option value="cold">Cold</option>
                      <option value="rainy">Rainy</option>
                      <option value="mild">Mild</option>
                    </select>
                  </div>
                  <div>
                    <label className="premium-label">Mood</label>
                    <select className="form-select premium-input" value={form.mood} onChange={(event) => setForm((current) => ({ ...current, mood: event.target.value }))}>
                      <option value="minimal">Minimal</option>
                      <option value="stylish">Stylish</option>
                      <option value="comfy">Comfy</option>
                    </select>
                  </div>
                  <div>
                    <label className="premium-label">Body Type</label>
                    <select className="form-select premium-input" value={form.body_type} onChange={(event) => setForm((current) => ({ ...current, body_type: event.target.value }))}>
                      <option value="slim">Slim</option>
                      <option value="bulky">Bulky</option>
                      <option value="average">Average</option>
                      <option value="tall">Tall</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                  <div>
                    <label className="premium-label">Budget</label>
                    <select className="form-select premium-input" value={form.budget} onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="premium-label">City</label>
                    <input className="form-control premium-input" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="Kathmandu" />
                  </div>

                  <button type="submit" className="btn btn-slessaa btn-slessaa-primary" disabled={loading}>
                    {loading ? 'Generating...' : 'Generate AI Recommendation'}
                  </button>
                </form>

                <div className="ai-question-list">
                  <span className="section-eyebrow">Chatbot Stylist</span>
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="chat-suggestion-chip"
                      onClick={() => setForm((current) => ({ ...current, occasion: question.toLowerCase().includes('formal') ? 'formal' : question.toLowerCase().includes('wedding') ? 'wedding' : 'casual' }))}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </aside>
            </div>

            <div className="col-xl-8">
              <div className="ai-result-stack">
                <div className="table-card ai-result-card">
                  <div className="section-title text-start mb-3">
                    <span className="section-eyebrow">AI Design Generator</span>
                    <h2>Turn a fashion idea into a structured design concept</h2>
                    <p>Describe the look you want, and get a demo-ready design direction with style, colors, fabric, and pattern ideas.</p>
                  </div>
                  <form className="design-generator-form" onSubmit={handleGenerateDesignSuggestion}>
                    <textarea
                      className="form-control premium-input premium-textarea"
                      rows="3"
                      value={designPrompt}
                      onChange={(event) => setDesignPrompt(event.target.value)}
                      placeholder="I want a modern kurta design with traditional Nepali elements"
                    ></textarea>
                    <div className="tailoring-sustainability-chips">
                      {designPromptChips.map((item) => (
                        <button key={item} type="button" className="chip selectable" onClick={() => setDesignPrompt(item)}>
                          {item}
                        </button>
                      ))}
                    </div>
                    <div className="ai-result-actions">
                      <button type="submit" className="btn btn-slessaa btn-slessaa-primary" disabled={designLoading}>
                        {designLoading ? 'Generating Design...' : 'Generate Design Suggestion'}
                      </button>
                      <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={handleSaveDesignSuggestion} disabled={!isAuthenticated || !designSuggestion || designSaving}>
                        {designSaving ? 'Saving...' : 'Save Design Concept'}
                      </button>
                    </div>
                    {!isAuthenticated ? <small>Log in to save generated design concepts.</small> : null}
                  </form>

                  {designSuggestion ? (
                    <div className="design-suggestion-card">
                      <div className="design-suggestion-head">
                        <div>
                          <span className="section-eyebrow">Generated Concept</span>
                          <h3>{designSuggestion.title}</h3>
                        </div>
                        <span className="value-pill">{designSuggestion.garment_type}</span>
                      </div>
                      <div className="ai-insight-grid">
                        <article className="ai-insight-item">
                          <span>Style</span>
                          <strong>{designSuggestion.style_direction}</strong>
                        </article>
                        <article className="ai-insight-item">
                          <span>Fabric</span>
                          <strong>{designSuggestion.fabric}</strong>
                        </article>
                        <article className="ai-insight-item">
                          <span>Occasion</span>
                          <strong>{designSuggestion.occasion}</strong>
                        </article>
                      </div>
                      <div className="design-suggestion-block">
                        <strong>Suggested Colors</strong>
                        <div className="mood-values">
                          {designSuggestion.colors.map((color) => (
                            <span key={color} className="value-pill">{color}</span>
                          ))}
                        </div>
                      </div>
                      <div className="design-suggestion-block">
                        <strong>Pattern Ideas</strong>
                        <ul className="ai-simple-list">
                          {designSuggestion.pattern_ideas.map((idea) => (
                            <li key={idea}>{idea}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="ai-style-note">{designSuggestion.notes}</p>
                    </div>
                  ) : (
                    <div className="filter-empty-state compact">
                      <h4>No design concept yet</h4>
                      <p>Try a prompt like “I want modern kurta” to generate a structured design suggestion.</p>
                    </div>
                  )}
                </div>

                <div className="table-card ai-result-card">
                  <div className="section-title text-start mb-3">
                    <span className="section-eyebrow">Recommendation Result</span>
                    <h2>AI outfit, fabric, and fit guidance</h2>
                    <p>{message || 'Your AI recommendation will appear here.'}</p>
                  </div>

                  {aiResult ? (
                    <div className="ai-result-layout">
                      <div className="ai-result-copy">
                        <div className="ai-insight-grid">
                          <article className="ai-insight-item">
                            <span>Fabric</span>
                            <strong>{aiResult.fabric}</strong>
                          </article>
                          <article className="ai-insight-item">
                            <span>Outfit</span>
                            <strong>{aiResult.outfit}</strong>
                          </article>
                          <article className="ai-insight-item">
                            <span>Search Query</span>
                            <strong>{aiResult.search_query}</strong>
                          </article>
                        </div>
                        <div className="mood-values">
                          {scorePills.map((pill) => (
                            <span key={pill.label} className="value-pill">
                              {pill.label}: {pill.value}
                            </span>
                          ))}
                        </div>
                        <p className="ai-style-note">{aiResult.style_note}</p>
                        <div className="ai-result-actions">
                          <button type="button" className="btn btn-slessaa btn-slessaa-primary" onClick={handleSaveOutfit} disabled={!isAuthenticated || saving}>
                            {saving ? 'Saving...' : 'Save Outfit'}
                          </button>
                          <button type="button" className="btn btn-slessaa btn-slessaa-outline" onClick={refreshWardrobePlan}>
                            Refresh Weekly Plan
                          </button>
                          {!isAuthenticated ? <Link to="/login" className="btn btn-link px-0">Log in to save looks</Link> : null}
                        </div>
                      </div>
                      <div className="ai-result-media">
                        {aiResult.image_url ? <img src={aiResult.image_url} alt={aiResult.search_query || aiResult.outfit} /> : null}
                      </div>
                    </div>
                  ) : (
                    <div className="filter-empty-state">
                      <h4>Waiting for styling input</h4>
                      <p>Generate a recommendation to see outfit, fabric, fit, and comfort guidance.</p>
                    </div>
                  )}
                </div>

                <div className="row g-4">
                  <div className="col-lg-6">
                    <div className="table-card">
                      <div className="section-title text-start mb-3">
                        <span className="section-eyebrow">Weather</span>
                        <h3>Current weather signal</h3>
                        <p>{weatherResult?.summary || 'Use auto weather detection for local styling help.'}</p>
                      </div>
                      <div className="ai-weather-card">
                        <strong>{weatherResult?.city || form.city}</strong>
                        <span>{weatherResult?.weather || form.weather || 'No weather selected'}</span>
                        <small>{weatherResult?.temperature_c ? `${weatherResult.temperature_c}°C` : 'Live temperature unavailable'}</small>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="table-card">
                      <div className="section-title text-start mb-3">
                        <span className="section-eyebrow">Upload Image</span>
                        <h3>Analyze your outfit</h3>
                        <p>Upload a look and get simple style and color improvement guidance.</p>
                      </div>
                      <label className="premium-upload-box d-flex flex-column align-items-center justify-content-center">
                        <input type="file" className="d-none" accept="image/*" onChange={handleUploadChange} />
                        <i className="bi bi-cloud-arrow-up fs-2"></i>
                        <strong>{analysisLoading ? 'Analyzing...' : 'Upload outfit image'}</strong>
                        <span>JPG, PNG, or WEBP</span>
                      </label>
                      {uploadPreview ? <img className="ai-upload-preview" src={uploadPreview} alt="Uploaded outfit preview" /> : null}
                      {uploadError ? <div className="alert alert-danger mt-3 mb-0">{uploadError}</div> : null}
                      {uploadAnalysis ? (
                        <div className="ai-upload-analysis">
                          <div className="mood-values">
                            {uploadAnalysis.colors?.map((color) => (
                              <span key={color} className="value-pill">{color}</span>
                            ))}
                          </div>
                          <p><strong>Style:</strong> {uploadAnalysis.style}</p>
                          <ul className="ai-simple-list">
                            {(uploadAnalysis.suggestions || []).map((suggestion) => (
                              <li key={suggestion}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="table-card">
                  <div className="section-title text-start mb-3">
                    <span className="section-eyebrow">Wardrobe Planner</span>
                    <h2>Weekly outfit plan</h2>
                    <p>Generated to vary occasion, weather, and silhouette without obvious repetition.</p>
                  </div>
                  {weeklyPlan.length ? (
                    <div className="ai-weekly-grid">
                      {weeklyPlan.map((item) => (
                        <article key={`${item.day}-${item.outfit}`} className="ai-weekly-card">
                          {item.image_url ? <img src={item.image_url} alt={item.outfit} /> : null}
                          <small>{item.day}</small>
                          <h5>{item.outfit}</h5>
                          <p>{item.fabric} · {item.fit_type}</p>
                          <span>{item.weather} · {item.occasion}</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="filter-empty-state">
                      <h4>No weekly plan yet</h4>
                      <p>Generate a recommendation first, then refresh the wardrobe plan.</p>
                    </div>
                  )}
                </div>

                <div className="table-card">
                  <div className="section-title text-start mb-3">
                    <span className="section-eyebrow">Live Catalog Matches</span>
                    <h2>Products selected from your marketplace inventory</h2>
                    <p>{catalogMessage || 'AI-matched catalog products appear here.'}</p>
                  </div>
                  {catalogResults.length ? (
                    <div className="shop-product-grid">
                      {catalogResults.map((product) => (
                        <div key={product.slug || product.id}>
                          <ProductCard product={product} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="filter-empty-state">
                      <h4>No products found</h4>
                      <p>Try another occasion or budget band to broaden the match.</p>
                    </div>
                  )}
                </div>

                <RecommendationSections
                  sections={recommendationSections}
                  loading={sectionLoading}
                  sectionOrder={['recommended_for_you', 'similar_items', 'trending_now']}
                  emptyCopy="Generate more browsing and styling signals to strengthen these recommendation shelves."
                />

                <div className="table-card">
                  <div className="section-title text-start mb-3">
                    <span className="section-eyebrow">Saved Outfits</span>
                    <h2>Your personalized style memory</h2>
                    <p>{savedPreferences?.preferred_outfit ? `Latest preference: ${savedPreferences.preferred_outfit}` : 'Save AI looks to build a longer-term style profile.'}</p>
                  </div>
                  {isAuthenticated ? (
                    savedOutfits.length ? (
                      <div className="ai-saved-grid">
                        {savedOutfits.map((outfit) => (
                          <article key={outfit.id} className="ai-saved-card">
                            {outfit.image_url ? <img src={outfit.image_url} alt={outfit.outfit} /> : null}
                            <small>{outfit.occasion || 'Saved look'}</small>
                            <h5>{outfit.outfit}</h5>
                            <p>{outfit.fabric} · {outfit.fit_type}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="filter-empty-state">
                        <h4>No saved outfits yet</h4>
                        <p>Generate and save an AI outfit to start building your wardrobe memory.</p>
                      </div>
                    )
                  ) : (
                    <div className="filter-empty-state">
                      <h4>Log in to save outfits</h4>
                      <p>Your saved AI looks and style preferences are available after sign-in.</p>
                      <Link to="/login" className="btn btn-slessaa btn-slessaa-primary">Go to Login</Link>
                    </div>
                  )}
                </div>

                <div className="table-card">
                  <div className="section-title text-start mb-3">
                    <span className="section-eyebrow">Saved Design Concepts</span>
                    <h2>Your generated design history</h2>
                    <p>Store structured fashion concepts for tailoring discussion or future reference.</p>
                  </div>
                  {isAuthenticated ? (
                    savedDesigns.length ? (
                      <div className="ai-saved-grid">
                        {savedDesigns.map((design) => (
                          <article key={design.id} className="ai-saved-card">
                            <small>{design.garment_type || 'Design concept'}</small>
                            <h5>{design.title}</h5>
                            <p>{design.fabric} · {design.style_direction}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="filter-empty-state">
                        <h4>No saved design concepts yet</h4>
                        <p>Generate a design suggestion and save it to build a creative history.</p>
                      </div>
                    )
                  ) : (
                    <div className="filter-empty-state">
                      <h4>Log in to save design concepts</h4>
                      <p>Your generated design ideas can be stored once you sign in.</p>
                      <Link to="/login" className="btn btn-slessaa btn-slessaa-primary">Go to Login</Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default RecommendationsPage;
