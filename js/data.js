/* ========================================
   StockSense Management — Intelligent DataStore
   Persistent, Reactive, Real Inventory DataStore
   Automated Retail Reorder Planner
   ======================================== */

const DataStore = (() => {
  const STORAGE_KEY = 'stocksense_store_data_v2';
  const MODE_KEY = 'stocksense_app_mode'; // 'shopkeeper' | 'supermarket'
  const today = new Date();
  const dayMs = 86400000;

  // ── Standard Suppliers (Pre-configured wholesale partners ready to receive orders) ──
  const defaultSuppliers = [
    {
      id: 'SUP001',
      name: 'FreshFarm Dairy & Agro',
      contact: 'Rajesh Kumar',
      email: 'rajesh@freshfarm.in',
      phone: '+91 98765 43210',
      leadTime: 2,
      minOrderValue: 1500,
      minOrderQty: 10,
      casePackSize: 1,
      deliverySchedule: 'Daily / On-demand',
      rating: 4.8,
      status: 'active',
      color: '#059669',
      whatsapp: '919876543210'
    },
    {
      id: 'SUP002',
      name: 'Metro Wholesale Super-Mart',
      contact: 'Priya Sharma',
      email: 'priya@metrowholesale.in',
      phone: '+91 87654 32109',
      leadTime: 3,
      minOrderValue: 4000,
      minOrderQty: 24,
      casePackSize: 12,
      deliverySchedule: 'Tue, Thu, Sat',
      rating: 4.6,
      status: 'active',
      color: '#3b82f6',
      whatsapp: '918765432109'
    },
    {
      id: 'SUP003',
      name: 'Annapurna Foods & Staples',
      contact: 'Vikram Singh',
      email: 'vikram@annapurna.in',
      phone: '+91 76543 21098',
      leadTime: 4,
      minOrderValue: 6000,
      minOrderQty: 30,
      casePackSize: 10,
      deliverySchedule: 'Mon, Wed, Fri',
      rating: 4.9,
      status: 'active',
      color: '#f59e0b',
      whatsapp: '917654321098'
    },
    {
      id: 'SUP004',
      name: 'CleanHome & Essentials',
      contact: 'Meena Patel',
      email: 'meena@cleanhome.in',
      phone: '+91 65432 10987',
      leadTime: 3,
      minOrderValue: 2500,
      minOrderQty: 12,
      casePackSize: 6,
      deliverySchedule: 'Wed, Sat',
      rating: 4.5,
      status: 'active',
      color: '#8b5cf6',
      whatsapp: '916543210987'
    }
  ];

  // ── Multi-Branch Setup ──
  const defaultBranches = [
    { id: 'BR001', name: 'Main Supermarket (பிரதான கடை)', code: 'MAIN', isCurrent: true, budget: 50000, budgetUsed: 0 },
    { id: 'BR002', name: 'Branch 2 - Express (கிளை 2)', code: 'EXP2', isCurrent: false, budget: 25000, budgetUsed: 0 }
  ];

  // ── Shop Configuration ──
  const defaultShopConfig = {
    name: 'Sri Lakshmi Supermarket',
    owner: 'Suresh Kumar',
    email: 'suresh@srilakshmistore.in',
    phone: '+91 99887 76655',
    address: '14, Market Road, Chennai, Tamil Nadu',
    currency: '₹',
    currencyCode: 'INR',
    reviewPeriodDays: 7,
    safetyStockDays: 2,
    defaultForecastHorizon: 14,
    monthlyBudget: 50000,
    autoApproveOrderLimit: 5000, // Orders under ₹5,000 auto-approved
  };

  // ── State variables in memory ──
  let state = {
    products: [],
    suppliers: [...defaultSuppliers],
    salesHistory: [],
    purchaseOrders: [],
    notifications: [],
    branches: [...defaultBranches],
    currentBranchId: 'BR001',
    shopConfig: { ...defaultShopConfig },
    budgetUsedMonth: 0,
    anomalies: [],
    isClean: true
  };

  // ── Persistence: Save to localStorage ──
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[DataStore] Save failed:', e);
    }
  }

  // ── Persistence: Load from localStorage ──
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const loaded = JSON.parse(raw);
        // If loaded data contains sample items from previous runs, purge them
        const hasSampleProducts = loaded.products && loaded.products.some(p => p.sku === 'GRC-RICE-5K' || p.sku === 'DAI-MILK-1L');
        if (hasSampleProducts) {
          state.products = [];
          state.salesHistory = [];
          state.purchaseOrders = [];
          state.notifications = [];
          state.anomalies = [];
          state.isClean = true;
          state.suppliers = loaded.suppliers && loaded.suppliers.length > 0 ? loaded.suppliers : [...defaultSuppliers];
          state.branches = loaded.branches && loaded.branches.length > 0 ? loaded.branches : [...defaultBranches];
          state.shopConfig = { ...defaultShopConfig, ...(loaded.shopConfig || {}) };
          saveState();
          console.log('[DataStore] Cleared previous demo records. Clean store active.');
        } else {
          state = {
            ...state,
            ...loaded,
            suppliers: loaded.suppliers && loaded.suppliers.length > 0 ? loaded.suppliers : [...defaultSuppliers],
            branches: loaded.branches && loaded.branches.length > 0 ? loaded.branches : [...defaultBranches],
            shopConfig: { ...defaultShopConfig, ...(loaded.shopConfig || {}) }
          };

          // Automatically purge any corrupted products resulting from binary/mojibake file imports
          const initialProductCount = (state.products || []).length;
          state.products = (state.products || []).filter(p => {
            if (!p || !p.name) return false;
            if (p.name.includes('\uFFFD') || p.name.includes('PK\x03\x04') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(p.name)) {
              return false;
            }
            return true;
          });

          if (state.products.length !== initialProductCount) {
            saveState();
            console.log(`[DataStore] Auto-cleaned ${initialProductCount - state.products.length} corrupted binary items.`);
          }

          console.log(`[DataStore] Loaded ${state.products.length} valid products.`);
        }
      } else {
        // Clean Slate by default
        state.products = [];
        state.salesHistory = [];
        state.purchaseOrders = [];
        state.isClean = true;
        saveState();
        console.log('[DataStore] Initialized clean slate with 0 products.');
      }
    } catch (e) {
      console.error('[DataStore] Load error:', e);
    }
  }

  // Initialize store on script execution
  loadState();

  // ── Public Store API ──
  return {
    // Accessors
    get products() { return state.products; },
    get suppliers() { return state.suppliers; },
    get salesHistory() { return state.salesHistory; },
    get purchaseOrders() { return state.purchaseOrders; },
    get notifications() { return state.notifications; },
    get branches() { return state.branches; },
    get shopConfig() { return state.shopConfig; },
    get isClean() { return state.products.length === 0 || state.isClean; },
    get categories() {
      const cats = state.products.map(p => p.category).filter(Boolean);
      return cats.length > 0 ? [...new Set(cats)] : ['Dairy', 'Grains & Staples', 'Vegetables', 'Snacks', 'Beverages', 'Personal Care', 'Cooking Essentials'];
    },

    // ── Clean Store Records Controls ──
    clearAllData() {
      state.products = [];
      state.salesHistory = [];
      state.purchaseOrders = [];
      state.notifications = [];
      state.anomalies = [];
      state.isClean = true;
      saveState();
      console.log('[DataStore] Wiped store records. Clean store active.');
      window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      return { success: true, message: 'Store records cleared successfully.' };
    },

    purgeCorruptedProducts() {
      const initial = state.products.length;
      state.products = state.products.filter(p => {
        if (!p || !p.name) return false;
        return !p.name.includes('\uFFFD') && !p.name.includes('PK\x03\x04') && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(p.name);
      });
      if (state.products.length !== initial) {
        saveState();
        window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      }
      return initial - state.products.length;
    },

    // ── Product Management ──
    getSupplier(id) {
      return state.suppliers.find(s => s.id === id) || state.suppliers[0];
    },

    getProduct(id) {
      return state.products.find(p => p.id === id);
    },

    getProductBySku(sku) {
      return state.products.find(p => p.sku === sku);
    },

    addProduct(prod) {
      const newId = `P${String(state.products.length + 1).padStart(3, '0')}`;
      const newProduct = {
        id: prod.id || newId,
        sku: prod.sku || `SKU-${Date.now().toString().slice(-6)}`,
        name: prod.name || 'New Item',
        category: prod.category || 'General',
        icon: prod.icon || '📦',
        stock: Number(prod.stock) || 0,
        openingStockVerified: prod.openingStockVerified !== undefined ? !!prod.openingStockVerified : true,
        reorderLevel: Number(prod.reorderLevel) || 10,
        avgDailySales: Number(prod.avgDailySales) || 2,
        supplierId: prod.supplierId || (state.suppliers[0] ? state.suppliers[0].id : 'SUP001'),
        shelfLifeDays: Number(prod.shelfLifeDays) || 180,
        expiryDate: prod.expiryDate ? new Date(prod.expiryDate).toISOString() : new Date(Date.now() + 180 * dayMs).toISOString(),
        costPrice: Number(prod.costPrice) || 0,
        sellingPrice: Number(prod.sellingPrice) || 0,
        incomingStock: Number(prod.incomingStock) || 0,
        reservedStock: 0,
        branchStock: prod.branchStock || { 'BR001': Number(prod.stock) || 0, 'BR002': 0 },
        keywords: prod.keywords || [prod.name.toLowerCase()]
      };

      state.products.push(newProduct);
      state.isClean = false;
      saveState();
      window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      return newProduct;
    },

    bulkAddProducts(productsList) {
      if (!Array.isArray(productsList) || productsList.length === 0) return [];
      const added = [];
      productsList.forEach((prod, i) => {
        const existingIdx = state.products.findIndex(p => p.sku === prod.sku);
        if (existingIdx !== -1) {
          state.products[existingIdx].stock = Number(prod.stock) !== undefined && !isNaN(Number(prod.stock)) ? Number(prod.stock) : state.products[existingIdx].stock;
          state.products[existingIdx].openingStockVerified = true;
          if (prod.costPrice) state.products[existingIdx].costPrice = Number(prod.costPrice);
          if (prod.sellingPrice) state.products[existingIdx].sellingPrice = Number(prod.sellingPrice);
          if (prod.category) state.products[existingIdx].category = prod.category;
          if (prod.name) state.products[existingIdx].name = prod.name;
          added.push(state.products[existingIdx]);
        } else {
          const newId = `P${String(state.products.length + 1).padStart(3, '0')}`;
          const newProduct = {
            id: prod.id || newId,
            sku: prod.sku || `SKU-${Date.now().toString().slice(-6)}-${i}`,
            name: prod.name || 'New Item',
            category: prod.category || 'General',
            icon: prod.icon || '📦',
            stock: Number(prod.stock) || 0,
            openingStockVerified: prod.openingStockVerified !== undefined ? !!prod.openingStockVerified : true,
            reorderLevel: Number(prod.reorderLevel) || 10,
            avgDailySales: Number(prod.avgDailySales) || 2,
            supplierId: prod.supplierId || (state.suppliers[0] ? state.suppliers[0].id : 'SUP001'),
            shelfLifeDays: Number(prod.shelfLifeDays) || 180,
            expiryDate: prod.expiryDate ? new Date(prod.expiryDate).toISOString() : new Date(Date.now() + (Number(prod.shelfLifeDays) || 180) * dayMs).toISOString(),
            costPrice: Number(prod.costPrice) || 0,
            sellingPrice: Number(prod.sellingPrice) || 0,
            incomingStock: Number(prod.incomingStock) || 0,
            reservedStock: 0,
            branchStock: prod.branchStock || { 'BR001': Number(prod.stock) || 0, 'BR002': 0 },
            keywords: prod.keywords || [prod.name.toLowerCase()]
          };
          state.products.push(newProduct);
          added.push(newProduct);
        }
      });
      state.isClean = false;
      saveState();
      window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      return added;
    },

    updateProduct(id, updates) {
      const idx = state.products.findIndex(p => p.id === id);
      if (idx !== -1) {
        state.products[idx] = { ...state.products[idx], ...updates };
        saveState();
        window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
        return state.products[idx];
      }
      return null;
    },

    deleteProduct(id) {
      state.products = state.products.filter(p => p.id !== id);
      saveState();
      window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      return true;
    },

    // ── Feature 1: Automatic Stock Updates (Sale, Return, POS, Voice) ──
    recordSale(productIdOrSku, quantity = 1, options = {}) {
      const prod = state.products.find(p => p.id === productIdOrSku || p.sku === productIdOrSku || p.name.toLowerCase() === productIdOrSku.toLowerCase());
      if (!prod) {
        return { success: false, message: `Product "${productIdOrSku}" not found.` };
      }

      const qty = Math.max(1, Number(quantity));
      if (prod.stock < qty && !options.allowNegative) {
        // Still allow partial or alert
        console.warn(`[StockAlert] Selling ${qty} with only ${prod.stock} in stock!`);
      }

      // Decrement stock
      prod.stock = Math.max(0, prod.stock - qty);
      if (prod.branchStock && prod.branchStock[state.currentBranchId] !== undefined) {
        prod.branchStock[state.currentBranchId] = Math.max(0, prod.branchStock[state.currentBranchId] - qty);
      }

      // Add to sales ledger
      const saleEntry = {
        id: `S${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        sku: prod.sku,
        productName: prod.name,
        productId: prod.id,
        quantitySold: qty,
        unitPrice: prod.sellingPrice,
        total: qty * prod.sellingPrice,
        branchId: state.currentBranchId,
        source: options.source || 'pos' // 'pos' | 'voice' | 'manual' | 'barcode'
      };
      state.salesHistory.unshift(saleEntry);

      // Check Feature 2: Low-Stock Detection Trigger
      const status = this.getStockStatus(prod);
      let alertMsg = null;
      if (status.label === 'Critical' || status.label === 'Out of Stock') {
        alertMsg = `⚠️ ${prod.name} இருப்பு குறைவு! (${prod.stock} units remaining).`;
        this.addNotification({
          type: 'critical',
          title: 'குறைந்த இருப்பு எச்சரிக்கை (Low Stock)',
          message: `${prod.name} இருப்பு குறைவாக உள்ளது (${prod.stock} மட்டுமே உள்ளது). மறுஆர்டர் செய்யவும்.`
        });
      }

      saveState();
      window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      return { success: true, product: prod, sale: saleEntry, alertMsg };
    },

    // ── Quick Stock Adjust (Button +/- for Low Literacy) ──
    adjustStock(productId, delta, reason = 'manual_adjustment') {
      const prod = this.getProduct(productId);
      if (!prod) return false;
      const oldStock = prod.stock;
      prod.stock = Math.max(0, prod.stock + delta);
      if (prod.branchStock) {
        prod.branchStock[state.currentBranchId] = Math.max(0, (prod.branchStock[state.currentBranchId] || 0) + delta);
      }
      saveState();
      window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      return { success: true, product: prod, oldStock, newStock: prod.stock };
    },

    // ── Feature 2: Dynamic Low-Stock & Expiry Status ──
    getStockStatus(product) {
      if (!product) return { label: 'Unknown', class: 'badge-out', priority: 0 };
      if (product.stock === 0) return { label: 'Out of Stock', class: 'badge-out', priority: 0, tamil: 'இருப்பு இல்லை' };

      const daysUntilExp = this.daysUntil(product.expiryDate);
      if (daysUntilExp <= 3 && daysUntilExp >= 0) {
        return { label: 'Near Expiry', class: 'badge-critical', priority: 1, tamil: 'காலாவதி அபாயம்' };
      }

      const rLevel = product.reorderLevel || 10;
      if (product.stock <= Math.round(rLevel * 0.5)) {
        return { label: 'Critical', class: 'badge-critical', priority: 1, tamil: 'மிகக் குறைவு' };
      }
      if (product.stock <= rLevel) {
        return { label: 'Low Stock', class: 'badge-warning', priority: 2, tamil: 'குறைவான இருப்பு' };
      }
      return { label: 'Healthy', class: 'badge-healthy', priority: 4, tamil: 'நிறைவான இருப்பு' };
    },

    // ── Feature 3 & 4: Intelligent Reorder & Demand Calculation ──
    calculateReorderSuggestion(product) {
      if (!product) return null;
      const supplier = this.getSupplier(product.supplierId);
      const leadTime = supplier ? supplier.leadTime : 3;
      const reviewPeriod = state.shopConfig.reviewPeriodDays || 7;
      const safetyDays = state.shopConfig.safetyStockDays || 2;
      const dailyDemand = product.avgDailySales || 2;

      // Dynamic Reorder Point: ROP = (Daily Demand × Lead Time) + (Daily Demand × Safety Days)
      const safetyStock = Math.ceil(dailyDemand * safetyDays);
      const leadTimeDemand = Math.ceil(dailyDemand * leadTime);
      const reorderPoint = leadTimeDemand + safetyStock;

      // Target Stock Level: TSL = Daily Demand × (Lead Time + Review Period) + Safety Stock
      const targetStockLevel = Math.ceil(dailyDemand * (leadTime + reviewPeriod)) + safetyStock;

      // Current inventory position = onHand + incoming - reserved
      const inventoryPosition = product.stock + (product.incomingStock || 0);

      let rawSuggestedQty = Math.max(0, targetStockLevel - inventoryPosition);

      // Shelf-life constraint (Feature 10): Ensure order won't spoil before selling!
      const shelfLifeDays = product.shelfLifeDays || 180;
      const maxSellableQty = Math.floor(shelfLifeDays * dailyDemand * 0.9);
      let shelfLifeCapped = false;

      if (rawSuggestedQty > maxSellableQty && maxSellableQty > 0) {
        rawSuggestedQty = maxSellableQty;
        shelfLifeCapped = true;
      }

      // Pack size rounding
      const packSize = supplier && supplier.casePackSize ? supplier.casePackSize : 1;
      let finalQty = rawSuggestedQty;
      if (finalQty > 0 && packSize > 1) {
        finalQty = Math.ceil(finalQty / packSize) * packSize;
      }

      // Check supplier MOQ
      if (finalQty > 0 && supplier && supplier.minOrderQty && finalQty < supplier.minOrderQty) {
        finalQty = supplier.minOrderQty;
      }

      const urgency = product.stock === 0 ? 'out_of_stock'
        : product.stock <= leadTimeDemand ? 'critical'
        : product.stock <= reorderPoint ? 'moderate'
        : 'healthy';

      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        icon: product.icon,
        currentStock: product.stock,
        reorderPoint,
        leadTimeDays: leadTime,
        safetyStock,
        dailyDemand,
        rawSuggestedQty,
        suggestedQty: finalQty,
        unitCost: product.costPrice,
        estimatedCost: finalQty * product.costPrice,
        shelfLifeCapped,
        urgency,
        supplierId: product.supplierId,
        supplierName: supplier ? supplier.name : 'Primary Supplier',
        daysOfSupplyLeft: dailyDemand > 0 ? (product.stock / dailyDemand).toFixed(1) : 999
      };
    },

    calculateFullReorderPlan() {
      const verifiedProducts = state.products.filter(p => p.openingStockVerified !== false);
      const suggestions = verifiedProducts.map(p => this.calculateReorderSuggestion(p)).filter(Boolean);
      const itemsToOrder = suggestions.filter(s => s.suggestedQty > 0);
      const criticalCount = itemsToOrder.filter(s => s.urgency === 'out_of_stock' || s.urgency === 'critical').length;
      const totalEstimatedCost = itemsToOrder.reduce((sum, s) => sum + s.estimatedCost, 0);

      const plan = {
        calculatedAt: new Date().toISOString(),
        totalProducts: state.products.length,
        verifiedCount: verifiedProducts.length,
        unverifiedCount: state.products.length - verifiedProducts.length,
        itemsToOrderCount: itemsToOrder.length,
        criticalCount,
        totalEstimatedCost,
        itemsToOrder,
        allSuggestions: suggestions
      };

      state.lastReorderPlan = plan;
      return plan;
    },

    // ── Feature 5: Automatic Supplier Selection Matrix ──
    getBestSupplierForProduct(product) {
      if (!product) return null;
      // Score suppliers based on: Price (40%), Lead Time (25%), Rating (20%), MOQ (15%)
      const scores = state.suppliers.map(sup => {
        const leadScore = Math.max(0, 100 - (sup.leadTime * 15));
        const ratingScore = (sup.rating || 4.5) * 20; // 0-100
        const moqScore = sup.minOrderQty <= 20 ? 95 : 70;
        const totalScore = Math.round(0.4 * 90 + 0.25 * leadScore + 0.2 * ratingScore + 0.15 * moqScore);

        return {
          supplier: sup,
          score: totalScore,
          isRecommended: sup.id === product.supplierId
        };
      });

      scores.sort((a, b) => b.score - a.score);
      return scores;
    },

    // ── Feature 6 & 7: Purchase Order Creation & Auto-Sending ──
    createPurchaseOrder(poData) {
      const supplier = this.getSupplier(poData.supplierId);
      const newPoId = `PO-${new Date().getFullYear()}-${String(state.purchaseOrders.length + 1).padStart(3, '0')}`;
      const totalCost = (poData.items || []).reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

      // Check Feature 11: Budget Control
      const monthlyBudget = state.shopConfig.monthlyBudget || 50000;
      const currentMonthSpend = this.getCurrentMonthSpend();
      const exceedsBudget = (currentMonthSpend + totalCost) > monthlyBudget;

      // Automatic approval rule: small shop or orders under threshold auto-approve
      const autoLimit = state.shopConfig.autoApproveOrderLimit || 5000;
      const isAutoApproved = totalCost <= autoLimit && !exceedsBudget;

      const newPo = {
        id: newPoId,
        supplierId: poData.supplierId,
        supplierName: supplier ? supplier.name : 'Wholesale Supplier',
        items: poData.items || [],
        totalCost,
        status: isAutoApproved ? 'ordered' : 'draft', // draft, approved, ordered, in_transit, received, cancelled
        orderDate: new Date().toISOString(),
        expectedDelivery: new Date(Date.now() + ((supplier ? supplier.leadTime : 3) * dayMs)).toISOString(),
        notes: poData.notes || '',
        approvalMode: isAutoApproved ? 'auto' : 'pending_approval',
        exceedsBudget,
        branchId: state.currentBranchId
      };

      // Update incoming stock for items
      newPo.items.forEach(item => {
        const p = this.getProduct(item.productId);
        if (p) {
          p.incomingStock = (p.incomingStock || 0) + item.quantity;
        }
      });

      state.purchaseOrders.unshift(newPo);
      saveState();
      window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      return newPo;
    },

    // ── Feature 7: Send Order via WhatsApp & Email ──
    generateWhatsAppOrderLink(poId) {
      const po = state.purchaseOrders.find(o => o.id === poId);
      if (!po) return null;
      const supplier = this.getSupplier(po.supplierId);
      const phone = supplier && supplier.whatsapp ? supplier.whatsapp : '919876543210';

      const itemList = po.items.map((it, idx) => `${idx + 1}. ${it.name} - ${it.quantity} units (Est ₹${it.quantity * it.unitCost})`).join('\n');
      const text = encodeURIComponent(
        `*PURCHASE ORDER: ${po.id}*\n` +
        `Store: ${state.shopConfig.name}\n` +
        `Supplier: ${po.supplierName}\n\n` +
        `*Items to deliver:*\n${itemList}\n\n` +
        `*Total Value:* ₹${po.totalCost.toLocaleString('en-IN')}\n` +
        `*Expected Delivery:* ${new Date(po.expectedDelivery).toLocaleDateString('en-IN')}\n\n` +
        `Please confirm order dispatch. Thank you!`
      );

      return `https://wa.me/${phone}?text=${text}`;
    },

    // ── Feature 8: Automatic Delivery Tracking Transition ──
    advanceOrderStatus(poId, nextStatus) {
      const po = state.purchaseOrders.find(o => o.id === poId);
      if (!po) return null;
      po.status = nextStatus;
      saveState();
      window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      return po;
    },

    // ── Feature 9: Automated Goods Receiving & Verification ──
    receiveGoods(poId, receivedData) {
      const po = state.purchaseOrders.find(o => o.id === poId);
      if (!po) return { success: false, message: 'PO not found' };

      const discrepancies = [];

      po.items.forEach(item => {
        const itemRec = (receivedData.items || []).find(r => r.productId === item.productId);
        const acceptedQty = itemRec ? Number(itemRec.accepted) : item.quantity;
        const damagedQty = itemRec ? Number(itemRec.damaged || 0) : 0;
        const missingQty = Math.max(0, item.quantity - acceptedQty - damagedQty);

        item.received = acceptedQty;
        item.damaged = damagedQty;
        item.missing = missingQty;

        if (missingQty > 0 || damagedQty > 0) {
          discrepancies.push({
            productId: item.productId,
            name: item.name,
            ordered: item.quantity,
            accepted: acceptedQty,
            damaged: damagedQty,
            missing: missingQty
          });
        }

        // Feature 1: Automatically increment active product stock!
        const product = this.getProduct(item.productId);
        if (product) {
          product.stock += acceptedQty;
          product.incomingStock = Math.max(0, (product.incomingStock || 0) - item.quantity);
          if (product.branchStock) {
            product.branchStock[state.currentBranchId] = (product.branchStock[state.currentBranchId] || 0) + acceptedQty;
          }
        }
      });

      po.status = 'received';
      po.receivedDate = new Date().toISOString();
      po.discrepancies = discrepancies;

      // Add notification
      this.addNotification({
        type: discrepancies.length > 0 ? 'warning' : 'success',
        title: discrepancies.length > 0 ? 'சரக்கு பெறப்பட்டது (குறைபாடுகள் உள்ளன)' : 'சரக்கு முழுமையாக பெறப்பட்டது',
        message: `${po.id} சரக்கு பெறப்பட்டு இருப்பில் சேர்க்கப்பட்டது. (${po.items.reduce((s, i) => s + (i.received || 0), 0)} பொருட்கள்).`
      });

      saveState();
      window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      return { success: true, po, discrepancies };
    },

    // ── Feature 10: Automatic Expiry Monitoring & Markdown Recommendations ──
    getExpiryAnalysis() {
      const critical = [];
      const warning = [];
      const safe = [];

      state.products.forEach(p => {
        if (!p.expiryDate || p.stock === 0) return;
        const daysLeft = this.daysUntil(p.expiryDate);
        if (daysLeft <= 3 && daysLeft >= 0) {
          critical.push({
            product: p,
            daysLeft,
            suggestedDiscountPct: 35, // Clear immediately
            wastePreventionPlan: '35% Flash Sale'
          });
        } else if (daysLeft <= 7 && daysLeft > 3) {
          warning.push({
            product: p,
            daysLeft,
            suggestedDiscountPct: 20,
            wastePreventionPlan: '20% Weekend Promo'
          });
        } else if (daysLeft > 7) {
          safe.push({ product: p, daysLeft });
        }
      });

      return { critical, warning, safe, totalAtRisk: critical.length + warning.length };
    },

    // ── Feature 11: Budget Control Status ──
    getBudgetStatus() {
      const monthlyBudget = state.shopConfig.monthlyBudget || 50000;
      const currentSpend = this.getCurrentMonthSpend();
      const remaining = Math.max(0, monthlyBudget - currentSpend);
      const usedPct = Math.min(100, Math.round((currentSpend / monthlyBudget) * 100));

      return {
        monthlyBudget,
        currentSpend,
        remaining,
        usedPct,
        isExceeded: currentSpend > monthlyBudget,
        warningThreshold: usedPct >= 80
      };
    },

    getCurrentMonthSpend() {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      return state.purchaseOrders
        .filter(po => {
          const d = new Date(po.orderDate);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth && po.status !== 'cancelled';
        })
        .reduce((sum, po) => sum + (po.totalCost || 0), 0);
    },

    // ── Feature 12: Automatic Daily Report Summary ──
    generateDailyReport() {
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySales = state.salesHistory.filter(s => s.date.startsWith(todayStr));
      const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
      const todayUnitsSold = todaySales.reduce((sum, s) => sum + s.quantitySold, 0);

      const totalInventoryValue = state.products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
      const lowStockItems = state.products.filter(p => p.stock <= p.reorderLevel);
      const outOfStockItems = state.products.filter(p => p.stock === 0);

      // Dead stock / slow moving: 0 sales in 14 days
      const slowMoving = state.products.filter(p => {
        const sales = this.getProductSales(p.id, 14);
        return sales.length === 0 && p.stock > 10;
      });

      return {
        date: todayStr,
        todayRevenue,
        todayUnitsSold,
        salesCount: todaySales.length,
        totalInventoryValue,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        slowMovingCount: slowMoving.length,
        lowStockItems,
        slowMoving
      };
    },

    // ── Feature 13: Multi-Branch Stock Balancing ──
    getMultiBranchTransfers() {
      const suggestions = [];
      const currentBranch = state.currentBranchId;
      const otherBranch = currentBranch === 'BR001' ? 'BR002' : 'BR001';

      state.products.forEach(p => {
        if (!p.branchStock) return;
        const currentStock = p.branchStock[currentBranch] || 0;
        const otherStock = p.branchStock[otherBranch] || 0;

        // If current branch has shortage (<= reorderLevel) and other branch has surplus (> 2x reorderLevel)
        if (currentStock <= p.reorderLevel && otherStock > (p.reorderLevel * 1.5)) {
          const transferQty = Math.min(Math.round(otherStock * 0.4), p.reorderLevel - currentStock + 5);
          if (transferQty > 0) {
            suggestions.push({
              productId: p.id,
              name: p.name,
              sku: p.sku,
              icon: p.icon,
              sourceBranch: otherBranch === 'BR001' ? 'Main Supermarket' : 'Branch 2 - Express',
              targetBranch: currentBranch === 'BR001' ? 'Main Supermarket' : 'Branch 2 - Express',
              sourceBranchStock: otherStock,
              targetBranchStock: currentStock,
              transferQty,
              savingsCost: transferQty * p.costPrice,
              reason: 'Surplus detected at branch. Inter-store transfer avoids new supplier purchase!'
            });
          }
        }
      });

      return suggestions;
    },

    executeBranchTransfer(productId, qty) {
      const p = this.getProduct(productId);
      if (!p || !p.branchStock) return false;
      const currentBranch = state.currentBranchId;
      const otherBranch = currentBranch === 'BR001' ? 'BR002' : 'BR001';

      if ((p.branchStock[otherBranch] || 0) < qty) return false;

      p.branchStock[otherBranch] -= qty;
      p.branchStock[currentBranch] = (p.branchStock[currentBranch] || 0) + qty;
      p.stock = p.branchStock[currentBranch]; // sync current view

      this.addNotification({
        type: 'info',
        title: 'கிளை மாற்றல் முடிந்தது (Branch Transfer Done)',
        message: `${p.name} ${qty} அலகுகள் கிளைக்கு மாற்றப்பட்டது.`
      });

      saveState();
      window.dispatchEvent(new CustomEvent('stocksense:data-changed'));
      return true;
    },

    // ── Feature 15: Automatic Error & Anomaly Detection ──
    detectAnomalies() {
      const issues = [];

      // 1. Duplicate PO check: similar POs within 24 hours
      const recentPOs = state.purchaseOrders.filter(po => {
        return (Date.now() - new Date(po.orderDate).getTime()) < dayMs;
      });

      for (let i = 0; i < recentPOs.length; i++) {
        for (let j = i + 1; j < recentPOs.length; j++) {
          if (recentPOs[i].supplierId === recentPOs[j].supplierId) {
            issues.push({
              type: 'duplicate_po',
              severity: 'warning',
              title: 'சாத்தியமான இரட்டை ஆர்டர் (Possible Duplicate PO)',
              description: `${recentPOs[i].id} and ${recentPOs[j].id} to "${recentPOs[i].supplierName}" were created within 24 hours.`,
              action: 'Verify PO before sending'
            });
          }
        }
      }

      // 2. Discrepancy: Negative or Zero physical count with active sales
      state.products.forEach(p => {
        if (p.stock === 0 && p.avgDailySales > 5) {
          issues.push({
            type: 'stockout_loss',
            severity: 'critical',
            title: 'முக்கிய பொருள் இருப்பு இல்லை (High-Velocity Stockout)',
            description: `${p.name} sells ~${p.avgDailySales}/day but current stock is 0! Revenue is being lost.`,
            action: 'Place urgent emergency reorder'
          });
        }
      });

      return issues;
    },

    // ── Notification Helper ──
    addNotification(notif) {
      const entry = {
        id: `N${Date.now().toString().slice(-4)}`,
        type: notif.type || 'info',
        title: notif.title || 'Alert',
        message: notif.message || '',
        time: new Date().toISOString(),
        read: false
      };
      state.notifications.unshift(entry);
      if (state.notifications.length > 20) state.notifications.pop();
      saveState();
      window.dispatchEvent(new CustomEvent('stocksense:notification-added', { detail: entry }));
      return entry;
    },

    // ── Helper Utilities ──
    getProductSales(productId, days = 28) {
      const cutoff = new Date(Date.now() - days * dayMs);
      return state.salesHistory.filter(s => s.productId === productId && new Date(s.date) >= cutoff);
    },

    getDailySales(productId, days = 28) {
      const cutoff = new Date(Date.now() - days * dayMs);
      const sales = state.salesHistory.filter(s => s.productId === productId && new Date(s.date) >= cutoff);
      const dailyMap = {};

      for (let d = 0; d < days; d++) {
        const date = new Date(Date.now() - (days - 1 - d) * dayMs);
        const key = date.toISOString().split('T')[0];
        dailyMap[key] = 0;
      }

      sales.forEach(s => {
        const key = s.date.split('T')[0];
        if (dailyMap[key] !== undefined) dailyMap[key] += s.quantitySold;
      });

      return Object.entries(dailyMap).map(([date, qty]) => ({ date, qty }));
    },

    getTotalSales(days = 7) {
      const cutoff = new Date(Date.now() - days * dayMs);
      return state.salesHistory.filter(s => new Date(s.date) >= cutoff).reduce((sum, s) => sum + s.total, 0);
    },

    formatCurrency(value) {
      return `${state.shopConfig.currency}${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    },

    formatDate(date) {
      if (!date) return '—';
      return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    formatRelativeTime(date) {
      if (!date) return '';
      const diff = Date.now() - new Date(date).getTime();
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / dayMs);
      if (mins < 60) return `${Math.max(1, mins)}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    },

    daysUntil(date) {
      if (!date) return Infinity;
      return Math.ceil((new Date(date).getTime() - Date.now()) / dayMs);
    }
  };
})();

// Provide backward compatibility for any existing DemoData calls
const DemoData = DataStore;
window.DemoData = DataStore;
window.DataStore = DataStore;
