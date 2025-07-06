import {
  reactExtension,
  useCartLines,
  useApplyCartLinesChange,
  useApplyAttributeChange,
  useAttributes,
  useShop,
  useBuyerJourney,
  Banner,
  BlockStack,
  Button,
  Text,
  InlineLayout,
  Modal,
  View,
  Spinner,
  Icon,
  Pressable,
  Image,
  Divider,
  List,
  ListItem,
  SkeletonText,
  TextField,
  Checkbox,
  Grid,
  GridItem
} from '@shopify/ui-extensions-react/checkout';
import { useState, useEffect, useCallback } from 'react';

// Types
interface PrintShop {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  latitude: number;
  longitude: number;
  specialty: string;
  rating: number;
  phone?: string;
  email?: string;
  website?: string;
  capabilities: {
    screen_printing?: boolean;
    embroidery?: boolean;
    dtg?: boolean;
    reused_apparel?: boolean;
    organic_inks?: boolean;
    water_based_inks?: boolean;
  };
  hours: Record<string, string>;
  distance_km?: number;
}

interface UserLocation {
  lat: number;
  lng: number;
}

interface DIYLabelProduct {
  lineId: string;
  productId: string;
  variantId: string;
  title: string;
  quantity: number;
  enabled: boolean;
}

// Main checkout extension
export default reactExtension(
  'purchase.checkout.block.render',
  () => <DIYLabelCheckout />
);

