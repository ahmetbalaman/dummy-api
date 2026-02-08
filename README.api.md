# Loyalty System API

Node.js REST API for multi-tenant loyalty and collection management system.

## Features

- 🔐 JWT Authentication
- 👥 Role-based access control (Admin, Business, User)
- 🔑 OAuth support (Google, Apple)
- 🏪 Multi-tenant business isolation
- 💰 Dual economy system (TL + Points)
- 📦 Collection set management
- 🚚 Shipment tracking
- 📊 Business analytics

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB
# Make sure MongoDB is running on localhost:27017

# Seed database with sample data
npm run seed

# Start development server
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/admin` - Admin login
- `POST /api/auth/business` - Business login
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/apple` - Apple Sign In

### Admin Routes
- `GET /api/admin/businesses` - List all businesses
- `POST /api/admin/businesses` - Create business
- `GET /api/admin/collection-sets` - List collection sets
- `POST /api/admin/collection-sets` - Create collection set
- `GET /api/admin/shipments` - List all shipments
- `POST /api/admin/shipments` - Create shipment
- `GET /api/admin/system` - System stats
- `GET /api/admin/logs` - System logs

### Business Routes
- `GET /api/business/me` - Get business profile
- `GET /api/business/categories` - List categories
- `GET /api/business/products-tl` - List TL products
- `POST /api/business/products-tl` - Create TL product
- `GET /api/business/products-point` - List point products
- `GET /api/business/orders-tl` - List TL orders
- `GET /api/business/orders-point` - List point orders
- `GET /api/business/shipments` - List business shipments
- `GET /api/business/analytics` - Business analytics

### Mobile Routes
- `GET /api/mobile/profile` - User profile
- `GET /api/mobile/businesses` - List all businesses
- `GET /api/mobile/businesses/:id` - Business details
- `POST /api/mobile/order-tl` - Create TL order
- `POST /api/mobile/order-point` - Create point order
- `GET /api/mobile/orders-history` - Order history
- `GET /api/mobile/loyalty/:businessId` - Get loyalty points
- `GET /api/mobile/loyalties` - All loyalty points

### Kiosk Routes
- `GET /api/kiosk/menu/:businessId` - Get menu
- `POST /api/kiosk/session` - Create session
- `GET /api/kiosk/session/:qrCode` - Get session

## Database Models

- User
- Business
- Category
- Collection
- CollectionSet
- ProductTL
- ProductPoint
- OrderTL
- OrderPoint
- Loyalty
- Shipment
- KioskSession

## Environment Variables

See `.env.example` for all required configuration.

## Architecture

- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Google Auth Library** - Google OAuth
- **Apple Sign In** - Apple authentication

## Business Logic

### Multi-tenant Isolation
Each business operates as an independent account. Orders, products, and analytics are filtered by `businessId`.

### Dual Economy
- **TL Economy**: Real money transactions, earns points
- **Point Economy**: Loyalty points, no point earning

Points are business-specific and cannot be transferred between businesses.

### Collection Sets
Admin creates collection sets and ships them to businesses. Businesses receive shipments and products are added to their inventory.

## Security

- Helmet.js for security headers
- Rate limiting
- CORS configuration
- JWT token validation
- Role-based middleware
- Password hashing with bcrypt

## License

MIT
