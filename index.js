const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const cartToggle = document.querySelector(".cart-toggle");
const cartClose = document.querySelector(".cart-close");
const cartDrawer = document.querySelector(".cart-drawer");
const cartBackdrop = document.querySelector(".cart-backdrop");
const cartToast = document.querySelector(".cart-toast");
const cartItems = document.querySelector(".cart-items");
const cartCount = document.querySelector(".cart-count");
const cartTotal = document.querySelector(".cart-total");
const deliveryPendingBadge = document.querySelector(".delivery-pending-badge");
const checkoutButton = document.querySelector(".checkout-button");
const checkoutName = document.querySelector(".checkout-name");
const checkoutPhone = document.querySelector(".checkout-phone");
const deliveryAddress = document.querySelector(".delivery-address");
const deliveryNote = document.querySelector(".delivery-note");
const checkoutNotes = document.querySelector(".checkout-notes");
const orderModeInputs = document.querySelectorAll('input[name="order-mode"]');
const paymentMethodInputs = document.querySelectorAll('input[name="payment-method"]');
const viewFullMenuButton = document.querySelector(".view-full-menu-btn");
const fullMenuPanel = document.querySelector(".full-menu-panel");
const expandedMenuGrid = document.querySelector(".expanded-menu-grid");
const featuredMenuGrid = document.querySelector(".featured-menu-grid");
const menuFilterBar = document.querySelector(".menu-filter-bar");
const fullMenuTitle = document.querySelector(".full-menu-title");
const fullMenuNote = document.querySelector(".full-menu-note");
const showLessMenuButton = document.querySelector(".show-less-menu-btn");
const spacePhotos = document.querySelectorAll(".space-photo");

const siteConfig = window.CAFE_CONFIG || {};
const businessConfig = siteConfig.business || {};
const deliveryConfig = siteConfig.delivery || {};
const storageConfig = siteConfig.storage || {};
const supabaseConfig = siteConfig.supabase || {};

const SUPABASE_URL = supabaseConfig.url || "";
const SUPABASE_ANON_KEY = supabaseConfig.anonKey || "";
const cartStorageKey = storageConfig.cartKey || "cafe-cart";
const siteSettingsCacheKey = storageConfig.siteSettingsCacheKey || "cafe-site-settings";
const menuCacheKey = storageConfig.menuCacheKey || "cafe-menu-items";

const parseSupabaseError = async (response, fallbackMessage) => {
  const rawText = await response.text();

  try {
    const payload = JSON.parse(rawText);
    const apiMessage = String(payload?.message || "").trim();
    const missingMenuTable =
      payload?.code === "PGRST205" && apiMessage.includes("public.menu_items");

    if (missingMenuTable) {
      return "Menu is not available yet because Supabase menu storage has not been set up.";
    }

    return apiMessage || fallbackMessage;
  } catch {
    return rawText || fallbackMessage;
  }
};
const DEFAULT_MENU_SECTION_ORDER = [
  "showcase",
  "drinks",
  "burgers",
  "pizza",
  "pasta",
  "continental",
  "desserts",
];

const formatMenuSectionLabel = (value = "") =>
  String(value)
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getMenuSectionTitle = (key) => `${formatMenuSectionLabel(key)} Highlights`;
const getMenuSectionNote = (key) => `Explore the latest picks from our ${formatMenuSectionLabel(key)} section.`;
const cart = [];
let toastTimer;

let deliveryState = {
  fee: 0,
  distanceKm: null,
  isPending: false,
};

let activeMenuCategory = "showcase";
let currentBusinessConfig = {
  name: businessConfig.name || "Cafe",
  shortName: businessConfig.shortName || (businessConfig.name || "Cafe").slice(0, 2).toUpperCase(),
  email: businessConfig.email || "",
  phoneDisplay: businessConfig.phoneDisplay || "",
  phoneHref: businessConfig.phoneHref || "",
  whatsappNumber: businessConfig.whatsappNumber || "",
  addressLines: Array.isArray(businessConfig.addressLines) ? businessConfig.addressLines : ["", ""],
  coordinates: businessConfig.coordinates || { lat: 0, lng: 0 },
  mapQuery: businessConfig.mapQuery || "",
  mapEmbedUrl: businessConfig.mapEmbedUrl || "",
  footerTagline: businessConfig.footerTagline || "",
  instagramUrl: businessConfig.instagramUrl || "",
  facebookUrl: businessConfig.facebookUrl || "",
  xUrl: businessConfig.xUrl || "",
};
let currentDeliveryConfig = {
  thresholdKm: deliveryConfig.thresholdKm ?? 15,
  longDistanceFee: deliveryConfig.longDistanceFee ?? 150,
};
let currentMenuGroups = {};

const persistSiteSettingsCache = (settings) => {
  try {
    sessionStorage.setItem(siteSettingsCacheKey, JSON.stringify(settings));
  } catch {}
};

