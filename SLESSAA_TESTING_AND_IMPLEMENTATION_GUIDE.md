# Slessaa Clothing Testing and Implementation Guide

This document is a practical guide for testing and continuing implementation of the Slessaa Clothing project. It is based on the current repository structure and code paths.

## 1. Project Overview

Slessaa Clothing is a multi-role fashion ecommerce and tailoring platform.

Stack:

- Frontend: React 18, Vite, Bootstrap, Bootstrap Icons
- Backend: Django REST Framework, Simple JWT
- Database: MongoDB through custom repository modules
- Auth: JWT access/refresh tokens
- Roles: `customer`, `vendor`, `tailor`, `admin`, `super_admin`

Important architecture detail:

- The backend does not use normal Django ORM models for app data.
- Application data is stored in MongoDB collections through repository files such as:
  - `backend/apps/accounts/repository.py`
  - `backend/apps/products/repository.py`
  - `backend/apps/orders/repository.py`
  - `backend/apps/tailoring/repository.py`
  - `backend/apps/chats/repository.py`

## 2. Important Files

Frontend:

- `src/App.jsx`: frontend route definitions
- `src/services/api.js`: all frontend API helper functions and API base URL logic
- `src/context/AuthContext.jsx`: login session state and role handling
- `src/context/CartContext.jsx`: cart behavior, local and backend cart sync
- `src/context/WishlistContext.jsx`: wishlist behavior
- `src/components/layout/*Layout.jsx`: role dashboard shells
- `src/pages/HomePage.jsx`: storefront homepage
- `src/pages/ProductDetailsPage.jsx`: product detail, reviews, questions, chat entry
- `src/pages/CheckoutPage.jsx`: order placement
- `src/pages/MessagesPage.jsx`: customer messaging page
- `src/components/chat/ChatWorkspace.jsx`: shared chat UI
- `src/components/vendor/VendorDashboardWorkspace.jsx`: vendor dashboard workspace
- `src/pages/TailorDashboardPage.jsx`: tailor dashboard workspace
- `src/pages/AdminDashboardPage.jsx`: admin dashboard
- `src/pages/SuperAdminDashboardPage.jsx`: super admin dashboard
- `src/styles/global.css`: main styling

Backend:

- `backend/manage.py`: Django command entry
- `backend/config/settings.py`: Django settings, CORS, MongoDB, API keys
- `backend/config/urls.py`: root API URL mounting
- `backend/common/mongo.py`: MongoDB helper
- `backend/common/storage.py`: upload helper
- `backend/apps/accounts/*`: auth, users, profile, password reset command
- `backend/apps/vendors/*`: vendor profiles and vendor applications
- `backend/apps/products/*`: categories and products
- `backend/apps/orders/*`: cart, wishlist, orders, tracking, returns, vouchers
- `backend/apps/tailoring/*`: measurements, tailoring requests, tailor profiles, tailoring messages
- `backend/apps/chats/*`: in-app messaging conversations and messages
- `backend/apps/dashboards/*`: customer/vendor/tailor/admin/super-admin summaries
- `backend/apps/payments/*`: payment initiation/verification
- `backend/apps/reviews/*`: product reviews and product questions
- `backend/apps/support/*`: contact/support messages
- `backend/apps/ai_services/*`: AI recommendations, design suggestion, chatbot, weather, outfit tools

## 3. Local Setup

### 3.1 Frontend

Install dependencies:

```powershell
npm install
```

Run on localhost:

```powershell
npm run dev
```

Run on local Wi-Fi network for mobile testing:

```powershell
npm run dev -- --host
```

Build production assets:

```powershell
npm run build
```

Preview build:

```powershell
npm run preview
```

### 3.2 Backend

Install Python dependencies:

```powershell
pip install -r backend/requirements.txt
```

Run backend locally:

```powershell
python backend/manage.py runserver
```

Run backend on local network for mobile testing:

```powershell
python backend/manage.py runserver 0.0.0.0:8000
```

Check backend configuration:

```powershell
python backend/manage.py check
```

Compile-check Python files:

```powershell
python -m compileall backend/apps
```

### 3.3 MongoDB

The project uses MongoDB as the only application data store.

Default values from `backend/config/settings.py`:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/
MONGODB_DATABASE=slessaa_clothing
MONGODB_APP_NAME=slessaa-django
```

MongoDB must be running before testing backend APIs.

There is also a MongoDB test command:

```powershell
python backend/manage.py test_mongodb
```

## 4. Environment Variables

Root `.env.example` currently includes:

```env
VITE_API_URL=
VITE_API_BASE_URL=
VITE_KHALTI_PUBLIC_KEY=your_rotated_khalti_public_key_here
MONGODB_URI=mongodb://127.0.0.1:27017/
MONGODB_DATABASE=slessaa_clothing
MONGODB_APP_NAME=slessaa-django
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
```

Backend settings also support:

```env
DJANGO_SECRET_KEY=
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=*
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
FRONTEND_BASE_URL=http://localhost:5173
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
KHALTI_PUBLIC_KEY=
KHALTI_SECRET_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
IMAGE_GENERATION_API_URL=
IMAGE_GENERATION_API_KEY=
UNSPLASH_ACCESS_KEY=
PEXELS_API_KEY=
```

For mobile testing on the same Wi-Fi:

```env
VITE_API_URL=http://YOUR_LOCAL_IP:8000
FRONTEND_BASE_URL=http://YOUR_LOCAL_IP:5173
DJANGO_ALLOWED_HOSTS=*
CORS_ALLOWED_ORIGIN_REGEXES=^http://192\.168\.\d{1,3}\.\d{1,3}:5173$,^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$,^http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:5173$
```

Then run:

```powershell
npm run dev -- --host
python backend/manage.py runserver 0.0.0.0:8000
```

Open from mobile:

```text
http://YOUR_LOCAL_IP:5173
```

Do not open `http://0.0.0.0:8000` in a browser. Use `http://localhost:8000` on PC or `http://YOUR_LOCAL_IP:8000` from mobile.

