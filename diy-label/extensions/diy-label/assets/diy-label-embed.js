(function() {
  'use strict';
  
  // DIY Label App Embed Script
  window.DIYLabelEmbed = {
    config: null,
    
    init: function(embedConfig) {
      this.config = embedConfig;
      
      // Only run on product pages
      if (!this.isProductPage()) {
        return;
      }
      
      // Check if DIY Label is enabled
      if (!this.config.enabled) {
        return;
      }
      
      this.loadWidget();
    },
    
    isProductPage: function() {
      // Check if we're on a product page
      return window.location.pathname.includes('/products/') || 
             document.querySelector('[data-product-id]') ||
             window.ShopifyAnalytics?.meta?.product;
    },
    
    getProductId: function() {
      // Try multiple methods to get product ID
      let productId = null;
      
      // Method 1: Shopify Analytics
      if (window.ShopifyAnalytics?.meta?.product?.id) {
        productId = window.ShopifyAnalytics.meta.product.id;
      }
      
      // Method 2: Look for data attributes
      if (!productId) {
        const productElement = document.querySelector('[data-product-id]');
        if (productElement) {
          productId = productElement.getAttribute('data-product-id');
        }
      }
      
      // Method 3: Extract from URL
      if (!productId) {
        const pathMatch = window.location.pathname.match(/\/products\/([^\/]+)/);
        if (pathMatch) {
          // This gives us the handle, we'll need to resolve it
          productId = pathMatch[1];
        }
      }
      
      return productId;
    },
    
    getShopDomain: function() {
      return window.Shopify?.shop || window.location.hostname;
    },
    
    loadWidget: function() {
      const productId = this.getProductId();
      const shopDomain = this.getShopDomain();
      
      if (!productId) {
        console.log('DIY Label: Could not determine product ID');
        return;
      }
      
      // Check if this product has DIY Label enabled
      this.checkProductSettings(shopDomain, productId).then(settings => {
        if (settings.enabled || this.config.show_on_all_products) {
          this.createWidget(productId, shopDomain, settings);
        }
      }).catch(error => {
        console.error('DIY Label: Error checking product settings:', error);
      });
    },
    
    checkProductSettings: function(shopDomain, productId) {
      const apiUrl = this.config.app_url || 'https://increasing-exercise-calculation-yo.trycloudflare.com';
      
      return fetch(`${apiUrl}/api/product-settings?shop=${encodeURIComponent(shopDomain)}&product=${encodeURIComponent(productId)}`)
        .then(response => response.json())
        .catch(error => {
          console.error('DIY Label: API error:', error);
          return { enabled: false };
        });
    },
    
    createWidget: function(productId, shopDomain, settings) {
      // Find a good place to insert the widget
      const insertionPoint = this.findInsertionPoint();
      
      if (!insertionPoint) {
        console.log('DIY Label: Could not find suitable insertion point');
        return;
      }
      
      // Create widget container
      const widgetContainer = document.createElement('div');
      widgetContainer.id = 'diy-label-widget-container';
      widgetContainer.style.cssText = `
        margin: 20px 0;
        padding: 20px;
        border: 1px solid #e1e1e1;
        border-radius: 8px;
        background: ${this.config.widget_theme === 'dark' ? '#1a1a1a' : '#f9f9f9'};
        font-family: system-ui, -apple-system, sans-serif;
      `;
      
      // Create iframe for the widget
      const iframe = document.createElement('iframe');
      const apiUrl = this.config.app_url || 'https://increasing-exercise-calculation-yo.trycloudflare.com';
      
      iframe.src = `${apiUrl}/widget?` + new URLSearchParams({
        shop: shopDomain,
        product: productId,
        theme: this.config.widget_theme || 'light',
        radius: this.config.default_radius || '25',
        embed: 'true'
      }).toString();
      
      iframe.style.cssText = `
        width: 100%;
        height: 500px;
        border: none;
        border-radius: 6px;
        background: transparent;
      `;
      
      iframe.frameBorder = '0';
      iframe.loading = 'lazy';
      
      // Add loading state
      widgetContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: ${this.config.widget_theme === 'dark' ? '#fff' : '#333'};">
          <h3 style="margin: 0 0 10px 0; font-size: 18px;">🌱 Local Printing Available</h3>
          <p style="margin: 0; color: ${this.config.widget_theme === 'dark' ? '#ccc' : '#666'};">Loading nearby print shops...</p>
        </div>
      `;
      
      // Insert widget into page
      insertionPoint.appendChild(widgetContainer);
      
      // Replace loading content with iframe after a short delay
      setTimeout(() => {
        widgetContainer.innerHTML = '';
        widgetContainer.appendChild(iframe);
      }, 500);
      
      // Handle iframe messages for dynamic resizing
      window.addEventListener('message', (event) => {
        if (event.origin !== apiUrl) return;
        
        if (event.data.type === 'diy-label-resize') {
          iframe.style.height = Math.max(400, event.data.height) + 'px';
        }
        
        if (event.data.type === 'diy-label-selection') {
          // Handle print shop selection
          console.log('DIY Label: Print shop selected:', event.data.printShop);
          
          // Dispatch custom event for theme integration
          const customEvent = new CustomEvent('diyLabelSelection', {
            detail: {
              printShop: event.data.printShop,
              productId: productId
            }
          });
          document.dispatchEvent(customEvent);
          
          // Show confirmation
          this.showConfirmation(event.data.printShop);
        }
      });
    },
    
    findInsertionPoint: function() {
      // Try multiple selectors to find a good insertion point
      const selectors = [
        '.product-form',
        '.product__form',
        '.product-single__form',
        '.shopify-product-form',
        '[data-product-form]',
        '.product-form-container',
        '.product__info',
        '.product-info',
        '.product-details',
        '.product__details',
        '.product-single',
        '.product'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.parentNode || element;
        }
      }
      
      // Fallback: try to find any form and insert after it
      const forms = document.querySelectorAll('form');
      for (const form of forms) {
        if (form.querySelector('[name="id"]') || form.action.includes('cart')) {
          return form.parentNode || document.body;
        }
      }
      
      // Last resort: insert at the end of main content
      return document.querySelector('main') || document.body;
    },
    
    showConfirmation: function(printShop) {
      const confirmation = document.createElement('div');
      confirmation.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        z-index: 9999;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
      `;
      
      confirmation.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">✅</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">Print Shop Selected</div>
            <div style="font-size: 14px; opacity: 0.9;">${printShop.name}</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(confirmation);
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        if (confirmation.parentNode) {
          confirmation.parentNode.removeChild(confirmation);
        }
      }, 4000);
    }
  };
  
  // Auto-initialize when DOM is ready
  function initializeEmbed() {
    // Wait for Shopify app embed config
    if (window.DIYLabelEmbedConfig) {
      window.DIYLabelEmbed.init(window.DIYLabelEmbedConfig);
    } else {
      // Retry after a short delay
      setTimeout(initializeEmbed, 100);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEmbed);
  } else {
    initializeEmbed();
  }
  
})();