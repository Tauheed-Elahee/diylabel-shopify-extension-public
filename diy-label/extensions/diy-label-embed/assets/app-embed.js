(function() {
  'use strict';
  
  // DIY Label App Embed Script
  window.DIYLabelEmbed = {
    config: null,
    
    init: function(embedConfig) {
      this.config = embedConfig;
      console.log('DIY Label: Initializing with config:', embedConfig);
      
      // Only run on product pages
      if (!this.isProductPage()) {
        console.log('DIY Label: Not a product page, skipping');
        return;
      }
      
      // Check if DIY Label is enabled
      if (!this.config.enabled) {
        console.log('DIY Label: Disabled in settings');
        return;
      }
      
      this.loadWidget();
    },
    
    isProductPage: function() {
      // Check if we're on a product page
      return window.location.pathname.includes('/products/') || 
             document.querySelector('[data-product-id]') ||
             window.ShopifyAnalytics?.meta?.product ||
             document.querySelector('form[action*="/cart/add"]');
    },
    
    getProductId: function() {
      // Try multiple methods to get product ID
      let productId = null;
      
      // Method 1: Shopify Analytics
      if (window.ShopifyAnalytics?.meta?.product?.id) {
        productId = window.ShopifyAnalytics.meta.product.id;
      }
      
      // Method 2: Look for product form
      if (!productId) {
        const productForm = document.querySelector('form[action*="/cart/add"]');
        if (productForm) {
          const idInput = productForm.querySelector('input[name="id"], select[name="id"]');
          if (idInput) {
            productId = idInput.value || idInput.options?.[idInput.selectedIndex]?.value;
          }
        }
      }
      
      // Method 3: Look for data attributes
      if (!productId) {
        const productElement = document.querySelector('[data-product-id]');
        if (productElement) {
          productId = productElement.getAttribute('data-product-id');
        }
      }
      
      console.log('DIY Label: Product ID found:', productId);
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
      
      console.log('DIY Label: Loading widget for product:', productId);
      
      // Check if this product has DIY Label enabled
      this.checkProductSettings(shopDomain, productId).then(settings => {
        console.log('DIY Label: Product settings:', settings);
        if (settings.enabled || this.config.show_on_all_products) {
          this.createWidget(productId, shopDomain, settings);
        } else {
          console.log('DIY Label: Product not enabled for DIY Label');
        }
      }).catch(error => {
        console.error('DIY Label: Error checking product settings:', error);
        // If API fails, still show widget if show_on_all_products is true
        if (this.config.show_on_all_products) {
          this.createWidget(productId, shopDomain, { enabled: true });
        }
      });
    },
    
    checkProductSettings: function(shopDomain, productId) {
      const apiUrl = this.config.api_url || 'https://increasing-exercise-calculation-yo.trycloudflare.com';
      
      return fetch(`${apiUrl}/api/product-settings?shop=${encodeURIComponent(shopDomain)}&product=${encodeURIComponent(productId)}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        })
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
      
      // Check if widget already exists
      if (document.getElementById('diy-label-widget-container')) {
        console.log('DIY Label: Widget already exists');
        return;
      }
      
      console.log('DIY Label: Creating widget at insertion point:', insertionPoint);
      
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
      
      // Add loading state
      widgetContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: ${this.config.widget_theme === 'dark' ? '#fff' : '#333'};">
          <h3 style="margin: 0 0 10px 0; font-size: 18px;">🌱 Local Printing Available</h3>
          <p style="margin: 0; color: ${this.config.widget_theme === 'dark' ? '#ccc' : '#666'};">Loading nearby print shops...</p>
        </div>
      `;
      
      // Insert widget into page
      insertionPoint.appendChild(widgetContainer);
      
      // Create iframe for the widget
      setTimeout(() => {
        const iframe = document.createElement('iframe');
        const apiUrl = this.config.api_url || 'https://increasing-exercise-calculation-yo.trycloudflare.com';
        
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
        
        // Replace loading content with iframe
        widgetContainer.innerHTML = '';
        widgetContainer.appendChild(iframe);
        
        console.log('DIY Label: Widget iframe created and loaded');
        
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
      }, 500);
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
          console.log('DIY Label: Found insertion point with selector:', selector);
          return element.parentNode || element;
        }
      }
      
      // Fallback: try to find any form and insert after it
      const forms = document.querySelectorAll('form');
      for (const form of forms) {
        if (form.querySelector('[name="id"]') || form.action.includes('cart')) {
          console.log('DIY Label: Found insertion point via form');
          return form.parentNode || document.body;
        }
      }
      
      // Last resort: insert at the end of main content
      const fallback = document.querySelector('main') || document.querySelector('.main-content') || document.body;
      console.log('DIY Label: Using fallback insertion point:', fallback.tagName);
      return fallback;
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
        animation: slideIn 0.3s ease-out;
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
      
      // Add animation styles if not already present
      if (!document.getElementById('diy-label-styles')) {
        const styles = document.createElement('style');
        styles.id = 'diy-label-styles';
        styles.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `;
        document.head.appendChild(styles);
      }
      
      document.body.appendChild(confirmation);
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        if (confirmation.parentNode) {
          confirmation.style.animation = 'slideIn 0.3s ease-out reverse';
          setTimeout(() => {
            if (confirmation.parentNode) {
              confirmation.parentNode.removeChild(confirmation);
            }
          }, 300);
        }
      }, 4000);
    }
  };
  
})();