## 5. Roles and Account Management

Supported roles:

- `customer`: storefront user
- `vendor`: shop owner
- `tailor`: assigned tailoring worker
- `admin`: platform operations
- `super_admin`: full system control

Current role dashboard path mapping is in `src/utils/roleRouting.js`:

```text
customer     -> /dashboard/customer
vendor       -> /dashboard/vendor
tailor       -> /dashboard/tailor
admin        -> /dashboard/admin
super_admin  -> /dashboard/super-admin
```

### 5.1 Reset Role Passwords

Use the management command:

```powershell
python backend/manage.py reset_role_password EMAIL NEW_PASSWORD --role ROLE
```

Examples:

```powershell
python backend/manage.py reset_role_password superadmin@slessaa.com NewPassword123 --role super_admin
python backend/manage.py reset_role_password vendor@example.com NewPassword123 --role vendor
python backend/manage.py reset_role_password tailor@example.com NewPassword123 --role tailor
```

The command refuses to run when `DEBUG=false` unless `--force` is passed.

### 5.2 Create Admin Users

Admin users are created through the Super Admin dashboard or via the admin user API:

```text
POST /api/auth/users/
```

Only a super admin can create admin or super admin accounts.

## 6. Frontend Route Map

### 6.1 Storefront Routes

| Path | Page | Access |
| --- | --- | --- |
| `/` | Home | Public/storefront |
| `/about` | About | Public |
| `/apply-vendor` | Vendor application | Public |
| `/contact` | Contact/support | Public |
| `/shop` | Product listing | Storefront |
| `/shop/:productId` | Product detail | Storefront |
| `/wishlist` | Wishlist | Storefront |
| `/tailoring` | Tailoring/custom request | Storefront |
| `/tailoring/requests/:requestId` | Tailoring request detail | Customer |
| `/recommendations` | AI recommendations | Storefront |
| `/cart` | Cart | Storefront |
| `/checkout` | Checkout | Storefront |
| `/checkout/payment/:provider/:paymentId` | Payment callback/result | Storefront |
| `/messages` | Customer messages | Customer |
| `/orders` | Customer dashboard/orders | Customer |
| `/returns` | Customer returns | Customer |
| `/profile` | Customer profile | Customer |
| `/track-order` | Tracking page | Storefront |
| `/dashboard/customer` | Customer dashboard | Customer |
| `/login` | Login | Public |
| `/signup` | Signup | Public |
| `/auth/google/callback` | Google auth callback | Public |

### 6.2 Vendor Dashboard Routes

Vendor layout routes:

| Path | Section |
| --- | --- |
| `/dashboard/vendor` | Overview |
| `/dashboard/vendor/shop-profile` | Shop Profile |
| `/dashboard/vendor/products` | Products |
| `/dashboard/vendor/add-product` | Add Product |
| `/dashboard/vendor/orders` | Orders |
| `/dashboard/vendor/customized` | Customized Services |
| `/dashboard/vendor/returns` | Returns |
| `/dashboard/vendor/reviews-questions` | Reviews and Product Questions |
| `/dashboard/vendor/messages` | Customer messages and admin support |
| `/dashboard/vendor/payouts` | Payouts |
| `/dashboard/vendor/settings` | Settings |

Vendor dashboard implementation:

- `src/pages/VendorDashboardPage.jsx`
- `src/components/vendor/VendorDashboardWorkspace.jsx`

### 6.3 Tailor Dashboard Routes

Tailor layout routes:

| Path | Section |
| --- | --- |
| `/dashboard/tailor` | Overview |
| `/dashboard/tailor/assigned-requests` | Assigned Requests |
| `/dashboard/tailor/measurements` | Measurements |
| `/dashboard/tailor/messages` | Customer-Tailor Messages |
| `/dashboard/tailor/progress-updates` | Request progress workspace |
| `/dashboard/tailor/completed-work` | Completed Work |
| `/dashboard/tailor/earnings` | Earnings placeholder panel |
| `/dashboard/tailor/settings` | Settings placeholder panel |

Tailor dashboard implementation:

- `src/pages/TailorDashboardPage.jsx`
- `src/components/tailoring/TailoringRequestThread.jsx`

### 6.4 Admin Dashboard Routes

Admin layout routes:

| Path | Section |
| --- | --- |
| `/dashboard/admin` | Overview |
| `/dashboard/admin/users` | Users |
| `/dashboard/admin/vendor-applications` | Vendor Applications |
| `/dashboard/admin/tailor-applications` | Tailor Applications placeholder |
| `/dashboard/admin/vendors` | Vendors |
| `/dashboard/admin/tailors` | Tailors placeholder |
| `/dashboard/admin/orders` | Orders |
| `/dashboard/admin/tailoring-requests` | Tailoring Requests |
| `/dashboard/admin/returns` | Returns |
| `/dashboard/admin/payouts` | Payouts |
| `/dashboard/admin/reviews-questions` | Reviews and Questions |
| `/dashboard/admin/contact-messages` | Stored Contact Messages |
| `/dashboard/admin/vendor-support` | Vendor to Admin live support chat |
| `/dashboard/admin/analytics` | Analytics |
| `/dashboard/admin/settings` | Settings placeholder |

Admin dashboard implementation:

- `src/pages/AdminDashboardPage.jsx`
- `src/components/layout/AdminLayout.jsx`

### 6.5 Super Admin Dashboard Routes

Super admin layout routes:

| Path | Section |
| --- | --- |
| `/dashboard/super-admin` | Dashboard |
| `/dashboard/super-admin/users` | Users |
| `/dashboard/super-admin/admins` | Admin Management |
| `/dashboard/super-admin/vendors` | Vendor list and approval |
| `/dashboard/super-admin/tailors` | Tailor list and approval |
| `/dashboard/super-admin/orders` | Orders and status updates |
| `/dashboard/super-admin/returns` | Returns |
| `/dashboard/super-admin/commission` | Commission and platform settings |
| `/dashboard/super-admin/analytics` | Analytics |
| `/dashboard/super-admin/settings` | Platform controls/settings |

Super admin implementation:

- `src/pages/SuperAdminDashboardPage.jsx`
- `src/components/layout/SuperAdminLayout.jsx`

## 7. Backend API Map

All backend API routes are under:

```text
http://localhost:8000/api/
```

Or on mobile/network:

```text
http://YOUR_LOCAL_IP:8000/api/
```

JWT auth header:

```http
Authorization: Bearer ACCESS_TOKEN
```

### 7.1 Auth and Account APIs

Mounted under `backend/apps/accounts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/` | Auth API root |
| `POST` | `/api/auth/register/` | Register customer/vendor/tailor where allowed |
| `POST` | `/api/auth/login/` | Login and receive JWT tokens |
| `POST` | `/api/auth/refresh/` | Refresh JWT access token |
| `GET` | `/api/auth/google/config/` | Get Google auth config |
| `POST` | `/api/auth/google/login/` | Google login |
| `GET` | `/api/auth/users/` | List users, admin/super admin |
| `POST` | `/api/auth/users/` | Create admin/super admin, super admin only |
| `PATCH` | `/api/auth/users/:id/` | Update user/admin |
| `DELETE` | `/api/auth/users/:id/` | Delete user/admin |
| `GET` | `/api/account/profile/` | Get current profile |
| `PUT` | `/api/account/profile/` | Update current profile |
| `POST` | `/api/account/password/` | Change current password |

Register payload:

```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "9800000000",
  "password": "Password123",
  "confirm_password": "Password123",
  "account_type": "customer"
}
```

Login payload:

```json
{
  "email": "customer@example.com",
  "password": "Password123"
}
```

### 7.2 Vendor APIs

Mounted under `backend/apps/vendors`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/vendors/` | List vendor profiles |
| `GET` | `/api/vendors/:slug/` | Vendor detail |
| `PATCH` | `/api/vendors/:slug/` | Update vendor profile/status |
| `POST` | `/api/vendor-applications/` | Submit public vendor application |
| `GET` | `/api/vendor-applications/` | List vendor applications |
| `PATCH` | `/api/vendor-applications/` | Approve/reject vendor application |

Vendor application should be tested before vendor signup, because vendor signup is restricted unless the application email is approved.

### 7.3 Product APIs

Mounted under `backend/apps/products`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/categories/` | List categories |
| `POST` | `/api/categories/` | Create category |
| `GET` | `/api/products/` | List products |
| `POST` | `/api/products/` | Create product |
| `GET` | `/api/products/:slug_or_id/` | Product detail |
| `PATCH` | `/api/products/:slug_or_id/` | Update product |
| `DELETE` | `/api/products/:slug_or_id/` | Delete product |

Product fields include:

- `vendor`
- `category`
- `name`
- `description`
- `price`
- `discount_price`
- `stock`
- `sizes`
- `colors`
- `fabric_options`
- `product_type`: `ready_made`, `customizable`, `both`
- `is_customizable`
- `main_image`
- `external_image_url`
- `sustainability_guidance`
- `customization_note`

### 7.4 Cart, Wishlist, Orders, Returns, Tracking