const loadCachedSiteSettings = () => {
  try {
    const raw = sessionStorage.getItem(siteSettingsCacheKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    sessionStorage.removeItem(siteSettingsCacheKey);
    return null;
  }
};

const persistMenuCache = (records) => {
  try {
    sessionStorage.setItem(menuCacheKey, JSON.stringify(records));
  } catch {}
};

const loadCachedMenu = () => {
  try {
    const raw = sessionStorage.getItem(menuCacheKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    sessionStorage.removeItem(menuCacheKey);
    return null;
  }
};

const normalizeSiteSettings = (record) => ({
  business: {
    name: record.business_name || currentBusinessConfig.name,
    shortName: record.short_name || currentBusinessConfig.shortName,
    email: record.email || currentBusinessConfig.email,
    phoneDisplay: record.phone_display || currentBusinessConfig.phoneDisplay,
    phoneHref: record.phone_href || currentBusinessConfig.phoneHref,
    whatsappNumber: record.whatsapp_number || currentBusinessConfig.whatsappNumber,
    addressLines: [record.address_line_1 || "", record.address_line_2 || ""],
    coordinates: {
      lat: Number(record.latitude ?? currentBusinessConfig.coordinates.lat ?? 0),
      lng: Number(record.longitude ?? currentBusinessConfig.coordinates.lng ?? 0),
    },
    mapQuery: record.map_query || currentBusinessConfig.mapQuery,
    mapEmbedUrl: record.map_embed_url || currentBusinessConfig.mapEmbedUrl,
    footerTagline: record.footer_tagline || currentBusinessConfig.footerTagline,
    instagramUrl: record.instagram_url || currentBusinessConfig.instagramUrl,
    facebookUrl: record.facebook_url || currentBusinessConfig.facebookUrl,
    xUrl: record.x_url || currentBusinessConfig.xUrl,
  },
  delivery: {
    thresholdKm: Number(record.delivery_threshold_km ?? currentDeliveryConfig.thresholdKm),
    longDistanceFee: Number(record.long_distance_fee ?? currentDeliveryConfig.longDistanceFee),
  },
});

const updateActiveSiteSettings = (settings) => {
  if (!settings) return;
  currentBusinessConfig = settings.business;
  currentDeliveryConfig = settings.delivery;
};

const applySiteConfig = () => {
  const businessName = currentBusinessConfig.name || "Cafe";
  document.title = businessName;

  document.querySelectorAll("[data-site-field='business-name']").forEach((element) => {
    element.textContent = businessName;
  });

  document.querySelectorAll("[data-site-field='short-name']").forEach((element) => {
    element.textContent = currentBusinessConfig.shortName || businessName.slice(0, 2).toUpperCase();
  });

  document.querySelectorAll("[data-site-field='address-line-1']").forEach((element) => {
    element.textContent = currentBusinessConfig.addressLines?.[0] || "";
  });

  document.querySelectorAll("[data-site-field='address-line-2']").forEach((element) => {
    element.textContent = currentBusinessConfig.addressLines?.[1] || "";
  });

  document.querySelectorAll("[data-site-field='phone-link']").forEach((element) => {
    element.textContent = currentBusinessConfig.phoneDisplay || "";
    element.setAttribute("href", `tel:${currentBusinessConfig.phoneHref || ""}`);
  });

  document.querySelectorAll("[data-site-field='email-link']").forEach((element) => {
    element.textContent = currentBusinessConfig.email || "";
    element.setAttribute("href", `mailto:${currentBusinessConfig.email || ""}`);
  });

  document.querySelectorAll("[data-site-field='footer-tagline']").forEach((element) => {
    element.textContent = currentBusinessConfig.footerTagline || "";
  });

  document.querySelectorAll("[data-site-field='map-embed']").forEach((element) => {
    element.setAttribute("src", currentBusinessConfig.mapEmbedUrl || "");
  });

  document.querySelectorAll("[data-site-field='instagram-link']").forEach((element) => {
    element.setAttribute("href", currentBusinessConfig.instagramUrl || "#visit");
  });

  document.querySelectorAll("[data-site-field='facebook-link']").forEach((element) => {
    element.setAttribute("href", currentBusinessConfig.facebookUrl || "#visit");
  });

  document.querySelectorAll("[data-site-field='x-link']").forEach((element) => {
    element.setAttribute("href", currentBusinessConfig.xUrl || "#visit");
  });

  document.querySelectorAll(".trust-whatsapp-link").forEach((element) => {
    element.setAttribute(
      "href",
      currentBusinessConfig.whatsappNumber
        ? `https://wa.me/${currentBusinessConfig.whatsappNumber}`
        : "#visit",
    );
  });

  document.querySelectorAll("[data-site-field='copyright']").forEach((element) => {
    element.innerHTML = `&copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.`;
  });
};

applySiteConfig();

const fetchLiveSiteSettings = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?id=eq.1&select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Could not load site settings.");
  }

  const data = await response.json();
  return data[0] || null;
};

