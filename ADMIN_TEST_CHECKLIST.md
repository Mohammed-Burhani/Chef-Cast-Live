# Admin Dashboard Test Checklist

## Pre-Test Setup

1. **Create test data**
   ```bash
   # Run in Supabase SQL Editor
   # Execute: supabase/schema.sql
   # Execute: supabase/test_data.sql (optional sample data)
   ```

2. **Create admin user**
   ```bash
   # 1. Signup via app with email: admin@chefcast.live
   # 2. Run in Supabase SQL Editor:
   UPDATE profiles 
   SET is_admin = true 
   WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@chefcast.live');
   ```

## Test Flow

### 1. Admin Login & Routing
- [ ] Login with admin credentials
- [ ] Should redirect to `/(admin)` dashboard (NOT regular tabs)
- [ ] Console log should show: `[Router] User role: admin isAdmin: true`
- [ ] Should see sidebar with navigation items

### 2. Dashboard Overview
- [ ] Stats cards display correctly (Live Now, Upcoming, Completed, Active Users)
- [ ] Quick action buttons work (Create Episode, Go Live, View Analytics)
- [ ] Recent episodes list displays
- [ ] Sidebar navigation items clickable
- [ ] User info + logout button in sidebar footer

### 3. Episodes Management (`/(admin)/episodes`)
- [ ] Navigate from sidebar or dashboard
- [ ] List shows all episodes
- [ ] Create button opens modal
- [ ] Can create episode with title + scheduled_at
- [ ] Can edit existing episode
- [ ] Can toggle episode live/stop
- [ ] Questions button navigates to questions page

### 4. Questions Management (`/(admin)/questions/[id]`)
- [ ] Navigate from episodes page
- [ ] List shows all questions for episode
- [ ] Create button opens modal
- [ ] Can create question with options + correct answer
- [ ] Can activate question (sets as active, deactivates others)
- [ ] Can deactivate active question
- [ ] Active badge shows on current active question

### 5. Live Control (`/(admin)/live-control`)
- [ ] Shows currently live episodes
- [ ] Shows upcoming episodes ready to go live
- [ ] Can toggle episode live from this page
- [ ] Manage Questions button works

### 6. Analytics (`/(admin)/analytics`)
- [ ] Stats cards display (placeholder data)
- [ ] Engagement metrics show
- [ ] Top episodes list displays
- [ ] "Coming soon" message shows

### 7. Settings (`/(admin)/settings`)
- [ ] Toggle switches work
- [ ] System info displays
- [ ] Action cards clickable (not implemented yet)
- [ ] "Coming soon" message shows

### 8. Non-Admin User Protection
- [ ] Login with regular (non-admin) user
- [ ] Should redirect to `/(tabs)` (regular user app)
- [ ] Should NOT see admin routes
- [ ] Manual navigation to `/(admin)` redirects back to tabs

### 9. Logout & Re-login
- [ ] Logout from admin dashboard
- [ ] Should redirect to login
- [ ] Re-login with admin credentials
- [ ] Should return to admin dashboard

## Common Issues

### Issue: Admin redirects to regular tabs instead of dashboard
**Fix:** Verify `is_admin = true` in profiles table
```sql
SELECT id, username, is_admin FROM profiles WHERE id = 'YOUR_USER_ID';
```

### Issue: Infinite loading on admin route
**Fix:** Check console for routing errors, verify folder name is `(admin)` not `admin`

### Issue: "Property 'role' does not exist" error
**Fix:** Already fixed in `types/index.ts` - UserProfile has `role` field

### Issue: Questions not appearing for episode
**Fix:** Check `episode_id` matches in questions table

## API Endpoints Used

- `lib/api/supabase.ts` - Main API functions
- `lib/api/hooks.ts` - React Query hooks for regular users
- `lib/api/admin.ts` - Admin API functions
- `lib/api/admin-hooks.ts` - React Query hooks for admin

## File Structure

```
app/
├── (admin)/
│   ├── _layout.tsx          # Admin stack navigator
│   ├── index.tsx            # Dashboard with sidebar
│   ├── episodes.tsx         # Episode CRUD
│   ├── questions/[id].tsx   # Question CRUD per episode
│   ├── live-control.tsx     # Live stream controls
│   ├── analytics.tsx        # Stats & charts
│   └── settings.tsx         # App config
├── (auth)/
│   ├── login.tsx            # Email+password login
│   └── signup.tsx           # Signup with onboarding
├── (tabs)/                  # Regular user app
└── _layout.tsx              # Root routing logic
```

## Notes

- Admin uses separate UI from regular users
- Sidebar navigation for easy module access
- All CRUD operations use React Query
- Real-time updates via Supabase subscriptions (when implemented)
- Responsive design works on web + mobile