Mounted under `backend/apps/orders`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/cart/` | List cart |
| `POST` | `/api/cart/` | Add cart item |
| `PATCH` | `/api/cart/:id/` | Update cart quantity/options |
| `DELETE` | `/api/cart/:id/` | Remove cart item |
| `GET` | `/api/wishlist/` | List wishlist |
| `POST` | `/api/wishlist/` | Add wishlist item |
| `DELETE` | `/api/wishlist/:id/` | Remove wishlist item |
| `GET` | `/api/orders/` | List visible orders by role |
| `POST` | `/api/orders/` | Place order |
| `GET` | `/api/orders/:id/` | Order detail |
| `PATCH` | `/api/orders/:id/` | Update order status |
| `GET` | `/api/tracking/` | Tracking updates |
| `GET` | `/api/return-requests/` | List returns |
| `POST` | `/api/return-requests/` | Create return request |
| `PATCH` | `/api/return-requests/:id/` | Update return request |
| `GET` | `/api/vouchers/` | List vouchers |

Order create payload shape:

```json
{
  "full_name": "Customer Name",
  "phone": "9800000000",
  "email": "customer@example.com",
  "shipping_address": "Kathmandu",
  "city": "Kathmandu",
  "province": "Bagmati",
  "postal_code": "44600",
  "billing_address": "Kathmandu",
  "delivery_option": "standard",
  "payment_method": "cod",
  "shipping_fee": "0",
  "total": "2500",
  "items": [
    {
      "product": 1,
      "quantity": 1,
      "size": "M",
      "color": "Black",
      "price": "2500"
    }
  ]
}
```

Nepal phone validation expects a 10 digit number starting with `98`, or a normalized `977` number.

Order status update values:

```text
pending
processing
ready
completed
delivered
```

### 7.5 Tailoring APIs

Mounted under `backend/apps/tailoring`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/measurements/` | List measurements |
| `POST` | `/api/measurements/` | Create measurement |
| `POST` | `/api/measurement-suggestions/` | Generate measurement suggestion |
| `GET` | `/api/tailor-profiles/` | List tailor profiles |
| `PATCH` | `/api/tailor-profiles/:id/` | Update tailor profile/status |
| `GET` | `/api/tailor-recommendations/` | List/route recommendations |
| `POST` | `/api/tailor-recommendations/` | Get recommended tailor |
| `GET` | `/api/tailoring-requests/` | List visible tailoring requests |
| `POST` | `/api/tailoring-requests/` | Create customization/tailoring request |
| `GET` | `/api/tailoring-requests/:id/` | Tailoring request detail |
| `PATCH` | `/api/tailoring-requests/:id/` | Update request/status |
| `GET` | `/api/tailoring-messages/` | List structured tailoring messages |
| `POST` | `/api/tailoring-messages/` | Create structured tailoring message |

Tailoring request core fields:

- `clothing_type`
- `fabric`
- `color`
- `design_notes`
- `standard_size`
- `style_preference`
- `occasion_preference`
- `delivery_preference`
- `preferred_delivery_date`
- `measurement`
- `assigned_tailor`
- `vendor`
- `reference_product_id`
- `reference_product_slug`
- `inspiration_image`

Progress statuses to test:

```text
pending
assigned
accepted
discussion_ongoing
in_progress
cutting
stitching
fitting
completed
```

### 7.6 Messaging APIs

Mounted under `backend/apps/chats`.

Supported conversation types:

- `customer_vendor`
- `customer_tailor`
- `vendor_admin`

Main endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/chat/conversations/` | List conversations |
| `POST` | `/api/chat/conversations/` | Create or get conversation |
| `GET` | `/api/chat/conversations/:id/` | Get conversation detail |
| `POST` | `/api/chat/conversations/:id/read/` | Mark conversation read |
| `POST` | `/api/chat/conversations/:id/close/` | Close/reopen vendor-admin thread |
| `GET` | `/api/chat/messages/?conversation=:id` | List messages |
| `POST` | `/api/chat/messages/` | Send message |

Compatibility endpoints also exist:

| Method | Endpoint |
| --- | --- |
| `GET` | `/api/messages/conversations/` |
| `POST` | `/api/messages/conversations/start/` |
| `GET` | `/api/messages/conversations/:id/` |
| `GET` | `/api/messages/conversations/:id/messages/` |
| `POST` | `/api/messages/conversations/:id/messages/` |
| `POST` | `/api/messages/conversations/:id/read/` |
| `POST` | `/api/messages/conversations/:id/close/` |

Create customer/vendor thread:

```json
{
  "kind": "customer_vendor",
  "vendor_user_id": 2,
  "product_id": 1
}
```

Create customer/vendor order thread:

```json
{
  "kind": "customer_vendor",
  "vendor_user_id": 2,
  "order_id": 10
}
```

Create customer/tailor thread:

```json
{
  "kind": "customer_tailor",
  "tailoring_request_id": 5
}
```

Create vendor/admin support thread:

```json
{
  "kind": "vendor_admin",
  "support_topic": "payout_issue",
  "subject": "Payout not received"
}
```

Send message:

```json
{
  "conversation": 1,
  "body": "Hello, I need help with this order."
}
```

Role rules:

- Customer can create/access only their customer/vendor or customer/tailor threads.
- Vendor can access their customer/vendor and vendor/admin threads.
- Tailor can access assigned customer/tailor threads.
- Admin can access assigned vendor/admin support threads.
- Super admin can inspect all conversations from backend access rules.
- Closed vendor/admin support threads cannot receive messages until reopened.

### 7.7 Reviews and Product Questions

Mounted under `backend/apps/reviews`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/reviews/` | List reviews |
| `POST` | `/api/reviews/` | Create review |
| `PATCH` | `/api/reviews/:id/` | Update/moderate review |
| `DELETE` | `/api/reviews/:id/` | Delete review |
| `GET` | `/api/product-questions/` | List product questions |
| `POST` | `/api/product-questions/` | Ask product question |
| `PATCH` | `/api/product-questions/:id/` | Answer/moderate question |
| `DELETE` | `/api/product-questions/:id/` | Delete question |

