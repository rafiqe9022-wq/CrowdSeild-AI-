# Role-Based Access Control (RBAC) Implementation

## Overview

Implemented role-based access control so different user roles see only the pages they're authorized to access.

## User Roles & Permissions

### Admin
**Full system access**
- Command Centre Dashboard
- Event Map
- Crowd Monitor
- Traffic Flow
- Risk Engine
- Route Planner
- Emergency Corridor
- Signal Advisory
- Scenario Lab
- Alerts & Incidents
- Gate Management
- Audit Log
- Reports
- Help & Docs

**Total: 14 pages**

---

### Operator
**Operational monitoring and incident management**
- Command Centre Dashboard
- Event Map
- Crowd Monitor
- Risk Engine
- Alerts & Incidents
- Gate Management
- Help & Docs

**Total: 7 pages**

**Cannot access:**
- Traffic Flow (traffic officer responsibility)
- Route Planner (traffic officer responsibility)
- Emergency Corridor (emergency officer responsibility)
- Signal Advisory (traffic officer responsibility)
- Scenario Lab (admin only)
- Audit Log (auditor/admin only)
- Reports (auditor/admin only)

---

### Traffic Officer
**Traffic and route management**
- Command Centre Dashboard
- Event Map
- Traffic Flow
- Route Planner
- Signal Advisory
- Gate Management
- Help & Docs

**Total: 7 pages**

**Cannot access:**
- Crowd Monitor (operator responsibility)
- Risk Engine (operator responsibility)
- Emergency Corridor (emergency officer responsibility)
- Scenario Lab (admin only)
- Alerts & Incidents (operator responsibility)
- Audit Log (auditor/admin only)
- Reports (auditor/admin only)

---

### Emergency Officer
**Emergency response coordination**
- Command Centre Dashboard
- Event Map
- Emergency Corridor
- Route Planner
- Alerts & Incidents
- Help & Docs

**Total: 6 pages**

**Cannot access:**
- Crowd Monitor (operator responsibility)
- Traffic Flow (traffic officer responsibility)
- Risk Engine (operator responsibility)
- Signal Advisory (traffic officer responsibility)
- Scenario Lab (admin only)
- Gate Management (operator/traffic responsibility)
- Audit Log (auditor/admin only)
- Reports (auditor/admin only)

---

### Auditor
**Read-only audit and reporting**
- Command Centre Dashboard
- Audit Log
- Reports
- Alerts & Incidents
- Help & Docs

**Total: 5 pages**

**Cannot access:**
- Event Map (operational role)
- Crowd Monitor (operational role)
- Traffic Flow (operational role)
- Risk Engine (operational role)
- Route Planner (operational role)
- Emergency Corridor (operational role)
- Signal Advisory (operational role)
- Scenario Lab (admin only)
- Gate Management (operational role)

---

## Implementation Details

### 1. Permission Definition (`src/types.ts`)

```typescript
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['dashboard', 'map', 'crowd', 'traffic', 'risk', 'routes', 
          'emergency', 'signals', 'scenario', 'alerts', 'gates', 
          'audit', 'reports', 'help'],
  operator: ['dashboard', 'map', 'crowd', 'risk', 'alerts', 'gates', 'help'],
  traffic_officer: ['dashboard', 'map', 'traffic', 'routes', 'signals', 'gates', 'help'],
  emergency_officer: ['dashboard', 'map', 'emergency', 'routes', 'alerts', 'help'],
  auditor: ['dashboard', 'audit', 'reports', 'alerts', 'help']
};
```

### 2. Navigation Filtering (`src/components/Layout.tsx`)

```typescript
// Filter navigation items based on user role permissions
const userRole = store.currentUser?.role || 'auditor';
const allowedPages = ROLE_PERMISSIONS[userRole];
const filteredNavItems = NAV_ITEMS.filter(item => allowedPages.includes(item.id));

// Render only filtered items
{filteredNavItems.map(item => (
  <button key={item.id} onClick={() => onNavigate(item.id)}>
    ...
  </button>
))}
```

### 3. Route Protection (`src/App.tsx`)

