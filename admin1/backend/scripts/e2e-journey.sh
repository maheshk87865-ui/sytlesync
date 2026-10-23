#!/bin/bash
# StyleSync Customer Backend — End-to-End Journey Test
# ---------------------------------------------------------------
# Walks through the complete customer journey against a live backend:
#   1.  Health check
#   2.  Sign up (creates a real customer account on the backend)
#   3.  Login (gets JWT)
#   4.  /auth/me (verify JWT works)
#   5.  /customers/me (profile)
#   6.  Set preferences
#   7.  List salons (public discovery)
#   8.  Get salon detail
#   9.  List services
#   10. Search
#   11. Get availability (today)
#   12. Get availability (specific date)
#   13. Create booking (will fail if DB down — expected)
#   14. List bookings
#   15. Create payment intent
#   16. List payment methods
#   17. List notifications
#   18. List favorites
#   19. Add favorite
#   20. List support tickets
#   21. Create support ticket
#   22. AI: analyze photo (demo pixel-analysis)
#   23. AI: text recommendation
#   24. AI: virtual try-on
#   25. Logout

export NODE_ENV=test
BASE="http://localhost:4000"
P=0; F=0; T=0

t() {
  T=$((T+1))
  local d="$1" e="$2" a="$3"
  if echo "$a" | grep -qi "$e"; then
    P=$((P+1))
    echo "  ✓ T$T: $d"
  else
    F=$((F+1))
    echo "  ✗ T$T: $d → expected '$e' got: $(echo $a|head -c 80)"
  fi
}

# Generate a unique email for this test run so we don't conflict
UNIQUE="user$(date +%s)@test.com"
PASS="TestPassword123!"
NAME="Test Customer"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  STYLESYNC CUSTOMER JOURNEY — END-TO-END TEST                ║"
echo "║  Email: $UNIQUE                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo ""; echo "━━━ 1. HEALTH ━━━"
t "Backend reachable" "StyleSync" "$(curl -s $BASE/)"
t "Health endpoint" "version" "$(curl -s $BASE/api/v1/health)"

echo ""; echo "━━━ 2. SIGN UP ━━━"
SIGNUP_RESP=$(curl -s -X POST $BASE/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$UNIQUE\",\"password\":\"$PASS\",\"fullName\":\"$NAME\"}")
echo "  Signup response: $(echo $SIGNUP_RESP | head -c 100)"
t "Signup success" "token" "$SIGNUP_RESP"