### 7.8 Payments

Mounted under `backend/apps/payments`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/payments/` | List visible payments |
| `POST` | `/api/payments/initiate/` | Initiate payment |
| `POST` | `/api/payments/verify/` | Verify payment |

Supported payment methods in order validation:

```text
cod
esewa
khalti
card
```

### 7.9 Notifications

Mounted under `backend/apps/notifications`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/notifications/` | List notifications |
| `POST` | `/api/notifications/:id/read/` | Mark one notification read |
| `POST` | `/api/notifications/read-all/` | Mark all read |

### 7.10 Dashboards and Settings

Mounted under `backend/apps/dashboards`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/dashboard/customer/` | Customer dashboard summary |
| `GET` | `/api/dashboard/vendor/` | Vendor dashboard summary |
| `GET` | `/api/dashboard/tailor/` | Tailor dashboard summary |
| `GET` | `/api/dashboard/admin/` | Admin dashboard summary |
| `GET` | `/api/dashboard/super-admin/` | Super admin dashboard summary |
| `GET` | `/api/dashboard/super-admin/analytics/` | Super admin analytics |
| `GET` | `/api/platform-settings/` | Platform settings |
| `PATCH` | `/api/platform-settings/` | Update platform settings |

### 7.11 AI Services

Mounted under `backend/apps/ai_services`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET/POST` | `/api/recommendations/` | Recommendation list or user-based recommendations |
| `POST` | `/api/recommend/` | Fashion recommendation |
| `POST` | `/api/weather/` | Weather-based fashion insight |
| `POST` | `/api/upload/` | Outfit/image analysis |
| `GET/POST` | `/api/save-outfit/` | Save/list outfit |
| `POST` | `/api/design-suggestion/` | AI design suggestion, including generated/fallback image support |
| `GET/POST` | `/api/save-design-suggestion/` | Save/list design suggestions |
| `POST` | `/api/wardrobe-plan/` | Wardrobe plan |
| `POST` | `/api/chatbot/` | Chatbot response |

Image generation depends on:

```env
IMAGE_GENERATION_API_URL=
IMAGE_GENERATION_API_KEY=
```

If generation fails, frontend/backend fallback behavior should show predefined images or a graceful fallback.

## 8. Core End-to-End Testing Checklists

Use these as manual test scripts.

### 8.1 Smoke Test

1. Start MongoDB.
2. Start backend:

   ```powershell
   python backend/manage.py runserver 0.0.0.0:8000
   ```

3. Start frontend:

   ```powershell
   npm run dev -- --host
   ```

4. Open:

   ```text
   http://localhost:5173
   http://localhost:8000/api/
   ```

5. Confirm no frontend console network errors.
6. Confirm API root loads.
7. Confirm login page loads.
8. Confirm product listing loads.

### 8.2 Customer Account and Login

1. Open `/signup`.
2. Register with `account_type=customer`.
3. Confirm redirect/login works.
4. Open `/dashboard/customer`.
5. Confirm customer dashboard data loads.
6. Log out.
7. Log in again with the same customer.

Expected:

- JWT tokens are stored in localStorage.
- Role routes allow customer dashboard.
- Customer cannot access vendor/admin/super-admin dashboards.

### 8.3 Vendor Application and Vendor Signup

1. Open `/apply-vendor`.
2. Submit a vendor application.
3. Log in as super admin.
4. Open `/dashboard/super-admin/vendors`.
5. Approve the vendor application.
6. Register or create the vendor account with the approved email.
7. Log in as vendor.
8. Open `/dashboard/vendor`.

Expected:

- Vendor application appears in admin/super-admin review areas.
- Vendor profile is created/provisioned.
- Vendor dashboard loads without customer storefront controls.

### 8.4 Product Management

As vendor:

1. Open `/dashboard/vendor/add-product`.
2. Create a product with:
   - category
   - name
   - price
   - stock
   - size/color/fabric values
   - image
   - product type
3. Open `/dashboard/vendor/products`.
4. Edit product.
5. Delete or deactivate product if needed.

As customer:

1. Open `/shop`.
2. Confirm product appears.
3. Click product card.
4. Confirm `/shop/:productId` opens.
5. Confirm image, title, price, description, sizes, quantity, Add to Cart, and Customize button if supported.

Expected:

- Product card navigation is consistent.
- Vendor can only manage own products unless admin/super admin.
- Product detail uses the selected product id/slug.

### 8.5 Cart and Checkout

