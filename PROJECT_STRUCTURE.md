# 📁 Proje Yapısı

```
loyalty-api/
├── src/
│   ├── middleware/
│   │   └── auth.js                 # JWT authentication & role-based access
│   ├── models/
│   │   ├── Admin.js                # Admin model (bcrypt password)
│   │   ├── Business.js             # Business model (multi-tenant)
│   │   ├── Category.js             # Product categories
│   │   ├── Collection.js           # Collection groups
│   │   ├── CollectionSet.js        # Admin collection sets
│   │   ├── KioskSession.js         # QR session management
│   │   ├── Loyalty.js              # User-business loyalty points
│   │   ├── OrderPoint.js           # Point orders
│   │   ├── OrderTL.js              # TL orders (earns points)
│   │   ├── ProductPoint.js         # Point products
│   │   ├── ProductTL.js            # TL products
│   │   ├── Shipment.js             # Shipment tracking
│   │   └── User.js                 # OAuth users (Google/Apple)
│   ├── routes/
│   │   ├── admin.js                # Admin endpoints
│   │   ├── auth.js                 # Authentication endpoints
│   │   ├── business.js             # Business endpoints
│   │   ├── kiosk.js                # Kiosk endpoints
│   │   └── mobile.js               # Mobile app endpoints
│   ├── scripts/
│   │   └── seed.js                 # Database seeding script
│   ├── utils/
│   │   ├── jwt.js                  # JWT token utilities
│   │   └── oauth.js                # Google/Apple OAuth verification
│   └── server.js                   # Express app & MongoDB connection
├── admin/                          # Original dummy JSON files
├── business/                       # Original dummy JSON files
├── kiosk/                          # Original dummy JSON files
├── mobile/                         # Original dummy JSON files
├── .dockerignore
├── .env                            # Environment variables (gitignored)
├── .env.example                    # Environment template
├── .gitignore
├── docker-compose.yml              # Docker setup (MongoDB + API)
├── Dockerfile                      # API container
├── package.json                    # Dependencies & scripts
├── postman_collection.json         # Postman API tests
├── PROJECT_STRUCTURE.md            # This file
├── QUICKSTART.md                   # Quick start guide
├── README.api.md                   # English API documentation
├── README.TR.md                    # Turkish documentation
└── readme.md                       # Original dummy API docs
```

## 📦 Modüller

### Server (src/server.js)
- Express app setup
- MongoDB connection
- Middleware configuration
- Route mounting
- Error handling

### Middleware (src/middleware/)
- **auth.js**: JWT verification, role-based access control

### Models (src/models/)
Tüm Mongoose modelleri:
- Password hashing (bcrypt)
- Schema validation
- Indexes for performance
- Virtual fields
- Instance methods

### Routes (src/routes/)
RESTful API endpoints:
- **auth.js**: Login & OAuth
- **admin.js**: System management
- **business.js**: Business operations
- **mobile.js**: User operations
- **kiosk.js**: Kiosk operations

### Utils (src/utils/)
- **jwt.js**: Token generation & verification
- **oauth.js**: Google & Apple token verification

### Scripts (src/scripts/)
- **seed.js**: Database initialization with sample data

## 🔑 Önemli Dosyalar

### package.json
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "seed": "node src/scripts/seed.js"
  }
}
```

### .env
Environment variables:
- PORT
- MONGODB_URI
- JWT_SECRET
- OAuth credentials
- CORS settings

### docker-compose.yml
Services:
- MongoDB (port 27017)
- API (port 3000)

### postman_collection.json
Complete API test collection with:
- Auto token management
- All endpoints
- Sample requests

## 🗄️ Veritabanı Yapısı

```
MongoDB: loyalty-system
├── admins                  # Admin users
├── businesses              # Business accounts
├── users                   # OAuth users
├── categories              # Product categories (per business)
├── collections             # Collection groups (per business)
├── collectionsets          # Admin collection sets
├── producttls              # TL products (per business)
├── productpoints           # Point products (per business)
├── ordertls                # TL orders (earns points)
├── orderpoints             # Point orders (spends points)
├── loyalties               # User-business points
├── shipments               # Shipment tracking
└── kiosksessions           # QR sessions
```

## 🔐 Authentication Flow

```
Client Request
    ↓
POST /api/auth/{admin|business|google|apple}
    ↓
Verify credentials/token
    ↓
Generate JWT token
    ↓
Return { token, user }
    ↓
Client stores token
    ↓
Subsequent requests include:
Authorization: Bearer <token>
    ↓
Middleware verifies token
    ↓
Attach user to req.user
    ↓
Route handler processes request
```

## 🏪 Multi-Tenant Architecture

```
Business Login
    ↓
businessId stored in JWT
    ↓
Middleware extracts businessId
    ↓
All queries filtered by businessId
    ↓
Business sees only their data
```

## 💰 Dual Economy System

```
TL Order Flow:
User → Order TL Products → Pay with Money → Earn Points (10%)

Point Order Flow:
User → Order Point Products → Pay with Points → No Points Earned
```

## 📦 Collection Set Flow

```
Admin → Create Collection Set
    ↓
Admin → Create Shipment to Business
    ↓
Shipment Status: pending
    ↓
Admin → Update to in_transit (add tracking)
    ↓
Business → View shipment
    ↓
Business → Confirm delivery
    ↓
Shipment Status: delivered
    ↓
Products added to business inventory
```

## 🚀 Deployment Options

### Local Development
```bash
npm run dev
```

### Docker
```bash
docker-compose up -d
```

### Production
```bash
npm start
```

### Cloud (Heroku/Railway/Render)
1. Set environment variables
2. Connect MongoDB (Atlas)
3. Deploy from Git
4. Run seed script

## 📊 API Metrics

- **Total Endpoints**: 40+
- **Authentication Methods**: 4 (Admin, Business, Google, Apple)
- **Database Models**: 12
- **Middleware**: 2 (protect, restrictTo)
- **Roles**: 3 (admin, business, user)

## 🔧 Development Tools

- **nodemon**: Auto-restart on file changes
- **morgan**: HTTP request logging
- **helmet**: Security headers
- **cors**: Cross-origin resource sharing
- **express-rate-limit**: Rate limiting

## 📝 Code Quality

- ✅ Consistent error handling
- ✅ Input validation
- ✅ Password hashing
- ✅ JWT security
- ✅ Database indexes
- ✅ RESTful conventions
- ✅ Async/await patterns
- ✅ Environment configuration

## 🎯 Next Steps

1. Add Swagger/OpenAPI documentation
2. Implement logging system (Winston)
3. Add unit tests (Jest)
4. Add integration tests
5. Implement caching (Redis)
6. Add file upload (AWS S3)
7. Add email notifications
8. Add WebSocket for real-time updates
9. Add GraphQL API
10. Add admin dashboard
