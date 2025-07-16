import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  Select,
  Button,
  useApi,
  useApplyAttributeChange,
  useInstructions,
  useTranslate,
  useCartLines,
  useAttributes,
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect, useMemo } from "react";

// 1. Choose an extension target
export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

// Define print shop data directly in the code
const PRINT_SHOPS_DATA = [
  {
    id: 1,
    name: "Toronto Print Hub",
    lat: 43.6532,
    lng: -79.3832,
    address: "123 Queen St W, Toronto, ON",
    specialty: "T-Shirts & Hoodies",
    rating: 4.8,
    active: true
  },
  {
    id: 2,
    name: "King Street Printing",
    lat: 43.6481,
    lng: -79.3773,
    address: "456 King St W, Toronto, ON",
    specialty: "Business Cards & Flyers",
    rating: 4.9,
    active: true
  },
  {
    id: 3,
    name: "Distillery Print Co.",
    lat: 43.6503,
    lng: -79.3591,
    address: "789 Front St E, Toronto, ON",
    specialty: "Custom Designs",
    rating: 4.7,
    active: true
  },
  {
    id: 4,
    name: "Impression Montréal",
    lat: 45.5017,
    lng: -73.5673,
    address: "321 Rue Saint-Denis, Montréal, QC",
    specialty: "Sustainable Materials",
    rating: 4.6,
    active: true
  },
  {
    id: 5,
    name: "Plateau Print Shop",
    lat: 45.52,
    lng: -73.58,
    address: "654 Avenue du Mont-Royal, Montréal, QC",
    specialty: "Large Format",
    rating: 4.8,
    active: true
  },
  {
    id: 6,
    name: "Old Port Printing",
    lat: 45.5088,
    lng: -73.554,
    address: "987 Rue Notre-Dame, Montréal, QC",
    specialty: "Premium Quality",
    rating: 4.9,
    active: true
  },
  {
    id: 7,
    name: "Stampede Print Co.",
    lat: 51.0447,
    lng: -114.0719,
    address: "123 17th Ave SW, Calgary, AB",
    specialty: "T-Shirts & Hoodies",
    rating: 4.7,
    active: true
  },
  {
    id: 8,
    name: "Bow River Printing",
    lat: 51.0486,
    lng: -114.0708,
    address: "456 8th Ave SW, Calgary, AB",
    specialty: "Business Cards & Flyers",
    rating: 4.8,
    active: true
  },
  {
    id: 9,
    name: "Kensington Print Studio",
    lat: 51.0515,
    lng: -114.0832,
    address: "789 Kensington Rd NW, Calgary, AB",
    specialty: "Artisan Crafts",
    rating: 4.6,
    active: true
  },
  {
    id: 10,
    name: "Capital Print Co.",
    lat: 45.4215,
    lng: -75.6972,
    address: "123 Bank St, Ottawa, ON",
    specialty: "Government Printing",
    rating: 4.8,
    active: true
  }
];

interface PrintShop {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  specialty: string;
  rating: number;
  phone?: string;
  email?: string;
  active?: boolean;
}