1. Open product detail.
2. Select size/color if available.
3. Add to cart.
4. Open `/cart`.
5. Update quantity.
6. Remove item and re-add it.
7. Open `/checkout`.
8. Fill checkout form using valid Nepali mobile number starting with `98`.
9. Use `cod` for first test.
10. Place order.

Expected:

- Cart persists for logged-in customer.
- Order is created.
- Order has customer id.
- Order items have product/vendor linkage.
- Customer sees order in `/orders`.
- Vendor sees the order in `/dashboard/vendor/orders`.
- Admin and super admin see the order in their dashboards.

### 8.6 Vendor Order Status Flow

As vendor:

1. Open `/dashboard/vendor/orders`.
2. Find the customer order.
3. Change status:
   - pending
   - processing
   - ready
   - completed
   - delivered
4. Add status note.
5. Save.

As customer:

1. Open `/orders`.
2. Confirm updated status.
3. Open `/track-order`.
4. Confirm tracking updates.

Expected:

- Status update is saved.
- Tracking updates are visible.
- Dashboard counts update after refresh.

### 8.7 Customer to Vendor Messaging

From product page:

1. Log in as customer.
2. Open a product detail page.
3. Click `Chat with Vendor`.
4. Send a message.

From order page:

1. Open `/orders`.
2. Click vendor chat/message action for an order.
3. Send a message.

As vendor:

1. Open `/dashboard/vendor/messages`.
2. Select `Customers`.
3. Confirm customer thread appears.
4. Reply.

Expected:

- Thread appears in `/messages` for customer.
- Thread appears in vendor dashboard.
- Unread count appears then clears after opening.
- Same product/order context should reuse existing thread.

### 8.8 Vendor to Admin Messaging

As vendor:

1. Open `/dashboard/vendor/messages`.
2. Select `Admin Support`.
3. Choose support topic:
   - general support
   - payout issue
   - order dispute
   - product approval
   - technical problem
4. Enter subject.
5. Click `Contact Admin`.
6. Send a message.

As admin:

1. Open `/dashboard/admin/vendor-support`.
2. Confirm vendor support thread appears.
3. Reply.
4. Close the thread.
5. Reopen the thread.
6. Reply again.

Expected:

- Vendor/admin thread is persisted.
- Vendor can see the thread in Admin Support tab.
- Admin can reply.
- Closed conversations block sending until reopened.

### 8.9 Tailoring Request Flow

As customer:

1. Open `/tailoring`.
2. Fill measurement and design fields.
3. Upload inspiration image if needed.
4. Submit tailoring request.
5. Open `/tailoring/requests/:requestId`.

As tailor:

1. Open `/dashboard/tailor`.
2. Confirm assigned count.
3. Open `/dashboard/tailor/assigned-requests`.
4. Open a request.
5. Review customer, design, measurements, image, and request status.
6. Open `/dashboard/tailor/progress-updates`.
7. Send a progress update and set stage.

As customer:

1. Reopen request detail.
2. Confirm tailor update is visible.
3. Open `/messages?kind=customer_tailor&tailoring_request_id=ID`.

Expected:

- Request is visible only to assigned tailor, owning customer, and admins.
- Measurements are readable.
- Customer/tailor conversation exists.
- Progress changes persist.

### 8.10 Tailor Messaging

As customer:

1. Open tailoring request detail.
2. Click/open tailoring message link.
3. Send message.

As tailor:

1. Open `/dashboard/tailor/messages`.
2. Confirm conversation appears.
3. Reply.

Expected:

- Tailor only sees conversations for assigned requests.
- Customer only sees own conversations.
- Conversation count in tailor dashboard updates.

### 8.11 Returns and Vouchers

As customer:

1. Open `/orders`.
2. Create return request for an order item.
3. Add reason, description, image proof if available.
4. Choose requested resolution:
   - full refund
   - exchange
   - voucher
   - manual vendor review

As vendor/admin:

1. Open returns section.
2. Review request.
3. Update status:
   - pending
   - under review
   - approved refund
   - approved exchange
   - approved voucher
   - more info requested
   - rejected
   - completed
4. Add vendor/admin note.

Expected:

- Customer sees return status.
- Vendor sees only relevant return cases.
- Admin/super admin can monitor returns.
- Voucher appears if voucher resolution is approved.

### 8.12 Reviews and Product Questions

As customer:

1. Open product detail.
2. Submit review.
3. Submit product question.

As vendor:

1. Open `/dashboard/vendor/reviews-questions`.
2. Answer product question.
3. Hide/show review if available.

As admin:

1. Open `/dashboard/admin/reviews-questions`.
2. Moderate review/question.

Expected:

- Reviews appear on product.
- Questions can be answered.
- Moderation state is respected.

### 8.13 Super Admin Tests

Log in as super admin and test:

1. `/dashboard/super-admin`
2. Click summary cards:
   - Users
   - Admins
   - Vendors
   - Tailors
   - Orders
   - Commission
3. Test sidebar links.
4. Create admin user.
5. Edit admin user.
6. Approve/reject vendors.
7. Approve/reject tailors.
8. Update order status.
9. Update platform settings/commission.
10. Open analytics.

Expected:

- All cards and sidebar items route.
- Active state updates.
- User/vendor/tailor/order data is real.
- No dead placeholder for core modules.

### 8.14 Admin Tests