const fetchLiveMenuItems = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/menu_items?select=*&order=section_key.asc,display_order.asc,id.asc`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response, "Could not load menu items."));
  }

  return response.json();
};

const initializeSiteSettings = async () => {
  const cachedSettings = loadCachedSiteSettings();
  if (cachedSettings) {
    updateActiveSiteSettings(cachedSettings);
    applySiteConfig();
  }

  try {
    const liveRecord = await fetchLiveSiteSettings();
    if (!liveRecord) return;

    const normalizedSettings = normalizeSiteSettings(liveRecord);
    updateActiveSiteSettings(normalizedSettings);
    persistSiteSettingsCache(normalizedSettings);
    applySiteConfig();
  } catch {}
};

const initializeMenuItems = async () => {
  const cachedMenu = loadCachedMenu();
  if (Array.isArray(cachedMenu) && cachedMenu.length) {
    currentMenuGroups = buildMenuGroupsFromRecords(cachedMenu);
    if (!currentMenuGroups[activeMenuCategory]) {
      activeMenuCategory = getPrimaryMenuSection();
    }
    renderMenuFilters();
    renderFeaturedMenu();
    renderExpandedMenu(activeMenuCategory);
  }

  try {
    const liveMenu = await fetchLiveMenuItems();
    if (!Array.isArray(liveMenu) || !liveMenu.length) return;

    currentMenuGroups = buildMenuGroupsFromRecords(liveMenu);
    persistMenuCache(liveMenu);
    if (!currentMenuGroups[activeMenuCategory]) {
      activeMenuCategory = getPrimaryMenuSection();
    }
    renderMenuFilters();
    renderFeaturedMenu();
    renderExpandedMenu(activeMenuCategory);
  } catch {}
};

const enableSpaceImageFallback = (image) => {
  const frame = image.closest(".space-image");
  if (!frame) return;

  frame.classList.add("is-fallback");
};

spacePhotos.forEach((image) => {
  const markLoadedState = () => {
    if (image.naturalWidth > 0) {
      image.closest(".space-image")?.classList.remove("is-fallback");
      return;
    }

    enableSpaceImageFallback(image);
  };

  if (image.complete) {
    markLoadedState();
  } else {
    image.addEventListener("load", markLoadedState, { once: true });
    image.addEventListener("error", () => enableSpaceImageFallback(image), { once: true });
  }
});

const fullMenuItems = {
  showcase: {
    title: "Cafe favorites for every kind of craving.",
    note: "A curated spread of our most-loved drinks, plates, and desserts.",
    items: [
      {
        category: "Coffee",
        name: "Forest Velvet Latte",
        description: "Espresso, velvet milk foam, brown sugar, and a hint of rosemary.",
        price: 280,
        image:
          "https://images.unsplash.com/photo-1593443320739-77f74939d0da?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        category: "Bakery",
        name: "Maple Almond Croissant",
        description: "Flaky layers finished with toasted almond cream and maple glaze.",
        price: 240,
        image:
          "https://images.unsplash.com/photo-1586657263857-346c4b712ff5?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        category: "Brunch",
        name: "Garden Toast Plate",
        description: "Sourdough, whipped ricotta, roasted tomatoes, herbs, and olive oil.",
        price: 440,
        image:
          "https://images.unsplash.com/photo-1515942400420-2b98fed1f515?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        category: "Dessert",
        name: "Golden Pistachio Cake",
        description: "Soft sponge with pistachio cream and a warm honey crumb finish.",
        price: 320,
        image:
          "https://images.unsplash.com/photo-1716579870046-878e4d3f7c28?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        category: "Cold Brew",
        name: "Hazelnut Cloud Brew",
        description: "Slow-steeped coffee, hazelnut cream, and a chilled velvet finish.",
        price: 260,
        image:
          "https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aWNlZCUyMGNvZmZlZXxlbnwwfHwwfHx8MA%3D%3D",
      },
      {
        category: "Bakery",
        name: "Brown Butter Kouign Amann",
        description: "Crisp caramelized layers with buttery centers and a delicate sea salt touch.",
        price: 290,
        image:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cGFzdHJ5fGVufDB8fDB8fHww",
      },
      {
        category: "Pasta",
        name: "Rosemary Cream Pasta",
        description: "Silky herb cream sauce, garlic mushrooms, and parmesan folded into warm pasta.",
        price: 480,
        image:
          "https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGFzdGF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Dessert",
        name: "Vanilla Bloom Cheesecake",
        description: "Baked vanilla cheesecake with berry glaze and a soft biscuit crumb base.",
        price: 340,
        image:
          "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2hlZXNlY2FrZXxlbnwwfHwwfHx8MA%3D%3D",
      },
      {
        category: "Burger",
        name: "Truffle Melt Burger",
        description: "Juicy veg patty, caramelized onions, truffle mayo, and cheddar in a brioche bun.",
        price: 390,
        image:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YnVyZ2VyfGVufDB8fDB8fHww",
      },
      {
        category: "Pizza",
        name: "Garden Fire Pizza",
        description: "Roasted peppers, olives, basil, mozzarella, and smoked tomato sauce.",
        price: 520,
        image:
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGl6emF8ZW58MHx8MHx8fDA%3D",
      },
    ],
  },
  drinks: {
    title: "Drinks that feel soft, bright, and slow-made.",
    note: "From warm espresso comforts to cool signature pours.",
    items: [
      {
        category: "Coffee",
        name: "Forest Velvet Latte",
        description: "Espresso, velvet milk foam, brown sugar, and a hint of rosemary.",
        price: 280,
        image:
          "https://images.unsplash.com/photo-1593443320739-77f74939d0da?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        category: "Cold Brew",
        name: "Hazelnut Cloud Brew",
        description: "Slow-steeped coffee, hazelnut cream, and a chilled velvet finish.",
        price: 260,
        image:
          "https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aWNlZCUyMGNvZmZlZXxlbnwwfHwwfHx8MA%3D%3D",
      },
      {
        category: "Coffee",
        name: "Honey Cinnamon Flat White",
        description: "Double espresso swirled with cinnamon honey and silky microfoam.",
        price: 300,
        image:
          "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29mZmVlfGVufDB8fDB8fHww",
      },
      {
        category: "Matcha",
        name: "Velvet Matcha Bloom",
        description: "Ceremonial matcha with vanilla cream and a floral finish.",
        price: 320,
        image:
          "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bWF0Y2hhfGVufDB8fDB8fHww",
      },
      {
        category: "Cooler",
        name: "Citrus Mint Sparkler",
        description: "Fresh lime, mint, and sparkling tonic over crystal ice.",
        price: 210,
        image:
          "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGVtb24lMjBkcmlua3xlbnwwfHwwfHx8MA%3D%3D",
      },
      {
        category: "Coffee",
        name: "Mocha Terrace",
        description: "Dark cocoa espresso topped with chilled whipped cream.",
        price: 310,
        image:
          "https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bW9jaGF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Tea",
        name: "Saffron Kashmiri Chai",
        description: "Creamy noon chai touched with saffron and crushed pistachio.",
        price: 240,
        image:
          "https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2hhaXxlbnwwfHwwfHx8MA%3D%3D",
      },
      {
        category: "Cooler",
        name: "Berry Rose Fizz",
        description: "House berry syrup, rose water, lemon, and soda.",
        price: 230,
        image:
          "https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmVycnklMjBkcmlua3xlbnwwfHwwfHx8MA%3D%3D",
      },
    ],
  },
  burgers: {
    title: "Comfort burgers with cafe-style layers and bold fillings.",
    note: "Soft buns, generous sauces, and plates built for hungry afternoons.",
    items: [
      {
        category: "Burger",
        name: "Truffle Melt Burger",
        description: "Juicy veg patty, caramelized onions, truffle mayo, and cheddar in a brioche bun.",
        price: 390,
        image:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YnVyZ2VyfGVufDB8fDB8fHww",
      },
      {
        category: "Burger",
        name: "Smoky Paneer Stack",
        description: "Grilled paneer, smoky tomato relish, lettuce, and garlic aioli.",
        price: 360,
        image:
          "https://images.unsplash.com/photo-1550317138-10000687a72b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnVyZ2VyfGVufDB8fDB8fHww",
      },
      {
        category: "Burger",
        name: "Crispy Herb Burger",
        description: "Crisp fried patty with slaw, herb mayo, and pickled cucumber.",
        price: 340,
        image:
          "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YnVyZ2VyfGVufDB8fDB8fHww",
      },
      {
        category: "Burger",
        name: "Peri Peri Crunch Burger",
        description: "Spiced crunchy patty with peri mayo and onion rings.",
        price: 350,
        image:
          "https://images.unsplash.com/photo-1688246780164-00c01647e78c?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        category: "Burger",
        name: "Mushroom Swiss Burger",
        description: "Sauteed mushrooms, swiss cheese, and pepper cream on a toasted bun.",
        price: 410,
        image:
          "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8YnVyZ2VyfGVufDB8fDB8fHww",
      },
      {
        category: "Burger",
        name: "Avocado Garden Burger",
        description: "Veg patty, smashed avocado, baby greens, and lemon herb dressing.",
        price: 380,
        image:
          "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8YnVyZ2VyfGVufDB8fDB8fHww",
      },
    ],
  },
  pizza: {
    title: "Wood-fired style pizzas with cozy cafe energy.",
    note: "Balanced toppings, melty cheese, and crisp edges worth sharing.",
    items: [
      {
        category: "Pizza",
        name: "Garden Fire Pizza",
        description: "Roasted peppers, olives, basil, mozzarella, and smoked tomato sauce.",
        price: 520,
        image:
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGl6emF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Pizza",
        name: "Margherita Bianca",
        description: "Mozzarella, burrata finish, basil oil, and blistered crust.",
        price: 460,
        image:
          "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cGl6emF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Pizza",
        name: "Pesto Corn Pizza",
        description: "Sweet corn, basil pesto, jalapenos, and mozzarella.",
        price: 490,
        image:
          "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8cGl6emF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Pizza",
        name: "Smoked Paneer Pizza",
        description: "Tandoori paneer, onion petals, peppers, and creamy tomato base.",
        price: 540,
        image:
          "https://images.unsplash.com/photo-1511689660979-10d2b1aada49?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8cGl6emF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Pizza",
        name: "Truffle Mushroom Pizza",
        description: "Mixed mushrooms, truffle cream, mozzarella, and thyme.",
        price: 560,
        image:
          "https://images.unsplash.com/photo-1654722906292-1f712f25a799?q=80&w=795&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        category: "Pizza",
        name: "Roasted Garlic Pizza",
        description: "Roasted garlic puree, caramelized onions, spinach, and cheese blend.",
        price: 500,
        image:
          "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHBpenphfGVufDB8fDB8fHww",
      },
    ],
  },
  pasta: {
    title: "Pasta bowls layered with comfort and cafe finesse.",
    note: "Creamy, herby, and slow-made plates for long table conversations.",
    items: [
      {
        category: "Pasta",
        name: "Rosemary Cream Pasta",
        description: "Silky herb cream sauce, garlic mushrooms, and parmesan folded into warm pasta.",
        price: 480,
        image:
          "https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGFzdGF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Pasta",
        name: "Roasted Tomato Penne",
        description: "Slow-roasted tomatoes, basil, olive oil, and parmesan shards.",
        price: 420,
        image:
          "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cGFzdGF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Pasta",
        name: "Basil Pesto Linguine",
        description: "Fresh basil pesto with cherry tomatoes and toasted pine nuts.",
        price: 450,
        image:
          "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8cGFzdGF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Pasta",
        name: "Pink Sauce Fusilli",
        description: "Creamy tomato sauce, garlic confit, and parmesan finish.",
        price: 440,
        image:
          "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8cGFzdGF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Pasta",
        name: "Wild Mushroom Alfredo",
        description: "Velvety alfredo with sauteed mushrooms and cracked black pepper.",
        price: 490,
        image:
          "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8cGFzdGF8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Pasta",
        name: "Spiced Arrabbiata Rigatoni",
        description: "Bold tomato chili sauce with basil and roasted garlic crumbs.",
        price: 430,
        image:
          "https://images.unsplash.com/photo-1622973536968-3ead9e780960?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8cmlnYXRvbml8ZW58MHx8MHx8fDA%3D",
      },
    ],
  },
  continental: {
    title: "Continental plates for elegant brunches and easy dinners.",
    note: "Cafe classics with light sauces, herbs, and comforting sides.",
    items: [
      {
        category: "Continental",
        name: "Garden Toast Plate",
        description: "Sourdough, whipped ricotta, roasted tomatoes, herbs, and olive oil.",
        price: 440,
        image:
          "https://images.unsplash.com/photo-1515942400420-2b98fed1f515?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        category: "Continental",
        name: "Herb Grilled Cottage Steak",
        description: "Paneer steak, buttered vegetables, mashed potatoes, and herb jus.",
        price: 560,
        image:
          "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3RlYWslMjBwbGF0ZXxlbnwwfHwwfHx8MA%3D%3D",
      },
      {
        category: "Continental",
        name: "Creamy Herb Schnitzel",
        description: "Crumb-coated cutlet with pepper sauce and roasted potatoes.",
        price: 520,
        image:
          "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y29udGluZW50YWwlMjBmb29kfGVufDB8fDB8fHww",
      },
      {
        category: "Continental",
        name: "Mediterranean Herb Rice",
        description: "Lemon herb rice with grilled vegetables, feta, and olives.",
        price: 410,
        image:
          "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cmljZSUyMGJvd2x8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Continental",
        name: "Garlic Butter Roast Veg Bowl",
        description: "Roasted seasonal vegetables, barley, garlic butter, and parmesan crisp.",
        price: 390,
        image:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dmVnZXRhYmxlJTIwYm93bHxlbnwwfHwwfHx8MA%3D%3D",
      },
      {
        category: "Continental",
        name: "Sunset Grilled Sandwich",
        description: "Three-cheese grilled sandwich with tomato confit and herb fries.",
        price: 340,
        image:
          "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z3JpbGxlZCUyMHNhbmR3aWNofGVufDB8fDB8fHww",
      },
    ],
  },
  desserts: {
    title: "Desserts worth slowing down for.",
    note: "Soft textures, warm notes, and elegant cafe finishes.",
    items: [
      {
        category: "Dessert",
        name: "Golden Pistachio Cake",
        description: "Soft sponge with pistachio cream and a warm honey crumb finish.",
        price: 320,
        image:
          "https://images.unsplash.com/photo-1716579870046-878e4d3f7c28?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        category: "Dessert",
        name: "Vanilla Bloom Cheesecake",
        description: "Baked vanilla cheesecake with berry glaze and a soft biscuit crumb base.",
        price: 340,
        image:
          "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2hlZXNlY2FrZXxlbnwwfHwwfHx8MA%3D%3D",
      },
      {
        category: "Dessert",
        name: "Dark Cocoa Torte",
        description: "Dense chocolate torte with ganache gloss and sea salt flakes.",
        price: 360,
        image:
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2hvY29sYXRlJTIwY2FrZXxlbnwwfHwwfHx8MA%3D%3D",
      },
      {
        category: "Dessert",
        name: "Lotus Milk Cake",
        description: "Soft tres leches-style cake with lotus cream and biscuit dust.",
        price: 330,
        image:
          "https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWlsayUyMGNha2V8ZW58MHx8MHx8fDA%3D",
      },
      {
        category: "Dessert",
        name: "Berry Pavlova Cup",
        description: "Crisp meringue, vanilla cream, berries, and rose syrup.",
        price: 310,
        image:
          "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGF2bG92YXxlbnwwfHwwfHx8MA%3D%3D",
      },
      {
        category: "Dessert",
        name: "Tiramisu Cloud Jar",
        description: "Mascarpone cream, coffee-soaked sponge, and cocoa finish.",
        price: 350,
        image:
          "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dGlyYW1pc3V8ZW58MHx8MHx8fDA%3D",
      },
    ],
  },
};

const MENU_SECTION_META = {
  showcase: {
    title: "Cafe favorites for every kind of craving.",
    note: "A curated spread of our most-loved drinks, plates, and desserts.",
  },
  drinks: {
    title: "Drinks that feel soft, bright, and slow-made.",
    note: "From warm espresso comforts to cool signature pours.",
  },
  burgers: {
    title: "Comfort burgers with cafe-style layers and bold fillings.",
    note: "Soft buns, generous sauces, and plates built for hungry afternoons.",
  },
  pizza: {
    title: "Wood-fired style pizzas with cozy cafe energy.",
    note: "Balanced toppings, melty cheese, and crisp edges worth sharing.",
  },
  pasta: {
    title: "Pasta bowls layered with comfort and cafe finesse.",
    note: "Creamy, herby, and slow-made plates for long table conversations.",
  },
  continental: {
    title: "Continental plates for elegant brunches and easy dinners.",
    note: "Cafe classics with light sauces, herbs, and comforting sides.",
  },
  desserts: {
    title: "Desserts worth slowing down for.",
    note: "Soft textures, warm notes, and elegant cafe finishes.",
  },
};

const cloneMenuGroups = () => JSON.parse(JSON.stringify(fullMenuItems));

const getOrderedSectionKeys = (groups = currentMenuGroups) => {
  const allKeys = Object.keys(groups || {});
  const known = DEFAULT_MENU_SECTION_ORDER.filter((key) => allKeys.includes(key));
  const custom = allKeys
    .filter((key) => !DEFAULT_MENU_SECTION_ORDER.includes(key))
    .sort((a, b) => formatMenuSectionLabel(a).localeCompare(formatMenuSectionLabel(b)));

  return [...known, ...custom];
};

const buildMenuGroupsFromRecords = (records = []) => {
  const groups = cloneMenuGroups();
  const seenSections = new Set();

  records
    .filter((item) => item && item.is_active !== false && item.section_key)
    .sort((a, b) => {
      const orderDiff = Number(a.display_order || 0) - Number(b.display_order || 0);
      if (orderDiff !== 0) return orderDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    })
    .forEach((item) => {
      if (!groups[item.section_key]) {
        groups[item.section_key] = {
          title: getMenuSectionTitle(item.section_key),
          note: getMenuSectionNote(item.section_key),
          items: [],
        };
      }

      if (!seenSections.has(item.section_key)) {
        groups[item.section_key] = {
          ...(MENU_SECTION_META[item.section_key] || {
            title: getMenuSectionTitle(item.section_key),
            note: getMenuSectionNote(item.section_key),
          }),
          items: [],
        };
        seenSections.add(item.section_key);
      }

      groups[item.section_key].items.push({
        id: item.id,
        category: item.category,
        name: item.name,
        description: item.description,
        price: Number(item.price || 0),
        image: item.image_url,
      });
    });

  return groups;
};

currentMenuGroups = cloneMenuGroups();

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const formatPrice = (value) => `INR ${value}`;

const createMenuCard = (item) => `
  <article class="menu-card">
    <div
      class="menu-image"
      style="
        background-image:
          linear-gradient(rgba(47, 55, 39, 0.08), rgba(47, 55, 39, 0.08)),
          url('${item.image}');
      "
    ></div>
    <div class="menu-content">
      <span class="menu-tag">${item.category}</span>
      <h3>${item.name}</h3>
      <p>${item.description}</p>
      <div class="menu-meta">
        <strong>${formatPrice(item.price)}</strong>
        <button
          class="order-button"
          type="button"
          data-name="${item.name}"
          data-price="${item.price}"
        >
          Add to Cart
        </button>
      </div>
    </div>
  </article>