function Extension() {
  const translate = useTranslate();
  const { extension, query } = useApi();
  const instructions = useInstructions();
  const applyAttributeChange = useApplyAttributeChange();
  const cartLines = useCartLines();
  const attributes = useAttributes();

  // Use the hardcoded print shop data
  const parsedPrintShops = useMemo(() => {
    return PRINT_SHOPS_DATA
      .filter(shop => shop.active !== false)
      .map(shop => ({
        id: parseInt(shop.id),
        name: shop.name,
        address: shop.address,
        lat: parseFloat(shop.lat),
        lng: parseFloat(shop.lng),
        specialty: shop.specialty,
        rating: parseFloat(shop.rating),
        phone: shop.phone,
        email: shop.email,
        active: shop.active !== 'false'
      }));
  }, []);

  const [printShops, setPrintShops] = useState<PrintShop[]>([]);
  const [selectedPrintShop, setSelectedPrintShop] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Check if DIY Label is already enabled
  const diyLabelEnabled = attributes.find(attr => attr.key === 'diy_label_enabled')?.value === 'true';
  const existingPrintShop = attributes.find(attr => attr.key === 'diy_label_print_shop_name')?.value;

  // Check if cart has items (function only works with products in cart)
  const hasCartItems = cartLines.length > 0;

  // 2. Check instructions for feature availability
  if (!instructions.attributes.canUpdateAttributes) {
    return (
      <Banner title="DIY Label" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  // Don't show if no cart items
  if (!hasCartItems) {
    return null;
  }

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  // Get location from Shopify checkout data
  const getLocationFromCheckout = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Access checkout data through the query API
      const checkoutData = await query(`
        query {
          buyerIdentity {
            deliveryAddressPreferences {
              ... on MailingAddress {
                address1
                address2
                city
                provinceCode
                countryCode
                zip
              }
            }
          }
          deliveryGroups {
            deliveryAddress {
              address1
              address2
              city
              provinceCode
              countryCode
              zip
            }
          }
        }
      `);

      // Priority 1: Delivery address from deliveryGroups
      const deliveryAddress = checkoutData?.data?.deliveryGroups?.[0]?.deliveryAddress;
      if (deliveryAddress && deliveryAddress.city && deliveryAddress.provinceCode) {
        console.log('Using delivery address from deliveryGroups:', deliveryAddress);
        return await geocodeAddressLocally(deliveryAddress);
      }

      // Priority 2: Buyer identity delivery preferences
      const buyerAddress = checkoutData?.data?.buyerIdentity?.deliveryAddressPreferences?.[0];
      if (buyerAddress && buyerAddress.city && buyerAddress.provinceCode) {
        console.log('Using address from buyerIdentity:', buyerAddress);
        return await geocodeAddressLocally(buyerAddress);
      }

      console.log('No address found in checkout data');
      return null;
    } catch (error) {
      console.error('Error accessing checkout data:', error);
      return null;
    }
  };

  // Simple local geocoding for major cities (in production, you'd want a more comprehensive solution)
  const geocodeAddressLocally = async (address: any): Promise<{ lat: number; lng: number } | null> => {
    const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
      // California
      'san francisco,ca': { lat: 37.7749, lng: -122.4194 },
      'oakland,ca': { lat: 37.8044, lng: -122.2712 },
      'berkeley,ca': { lat: 37.8715, lng: -122.2730 },
      'san jose,ca': { lat: 37.3382, lng: -121.8863 },
      'sacramento,ca': { lat: 38.5816, lng: -121.4944 },
      
      // New York
      'new york,ny': { lat: 40.7128, lng: -74.0060 },
      'brooklyn,ny': { lat: 40.6782, lng: -73.9442 },
      'queens,ny': { lat: 40.7282, lng: -73.7949 },
      
      // Other major cities
      'chicago,il': { lat: 41.8781, lng: -87.6298 },
      'houston,tx': { lat: 29.7604, lng: -95.3698 },
      'phoenix,az': { lat: 33.4484, lng: -112.0740 },
      'philadelphia,pa': { lat: 39.9526, lng: -75.1652 },
      'san antonio,tx': { lat: 29.4241, lng: -98.4936 },
      'san diego,ca': { lat: 32.7157, lng: -117.1611 },
      'dallas,tx': { lat: 32.7767, lng: -96.7970 },
      'austin,tx': { lat: 30.2672, lng: -97.7431 },
      
      // Canada
      'toronto,on': { lat: 43.6532, lng: -79.3832 },
      'vancouver,bc': { lat: 49.2827, lng: -123.1207 },
      'montreal,qc': { lat: 45.5017, lng: -73.5673 },
      'calgary,ab': { lat: 51.0447, lng: -114.0719 },
      'ottawa,on': { lat: 45.4215, lng: -75.6972 },
    };

    const cityKey = `${address.city?.toLowerCase()},${address.provinceCode?.toLowerCase()}`;
    return cityCoordinates[cityKey] || null;
  };

  // Get user location via browser geolocation (fallback)
  const getUserLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          let errorMessage = 'Location access failed';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  };

  // Filter and sort print shops by distance
  const filterPrintShopsByLocation = (location: { lat: number; lng: number }, maxDistance: number = 50): PrintShop[] => {
    return parsedPrintShops
      .map(shop => ({
        ...shop,
        distance: calculateDistance(location.lat, location.lng, shop.lat, shop.lng)
      }))
      .filter(shop => shop.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
  };

  // Load print shops with improved location detection
  useEffect(() => {
    const loadPrintShops = async () => {
      if (diyLabelEnabled || !hasCartItems) return;

      try {
        setLoading(true);
        setError("");
        
        console.log('Starting location detection...');
        
        // Try to get location from Shopify checkout data first
        let location = await getLocationFromCheckout();
        
        // Fallback to browser geolocation if no checkout address available
        if (!location) {
          console.log('No checkout address found, falling back to browser geolocation');
          try {
            location = await getUserLocation();
            console.log('Got browser location:', location);
          } catch (geoError: any) {
            console.error('Browser geolocation failed:', geoError);
            // If all location methods fail, show all print shops
            console.log('Using all print shops as fallback');
            setPrintShops(parsedPrintShops);
            setLoading(false);
            return;
          }
        }
        
        if (location) {
          setUserLocation(location);
          const nearbyShops = filterPrintShopsByLocation(location);
          setPrintShops(nearbyShops);
          
          if (nearbyShops.length === 0) {
            setError('No print shops found within 50km of your location');
          }
        } else {
          // If no location is available, show all print shops
          setPrintShops(parsedPrintShops);
        }
        
      } catch (error) {
        console.error('Error loading print shops:', error instanceof Error ? error.message : error);
        setError('Failed to load print shops');
        // Fallback to showing all shops
        setPrintShops(parsedPrintShops);
      } finally {
        setLoading(false);
      }
    };

    loadPrintShops();
  }, [diyLabelEnabled, hasCartItems]);

  // Handle print shop selection
  const handlePrintShopChange = async (value: string) => {
    setSelectedPrintShop(value);
    
    if (!value) return;

    const shop = printShops.find(s => s.id.toString() === value);
    if (!shop) return;

    try {
      // Update cart attributes with selected print shop
      await applyAttributeChange({
        key: "diy_label_enabled",
        type: "updateAttribute",
        value: "true",
      });

      await applyAttributeChange({
        key: "diy_label_print_shop_id",
        type: "updateAttribute",
        value: shop.id.toString(),
      });

      await applyAttributeChange({
        key: "diy_label_print_shop_name",
        type: "updateAttribute",
        value: shop.name,
      });

      await applyAttributeChange({
        key: "diy_label_print_shop_address",
        type: "updateAttribute",
        value: shop.address,
      });

      if (userLocation) {
        await applyAttributeChange({
          key: "diy_label_customer_location",
          type: "updateAttribute",
          value: JSON.stringify(userLocation),
        });
      }

      // Set the fulfillment type to trigger the pickup function
      await applyAttributeChange({
        key: "requestedFulfillmentType",
        type: "updateAttribute",
        value: "pickup",
      });

    } catch (error) {
      setError('Failed to select print shop. Please try again.');
    }
  };

  // Handle removal of DIY Label
  const handleRemoveDIYLabel = async () => {
    try {
      await applyAttributeChange({
        key: "diy_label_enabled",
        type: "updateAttribute",
        value: "false",
      });

      await applyAttributeChange({
        key: "requestedFulfillmentType",
        type: "updateAttribute",
        value: "",
      });

      setSelectedPrintShop("");
    } catch (error) {
      setError('Failed to remove local printing option');
    }
  };

  // Prepare select options
  const selectOptions = [
    { value: "", label: translate("choosePrintShop") },
    ...printShops.map(shop => ({
      value: shop.id.toString(),
      label: `${shop.name} ${userLocation ? `(${calculateDistance(userLocation.lat, userLocation.lng, shop.lat, shop.lng).toFixed(1)}km)` : ''}`
    }))
  ];

  // If already enabled, show current selection
  if (diyLabelEnabled && existingPrintShop) {
    return (
      <BlockStack spacing="base">
        <Banner status="success">
          <BlockStack spacing="tight">
            <Text emphasis="bold">🌱 {translate("localPrintingSelected")}</Text>
            <Text>
              {translate("orderWillBePrinted", { printShop: existingPrintShop })}
            </Text>
          </BlockStack>
        </Banner>
        
        <Button
          kind="secondary"
          onPress={handleRemoveDIYLabel}
        >
          {translate("removeLocalPrinting")}
        </Button>
      </BlockStack>
    );
  }

  // 3. Render the UI
  return (
    <BlockStack spacing="base">
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">🌱 {translate("localPrintingAvailable")}</Text>
          <Text>
            {translate("supportLocalCommunity")}
          </Text>
        </BlockStack>
      </Banner>

      {error && (
        <Banner status="critical">
          <Text>{error}</Text>
        </Banner>
      )}

      {loading && (
        <Text>{translate("loadingPrintShops")}</Text>
      )}

      {!loading && !error && printShops.length > 0 && (
        <BlockStack spacing="base">
          <Text emphasis="bold">{translate("selectPrintShop")}</Text>
          
          <Select
            label="Print Shop"
            value={selectedPrintShop}
            onChange={handlePrintShopChange}
            options={selectOptions}
          />

          {selectedPrintShop && (
            <BlockStack spacing="tight">
              {(() => {
                const shop = printShops.find(s => s.id.toString() === selectedPrintShop);
                if (!shop) return null;
                
                const distance = userLocation ? 
                  calculateDistance(userLocation.lat, userLocation.lng, shop.lat, shop.lng) : 
                  null;
                
                return (
                  <>
                    <Text emphasis="bold">{shop.name} ⭐ {shop.rating}/5</Text>
                    <Text>{shop.address}</Text>
                    <Text>{shop.specialty}</Text>
                    {distance && (
                      <Text>Distance: {distance.toFixed(1)} km</Text>
                    )}
                    {shop.phone && (
                      <Text>Phone: {shop.phone}</Text>
                    )}
                    {shop.email && (
                      <Text>Email: {shop.email}</Text>
                    )}
                  </>
                );
              })()}
            </BlockStack>
          )}
        </BlockStack>
      )}

      {!loading && printShops.length === 0 && (
        <Banner status="warning">
          <Text>{translate("noPrintShopsFound")}</Text>
        </Banner>
      )}
    </BlockStack>
  );
}