import { Link } from 'react-router-dom';
import CtaBanner from '../components/common/CtaBanner';
import SectionTitle from '../components/common/SectionTitle';

const offerCards = [
  {
    icon: 'bi-bag-heart',
    title: 'Ready-Made Fashion',
    text: 'Explore a wide range of trendy outfits including jeans, hoodies, t-shirts, dresses, and more.'
  },
  {
    icon: 'bi-scissors',
    title: 'Custom Tailoring',
    text: 'Get clothes tailored exactly to your measurements and preferences.'
  },
  {
    icon: 'bi-stars',
    title: 'Smart Recommendations',
    text: 'Discover outfits based on your style, preferences, and needs.'
  },
  {
    icon: 'bi-chat-dots',
    title: 'AI Assistant',
    text: 'Use our chatbot to quickly find the perfect outfit for any occasion.'
  }
];

const reasons = [
  'High-quality fabrics and designs',
  'Affordable pricing for every budget',
  'Personalized fashion experience',
  'Easy and user-friendly shopping',
  'Fast and reliable service'
];

const principles = [
  {
    icon: 'bi-bullseye',
    title: 'Mission',
    text: 'Our mission is to make fashion accessible, customizable, and intelligent. We aim to help every individual express their unique style through high-quality clothing and personalized services.'
  },
  {
    icon: 'bi-eye',
    title: 'Vision',
    text: 'We believe fashion should be smart, personal, and effortless. Our vision is to build a platform where technology and creativity come together to redefine how people discover and wear clothes.'
  },
  {
    icon: 'bi-shield-check',
    title: 'Promise',
    text: 'At Slesssa Clothing, we are committed to delivering not just products, but a complete fashion experience from discovery to delivery.'
  }
];

function AboutPage() {
  return (
    <>
      <section className="page-hero compact-hero about-hero">
        <div className="container">
          <div className="about-hero-shell">
            <div className="about-hero-copy">
              <span className="section-eyebrow">About Us</span>
              <h1>Modern fashion, custom tailoring, and smart discovery in one premium store.</h1>
              <p>
                Welcome to Slesssa Clothing, your one-stop destination for modern fashion and personalized style. We combine ready-made clothing, custom tailoring, and smart recommendations to bring you a seamless shopping experience.
              </p>
            </div>
            <div className="about-hero-card">
              <span className="about-hero-card-label">Why Slesssa</span>
              <h3>Built for customers who want style, fit, and convenience together.</h3>
              <div className="about-hero-metrics">
                <div>
                  <strong>Ready to Wear</strong>
                  <span>Modern wardrobe staples and occasion pieces</span>
                </div>
                <div>
                  <strong>Tailoring</strong>
                  <span>Personalized fit and customization flow</span>
                </div>
                <div>
                  <strong>Smart Discovery</strong>
                  <span>AI-led recommendations and shopping support</span>
                </div>
              </div>
              <div className="hero-actions mt-3">
                <Link to="/apply-vendor" className="btn btn-slessaa btn-slessaa-primary">Apply as Vendor</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="row g-4 align-items-stretch">
            <div className="col-lg-7">
              <article className="info-card h-100 about-story-card">
                <span className="section-eyebrow">Our Story</span>
                <h3>A fashion platform designed to feel personal, polished, and easy to use.</h3>
                <p>
                  Slesssa Clothing is built around a simple idea: shopping for fashion should feel seamless, personal, and confident. From everyday casualwear to occasion dressing and custom tailoring, we bring modern style and practical service together in one place.
                </p>
                <p>
                  We combine ready-made fashion, made-for-you customization, and intelligent product discovery so customers can move from inspiration to checkout with less friction and more clarity.
                </p>
              </article>
            </div>
            <div className="col-lg-5">
              <div className="about-principle-stack">
                {principles.map((item) => (
                  <article key={item.title} className="info-card about-principle-card">
                    <div className="about-icon-badge">
                      <i className={`bi ${item.icon}`}></i>
                    </div>
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-space bg-soft">
        <div className="container">
          <SectionTitle
            eyebrow="What We Offer"
            title="Services shaped around modern fashion and personalized support"
            text="Every part of the platform is designed to help customers discover, customize, and shop with confidence."
          />
          <div className="row g-4">
            {offerCards.map((item) => (
              <div key={item.title} className="col-md-6 col-xl-3">
                <article className="info-card h-100 about-offer-card">
                  <div className="about-icon-badge">
                    <i className={`bi ${item.icon}`}></i>
                  </div>
                  <h4>{item.title}</h4>
                  <p>{item.text}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container">
          <div className="about-why-shell">
            <div className="section-title text-start mx-0">
              <span className="section-eyebrow">Why Choose Us</span>
              <h2>Fashion that feels premium, practical, and built around real customer needs.</h2>
              <p>
                Our focus is not only on clothing, but on delivering a complete shopping experience that feels thoughtful from first browse to final delivery.
              </p>
            </div>
            <div className="about-reason-grid">
              {reasons.map((item) => (
                <article key={item} className="feature-line-card about-reason-card">
                  <i className="bi bi-check2-circle"></i>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-space bg-soft">
        <div className="container">
          <div className="row g-4 align-items-stretch">
            <div className="col-lg-6">
              <article className="info-card h-100 about-vision-card">
                <span className="section-eyebrow">Built for the Future</span>
                <h3>Technology and creativity working together to improve fashion discovery.</h3>
                <p>
                  We are continuously improving our platform with AI-powered features, better recommendations, and smarter customization to give you the best fashion experience possible.
                </p>
              </article>
            </div>
            <div className="col-lg-6">
              <article className="info-card h-100 about-vision-card">
                <span className="section-eyebrow">Our Direction</span>
                <h3>Smart, personal, and effortless shopping for a growing digital wardrobe culture.</h3>
                <p>
                  We want Slesssa Clothing to be the place where customers discover quality fashion, shape it to their personal style, and enjoy a shopping flow that feels modern from start to finish.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <CtaBanner
        eyebrow="Explore Slesssa"
        title="Discover fashion, tailoring, and AI-assisted shopping in one place"
        text="Browse the collection, explore smart recommendations, or start a custom tailoring request built around your style."
        primaryLink={{ to: '/shop', label: 'Shop The Collection' }}
        secondaryLink={{ to: '/recommendations', label: 'View Recommendations' }}
      />
    </>
  );
}

export default AboutPage;
