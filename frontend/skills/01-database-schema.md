# Skill 01 — Firestore Database Schema

> Use this skill when: defining collections, querying Firestore, or updating the data model.
> Reference: `AGENT.md` Section 7 for collection overview.

---

## Collection Architecture

```
firestore/
├── users/{userId}
│   ├── addresses/{addressId}
│   └── cart_items/{cartItemId}
├── categories/{categoryId}
├── products/{productId}
│   └── delivery_days/{dayId}
├── orders/{orderId}
│   ├── items/{itemId}
│   └── status_history/{entryId}
├── delivery_zones/{zoneId}
├── revenue_records/{recordId}
└── config/
    ├── pricing
    ├── logistics
    └── platform
```

---

## TypeScript Interfaces

### `lib/types/user.types.ts`
```typescript
export type UserRole = 'customer' | 'admin';

export interface UserDocument {
  id: string;
  email: string;
  phone: string;                    // E.164 format: +2348012345678
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AddressDocument {
  id: string;
  user_id: string;
  label: string;                    // "Home", "Office", "Other"
  full_address: string;             // Human-readable full address
  lat: number;
  lng: number;
  city: string;
  lga: string;                      // Local Government Area
  instructions: string | null;      // Delivery instructions
  is_default: boolean;
  created_at: Timestamp;
}

export interface CartItemDocument {
  id: string;
  user_id: string;
  product_id: string;
  product_snapshot: {               // Snapshot for display
    name: string;
    price_per_kg: number;           // kobo
    image_url: string;
    min_kg: number;
    max_kg: number | null;
    kg_increment: number;
    product_type: 'REGULAR' | 'PERISHABLE';
    delivery_days: number[];        // Only populated for PERISHABLE
  };
  kg_quantity: number;
  added_at: Timestamp;
  updated_at: Timestamp;
}
```

### `lib/types/product.types.ts`
```typescript
export type ProductType = 'REGULAR' | 'PERISHABLE';

export interface ProductDocument {
  id: string;
  name: string;
  slug: string;                     // URL-safe unique identifier
  description: string;
  category_id: string;
  product_type: ProductType;
  price_per_kg: number;             // Integer, in kobo
  min_kg: number;                   // e.g., 0.5 — VARIES per product
  max_kg: number | null;
  kg_increment: number;             // Step size for selector (e.g., 0.5)
  stock_kg: number;                 // Available stock
  low_stock_threshold: number;      // Alert admin when stock_kg drops below this
  image_urls: string[];             // Firebase Storage URLs
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;               // For manual catalog ordering
  tags: string[];                   // e.g., ["protein", "seafood"]
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ProductDeliveryDayDocument {
  id: string;
  product_id: string;
  day_of_week: number;              // 0=Sunday, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  cutoff_hours: number;             // Hours before midnight of delivery day cutoff
                                    // e.g., 12 means orders cut off at noon the day before
}

export interface CategoryDocument {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Timestamp;
}
```

### `lib/types/order.types.ts`
```typescript
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'PROCESSING'
  | 'AWAITING_PICKUP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED_DELIVERY';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type DeliveryType = 'SINGLE' | 'SPLIT';

export interface OrderDocument {
  id: string;
  order_number: string;             // "CR-20240115-0042"
  user_id: string;
  address: OrderAddressSnapshot;    // Snapshot — NEVER reference live address
  zone_id: string;
  status: OrderStatus;

  // Pricing (ALL in kobo — integers only)
  subtotal: number;
  delivery_fee: number;             // Customer-facing delivery charge
  logistics_cost: number;           // Internal cost to logistics provider — NEVER expose to customers
  delivery_spread: number;          // delivery_fee - logistics_cost
  service_charge: number;           // ₦500–₦1,000 flat (ring-fenced)
  total_amount: number;             // subtotal + delivery_fee + service_charge

  // Delivery
  delivery_date: Timestamp;
  delivery_type: DeliveryType;
  delivery_notes: string | null;

  // Payment
  payment_reference: string | null;
  payment_status: PaymentStatus;
  payment_channel: string | null;
  paid_at: Timestamp | null;

  // Logistics
  logistics_provider: string | null;    // "gokada" | "uber_direct" | "bolt" | "glovo"
  logistics_order_id: string | null;    // Provider's own reference
  tracking_url: string | null;

  // Metadata
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface OrderAddressSnapshot {
  full_address: string;
  lat: number;
  lng: number;
  city: string;
  lga: string;
  instructions: string | null;
}

export interface OrderItemDocument {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;             // Snapshot — immutable after order placed
  product_type: ProductType;
  kg_quantity: number;
  price_per_kg: number;             // Snapshot in kobo
  line_total: number;               // kg_quantity * price_per_kg in kobo
}

export interface OrderStatusHistoryDocument {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  actor: string;                    // user_id or "system" or "paystack_webhook"
  created_at: Timestamp;
}
```

