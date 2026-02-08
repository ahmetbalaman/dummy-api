#!/bin/bash

# API Test Script
# Bu script API'nin çalışıp çalışmadığını test eder

BASE_URL="http://localhost:3131"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 API Test Script"
echo "=================="
echo ""

# Test 1: Health Check
echo -n "1. Health Check... "
HEALTH=$(curl -s ${BASE_URL}/health)
if [[ $HEALTH == *"ok"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

# Test 2: Admin Login
echo -n "2. Admin Login... "
ADMIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/admin \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@system.com","password":"admin123"}')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [[ ! -z "$ADMIN_TOKEN" ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "   Token: ${ADMIN_TOKEN:0:20}..."
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "   Response: $ADMIN_RESPONSE"
    exit 1
fi

# Test 3: Get Businesses (Admin)
echo -n "3. Get Businesses... "
BUSINESSES=$(curl -s ${BASE_URL}/api/admin/businesses \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ $BUSINESSES == *"Kahve"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    BUSINESS_COUNT=$(echo $BUSINESSES | grep -o '"_id"' | wc -l)
    echo "   Found $BUSINESS_COUNT businesses"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

# Test 4: Business Login
echo -n "4. Business Login... "
BUSINESS_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/business \
    -H "Content-Type: application/json" \
    -d '{"email":"info@kahvedukkani.com","password":"business123"}')

BUSINESS_TOKEN=$(echo $BUSINESS_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
BUSINESS_ID=$(echo $BUSINESS_RESPONSE | grep -o '"businessId":"[^"]*' | cut -d'"' -f4)

if [[ ! -z "$BUSINESS_TOKEN" ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "   Business ID: $BUSINESS_ID"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

# Test 5: Get Business Profile
echo -n "5. Get Business Profile... "
PROFILE=$(curl -s ${BASE_URL}/api/business/me \
    -H "Authorization: Bearer $BUSINESS_TOKEN")

if [[ $PROFILE == *"Kahve Dükkanı"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

# Test 6: Get TL Products
echo -n "6. Get TL Products... "
PRODUCTS=$(curl -s ${BASE_URL}/api/business/products-tl \
    -H "Authorization: Bearer $BUSINESS_TOKEN")

if [[ $PRODUCTS == *"Latte"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PRODUCT_COUNT=$(echo $PRODUCTS | grep -o '"_id"' | wc -l)
    echo "   Found $PRODUCT_COUNT products"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

# Test 7: Get TL Orders
echo -n "7. Get TL Orders... "
ORDERS=$(curl -s ${BASE_URL}/api/business/orders-tl \
    -H "Authorization: Bearer $BUSINESS_TOKEN")

if [[ $ORDERS == *"["* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ORDER_COUNT=$(echo $ORDERS | grep -o '"_id"' | wc -l)
    echo "   Found $ORDER_COUNT orders"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

# Test 8: Get Analytics
echo -n "8. Get Analytics... "
ANALYTICS=$(curl -s ${BASE_URL}/api/business/analytics \
    -H "Authorization: Bearer $BUSINESS_TOKEN")

if [[ $ANALYTICS == *"totalOrders"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

# Test 9: Get Kiosk Menu (No Auth)
echo -n "9. Get Kiosk Menu... "
MENU=$(curl -s ${BASE_URL}/api/kiosk/menu/$BUSINESS_ID)

if [[ $MENU == *"productsTL"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

# Test 10: System Stats
echo -n "10. System Stats... "
STATS=$(curl -s ${BASE_URL}/api/admin/system \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ $STATS == *"totalBusinesses"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "📊 Summary:"
echo "   - Admin authentication: ✓"
echo "   - Business authentication: ✓"
echo "   - Admin endpoints: ✓"
echo "   - Business endpoints: ✓"
echo "   - Kiosk endpoints: ✓"
echo ""
echo "🎉 API is working correctly!"