# Extract JWT from signup response
TOKEN=$(echo "$SIGNUP_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))" 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "  ⚠ Could not extract token from signup. Will try login next."
fi

echo ""; echo "━━━ 3. LOGIN ━━━"
LOGIN_RESP=$(curl -s -X POST $BASE/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$UNIQUE\",\"password\":\"$PASS\"}")
echo "  Login response: $(echo $LOGIN_RESP | head -c 100)"
t "Login success" "token" "$LOGIN_RESP"

# Extract JWT from login response (in case signup didn't have one)
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "  ⚠ No JWT — authed tests below will fail. Aborting."
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  FINAL: $P/$T passed, $F failed (auth setup failed)               ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  exit 1
fi

echo "  ✓ Got JWT: ${TOKEN:0:30}..."

# Use the token for all subsequent requests
AUTH_HEADER="Authorization: Bearer $TOKEN"

echo ""; echo "━━━ 4. AUTH/ME ━━━"
ME_RESP=$(curl -s $BASE/api/v1/auth/me -H "$AUTH_HEADER")
t "/auth/me returns user" "$UNIQUE" "$ME_RESP"

echo ""; echo "━━━ 5. CUSTOMER PROFILE ━━━"
PROFILE_RESP=$(curl -s $BASE/api/v1/customers/me -H "$AUTH_HEADER")
t "/customers/me returns profile" "$UNIQUE" "$PROFILE_RESP"

PREF_RESP=$(curl -s $BASE/api/v1/customers/me/preferences -H "$AUTH_HEADER")
t "/customers/me/preferences" "preferredServices" "$PREF_RESP"

echo ""; echo "━━━ 6. SET PREFERENCES ━━━"
NEW_PREF=$(curl -s -X PATCH $BASE/api/v1/customers/me/preferences \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"preferredServices":["Hair","Beard & Grooming"],"priceRangeMin":200,"priceRangeMax":2000}')
t "PATCH preferences" "preferredServices" "$NEW_PREF"

echo ""; echo "━━━ 7. LIST SALONS (public) ━━━"
SALONS_RESP=$(curl -s $BASE/api/v1/salons)
t "GET /salons returns data" "salons" "$SALONS_RESP"

echo ""; echo "━━━ 8. SALON DETAIL ━━━"
SALON_RESP=$(curl -s $BASE/api/v1/salons/00000000-0000-0000-0000-000000000001)
t "GET /salons/:id" "salons" "$SALON_RESP"

echo ""; echo "━━━ 9. SERVICES ━━━"
SERVICES_RESP=$(curl -s $BASE/api/v1/services)
t "GET /services" "Skin Fade" "$SERVICES_RESP"

CAT_RESP=$(curl -s $BASE/api/v1/categories)
t "GET /categories" "success" "$CAT_RESP"

echo ""; echo "━━━ 10. SEARCH ━━━"
SEARCH_RESP=$(curl -s "$BASE/api/v1/search?q=hair")
t "GET /search?q=hair" "salons" "$SEARCH_RESP"

echo ""; echo "━━━ 11. AVAILABILITY TODAY ━━━"
AVAIL_TODAY=$(curl -s $BASE/api/v1/availability/00000000-0000-0000-0000-000000000001/today)
t "GET /availability/:id/today" "slots" "$AVAIL_TODAY"

echo ""; echo "━━━ 12. AVAILABILITY DATE ━━━"
AVAIL_DATE=$(curl -s "$BASE/api/v1/availability/00000000-0000-0000-0000-000000000001?date=2026-10-15")
t "GET /availability/:id?date=..." "slots" "$AVAIL_DATE"

echo ""; echo "━━━ 13. CREATE BOOKING ━━━"
BOOKING_RESP=$(curl -s -X POST $BASE/api/v1/bookings \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"salonId":"00000000-0000-0000-0000-000000000001","serviceId":"00000000-0000-0000-0000-000000000002","staffId":"00000000-0000-0000-0000-000000000003","date":"2026-10-15","startTime":"10:00","notes":"Test booking"}')
echo "  Booking response: $(echo $BOOKING_RESP | head -c 100)"
t "POST /bookings (auth required)" "success" "$BOOKING_RESP"

echo ""; echo "━━━ 14. LIST BOOKINGS ━━━"
MY_BOOKINGS=$(curl -s $BASE/api/v1/bookings -H "$AUTH_HEADER")
t "GET /bookings (auth)" "pagination" "$MY_BOOKINGS"

echo ""; echo "━━━ 15. PAYMENT INTENT ━━━"
PAYMENT_INTENT=$(curl -s -X POST $BASE/api/v1/payments/intent \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"bookingId":"00000000-0000-0000-0000-000000000001","paymentMethodId":"upi"}')
t "POST /payments/intent" "success" "$PAYMENT_INTENT"

echo ""; echo "━━━ 16. PAYMENT METHODS ━━━"
METHODS_RESP=$(curl -s $BASE/api/v1/payments/methods -H "$AUTH_HEADER")
t "GET /payments/methods" "success" "$METHODS_RESP"

HISTORY_RESP=$(curl -s $BASE/api/v1/payments/history -H "$AUTH_HEADER")
t "GET /payments/history" "success" "$HISTORY_RESP"

echo ""; echo "━━━ 17. NOTIFICATIONS ━━━"
NOTIF_RESP=$(curl -s $BASE/api/v1/notifications -H "$AUTH_HEADER")
t "GET /notifications" "success" "$NOTIF_RESP"

UNREAD_RESP=$(curl -s $BASE/api/v1/notifications/unread-count -H "$AUTH_HEADER")
t "GET /notifications/unread-count" "success" "$UNREAD_RESP"

echo ""; echo "━━━ 18. FAVORITES ━━━"
FAV_RESP=$(curl -s $BASE/api/v1/favorites -H "$AUTH_HEADER")
t "GET /favorites" "success" "$FAV_RESP"

ADD_FAV=$(curl -s -X POST $BASE/api/v1/favorites/00000000-0000-0000-0000-000000000001 \
  -H "$AUTH_HEADER")
t "POST /favorites/:id" "success" "$ADD_FAV"

echo ""; echo "━━━ 19. SUPPORT TICKETS ━━━"
TICKETS_RESP=$(curl -s $BASE/api/v1/support/tickets -H "$AUTH_HEADER")
t "GET /support/tickets" "success" "$TICKETS_RESP"

NEW_TICKET=$(curl -s -X POST $BASE/api/v1/support/tickets \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"subject":"Test ticket","topic":"Booking","message":"This is a test"}')
t "POST /support/tickets" "success" "$NEW_TICKET"

echo ""; echo "━━━ 20. HISTORY ━━━"
HISTORY_RESP=$(curl -s $BASE/api/v1/history -H "$AUTH_HEADER")
t "GET /history" "success" "$HISTORY_RESP"

STATS_RESP=$(curl -s $BASE/api/v1/history/stats -H "$AUTH_HEADER")
t "GET /history/stats" "success" "$STATS_RESP"

echo ""; echo "━━━ 21. AI FLOW ━━━"
AI_PHOTO=$(curl -s -X POST $BASE/api/v1/ai/analyze-photo \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"photoDataUrl":"data:image/png;base64,iVBORw0KGgo="}')
t "POST /ai/analyze-photo" "success" "$AI_PHOTO"

AI_TEXT=$(curl -s -X POST $BASE/api/v1/ai/text-recommendation \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"prompt":"I want a fresh haircut for summer"}')
t "POST /ai/text-recommendation" "success" "$AI_TEXT"

AI_TRYON=$(curl -s -X POST $BASE/api/v1/ai/virtual-tryon \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"styleDescription":"Modern undercut","referenceImage":"data:image/png;base64,iVBORw0KGgo="}')
t "POST /ai/virtual-tryon" "success" "$AI_TRYON"

AI_FINDER=$(curl -s -X POST $BASE/api/v1/ai/salon-finder \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{"criteria":"affordable haircut nearby"}')
t "POST /ai/salon-finder" "success" "$AI_FINDER"

AI_HISTORY=$(curl -s $BASE/api/v1/ai/history -H "$AUTH_HEADER")
t "GET /ai/history" "success" "$AI_HISTORY"

echo ""; echo "━━━ 22. LOGOUT ━━━"
LOGOUT_RESP=$(curl -s -X POST $BASE/api/v1/auth/logout \
  -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
  -d '{}')
t "POST /auth/logout" "loggedOut" "$LOGOUT_RESP"

echo ""; echo "━━━ 23. POST-LOGOUT ISOLATION ━━━"
# After logout, the access token is still valid until it expires (stateless JWT).
# But /auth/refresh should fail (refresh token revoked).
# Customer should NOT be able to use a refresh token from a different customer.
# Verify unauthenticated /customers/me is rejected.
t "Unauthenticated /customers/me rejected" "auth" "$(curl -s $BASE/api/v1/customers/me)"

echo ""; echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  FINAL: $P/$T passed, $F failed                                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Cleanup
pkill -f "node.*dist/server" 2>/dev/null
