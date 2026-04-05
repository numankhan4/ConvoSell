
please tell me which options should i need to select.
Admin API
All orders

read_all_orders
Admin API
Analytics

read_analytics
Admin API
App Proxy

read_app_proxy

write_app_proxy
Admin API
Applications

read_apps
Admin API
Assigned fulfillment

read_assigned_fulfillment_orders

write_assigned_fulfillment_orders
Admin API
Audit events

read_audit_events
Admin API
Browsing Behavior

read_customer_events
Admin API
Cart Transform API

read_cart_transforms

write_cart_transforms

read_all_cart_transforms
Admin API
Cart and Checkout Validations

read_validations

write_validations
Admin API
Cash Tracking

read_cash_tracking

write_cash_tracking
Admin API
Channels

read_channels

write_channels
Admin API
Checkout branding settings

read_checkout_branding_settings

write_checkout_branding_settings
Admin API
Checkouts

write_checkouts

read_checkouts
Admin API
Companies

read_companies

write_companies
Admin API
Custom fulfillment services

read_custom_fulfillment_services

write_custom_fulfillment_services
Admin API
Custom pixels

read_custom_pixels

write_custom_pixels
Admin API
Customer

read_customers

write_customers
Admin API
Customer Data Erasure

read_customer_data_erasure

write_customer_data_erasure
Admin API
Customer Payment Methods

read_customer_payment_methods
Admin API
Customer merge

read_customer_merge

write_customer_merge
Admin API
Delivery customizations

read_delivery_customizations

write_delivery_customizations
Admin API
Discounts

read_price_rules

write_price_rules

read_discounts

write_discounts
Admin API
Discounts allocator functions

read_discounts_allocator_functions

write_discounts_allocator_functions
Admin API
Discovery API

read_discovery

write_discovery
Admin API
Draft orders

write_draft_orders

read_draft_orders
Admin API
Files

read_files

write_files
Admin API
Fulfillment constraint rules

read_fulfillment_constraint_rules

write_fulfillment_constraint_rules
Admin API
Fulfillment services

read_fulfillments

write_fulfillments
Admin API
Gift card transactions

read_gift_card_transactions

write_gift_card_transactions
Admin API
Gift cards

read_gift_cards

write_gift_cards
Admin API
Inventory

write_inventory

read_inventory
Admin API
Inventory shipments

write_inventory_shipments

read_inventory_shipments
Admin API
Inventory shipments received items

write_inventory_shipments_received_items

read_inventory_shipments_received_items
Admin API
Inventory transfers

write_inventory_transfers

read_inventory_transfers
Admin API
Legal Policies

read_legal_policies

write_legal_policies
Admin API
Local Pickup Delivery Option Generators

read_delivery_option_generators

write_delivery_option_generators
Admin API
Locales GraphQL Admin API

read_locales

write_locales
Admin API
Locations

write_locations

read_locations
Admin API
Marketing campaigns

read_marketing_integrated_campaigns

write_marketing_integrated_campaigns
Admin API
Marketing events

write_marketing_events

read_marketing_events
Admin API
Markets

read_markets

write_markets
Admin API
Markets_home

read_markets_home

write_markets_home
Admin API
Merchant managed fulfillment

read_merchant_managed_fulfillment_orders

write_merchant_managed_fulfillment_orders
Admin API
Metaobject definitions

read_metaobject_definitions

write_metaobject_definitions
Admin API
Metaobjects

read_metaobjects

write_metaobjects
Admin API
Navigation API

read_online_store_navigation

write_online_store_navigation
Admin API
Online Store Pages GraphQL API

read_online_store_pages

write_online_store_pages
Admin API
Order editing

write_order_edits

read_order_edits
Admin API
Orders

read_orders

write_orders
Admin API
Packing slip templates

write_packing_slip_templates

read_packing_slip_templates
Admin API
Payment Mandate

write_payment_mandate

read_payment_mandate
Admin API
Payment Terms

read_payment_terms

write_payment_terms
Admin API
Payment customizations

read_payment_customizations