### `lib/types/zone.types.ts`
```typescript
export interface DeliveryZoneDocument {
  id: string;
  name: string;                     // e.g., "Ikorodu", "Lagos Island"
  description: string | null;
  lgas: string[];                   // List of LGAs covered
  areas: string[];                  // List of area names / neighbourhoods
  base_logistics_cost: number;      // kobo — what platform pays courier (INTERNAL)
  customer_delivery_fee: number;    // kobo — what customer sees
  delivery_spread: number;          // kobo — retained by platform
  service_charge: number;           // kobo — ₦500,000 to ₦100,000 range
  estimated_delivery_minutes: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### `lib/types/revenue.types.ts`
```typescript
export interface RevenueRecordDocument {
  id: string;
  order_id: string;                 // Unique per order
  order_number: string;
  user_id: string;
  // Revenue breakdown (all kobo)
  subtotal: number;                 // Product revenue
  delivery_spread: number;          // Delivery markup retained
  service_charge: number;           // Flat fee — RING-FENCED
  ring_fenced_amount: number;       // = service_charge (for fleet fund)
  total_platform_revenue: number;   // delivery_spread + service_charge
  // Reference
  zone_id: string;
  logistics_provider: string;
  recorded_at: Timestamp;
}
```

---

## Firestore Helper Functions

### `lib/firestore/products.ts`
```typescript
import { db } from '@/lib/firebase/client';
import {
  collection, doc, getDocs, getDoc, query,
  where, orderBy, limit, Timestamp
} from 'firebase/firestore';

export const PRODUCTS_COLLECTION = 'products';
export const DELIVERY_DAYS_SUBCOLLECTION = 'delivery_days';

/** Fetch all active products with their delivery days */
export async function getActiveProducts(): Promise<ProductDocument[]> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('is_active', '==', true),
    orderBy('sort_order', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductDocument));
}

/** Fetch delivery days for a single product */
export async function getProductDeliveryDays(
  productId: string
): Promise<ProductDeliveryDayDocument[]> {
  const snap = await getDocs(
    collection(db, PRODUCTS_COLLECTION, productId, DELIVERY_DAYS_SUBCOLLECTION)
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductDeliveryDayDocument));
}

/** Get a single product by slug */
export async function getProductBySlug(
  slug: string
): Promise<ProductDocument | null> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('slug', '==', slug),
    where('is_active', '==', true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as ProductDocument;
}
```

### `lib/firestore/orders.ts`
```typescript
import { db } from '@/lib/firebase/admin'; // Server-side admin SDK
import { FieldValue } from 'firebase-admin/firestore';

export const ORDERS_COLLECTION = 'orders';

/** Generate human-readable order number */
export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `CR-${dateStr}-${random}`;
}

