# 🛍️ Adding DIY Label Widget to Shopify Theme

Complete guide for integrating the DIY Label customer widget into your Shopify store theme.

## 🎯 Integration Options

### Option 1: Theme App Extension (Recommended)
The most seamless way to add the widget to your theme.

### Option 2: Manual Theme Code Integration
Direct integration into theme files for maximum control.

### Option 3: Script Tag Integration
Simple JavaScript injection method.

---

## 🚀 Option 1: Theme App Extension (Recommended)

### Step 1: Create Theme Extension
```bash
cd diy-label
shopify app generate extension
```

Choose:
- **Extension type**: `Theme app extension`
- **Name**: `DIY Label Widget`

### Step 2: Configure Extension
The extension will be created in `extensions/diy-label-widget/`

**File: `extensions/diy-label-widget/blocks/diy-label.liquid`**
```liquid
<div class="diy-label-widget-container">
  {% if block.settings.enabled %}
    <div id="diy-label-widget-{{ product.id }}" 
         data-product-id="{{ product.id }}"
         data-shop-domain="{{ shop.permanent_domain }}"
         data-theme="{{ block.settings.theme }}"
         style="margin: {{ block.settings.margin }}px 0;">
      
      <div class="diy-label-loading">
        <p>🌱 Loading local printing options...</p>
      </div>
    </div>

    <script>
      (function() {
        // Load the DIY Label widget
        const script = document.createElement('script');
        script.src = '{{ app.url }}/widget-embed.js';
        script.async = true;
        script.onload = function() {
          if (window.DIYLabelWidget) {
            window.DIYLabelWidget.init({
              containerId: 'diy-label-widget-{{ product.id }}',
              productId: '{{ product.id }}',
              shopDomain: '{{ shop.permanent_domain }}',
              theme: '{{ block.settings.theme }}',
              apiUrl: '{{ app.url }}'
            });
          }
        };
        document.head.appendChild(script);
      })();
    </script>
  {% endif %}
</div>

{% schema %}
{
  "name": "DIY Label Widget",
  "target": "section",
  "settings": [
    {
      "type": "checkbox",
      "id": "enabled",
      "label": "Enable DIY Label",
      "default": true
    },
    {
      "type": "select",
      "id": "theme",
      "label": "Widget Theme",
      "options": [
        {
          "value": "light",
          "label": "Light"
        },
        {
          "value": "dark", 
          "label": "Dark"
        },
        {
          "value": "auto",
          "label": "Auto"
        }
      ],
      "default": "light"
    },
    {
      "type": "range",
      "id": "margin",
      "label": "Margin (px)",
      "min": 0,
      "max": 50,
      "step": 5,
      "default": 20
    }
  ]
}
{% endschema %}
```

### Step 3: Create Widget Embed Script
Create a new route for the embeddable widget script:

**File: `app/routes/widget-embed.js.tsx`**
```typescript
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const widgetScript = `
(function() {
  'use strict';
  
  window.DIYLabelWidget = {
    init: function(config) {
      const container = document.getElementById(config.containerId);
      if (!container) return;
      
      // Remove loading message
      container.innerHTML = '';
      
      // Create iframe for the widget
      const iframe = document.createElement('iframe');
      iframe.src = config.apiUrl + '/widget?' + 
        'shop=' + encodeURIComponent(config.shopDomain) + 
        '&product=' + encodeURIComponent(config.productId) +
        '&theme=' + encodeURIComponent(config.theme);
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.frameBorder = '0';
      
      container.appendChild(iframe);
      
      // Handle iframe messages
      window.addEventListener('message', function(event) {
        if (event.origin !== config.apiUrl) return;
        
        if (event.data.type === 'diy-label-resize') {
          iframe.style.height = event.data.height + 'px';
        }
        
        if (event.data.type === 'diy-label-selection') {
          // Handle print shop selection
          console.log('Print shop selected:', event.data.printShop);
          
          // You can dispatch custom events here for theme integration
          const customEvent = new CustomEvent('diyLabelSelection', {
            detail: event.data.printShop
          });
          document.dispatchEvent(customEvent);
        }
      });
    }
  };
})();
`;

  return new Response(widgetScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
```

### Step 4: Deploy Extension
```bash
shopify app deploy
```

---

## 🛠️ Option 2: Manual Theme Code Integration

### Step 1: Access Theme Code
1. Go to **Online Store > Themes** in Shopify Admin
2. Click **Actions > Edit code** on your active theme

### Step 2: Add Widget to Product Template

**File: `sections/product-form.liquid` or `templates/product.liquid`**

Add this code where you want the widget to appear (usually after the product form):

