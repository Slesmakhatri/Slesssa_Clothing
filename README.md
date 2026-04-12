# Slessaa Clothing

Full-stack final year project for a multi-vendor AI-powered fashion ecommerce and tailoring platform.

## Stack
- Frontend: React, Vite, Bootstrap 5
- Backend: Django, Django REST Framework, Simple JWT, MongoDB via `pymongo`

## Implemented System
- JWT authentication with register, login, profile session persistence
- Multi-vendor product catalog, checkout, tailoring, dashboards, and MongoDB-backed APIs
- Product listing, product detail, cart persistence, checkout, order history, and tracking
- Mock sandbox payment flow for eSewa and Khalti with backend payment verification
- Tailoring request workflow with measurements, vendor selection, and request history
- AI chatbot endpoint and recommendation/image-upload style workflow backed by live catalog data
- Customer, vendor, tailor, and admin dashboards

## Demo Accounts
- Customer: `customer@slessaa.com` / `Customer@12345`
- Vendor: `vendor1@slessaa.com` / `Vendor@12345`
- Tailor: `tailor@slessaa.com` / `Tailor@12345`
- Admin: `admin@slessaa.com` / `Admin@12345`

## Setup
1. Backend:
```bash
cd backend
pip install -r requirements.txt
copy .env.example .env
python manage.py test_mongodb
python manage.py runserver
```

2. Frontend:
```bash
copy .env.example .env
# install frontend dependencies with Node.js available in PATH
npm install
npm run dev
```

## Deployment Notes
- Frontend expects `VITE_API_BASE_URL`
- Backend expects `backend/.env`
- Backend requires a reachable MongoDB instance via `MONGODB_URI`
- Set `DJANGO_DEBUG=False` and production `DJANGO_ALLOWED_HOSTS`
"# Slessaa-Clothing" 
"# Slessaa-Clothing" 