`;

const getPrimaryMenuSection = () => {
  const orderedKeys = getOrderedSectionKeys(currentMenuGroups);
  if (orderedKeys.includes("showcase")) return "showcase";
  return orderedKeys[0] || "showcase";
};

const renderMenuFilters = () => {
  if (!menuFilterBar) return;

  const orderedKeys = getOrderedSectionKeys(currentMenuGroups).filter(
    (key) => (currentMenuGroups[key]?.items || []).length > 0,
  );

  menuFilterBar.innerHTML = orderedKeys
    .map(
      (key) => `
        <button class="menu-filter ${key === activeMenuCategory ? "is-active" : ""}" type="button" data-category="${key}">
          ${formatMenuSectionLabel(key)}
        </button>
      `,
    )
    .join("");
};

const renderFeaturedMenu = () => {
  if (!featuredMenuGrid) return;

  const primarySection = getPrimaryMenuSection();
  const featuredItems = (currentMenuGroups[primarySection]?.items || []).slice(0, 4);
  featuredMenuGrid.innerHTML = featuredItems.length
    ? featuredItems.map(createMenuCard).join("")
    : '<article class="menu-card"><div class="menu-content"><span class="menu-tag">Menu</span><h3>Menu updates coming soon</h3><p>Admin can add featured items from the dashboard.</p></div></article>';
};

const saveCart = () => {
  sessionStorage.setItem(cartStorageKey, JSON.stringify(cart));
};

const loadCart = () => {
  try {
    const savedCart = sessionStorage.getItem(cartStorageKey);
    if (!savedCart) return;

    const parsed = JSON.parse(savedCart);
    if (!Array.isArray(parsed)) return;

    parsed.forEach((item) => {
      if (
        item &&
        typeof item.name === "string" &&
        typeof item.price === "number" &&
        typeof item.quantity === "number"
      ) {
        cart.push(item);
      }
    });
  } catch {
    sessionStorage.removeItem(cartStorageKey);
  }
};

const renderExpandedMenu = (category) => {
  const fallbackKey = getPrimaryMenuSection();
  const menuGroup = currentMenuGroups[category] || currentMenuGroups[fallbackKey] || fullMenuItems.showcase;
  if (!expandedMenuGrid || !fullMenuTitle || !fullMenuNote) return;

  fullMenuTitle.textContent = menuGroup.title;
  fullMenuNote.textContent = menuGroup.note;
  expandedMenuGrid.innerHTML = menuGroup.items.length
    ? menuGroup.items.slice(0, 10).map(createMenuCard).join("")
    : '<article class="menu-card"><div class="menu-content"><span class="menu-tag">Menu</span><h3>No items in this section yet</h3><p>Use the admin dashboard to add dishes, pricing, and images.</p></div></article>';

  menuFilterBar?.querySelectorAll(".menu-filter").forEach((filter) => {
    filter.classList.toggle("is-active", filter.dataset.category === category);
  });
};

const showToast = (message) => {
  if (!cartToast) return;

  cartToast.textContent = message;
  cartToast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    cartToast.classList.remove("is-visible");
  }, 1800);
};

const toRadians = (value) => (value * Math.PI) / 180;

const getSelectedOrderMode = () =>
  document.querySelector('input[name="order-mode"]:checked')?.value || "Pickup";

const getSelectedPaymentMethod = () =>
  document.querySelector('input[name="payment-method"]:checked')?.value || "Cash";

const getDistanceKm = (from, to) => {
  const earthRadiusKm = 6371;
  const latDiff = toRadians(to.lat - from.lat);
  const lngDiff = toRadians(to.lng - from.lng);
  const a =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(lngDiff / 2) *
      Math.sin(lngDiff / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const getSubtotal = () =>
  cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

const getTotalItems = () =>
  cart.reduce((sum, item) => sum + item.quantity, 0);

const updateTotals = () => {
  cartCount.textContent = getTotalItems();
  if (deliveryPendingBadge) {
    deliveryPendingBadge.hidden = !deliveryState.isPending;
  }

  if (deliveryState.isPending) {
    cartTotal.textContent = `${formatPrice(getSubtotal())} + delivery TBD`;
    return;
  }

  cartTotal.textContent = formatPrice(getSubtotal() + deliveryState.fee);
};

const resetDeliveryState = () => {
  deliveryState = {
    fee: 0,
    distanceKm: null,
    isPending: false,
  };
  if (deliveryNote) deliveryNote.textContent = "";
};

const syncDeliveryUI = () => {
  const isDelivery = getSelectedOrderMode() === "Delivery";
  if (deliveryAddress) {
    deliveryAddress.hidden = !isDelivery;
    deliveryAddress.required = isDelivery;
  }

  if (!isDelivery) {
    resetDeliveryState();
    updateTotals();
  }
};

const openCart = () => {
  cartDrawer.classList.add("is-open");
  cartBackdrop.classList.add("is-visible");
  cartDrawer.setAttribute("aria-hidden", "false");
};

const closeCart = () => {
  cartDrawer.classList.remove("is-open");
  cartBackdrop.classList.remove("is-visible");
  cartDrawer.setAttribute("aria-hidden", "true");
};

const geocodeDeliveryAddress = async (address) => {
  const searchQueries = [
    address,
    `${address}, Delhi, India`,
    `${address}, North West Delhi, Delhi, India`,
    `${address}, Holambi Kalan, Delhi, India`,
  ];

  for (const query of searchQueries) {
    const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query,
    )}`;

    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const results = await response.json();
    if (!results.length) {
      continue;
    }

    return {
      lat: Number(results[0].lat),
      lng: Number(results[0].lon),
    };
  }

  return null;
};