```liquid
{% comment %} DIY Label Widget {% endcomment %}
{% if product.metafields.diy_label.enabled %}
<div class="diy-label-section" style="margin: 30px 0;">
  <div id="diy-label-widget" 
       data-product-id="{{ product.id }}"
       data-shop-domain="{{ shop.permanent_domain }}">
    
    <div class="diy-label-loading">
      <h3>🌱 Choose Local Printing</h3>
      <p>Loading nearby print shops...</p>
    </div>
  </div>
</div>

<script>
(function() {
  const widgetContainer = document.getElementById('diy-label-widget');
  if (!widgetContainer) return;
  
  const iframe = document.createElement('iframe');
  iframe.src = 'https://your-app-url.trycloudflare.com/widget?' + 
    'shop={{ shop.permanent_domain }}' +
    '&product={{ product.id }}';
  iframe.style.width = '100%';
  iframe.style.height = '600px';
  iframe.style.border = '1px solid #e1e1e1';
  iframe.style.borderRadius = '8px';
  iframe.frameBorder = '0';
  
  // Replace loading content with iframe
  widgetContainer.innerHTML = '';
  widgetContainer.appendChild(iframe);
})();
</script>
{% endif %}
```

### Step 3: Add CSS Styling

**File: `assets/theme.css` or `assets/application.css`**

```css
.diy-label-section {
  margin: 30px 0;
  padding: 20px;
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  background: #f9f9f9;
}

.diy-label-loading {
  text-align: center;
  padding: 40px 20px;
}

.diy-label-loading h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.diy-label-loading p {
  margin: 0;
  color: #666;
}

@media (max-width: 768px) {
  .diy-label-section {
    margin: 20px 0;
    padding: 15px;
  }
}
```

---

## 📱 Option 3: Script Tag Integration

### Step 1: Create Global Script
Add this to your theme's `theme.liquid` file before the closing `</head>` tag:

```liquid
{% comment %} DIY Label Global Script {% endcomment %}
<script>
window.DIYLabelConfig = {
  apiUrl: 'https://your-app-url.trycloudflare.com',
  shopDomain: '{{ shop.permanent_domain }}',
  theme: 'auto'
};
</script>
<script src="https://your-app-url.trycloudflare.com/widget-embed.js" async></script>
```

### Step 2: Add Widget Containers
In your product template, add:

```liquid
<div class="diy-label-auto-widget" 
     data-product-id="{{ product.id }}"
     data-auto-init="true">
</div>
```

---

## 🎛️ Advanced Configuration

### Conditional Display
Only show the widget for specific products:

```liquid
{% assign diy_enabled = false %}
{% for tag in product.tags %}
  {% if tag contains 'diy-label' %}
    {% assign diy_enabled = true %}
    {% break %}
  {% endif %}
{% endfor %}

{% if diy_enabled %}
  <!-- Widget code here -->
{% endif %}
```

### Product Metafields
Use Shopify metafields for per-product control:

```liquid
{% if product.metafields.diy_label.enabled == 'true' %}
  <!-- Widget code here -->
{% endif %}
```

### Theme Settings
Add theme settings for global control:

**File: `config/settings_schema.json`**
```json
{
  "name": "DIY Label",
  "settings": [
    {
      "type": "checkbox",
      "id": "diy_label_enabled",
      "label": "Enable DIY Label",
      "default": false
    },
    {
      "type": "text",
      "id": "diy_label_api_url",
      "label": "DIY Label API URL",
      "default": "https://your-app-url.com"
    }
  ]
}
```

---

## 🔧 Testing Your Integration

### 1. Test Widget Loading
- Visit a product page where you added the widget
- Check browser console for any JavaScript errors
- Verify the iframe loads correctly

### 2. Test Functionality
- Click "Find Print Shops Near Me"
- Allow location access
- Verify map and print shops load
- Test print shop selection

### 3. Mobile Testing
- Test on mobile devices
- Verify responsive design
- Check touch interactions work

---

## 🚨 Troubleshooting

### Widget Not Loading
1. Check if the iframe src URL is correct
2. Verify CORS settings allow your shop domain
3. Check browser console for errors

### Location Not Working
1. Ensure HTTPS is enabled on your store
2. Check if location permissions are granted
3. Test with different browsers

### Styling Issues
1. Check for CSS conflicts with theme
2. Use browser dev tools to inspect styles
3. Add `!important` to critical styles if needed

---

## 📋 Checklist

- [ ] Choose integration method (Theme Extension recommended)
- [ ] Add widget code to product template
- [ ] Test on development store
- [ ] Verify mobile responsiveness
- [ ] Test location functionality
- [ ] Check print shop selection works
- [ ] Deploy to live store
- [ ] Monitor for errors

---

## 🆘 Need Help?

If you encounter issues:

1. Check the browser console for JavaScript errors
2. Verify your app URL is accessible
3. Test the widget URL directly in browser
4. Contact support with specific error messages

**Widget Test URL:**
```
https://your-app-url.trycloudflare.com/widget?shop=your-store.myshopify.com&product=123
```