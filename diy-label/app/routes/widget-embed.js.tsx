import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const widgetScript = `
(function() {
  'use strict';
  
  window.DIYLabelWidget = {
    init: function(config) {
      const container = document.getElementById(config.containerId);
      if (!container) {
        console.error('DIY Label: Container not found:', config.containerId);
        return;
      }
      
      // Remove loading message
      container.innerHTML = '';
      
      // Create iframe for the widget
      const iframe = document.createElement('iframe');
      iframe.src = config.apiUrl + '/widget?' + 
        'shop=' + encodeURIComponent(config.shopDomain) + 
        '&product=' + encodeURIComponent(config.productId) +
        '&theme=' + encodeURIComponent(config.theme || 'light');
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.style.backgroundColor = '#f9f9f9';
      iframe.frameBorder = '0';
      iframe.loading = 'lazy';
      
      // Add loading state
      iframe.onload = function() {
        console.log('DIY Label widget loaded successfully');
      };
      
      iframe.onerror = function() {
        console.error('DIY Label widget failed to load');
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Unable to load DIY Label widget. Please try again later.</p>';
      };
      
      container.appendChild(iframe);
      
      // Handle iframe messages for dynamic resizing and interactions
      window.addEventListener('message', function(event) {
        // Verify origin for security
        if (event.origin !== config.apiUrl) return;
        
        if (event.data.type === 'diy-label-resize') {
          iframe.style.height = Math.max(400, event.data.height) + 'px';
        }
        
        if (event.data.type === 'diy-label-selection') {
          // Handle print shop selection
          console.log('Print shop selected:', event.data.printShop);
          
          // Dispatch custom event for theme integration
          const customEvent = new CustomEvent('diyLabelSelection', {
            detail: {
              printShop: event.data.printShop,
              productId: config.productId
            }
          });
          document.dispatchEvent(customEvent);
          
          // Optional: Show confirmation message
          const confirmation = document.createElement('div');
          confirmation.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 15px; border-radius: 5px; z-index: 9999; font-family: sans-serif;';
          confirmation.innerHTML = '✅ Print shop selected: ' + event.data.printShop.name;
          document.body.appendChild(confirmation);
          
          setTimeout(() => {
            if (confirmation.parentNode) {
              confirmation.parentNode.removeChild(confirmation);
            }
          }, 3000);
        }
        
        if (event.data.type === 'diy-label-error') {
          console.error('DIY Label widget error:', event.data.error);
          container.innerHTML = '<p style="text-align: center; color: #d32f2f; padding: 20px;">Error loading print shops. Please try again later.</p>';
        }
      });
    },
    
    // Auto-initialize widgets with data-auto-init attribute
    autoInit: function() {
      const widgets = document.querySelectorAll('[data-auto-init="true"]');
      widgets.forEach(function(widget) {
        const productId = widget.getAttribute('data-product-id');
        const shopDomain = window.DIYLabelConfig?.shopDomain || widget.getAttribute('data-shop-domain');
        const theme = window.DIYLabelConfig?.theme || widget.getAttribute('data-theme') || 'light';
        const apiUrl = window.DIYLabelConfig?.apiUrl || widget.getAttribute('data-api-url');
        
        if (productId && shopDomain && apiUrl) {
          // Create unique container ID
          const containerId = 'diy-label-auto-' + productId + '-' + Math.random().toString(36).substr(2, 9);
          widget.id = containerId;
          
          // Add loading state
          widget.innerHTML = '<div style="text-align: center; padding: 20px;"><p>🌱 Loading local printing options...</p></div>';
          
          // Initialize widget
          window.DIYLabelWidget.init({
            containerId: containerId,
            productId: productId,
            shopDomain: shopDomain,
            theme: theme,
            apiUrl: apiUrl
          });
        }
      });
    }
  };
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.DIYLabelWidget.autoInit);
  } else {
    window.DIYLabelWidget.autoInit();
  }
  
  // Also run auto-init when script loads (for dynamic content)
  setTimeout(window.DIYLabelWidget.autoInit, 100);
  
})();
`;

  return new Response(widgetScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};