const saveOrderToSupabase = async () => {
  const subtotal = getSubtotal();
  const total = subtotal + deliveryState.fee;
  const orderMode = getSelectedOrderMode();

  const payload = {
    customer_name: checkoutName.value.trim() || "Guest",
    customer_phone: checkoutPhone.value.trim() || "Not provided",
    order_type: orderMode,
    payment_method: getSelectedPaymentMethod(),
    delivery_address:
      orderMode === "Delivery" ? deliveryAddress.value.trim() || null : null,
    notes: checkoutNotes.value.trim() || null,
    items: cart.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      line_total: item.price * item.quantity,
    })),
    subtotal,
    delivery_fee: deliveryState.fee,
    total,
    estimated_distance_km: deliveryState.distanceKm,
    delivery_fee_pending: deliveryState.isPending,
    source: "website",
    status: "new",
  };

  const postOrder = async (body) =>
    fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    });

  let response = await postOrder(payload);

  if (!response.ok) {
    const errorText = await response.text();
    const missingPendingColumn =
      errorText.includes("delivery_fee_pending") &&
      errorText.includes("Could not find the");

    if (missingPendingColumn) {
      const legacyPayload = { ...payload };
      delete legacyPayload.delivery_fee_pending;
      response = await postOrder(legacyPayload);
    } else {
      throw new Error(errorText || "Order could not be saved to Supabase.");
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Order could not be saved to Supabase.");
  }

  return null;
};