write_payment_customizations
Admin API
Privacy Settings

read_privacy_settings

write_privacy_settings
Admin API
Product feeds

read_product_feeds

write_product_feeds
Admin API
Product information

read_product_listings

write_product_listings
Admin API
Products

read_products

write_products
Admin API
Publications

read_publications

write_publications
Admin API
Purchase Options

read_purchase_options

write_purchase_options
Admin API
Reports

write_reports

read_reports
Admin API
Resource feedback

read_resource_feedbacks

write_resource_feedbacks
Admin API
Returns

read_returns

write_returns
Admin API
Script tags

read_script_tags

write_script_tags
Admin API
Sensitive information of the Shopify Payments provider account

read_shopify_payments_provider_accounts_sensitive
Admin API
Shipping rates

read_shipping

write_shipping
Admin API
Shopify Payments account, settings, and banking details

read_shopify_payments_accounts
Admin API
Shopify Payments balance & payouts

read_shopify_payments_payouts
Admin API
Shopify Payments bank accounts

read_shopify_payments_bank_accounts
Admin API
Shopify Payments disputes

read_shopify_payments_disputes

write_shopify_payments_disputes
Admin API
Store content

read_content

write_content
Admin API
Store credit account transactions

read_store_credit_account_transactions

write_store_credit_account_transactions
Admin API
Store credit accounts

read_store_credit_accounts
Admin API
Subscription Contracts

write_own_subscription_contracts

read_own_subscription_contracts
Admin API
Theme Code

write_theme_code
Admin API
Theme templates

read_themes

write_themes
Admin API
Third party fulfillment

read_third_party_fulfillment_orders

write_third_party_fulfillment_orders
Admin API
Translations GraphQL Admin API

read_translations

write_translations
Admin API
Web Pixels

read_pixels

write_pixels
Customer Account API
Companies

customer_read_companies

customer_write_companies
Customer Account API
Customer

customer_write_customers

customer_read_customers
Customer Account API
Draft orders

customer_read_draft_orders
Customer Account API
Markets

customer_read_markets
Customer Account API
Metaobjects

customer_read_metaobjects
Customer Account API
Orders

customer_read_orders

customer_write_orders
Customer Account API
Quick Sale

customer_read_quick_sale

customer_write_quick_sale
Customer Account API
Store credit account transactions

customer_read_store_credit_account_transactions
Customer Account API
Store credit accounts

customer_read_store_credit_accounts
Customer Account API
Subscription Contracts

customer_write_own_subscription_contracts

customer_read_own_subscription_contracts
Storefront API
Bulk operations

unauthenticated_write_bulk_operations

unauthenticated_read_bulk_operations
Storefront API
Bundles

unauthenticated_read_bundles
Storefront API
Checkouts

unauthenticated_write_checkouts

unauthenticated_read_checkouts
Storefront API
Customer

unauthenticated_write_customers

unauthenticated_read_custome


Ah! The localStorage key is showing as undefined instead of auth-storage. That's the issue! Let me check the frontend auth store:

I found the issue! The persist configuration is missing the name property, which is causing the localStorage key to be undefined.

Let me fix this:

Perfect! I fixed it. Now:

🔄 Step 1: Restart Frontend
The frontend needs to reload with the updated code:

In your terminal where frontend is running, press Ctrl+C to stop it
Restart: cd frontend; npm run dev
Wait for "Ready" message
🧹 Step 2: Clear Old localStorage
In your browser:

Press F12 → Application tab (or Storage tab in Firefox)
In left sidebar: Local Storage → http://localhost:3001
Right-click on undefined key → Delete
Close Developer Tools
🔐 Step 3: Login Again
Refresh the page (F5)
Login with: numankhaan4@gmail.com
Enter password
✅ Step 4: Verify
After login, press F12 → Application → Local Storage → http://localhost:3001

You should now see:

Key: auth-storage ✓ (not "undefined")
Value: Your auth data with correct user and workspace
Then go to Orders page and you should see your orders! 🎉

Let me know once the frontend restarts and you've logged in again! 