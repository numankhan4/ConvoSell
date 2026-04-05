# Quick Start Guide - WhatsApp Template Messages

## 🚀 Getting Started

### 1. Database Migration
The migration has already been applied! Your database now has:
- `whatsapp_message_templates` table
- `template_messages` table  
- Updated `workspaces` table with subscription fields

### 2. Start the Backend
```powershell
cd backend
npm run start:dev
```

### 3. Start the Frontend
```powershell
cd frontend
npm run dev
```

### 4. Access New Features

#### Templates Manager
Navigate to: `http://localhost:3000/dashboard/templates`

**What you'll see:**
- Quota status dashboard (current plan, usage, limit)
- Templates list (once you create some)
- Performance metrics

#### Pricing Page
Navigate to: `http://localhost:3000/pricing`

**What you'll see:**
- 5 pricing tiers with features
- Cost breakdown (subscription + WhatsApp API costs)
- FAQ section

---

## 📝 Testing the Template System

### Step 1: Create Your First Template

**Via API** (use Postman/Insomnia):
```http
POST http://localhost:3001/api/templates
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "order_confirmation",
  "category": "UTILITY",
  "language": "en",
  "bodyText": "Hi {{1}}, your order #{{2}} for PKR {{3}} is confirmed! Reply YES to confirm or NO to cancel.",
  "footerText": "ConvoSell - WhatsApp Order Verification",
  "variables": [
    { "name": "customer_name", "example": "Ahmed" },
    { "name": "order_number", "example": "1234" },
    { "name": "total_amount", "example": "2500" }
  ]
}
```

**Response:**
```json
{
  "id": "template_xyz",
  "name": "order_confirmation",
  "status": "PENDING",
  "metaTemplateId": "1234567890",
  "message": "Template submitted to Meta for approval"
}
```

### Step 2: Wait for Meta Approval
- Templates typically approved in 24-48 hours
- Check status: `GET /api/templates/:id`
- Meta will review for policy compliance

### Step 3: Send Template Message

Once approved:
```http
POST http://localhost:3001/api/templates/{template_id}/send
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "recipientPhone": "+923001234567",
  "orderId": "order_123",
  "bodyParams": ["Ahmed Khan", "ORD-1234", "2500"]
}
```

**Success Response:**
```json
{
  "messageId": "wamid.XYZ123...",
  "status": "sent",
  "cost": 7
}
```

### Step 4: Check Quota Usage

```http
GET http://localhost:3001/api/templates/quota/status
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "plan": "free",
  "limit": 0,
  "used": 0,
  "remaining": 0,
  "resetAt": "2026-05-01T00:00:00Z",
  "canSend": false,
  "subscriptionStatus": "active"
}
```

---

## 🔧 Upgrading a Workspace Plan

### Via Database (for testing)
```sql
UPDATE workspaces 
SET 
  plan = 'starter',
  template_messages_limit = 50,
  subscription_status = 'active',
  quota_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
WHERE slug = 'your-workspace-slug';
```

### Via API (future):
Once billing integration is complete, users can upgrade via:
- Stripe Checkout session
- Paddle payment flow
- Admin panel

---

## 📊 Monitoring & Analytics

### Get Template Stats
```http
GET /api/templates/{template_id}/stats?days=30
```

### Get Message History
```http
GET /api/templates/messages/history?page=1&limit=20
```

### Check All Templates
```http
GET /api/templates
```

---

## ⚠️ Important Notes

### Quota Behavior
- **Free Plan**: Cannot send template messages (session messages only)
- **Paid Plans**: Monthly quota resets on 1st of each month
- **Over Quota**: API returns 403 Forbidden with upgrade prompt
- **Enterprise**: Unlimited quota (limit = -1)

### WhatsApp API Costs
- Charged by Meta separately
- Utility templates: ~PKR 7/message
- Marketing templates: ~PKR 12/message
- Billed to your Meta Business Account

### Template Approval
- Only approved templates can be sent
- Rejection reasons: policy violations, spam, etc.
- Can resubmit with modifications

---

## 🎯 Next Development Steps

### Immediate
- [ ] Test end-to-end template flow
- [ ] Submit a real template to Meta
- [ ] Verify quota enforcement

### Short-term
- [ ] Build template creation UI (remove placeholder modal)
- [ ] Add Stripe/Paddle integration
- [ ] Create subscription management page

### Medium-term
- [ ] Visual template builder
- [ ] Template analytics dashboard
- [ ] Automated template suggestions based on order data

---

## 🐛 Troubleshooting

### Template Creation Fails
- **Check**: WhatsApp integration is active
- **Check**: Meta access token is valid
- **Check**: Template name follows rules (lowercase, underscores, no spaces)

### Can't Send Template
- **Check**: Template status is "APPROVED"
- **Check**: Workspace quota not exceeded
- **Check**: Subscription is active

### Quota Not Resetting
- System auto-resets on first send after month change
- Can manually reset via admin tools if needed

---

## 📞 Support

For issues or questions:
1. Check [TEMPLATE_MESSAGE_SYSTEM.md](./TEMPLATE_MESSAGE_SYSTEM.md) for details
2. Review Meta's [WhatsApp Business API docs](https://developers.facebook.com/docs/whatsapp)
3. Check Prisma schema for data structure

---

**Ready to Launch!** 🚀

Your template message system is fully implemented and ready for testing. Start by upgrading a test workspace to "starter" plan and creating your first template.