const buildWhatsAppUrl = (orderId = null) => {
  const subtotal = getSubtotal();
  const total = subtotal + deliveryState.fee;
  const name = checkoutName.value.trim() || "Guest";
  const phone = checkoutPhone.value.trim() || "Not provided";
  const notes = checkoutNotes.value.trim() || "None";
  const orderMode = getSelectedOrderMode();
  const paymentMethod = getSelectedPaymentMethod();
  const address = deliveryAddress.value.trim();
  const mapsQuery =
    address ||
    currentBusinessConfig.mapQuery ||
    `${currentBusinessConfig.coordinates.lat},${currentBusinessConfig.coordinates.lng}`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapsQuery,
  )}`;
  const deliveryLabel =
    orderMode !== "Delivery"
      ? orderMode
      : deliveryState.isPending
        ? "To be confirmed"
        : deliveryState.fee > 0
          ? `INR ${deliveryState.fee}`
          : "Free";

  const lines = [
    `Name: ${name}`,
    `Phone: ${phone}`,
    "",
    "Items:",
    ...cart.map(
      (item) =>
        `* ${item.name} x${item.quantity} - Rs.${item.price * item.quantity}`,
    ),
    "",
    `Subtotal: Rs.${subtotal}`,
    `Delivery: ${deliveryLabel}`,
    `Payment: ${paymentMethod}`,
  ];

  if (orderId) {
    lines.push(`Order Ref: #${orderId}`);
  }

  if (orderMode === "Delivery") {
    lines.push(
      "",
      "Address:",
      address || "Not provided",
    );

    if (deliveryState.distanceKm !== null) {
      lines.push(`Distance: ${deliveryState.distanceKm.toFixed(1)} km`);
    }

    lines.push("", `Open in Maps: ${mapsLink}`);
  }

  lines.push(
    "",
    `Notes: ${notes}`,
  );

  if (orderMode !== "Delivery") {
    lines.push("", `Order Type: ${orderMode}`);
  }

  if (!deliveryState.isPending) {
    lines.push("", `Total: Rs.${total}`);
  } else if (orderMode === "Delivery") {
    lines.push("", `Total: Rs.${subtotal} + delivery to be confirmed`);
  }

  return `https://wa.me/${currentBusinessConfig.whatsappNumber}?text=${encodeURIComponent(
    lines.join("\n"),
  )}`;
};

