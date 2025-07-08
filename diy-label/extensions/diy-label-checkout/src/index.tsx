import { extension } from '@shopify/ui-extensions/checkout';

// Export all extension points
export { default as Checkout } from './Checkout';
export { default as ThankYou } from './ThankYou';

// Main extension entry point
export default extension('purchase.checkout.block.render', (root, api) => {
  // This is handled by the individual components
  // The extension system will automatically load the appropriate component
});