```typescript
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const currentPage = location.pathname.replace('/', '') || 'dashboard';
  const userRole = store.currentUser?.role || 'auditor';
  const allowedPages = ROLE_PERMISSIONS[userRole];
  
  if (!allowedPages.includes(currentPage)) {
    // Redirect to first allowed page
    const firstAllowedPage = allowedPages[0] || 'dashboard';
    return <Navigate to={`/${firstAllowedPage}`} replace />;
  }
  
  return <>{children}</>;
};

// Wrap each route with ProtectedRoute
<Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

---

## Security Features

### ✅ Navigation-Level Protection
- Sidebar only shows pages the user can access
- Prevents accidental navigation to restricted pages

### ✅ Route-Level Protection
- Direct URL access to restricted pages redirects to first allowed page
- Prevents unauthorized access even if user knows the URL

### ✅ Default Role Fallback
- If no user is logged in, defaults to 'auditor' (most restrictive)
- Ensures no accidental full access

### ✅ Consistent Permission Model
- Single source of truth in `ROLE_PERMISSIONS`
- Used by both navigation and route protection

---

## Testing the Implementation

### Test 1: Admin Access
1. Login as `admin` / `admin123`
2. Verify all 14 pages visible in sidebar
3. Navigate to each page - all should work
4. Try direct URL access to `/scenario` - should work

**Expected:** Full access to all pages

---

### Test 2: Operator Access
1. Login as `operator` / `operator123`
2. Verify only 7 pages visible:
   - Command Centre Dashboard
   - Event Map
   - Crowd Monitor
   - Risk Engine
   - Alerts & Incidents
   - Gate Management
   - Help & Docs
3. Try direct URL access to `/traffic` - should redirect to `/dashboard`
4. Try direct URL access to `/emergency` - should redirect to `/dashboard`

**Expected:** Limited to operational pages only

---

### Test 3: Traffic Officer Access
1. Login as `traffic` / `traffic123`
2. Verify only 7 pages visible:
   - Command Centre Dashboard
   - Event Map
   - Traffic Flow
   - Route Planner
   - Signal Advisory
   - Gate Management
   - Help & Docs
3. Try direct URL access to `/crowd` - should redirect to `/dashboard`
4. Try direct URL access to `/emergency` - should redirect to `/dashboard`

**Expected:** Limited to traffic management pages only

---

### Test 4: Emergency Officer Access
1. Login as `emergency` / `emergency123`
2. Verify only 6 pages visible:
   - Command Centre Dashboard
   - Event Map
   - Emergency Corridor
   - Route Planner
   - Alerts & Incidents
   - Help & Docs
3. Try direct URL access to `/traffic` - should redirect to `/dashboard`
4. Try direct URL access to `/signals` - should redirect to `/dashboard`

**Expected:** Limited to emergency response pages only

---

### Test 5: Auditor Access
1. Login as `auditor` / `auditor123`
2. Verify only 5 pages visible:
   - Command Centre Dashboard
   - Audit Log
   - Reports
   - Alerts & Incidents
   - Help & Docs
3. Try direct URL access to `/map` - should redirect to `/dashboard`
4. Try direct URL access to `/gates` - should redirect to `/dashboard`

**Expected:** Read-only access to audit and reports

---

### Test 6: Unauthorized URL Access
1. Login as `auditor`
2. Manually type `/scenario` in browser URL bar
3. Press Enter

**Expected:** Redirected to `/dashboard` (first allowed page)

---

## Design Rationale

### Why These Permissions?

**Admin:** Full access because admins configure the system, manage users, and need to see everything.

**Operator:** Focus on crowd monitoring and incident response. Don't need traffic signal control or emergency dispatch (those are specialized roles).

**Traffic Officer:** Focus on traffic flow, routing, and signal timing. Don't need crowd monitoring or emergency dispatch.

**Emergency Officer:** Focus on emergency response and evacuation routes. Need route planning but not traffic signal control.

**Auditor:** Read-only access to verify compliance and generate reports. No operational control.

### Why Dashboard for All Roles?

Every role needs the Command Centre Dashboard to see the overall situation, even if they can't interact with all features. It provides situational awareness.

### Why Help for All Roles?

Documentation should be accessible to everyone regardless of role.

---

## Files Modified

1. **`src/types.ts`**
   - Added `ROLE_PERMISSIONS` constant

2. **`src/components/Layout.tsx`**
   - Imported `ROLE_PERMISSIONS`
   - Added navigation filtering logic
   - Changed `NAV_ITEMS.map` to `filteredNavItems.map`

3. **`src/App.tsx`**
   - Imported `ROLE_PERMISSIONS` and `useLocation`
   - Added `ProtectedRoute` component
   - Wrapped all routes with `<ProtectedRoute>`

---

## Security Notes

⚠️ **Frontend-Only Protection**

This implementation provides **frontend-only** role-based access control. It prevents unauthorized access through the UI, but:

- A technically savvy user could still access restricted pages by modifying the React code
- For production use, you need **backend authorization** to enforce permissions server-side
- API endpoints should validate user roles before returning data
- Never rely solely on frontend checks for security

**For Production:**
- Implement backend API with role-based middleware
- Validate user role on every API request
- Return 403 Forbidden for unauthorized access
- Never send restricted data to the frontend

---

## Future Enhancements

1. **Granular Permissions:** Instead of page-level, add action-level permissions (e.g., "can acknowledge alerts" vs "can only view alerts")

2. **Dynamic Permissions:** Allow admins to customize role permissions through a UI

3. **Permission Audit Log:** Log when users attempt to access restricted pages

4. **Role Hierarchy:** Implement role inheritance (e.g., admin inherits all operator permissions)

5. **Temporary Access:** Allow admins to grant temporary access to restricted pages

---

## Summary

✅ Role-based access control implemented  
✅ 5 user roles with distinct permissions  
✅ Navigation filtering based on role  
✅ Route-level protection preventing unauthorized access  
✅ Automatic redirect to first allowed page  
✅ Consistent permission model across UI and routing  
✅ Security notes documented for production deployment  

The application now properly enforces role-based access control, ensuring each user sees only the features relevant to their responsibilities.