const renderCart = () => {
  saveCart();

  if (!cart.length) {
    cartItems.innerHTML =
      '<p class="cart-empty">Your cart is empty. Add something delicious from the menu.</p>';
    updateTotals();
    return;
  }

  cartItems.innerHTML = cart
    .map(
      (item, index) => `
        <div class="cart-item">
          <div class="cart-item-copy">
            <h3>${item.name}</h3>
            <p>${formatPrice(item.price)} each</p>
          </div>
          <div class="cart-item-controls">
            <strong class="cart-item-line-total">${formatPrice(item.price * item.quantity)}</strong>
            <button type="button" class="qty-btn" data-index="${index}" data-action="decrease">-</button>
            <span class="cart-item-qty">${item.quantity}</span>
            <button type="button" class="qty-btn" data-index="${index}" data-action="increase">+</button>
          </div>
        </div>
      `,
    )
    .join("");

  updateTotals();
};

const handleCheckout = async () => {
  if (!cart.length) {
    if (deliveryNote) {
      deliveryNote.textContent = "Add at least one item before placing an order.";
    }
    return;
  }

  const orderMode = getSelectedOrderMode();
  const name = checkoutName.value.trim();
  const phone = checkoutPhone.value.trim();

  if (!name) {
    deliveryNote.textContent = "Please enter your name.";
    checkoutName.focus();
    return;
  }

  if (!phone) {
    deliveryNote.textContent = "Please enter your phone number.";
    checkoutPhone.focus();
    return;
  }

  if (orderMode === "Delivery") {
    const address = deliveryAddress.value.trim();

    if (!address) {
      deliveryNote.textContent = "Please enter your delivery address.";
      deliveryAddress.focus();
      return;
    }

    deliveryNote.textContent = "Calculating delivery distance...";

    try {
      const coords = await geocodeDeliveryAddress(address);
      if (!coords) {
        deliveryState = {
          fee: 0,
          distanceKm: null,
          isPending: true,
        };
        updateTotals();
        deliveryNote.textContent =
          "Address estimate unavailable. Delivery charge is pending and will be confirmed after checking the typed address or shared pin on WhatsApp.";
      } else {
        const distanceKm = getDistanceKm(currentBusinessConfig.coordinates, coords);
        const fee =
          distanceKm > currentDeliveryConfig.thresholdKm ? currentDeliveryConfig.longDistanceFee : 0;

        deliveryState = {
          fee,
          distanceKm,
          isPending: false,
        };
        updateTotals();

        if (fee > 0) {
          deliveryNote.textContent = `Estimated distance is ${distanceKm.toFixed(
            1,
          )} km, so INR 150 delivery charge has been added.`;
        } else {
          deliveryNote.textContent = `Estimated distance is ${distanceKm.toFixed(
            1,
          )} km, so no delivery charge was added.`;
        }
      }
    } catch (error) {
      deliveryState = {
        fee: 0,
        distanceKm: null,
        isPending: true,
      };
      updateTotals();
      deliveryNote.textContent =
        "Address estimate unavailable. Delivery charge is pending and will be confirmed after checking the typed address or shared pin on WhatsApp.";
    }
  } else {
    resetDeliveryState();
  }

  let savedOrder = null;

  try {
    savedOrder = await saveOrderToSupabase();
    if (deliveryNote) {
      deliveryNote.textContent = savedOrder?.id
        ? `Order saved successfully with reference #${savedOrder.id}. Opening WhatsApp...`
        : "Order saved successfully. Opening WhatsApp...";
    }
    showToast("Order saved");
  } catch (error) {
    if (deliveryNote) {
      deliveryNote.textContent = `Supabase save failed: ${error.message}`;
    }
    showToast("WhatsApp fallback opened");
  }

  updateTotals();
  window.open(
    buildWhatsAppUrl(savedOrder?.id ?? null),
    "_blank",
    "noopener,noreferrer",
  );
};