function DIYLabelCheckout() {
  const cartLines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const applyAttributeChange = useApplyAttributeChange();
  const attributes = useAttributes();
  const shop = useShop();
  const { canBlockProgress, setCanBlockProgress } = useBuyerJourney();

  // State
  const [diyProducts, setDiyProducts] = useState<DIYLabelProduct[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [printShops, setPrintShops] = useState<PrintShop[]>([]);
  const [selectedShop, setSelectedShop] = useState<PrintShop | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const [useReusedApparel, setUseReusedApparel] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Check which products have DIY Label enabled
  useEffect(() => {
    checkDIYLabelProducts();
  }, [cartLines]);

  const checkDIYLabelProducts = async () => {
    const products: DIYLabelProduct[] = [];
    
    for (const line of cartLines) {
      if (line.merchandise.__typename === 'ProductVariant') {
        const productId = line.merchandise.product.id.replace('gid://shopify/Product/', '');
        
        try {
          // Check if this product has DIY Label enabled
          const response = await fetch(
            `https://spirits-plumbing-definitions-obituaries.trycloudflare.com/api/product-settings?shop=${encodeURIComponent(shop.myshopifyDomain)}&product=${encodeURIComponent(productId)}`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            products.push({
              lineId: line.id,
              productId: productId,
              variantId: line.merchandise.id.replace('gid://shopify/ProductVariant/', ''),
              title: line.merchandise.product.title,
              quantity: line.quantity,
              enabled: data.enabled || false
            });
          }
        } catch (error) {
          console.error('Error checking DIY Label status:', error);
          products.push({
            lineId: line.id,
            productId: productId,
            variantId: line.merchandise.id.replace('gid://shopify/ProductVariant/', ''),
            title: line.merchandise.product.title,
            quantity: line.quantity,
            enabled: false
          });
        }
      }
    }
    
    setDiyProducts(products);
  };

  // Get user location
  const getUserLocation = useCallback(async () => {
    setIsLocationLoading(true);
    setLocationError(null);
    
    try {
      // Request geolocation permission
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported'));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      });
      
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      setUserLocation(location);
      await fetchNearbyPrintShops(location);
      
    } catch (error) {
      console.error('Geolocation error:', error);
      setLocationError(
        error instanceof Error 
          ? error.message 
          : 'Unable to access your location. Please enter your city or zip code.'
      );
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  // Geocode manual location
  const geocodeLocation = async (address: string) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=pk.eyJ1IjoidGF1aGVlZC1lbGFoZWUiLCJhIjoiY21jMTVuMng4MDFjNzJxcGhqZGZqZGZwZCJ9.Ue9Ej_Ej_Ej_Ej_Ej_Ej_Ej&country=US,CA&types=place,postcode,locality`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      } else {
        throw new Error('Location not found');
      }
    } catch (error) {
      throw new Error('Could not find that location');
    }
  };

  // Fetch nearby print shops
  const fetchNearbyPrintShops = async (location: UserLocation) => {
    try {
      const response = await fetch(
        `https://spirits-plumbing-definitions-obituaries.trycloudflare.com/api/print-shops/nearby?lat=${location.lat}&lng=${location.lng}&radius=25`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch print shops');
      }
      
      const data = await response.json();
      setPrintShops(data.printShops || []);
      
    } catch (error) {
      console.error('Error fetching print shops:', error);
      setPrintShops([]);
    }
  };

  // Handle manual location search
  const handleManualLocationSearch = async () => {
    if (!manualLocation.trim()) return;
    
    setIsLocationLoading(true);
    setLocationError(null);
    
    try {
      const location = await geocodeLocation(manualLocation);
      setUserLocation(location);
      await fetchNearbyPrintShops(location);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Location search failed');
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Select print shop and update cart
  const selectPrintShop = async (shop: PrintShop) => {
    setSelectedShop(shop);
    setIsLoading(true);
    
    try {
      // Update cart attributes with DIY Label selection
      await applyAttributeChange({
        type: 'updateAttribute',
        key: 'diy_label_enabled',
        value: 'true'
      });
      
      await applyAttributeChange({
        type: 'updateAttribute',
        key: 'diy_label_print_shop_id',
        value: shop.id.toString()
      });
      
      await applyAttributeChange({
        type: 'updateAttribute',
        key: 'diy_label_print_shop_name',
        value: shop.name
      });
      
      await applyAttributeChange({
        type: 'updateAttribute',
        key: 'diy_label_print_shop_address',
        value: shop.address
      });
      
      if (userLocation) {
        await applyAttributeChange({
          type: 'updateAttribute',
          key: 'diy_label_customer_location',
          value: JSON.stringify(userLocation)
        });
      }
      
      if (useReusedApparel) {
        await applyAttributeChange({
          type: 'updateAttribute',
          key: 'diy_label_reused_apparel',
          value: 'true'
        });
      }
      
      if (specialInstructions) {
        await applyAttributeChange({
          type: 'updateAttribute',
          key: 'diy_label_instructions',
          value: specialInstructions
        });
      }
      
      // Add note to cart lines for DIY Label products
      const diyEnabledProducts = diyProducts.filter(p => p.enabled);
      if (diyEnabledProducts.length > 0) {
        const lineChanges = diyEnabledProducts.map(product => ({
          id: product.lineId,
          attributes: [
            {
              key: 'diy_label_enabled',
              value: 'true'
            },
            {
              key: 'diy_label_print_shop',
              value: shop.name
            }
          ]
        }));
        
        await applyCartLinesChange({
          type: 'updateCartLine',
          lines: lineChanges
        });
      }
      
      setIsModalOpen(false);
      
    } catch (error) {
      console.error('Error selecting print shop:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Open modal and request location
  const openModal = () => {
    setIsModalOpen(true);
    if (!userLocation) {
      getUserLocation();
    }
  };

  // Calculate enabled products count
  const enabledProductsCount = diyProducts.filter(p => p.enabled).length;
  const totalDIYQuantity = diyProducts
    .filter(p => p.enabled)
    .reduce((sum, p) => sum + p.quantity, 0);

  // Don't render if no DIY Label products
  if (enabledProductsCount === 0) {
    return null;
  }

  // Check if already selected
  const hasSelection = attributes.some(attr => attr.key === 'diy_label_enabled' && attr.value === 'true');
  const selectedShopName = attributes.find(attr => attr.key === 'diy_label_print_shop_name')?.value;

  return (
    <BlockStack spacing="base">
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 Local Printing Available</Text>
          <Text size="small">
            {totalDIYQuantity} item{totalDIYQuantity !== 1 ? 's' : ''} can be printed locally to reduce shipping impact and support your community.
          </Text>
        </BlockStack>
      </Banner>
      
      {hasSelection ? (
        <View border="base" padding="base" cornerRadius="base">
          <BlockStack spacing="tight">
            <Text emphasis="bold">✅ Local Print Shop Selected</Text>
            <Text size="small">{selectedShopName}</Text>
            <Button kind="secondary" onPress={openModal}>
              Change Print Shop
            </Button>
          </BlockStack>
        </View>
      ) : (
        <Button onPress={openModal} kind="primary">
          Choose Local Print Shop ({enabledProductsCount} product{enabledProductsCount !== 1 ? 's' : ''})
        </Button>
      )}

      {isModalOpen && (
        <Modal
          id="diy-label-modal"
          title="🌱 Choose Local Print Shop"
          onClose={() => setIsModalOpen(false)}
          padding
        >
          <BlockStack spacing="base">
            <Text>
              Find a local print shop near you to reduce shipping impact and support your community.
            </Text>
            
            <Divider />
            
            {/* Location Section */}
            <BlockStack spacing="tight">
              <Text emphasis="bold">📍 Your Location</Text>
              
              {!userLocation && !isLocationLoading && (
                <BlockStack spacing="tight">
                  <Button onPress={getUserLocation} kind="primary">
                    Use My Current Location
                  </Button>
                  
                  <Text size="small">Or enter your location manually:</Text>
                  
                  <InlineLayout spacing="tight">
                    <View flexGrow>
                      <TextField
                        label=""
                        value={manualLocation}
                        onChange={setManualLocation}
                        placeholder="Enter city or zip code"
                      />
                    </View>
                    <Button onPress={handleManualLocationSearch}>
                      Search
                    </Button>
                  </InlineLayout>
                </BlockStack>
              )}
              
              {isLocationLoading && (
                <View padding="base">
                  <InlineLayout spacing="tight" blockAlignment="center">
                    <Spinner size="small" />
                    <Text>Getting your location...</Text>
                  </InlineLayout>
                </View>
              )}
              
              {locationError && (
                <Banner status="critical">
                  <Text size="small">{locationError}</Text>
                </Banner>
              )}
              
              {userLocation && (
                <Banner status="success">
                  <Text size="small">
                    ✅ Location found! Showing print shops within 25 miles.
                  </Text>
                </Banner>
              )}
            </BlockStack>
            
            <Divider />
            
            {/* Print Shops List */}
            {printShops.length > 0 && (
              <BlockStack spacing="base">
                <Text emphasis="bold">🏪 Nearby Print Shops</Text>
                
                <BlockStack spacing="tight">
                  {printShops.slice(0, 5).map((shop) => (
                    <Pressable
                      key={shop.id}
                      onPress={() => selectPrintShop(shop)}
                      border="base"
                      padding="base"
                      cornerRadius="base"
                    >
                      <BlockStack spacing="tight">
                        <InlineLayout spacing="tight" blockAlignment="center">
                          <View flexGrow>
                            <Text emphasis="bold">{shop.name}</Text>
                          </View>
                          <View>
                            <Text size="small">⭐ {shop.rating}/5</Text>
                          </View>
                        </InlineLayout>
                        
                        <Text size="small" appearance="subdued">
                          {shop.address}
                        </Text>
                        
                        <Text size="small">
                          {shop.specialty}
                        </Text>
                        
                        {shop.distance_km && (
                          <Text size="small" appearance="subdued">
                            📍 {shop.distance_km.toFixed(1)} km away
                          </Text>
                        )}
                        
                        {shop.capabilities.reused_apparel && (
                          <Text size="small">♻️ Reused apparel available</Text>
                        )}
                      </BlockStack>
                    </Pressable>
                  ))}
                </BlockStack>
              </BlockStack>
            )}
            
            {userLocation && printShops.length === 0 && (
              <Banner status="info">
                <Text size="small">
                  No print shops found within 25 miles. Try expanding your search area or check back later as we add more partners.
                </Text>
              </Banner>
            )}
            
            <Divider />
            
            {/* Options */}
            <BlockStack spacing="tight">
              <Text emphasis="bold">🌱 Sustainability Options</Text>
              
              <Checkbox
                checked={useReusedApparel}
                onChange={setUseReusedApparel}
              >
                Request printing on reused/recycled apparel when available
              </Checkbox>
              
              <TextField
                label="Special Instructions (optional)"
                value={specialInstructions}
                onChange={setSpecialInstructions}
                placeholder="Any special requests for your local print shop..."
                multiline={3}
              />
            </BlockStack>
            
            {/* Products being printed locally */}
            <Divider />
            
            <BlockStack spacing="tight">
              <Text emphasis="bold">📦 Items for Local Printing</Text>
              <List>
                {diyProducts.filter(p => p.enabled).map((product) => (
                  <ListItem key={product.lineId}>
                    {product.title} (Qty: {product.quantity})
                  </ListItem>
                ))}
              </List>
            </BlockStack>
          </BlockStack>
        </Modal>
      )}
    </BlockStack>
  );
}