Log in as admin and test:

1. `/dashboard/admin`
2. Users list
3. Vendor applications
4. Vendors
5. Orders
6. Tailoring requests
7. Returns
8. Payouts
9. Reviews/questions
10. Contact messages
11. Vendor support

Expected:

- Admin can operate platform modules.
- Admin cannot access super admin dashboard unless role is `super_admin`.
- Vendor support chat works.

### 8.15 AI Recommendation and Design Image

1. Open `/recommendations`.
2. Enter fashion prompt.
3. Confirm recommendation returns:
   - tags
   - description
   - generated image or fallback image
4. Disable/clear image generation key and retry.
5. Confirm fallback UI appears.

Expected:

- Text recommendation stays working.
- Image appears below recommendation.
- API failure does not break page.

### 8.16 Chatbot

1. Open storefront.
2. Open chatbot widget.
3. Send a product/fashion question.
4. Confirm response.
5. Stop backend and retry.

Expected:

- Chatbot handles backend failure with user-friendly error.
- Page does not crash.

### 8.17 Mobile and Responsive Testing

Run network servers:

```powershell
npm run dev -- --host
python backend/manage.py runserver 0.0.0.0:8000
```

On phone:

```text
http://YOUR_LOCAL_IP:5173
```

Test pages:

- Home
- Shop
- Product detail
- Cart
- Checkout
- Messages
- Customer orders
- Vendor dashboard
- Tailor dashboard
- Admin/super-admin dashboards if needed

Check:

- No horizontal scrolling.
- Navbar collapses.
- Product cards stack 1 per row on mobile.
- Buttons are touch-friendly.
- Chat page stacks thread list and messages.
- Checkout form fields are readable.
- Dashboard tables scroll horizontally when needed.
- No API calls use `localhost` from mobile.

## 9. Implementation Notes by Workflow

### 9.1 Order Linkage

Ready-made orders should store:

- `customer_id`
- item `product`
- item `vendor`
- item `vendor_user`
- `order_type`
- `status`
- `payment_status`

If a cart contains products from multiple vendors, vendor filtering depends on vendor data stored per item. Vendor dashboard should filter by `vendor_user` or `vendor_user_id`.

### 9.2 Custom Tailoring Linkage

Tailoring requests should store:

- customer/user id
- optional product reference
- optional vendor
- assigned tailor/tailor id
- measurement
- inspiration image
- order type/custom status
- progress status

Tailor dashboard depends on correct `assigned_tailor` / `tailor_id` linkage.

### 9.3 Messaging Linkage

Conversation documents support:

- `kind`
- `customer_user_id`
- `vendor_user_id`
- `tailor_user_id`
- `admin_user_id`
- `product_id`
- `order_id`
- `return_request_id`
- `tailoring_request_id`
- `custom_request_id`
- `support_topic`
- `subject`
- `is_closed`
- `participant_user_ids`

Messages support:

- `conversation_id`
- `sender_user_id`
- `sender_detail`
- `body`
- `attachment`
- `read_by_user_ids`
- `created_at`

### 9.4 Dashboard Data

Dashboard summary endpoints are the source for counts:

- Customer: `/api/dashboard/customer/`
- Vendor: `/api/dashboard/vendor/`
- Tailor: `/api/dashboard/tailor/`
- Admin: `/api/dashboard/admin/`
- Super Admin: `/api/dashboard/super-admin/`

If counts look wrong, inspect:

- repository filtering by role
- vendor/tailor/user ids on records
- frontend list API calls
- dashboard summary calculation in `backend/apps/dashboards/views.py`

## 10. Common Problems and Fixes

### 10.1 Mobile Cannot Reach Backend

Symptoms:

- `ERR_ADDRESS_INVALID`
- API calls fail on phone
- `localhost` appears in network tab

Fix:

1. Use local IP, not `localhost`.
2. Set:

   ```env
   VITE_API_URL=http://YOUR_LOCAL_IP:8000
   ```

3. Run:

   ```powershell
   npm run dev -- --host
   python backend/manage.py runserver 0.0.0.0:8000
   ```

4. Open:

   ```text
   http://YOUR_LOCAL_IP:5173
   ```

### 10.2 CORS Error

Fix in `.env` or `backend/config/settings.py`:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://YOUR_LOCAL_IP:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://YOUR_LOCAL_IP:5173
DJANGO_ALLOWED_HOSTS=*
```

Restart backend after changing backend env values.

### 10.3 Google Login Origin Mismatch

Google error:

```text
Error 400: origin_mismatch
```

Fix in Google Cloud Console for your OAuth client:

- Add authorized JavaScript origins:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
  - `http://YOUR_LOCAL_IP:5173`
- Add redirect URI if using auth code flow:
  - `http://localhost:5173/auth/google/callback`
  - `http://YOUR_LOCAL_IP:5173/auth/google/callback`

Also confirm:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

### 10.4 Admin Password Unknown

Passwords are hashed and cannot be read in plain text.

Reset with:

```powershell
python backend/manage.py reset_role_password superadmin@slessaa.com NewPassword123 --role super_admin
```

### 10.5 Vendor Cannot Sign Up

Vendor signup is blocked unless the email has an approved vendor application.