/** Create order with items as sub-collection */
export async function createOrder(
  orderData: Omit<OrderDocument, 'id' | 'created_at' | 'updated_at'>,
  items: Omit<OrderItemDocument, 'id' | 'order_id'>[]
): Promise<string> {
  const batch = db.batch();
  const orderRef = db.collection(ORDERS_COLLECTION).doc();
  const orderId = orderRef.id;

  batch.set(orderRef, {
    ...orderData,
    id: orderId,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  // Write items as sub-collection
  items.forEach(item => {
    const itemRef = orderRef.collection('items').doc();
    batch.set(itemRef, { ...item, id: itemRef.id, order_id: orderId });
  });

  // Write initial status history
  const historyRef = orderRef.collection('status_history').doc();
  batch.set(historyRef, {
    id: historyRef.id,
    order_id: orderId,
    from_status: null,
    to_status: 'PENDING_PAYMENT',
    note: 'Order created',
    actor: 'system',
    created_at: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return orderId;
}

/** Transition order status — enforces valid state machine */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT:   ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING:        ['AWAITING_PICKUP', 'CANCELLED'],
  AWAITING_PICKUP:   ['IN_TRANSIT'],
  IN_TRANSIT:        ['DELIVERED', 'FAILED_DELIVERY'],
  DELIVERED:         [],
  CANCELLED:         [],
  FAILED_DELIVERY:   [],
};

export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  actor: string,
  note?: string
): Promise<void> {
  const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error(`Order ${orderId} not found`);

  const order = orderSnap.data() as OrderDocument;
  const allowed = VALID_TRANSITIONS[order.status];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${order.status} → ${newStatus}. Allowed: ${allowed.join(', ')}`
    );
  }

  const batch = db.batch();
  batch.update(orderRef, {
    status: newStatus,
    updated_at: FieldValue.serverTimestamp(),
  });

  const historyRef = orderRef.collection('status_history').doc();
  batch.set(historyRef, {
    id: historyRef.id,
    order_id: orderId,
    from_status: order.status,
    to_status: newStatus,
    note: note ?? null,
    actor,
    created_at: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
```

---

## Firestore Security Rules

### `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Helper functions ──────────────────────────────────────────────────────
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() &&
             request.auth.token.role == 'admin';
    }

    function isValidKg(kg, minKg) {
      return kg >= minKg && kg == math.floor(kg * 10) / 10; // max 1 decimal
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) && !('role' in request.resource.data);
      allow delete: if false; // Never hard-delete users

      // Addresses
      match /addresses/{addressId} {
        allow read, write: if isOwner(userId) || isAdmin();
      }

      // Cart
      match /cart_items/{cartItemId} {
        allow read, write: if isOwner(userId);
      }
    }

    // ── Categories ────────────────────────────────────────────────────────────
    match /categories/{categoryId} {
      allow read: if true;  // Public catalog browsing
      allow write: if isAdmin();
    }

    // ── Products ──────────────────────────────────────────────────────────────
    match /products/{productId} {
      allow read: if resource.data.is_active == true || isAdmin();
      allow write: if isAdmin();

      match /delivery_days/{dayId} {
        allow read: if true;
        allow write: if isAdmin();
      }
    }

    // ── Orders ────────────────────────────────────────────────────────────────
    match /orders/{orderId} {
      allow read: if isAdmin() || (isAuthenticated() && resource.data.user_id == request.auth.uid);
      allow create: if isAuthenticated();
      // Customers cannot update orders directly — all transitions go through API
      allow update: if isAdmin();
      allow delete: if false;

      match /items/{itemId} {
        allow read: if isAdmin() || (isAuthenticated() && get(/databases/$(database)/documents/orders/$(orderId)).data.user_id == request.auth.uid);
        allow write: if false; // Written by Cloud Functions only
      }

      match /status_history/{entryId} {
        allow read: if isAdmin() || (isAuthenticated() && get(/databases/$(database)/documents/orders/$(orderId)).data.user_id == request.auth.uid);
        allow write: if false; // Written by Cloud Functions only
      }
    }

    // ── Delivery Zones ────────────────────────────────────────────────────────
    match /delivery_zones/{zoneId} {
      // Customers can read active zones (for zone detection at checkout)
      // But NEVER expose logistics_cost — handled by server-side API only
      allow read: if true;
      allow write: if isAdmin();
    }

    // ── Revenue Records ───────────────────────────────────────────────────────
    match /revenue_records/{recordId} {
      allow read: if isAdmin();
      allow write: if false; // Written by Cloud Functions only
    }

    // ── Config ────────────────────────────────────────────────────────────────
    match /config/{configId} {
      allow read: if isAuthenticated(); // Customers need pricing config
      allow write: if isAdmin();
    }
  }
}
```

---

## Firebase Admin SDK Initialization

### `lib/firebase/admin.ts`
```typescript
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const adminApp = getApps().length === 0
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  : getApps()[0];

export const db = getFirestore(adminApp);
export const auth = getAuth(adminApp);
export const storage = getStorage(adminApp);
```

### `lib/firebase/client.ts`
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const firebaseAuth = getAuth(app);
export const firebaseStorage = getStorage(app);
```

---

## Indexing Strategy

Add these composite indexes in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "products",
      "fields": [
        { "fieldPath": "is_active", "order": "ASCENDING" },
        { "fieldPath": "category_id", "order": "ASCENDING" },
        { "fieldPath": "sort_order", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "products",
      "fields": [
        { "fieldPath": "is_active", "order": "ASCENDING" },
        { "fieldPath": "is_featured", "order": "ASCENDING" },
        { "fieldPath": "sort_order", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "fields": [
        { "fieldPath": "user_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "fields": [
        { "fieldPath": "delivery_date", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```