document.addEventListener("click", (event) => {
  const button = event.target.closest(".order-button");
  if (!button) return;

  const name = button.dataset.name;
  const price = Number(button.dataset.price);
  const existing = cart.find((item) => item.name === name);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ name, price, quantity: 1 });
  }

  renderCart();
  showToast(`${name} added to cart`);
  openCart();
});

cartItems.addEventListener("click", (event) => {
  const target = event.target.closest(".qty-btn");
  if (!target) return;

  const index = Number(target.dataset.index);
  const action = target.dataset.action;
  const item = cart[index];

  if (!item) return;

  if (action === "increase") item.quantity += 1;
  if (action === "decrease") item.quantity -= 1;

  if (item.quantity <= 0) {
    cart.splice(index, 1);
  }

  renderCart();
});

[checkoutName, checkoutPhone, checkoutNotes].forEach((field) => {
  field.addEventListener("input", () => {
    if (deliveryNote) deliveryNote.textContent = "";
  });
});

if (deliveryAddress) {
  deliveryAddress.addEventListener("input", () => {
    resetDeliveryState();
    updateTotals();
  });
}

orderModeInputs.forEach((field) => {
  field.addEventListener("change", syncDeliveryUI);
});

paymentMethodInputs.forEach((field) => {
  field.addEventListener("change", () => {
    if (deliveryNote) deliveryNote.textContent = "";
  });
});

viewFullMenuButton?.addEventListener("click", () => {
  if (!fullMenuPanel) return;

  fullMenuPanel.hidden = false;
  activeMenuCategory = getPrimaryMenuSection();
  renderMenuFilters();
  renderExpandedMenu(activeMenuCategory);
  fullMenuPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

showLessMenuButton?.addEventListener("click", () => {
  if (!fullMenuPanel) return;

  fullMenuPanel.hidden = true;
  viewFullMenuButton?.scrollIntoView({ behavior: "smooth", block: "center" });
});

menuFilterBar?.addEventListener("click", (event) => {
  const filter = event.target.closest(".menu-filter");
  if (!filter) return;

  activeMenuCategory = filter.dataset.category || getPrimaryMenuSection();
  renderExpandedMenu(activeMenuCategory);
});

cartToggle.addEventListener("click", openCart);
cartClose.addEventListener("click", closeCart);
cartBackdrop.addEventListener("click", closeCart);
checkoutButton.addEventListener("click", handleCheckout);

syncDeliveryUI();
loadCart();
renderCart();
renderMenuFilters();
renderFeaturedMenu();
renderExpandedMenu(activeMenuCategory);
initializeSiteSettings();
initializeMenuItems();