Fix:

1. Submit vendor application.
2. Approve it as admin/super admin.
3. Sign up vendor using the approved email.

### 10.6 Empty Chat Threads

Check:

- User is logged in with correct role.
- Conversation was created from product/order/tailoring/vendor support entry point.
- Backend has participant ids in `participant_user_ids`.
- Correct `kind` filter is passed:
  - `customer_vendor`
  - `customer_tailor`
  - `vendor_admin`

### 10.7 Vendor Dashboard Shows No Orders

Check order item fields:

- `vendor_user`
- `vendor_user_id`
- `vendor`
- `vendor_id`

Vendor dashboard filters by logged-in vendor user id.

### 10.8 Tailor Dashboard Shows No Assigned Requests

Check tailoring request fields:

- `assigned_tailor`
- `tailor_id`
- `user`
- `customer_id`
- `status`

Tailor dashboard only shows requests assigned to the logged-in tailor.

## 11. Recommended Testing Order

Use this order to avoid blocked workflows:

1. Backend health and MongoDB connection
2. Frontend build
3. Customer signup/login
4. Super admin password reset/login
5. Vendor application
6. Vendor approval
7. Vendor signup/login
8. Product/category creation
9. Product listing and detail
10. Cart and checkout
11. Vendor order dashboard
12. Admin/super admin order dashboard
13. Customer/vendor messaging
14. Tailoring request creation
15. Tailor assignment and tailor dashboard
16. Customer/tailor messaging
17. Returns and vouchers
18. Reviews/questions
19. Vendor/admin support messaging
20. AI recommendations/design image
21. Mobile Wi-Fi testing

## 12. Pre-Release Checklist

Backend:

- `python backend/manage.py check`
- `python -m compileall backend/apps`
- MongoDB running
- No hardcoded secrets
- `DJANGO_DEBUG=false` for production
- Restrictive `DJANGO_ALLOWED_HOSTS` for production
- Correct CORS origins
- Payment keys configured
- Google OAuth origins configured

Frontend:

- `npm run build`
- No console errors on core pages
- API base URL correct for environment
- Mobile responsive checks passed
- Product grid stable at 80%, 100%, 125%, 150% zoom
- Chat works on mobile
- Checkout works on mobile

Data:

- At least one admin/super admin account
- At least one approved vendor
- At least one approved/available tailor
- At least one category
- At least one active product
- Test customer account
- Test order
- Test tailoring request
- Test conversation threads

Security:

- Customer cannot access vendor/admin dashboards
- Vendor cannot access other vendor orders/products
- Tailor cannot access unrelated tailoring requests
- Admin cannot access super admin-only pages
- Customer cannot message unrelated vendors without valid context
- Vendor/admin support threads are not visible to customers

## 13. Useful Commands

Frontend:

```powershell
npm install
npm run dev
npm run dev -- --host
npm run build
npm run preview
```

Backend:

```powershell
pip install -r backend/requirements.txt
python backend/manage.py check
python backend/manage.py runserver
python backend/manage.py runserver 0.0.0.0:8000
python backend/manage.py test_mongodb
python -m compileall backend/apps
```

Password reset:

```powershell
python backend/manage.py reset_role_password EMAIL NEW_PASSWORD --role ROLE
```

## 14. Files to Inspect When Something Breaks

Auth/login:

- `backend/apps/accounts/views.py`
- `backend/apps/accounts/serializers.py`
- `backend/apps/accounts/repository.py`
- `src/context/AuthContext.jsx`
- `src/pages/LoginPage.jsx`

API URL/mobile:

- `src/services/api.js`
- `vite.config.js`
- `backend/config/settings.py`

Products:

- `backend/apps/products/repository.py`
- `backend/apps/products/views.py`
- `src/pages/ShopPage.jsx`
- `src/pages/ProductDetailsPage.jsx`
- `src/components/shop/ProductCard.jsx`

Orders/cart:

- `backend/apps/orders/repository.py`
- `backend/apps/orders/views.py`
- `src/context/CartContext.jsx`
- `src/pages/CartPage.jsx`
- `src/pages/CheckoutPage.jsx`

Dashboards:

- `backend/apps/dashboards/views.py`
- `src/components/vendor/VendorDashboardWorkspace.jsx`
- `src/pages/TailorDashboardPage.jsx`
- `src/pages/AdminDashboardPage.jsx`
- `src/pages/SuperAdminDashboardPage.jsx`

Messaging:

- `backend/apps/chats/repository.py`
- `backend/apps/chats/views.py`
- `src/components/chat/ChatWorkspace.jsx`
- `src/pages/MessagesPage.jsx`
- `src/components/vendor/VendorDashboardWorkspace.jsx`

Tailoring:

- `backend/apps/tailoring/repository.py`
- `backend/apps/tailoring/views.py`
- `src/pages/TailoringPage.jsx`
- `src/pages/TailoringRequestDetailPage.jsx`
- `src/pages/TailorDashboardPage.jsx`

AI:

- `backend/apps/ai_services/services.py`
- `backend/apps/ai_services/views.py`
- `src/pages/RecommendationsPage.jsx`
- `src/components/common/AiRecommendationSection.jsx`

