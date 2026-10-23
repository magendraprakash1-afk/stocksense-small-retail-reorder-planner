/* ========================================
   StockSense Management — API Layer
   Backend-ready service abstraction
   ======================================== */

const API = (() => {
  let BASE_URL = localStorage.getItem('stocksense_api_base') || 'http://localhost:8000/api/v1';
  let isDemo = localStorage.getItem('stocksense_is_demo') === 'false' ? false : true;

  // ── Simulated network delay ──
  function simulateDelay(ms = 200) {
    return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 150));
  }

  // ── Generic fetch wrapper (for real backend) ──
  async function request(method, endpoint, data = null) {
    if (isDemo) {
      await simulateDelay();
      return { success: true, data };
    }

    const token = localStorage.getItem('stocksense_access_token');
    const shopId = localStorage.getItem('stocksense_shop_id');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (shopId) headers['X-Shop-Id'] = shopId;

    const options = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  // ── Local storage helpers ──
  function saveLocal(key, data) {
    try {
      localStorage.setItem(`stocksense_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  }

  function loadLocal(key, fallback = null) {
    try {
      const data = localStorage.getItem(`stocksense_${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function removeLocal(key) {
    try {
      localStorage.removeItem(`stocksense_${key}`);
    } catch (e) { /* ignore */ }
  }

  // ── Auth ──
  const Auth = {
    async login(email, password) {
      await simulateDelay(400);
      // Demo: accept any credentials
      const user = {
        id: 'U001',
        name: DemoData.shopConfig.owner,
        email: email || DemoData.shopConfig.email,
        role: 'Owner',
        shopName: DemoData.shopConfig.name,
      };
      saveLocal('user', user);
      saveLocal('isLoggedIn', true);
      return { success: true, user };
    },

    async logout() {
      removeLocal('user');
      removeLocal('isLoggedIn');
      return { success: true };
    },

    getUser() {
      return loadLocal('user');
    },

    isLoggedIn() {
      return loadLocal('isLoggedIn', false);
    }
  };

  // ── Products / Inventory ──
  const Products = {
    async getAll(filters = {}) {
      await simulateDelay();
      let items = [...DemoData.products];

      if (filters.category) items = items.filter(p => p.category === filters.category);
      if (filters.status) {
        items = items.filter(p => {
          const s = DemoData.getStockStatus(p);
          return s.label.toLowerCase().replace(/\s+/g, '_') === filters.status;
        });
      }
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        items = items.filter(p => {
          if (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) return true;
          if (p.keywords && p.keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()))) return true;
          return false;
        });
      }
      if (filters.supplierId) items = items.filter(p => p.supplierId === filters.supplierId);

      return { success: true, data: items, total: items.length };
    },

    async getById(id) {
      await simulateDelay();
      return { success: true, data: DemoData.getProduct(id) };
    },

    async create(productData) {
      await simulateDelay(250);
      const newProduct = DataStore.addProduct(productData);
      return { success: true, data: newProduct };
    },

    async update(id, updates) {
      await simulateDelay(200);
      const updated = DataStore.updateProduct(id, updates);
      if (!updated) throw new Error('Product not found');
      return { success: true, data: updated };
    },

    async adjustStock(id, adjustment, reason = '') {
      await simulateDelay(200);
      const product = DataStore.getProduct(id);
      if (!product) throw new Error('Product not found');
      product.stock = Math.max(0, product.stock + adjustment);
      product.openingStockVerified = true;
      DataStore.updateProduct(id, { stock: product.stock, openingStockVerified: true });
      return { success: true, data: product };
    },

    async delete(id) {
      await simulateDelay(200);
      const ok = DataStore.deleteProduct(id);
      if (!ok) throw new Error('Product not found');
      return { success: true };
    },

    async importCSV(rows) {
      await simulateDelay(350);
      const validRows = [];
      const results = { imported: 0, updated: 0, errors: [] };
      rows.forEach((row, i) => {
        if (!row.sku || !row.name) {
          results.errors.push({ row: i + 1, message: 'Missing SKU or product name' });
          return;
        }
        const existing = DataStore.getProductBySku(row.sku);
        if (existing) {
          results.updated++;
        } else {
          results.imported++;
        }
        validRows.push(row);
      });
      DataStore.bulkAddProducts(validRows);
      return { success: true, data: results };
    },
  };

  // ── Sales ──
  const Sales = {
    async getAll(filters = {}) {
      await simulateDelay();
      let items = [...DemoData.salesHistory];

      if (filters.productId) items = items.filter(s => s.productId === filters.productId);
      if (filters.startDate) items = items.filter(s => s.date >= new Date(filters.startDate));
      if (filters.endDate) items = items.filter(s => s.date <= new Date(filters.endDate));
      if (filters.sku) items = items.filter(s => s.sku === filters.sku);

      items.sort((a, b) => b.date - a.date);
      return { success: true, data: items, total: items.length };
    },

    async importCSV(rows) {
      await simulateDelay(500);
      const results = { imported: 0, duplicates: 0, errors: [] };

      rows.forEach((row, i) => {
        if (!row.date || !row.sku || !row.quantity_sold) {
          results.errors.push({ row: i + 1, message: 'Missing required fields (date, sku, quantity_sold)' });
          return;
        }

        const product = DemoData.getProductBySku(row.sku);
        if (!product) {
          results.errors.push({ row: i + 1, message: `Unknown SKU: ${row.sku}` });
          return;
        }

        const saleDate = new Date(row.date);
        if (isNaN(saleDate.getTime())) {
          results.errors.push({ row: i + 1, message: `Invalid date: ${row.date}` });
          return;
        }

        // Check duplicate
        const isDup = DemoData.salesHistory.some(s =>
          s.sku === row.sku &&
          s.date.toISOString().split('T')[0] === saleDate.toISOString().split('T')[0] &&
          s.quantitySold === parseInt(row.quantity_sold)
        );

        if (isDup) {
          results.duplicates++;
          return;
        }

        DemoData.salesHistory.push({
          id: `S${String(DemoData.salesHistory.length + 1).padStart(5, '0')}`,
          date: saleDate,
          sku: row.sku,
          productName: product.name,
          productId: product.id,
          quantitySold: parseInt(row.quantity_sold),
          unitPrice: parseFloat(row.unit_price) || product.sellingPrice,
          total: parseInt(row.quantity_sold) * (parseFloat(row.unit_price) || product.sellingPrice),
        });

        results.imported++;
      });

      return { success: true, data: results };
    },

    async getDailySummary(productId, days = 28) {
      await simulateDelay();
      return { success: true, data: DemoData.getDailySales(productId, days) };
    },
  };

  // ── Forecast ──
  const Forecast = {
    async generate(productId, horizonDays = 14) {
      await simulateDelay(300);
      const product = DemoData.getProduct(productId);
      if (!product) throw new Error('Product not found');

      const historicalDaily = DemoData.getDailySales(productId, 28);
      const avgDaily = product.avgDailySales;

      // Simple moving average forecast with slight trend
      const last7 = historicalDaily.slice(-7);
      const last7Avg = last7.reduce((s, d) => s + d.qty, 0) / 7;
      const trend = (last7Avg - avgDaily) / avgDaily;

      const forecast = [];
      const today = new Date();
      for (let d = 1; d <= horizonDays; d++) {
        const date = new Date(today.getTime() + d * 86400000);
        const dayOfWeek = date.getDay();
        const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1.0;
        const predicted = Math.max(1, Math.round(avgDaily * (1 + trend * 0.3) * weekendFactor));
        const lower = Math.max(0, Math.round(predicted * 0.7));
        const upper = Math.round(predicted * 1.4);

        forecast.push({
          date: date.toISOString().split('T')[0],
          predicted,
          lower,
          upper,
        });
      }

      const supplier = DemoData.getSupplier(product.supplierId);
      const leadTimeDemand = Math.round(avgDaily * (supplier ? supplier.leadTime : 3));
      const stockDepletionDays = product.stock > 0 && avgDaily > 0
        ? Math.round(product.stock / avgDaily) : (product.stock > 0 ? Infinity : 0);

      return {
        success: true,
        data: {
          productId,
          historical: historicalDaily,
          forecast,
          avgDailySales: avgDaily,
          recentAvg: Math.round(last7Avg * 10) / 10,
          leadTimeDemand,
          stockDepletionDays,
          forecastMethod: 'Intelligent Moving Average',
        }
      };
    },

    async getAll(horizonDays = 14) {
      await simulateDelay(400);
      const results = [];
      for (const product of DemoData.products) {
        const fc = await this.generate(product.id, horizonDays);
        results.push({ ...fc.data, product });
      }
      return { success: true, data: results };
    },
  };

  // ── Reorder ──
  const Reorder = {
    async generatePlan(options = {}) {
      await simulateDelay(400);
      const {
        safetyStockDays = DemoData.shopConfig.safetyStockDays,
        reviewPeriodDays = DemoData.shopConfig.reviewPeriodDays,
      } = options;

      const recommendations = [];

      for (const product of DemoData.products) {
        const supplier = DemoData.getSupplier(product.supplierId);
        const leadTime = supplier ? supplier.leadTime : 3;
        const avgDaily = product.avgDailySales;

        // Forecast demand during lead time
        const forecastLeadTimeDemand = Math.round(avgDaily * leadTime);
        const safetyStock = Math.round(avgDaily * safetyStockDays);
        const reorderPoint = forecastLeadTimeDemand + safetyStock;

        // Net stock position
        const netStockPosition = product.stock + product.incomingStock - product.reservedStock;

        // Target stock: covers lead time + review period + safety stock
        const targetStock = Math.round(avgDaily * (leadTime + reviewPeriodDays + safetyStockDays));

        // Suggested order quantity
        let suggestedQty = Math.max(0, targetStock - netStockPosition);

        // Round to case pack size
        if (supplier && supplier.casePackSize > 1 && suggestedQty > 0) {
          suggestedQty = Math.ceil(suggestedQty / supplier.casePackSize) * supplier.casePackSize;
        }

        // Enforce minimum order quantity
        if (supplier && suggestedQty > 0 && suggestedQty < supplier.minOrderQty) {
          suggestedQty = supplier.minOrderQty;
        }

        // Shelf-life constraint
        let shelfLifeWarning = null;
        let shelfLifeCapped = false;
        const expiryDays = DemoData.daysUntil(product.expiryDate);
        if (product.shelfLifeDays && product.shelfLifeDays < 30) {
          const canSellBeforeExpiry = Math.round(avgDaily * product.shelfLifeDays);
          if (suggestedQty + product.stock > canSellBeforeExpiry) {
            const cappedQty = Math.max(0, canSellBeforeExpiry - product.stock);
            shelfLifeWarning = `Short shelf life (${product.shelfLifeDays}d). Capped order from ${suggestedQty} to ${cappedQty} to reduce waste.`;
            suggestedQty = cappedQty;
            shelfLifeCapped = true;
          }
        }

        // Expiry risk on existing stock
        let expiryRisk = null;
        if (expiryDays <= 5 && expiryDays > 0 && product.stock > 0) {
          const canSell = Math.round(avgDaily * expiryDays);
          const excessUnits = Math.max(0, product.stock - canSell);
          if (excessUnits > 0) {
            expiryRisk = `${excessUnits} units may expire before selling. Consider clearance pricing.`;
          }
        }

        // Determine priority/urgency
        let urgency, reason;
        const daysOfStock = avgDaily > 0 ? product.stock / avgDaily : Infinity;

        if (product.stock === 0 && product.incomingStock === 0) {
          urgency = 'critical';
          reason = 'Currently out of stock with no incoming orders.';
        } else if (daysOfStock < leadTime) {
          urgency = 'critical';
          reason = `Projected stockout before next delivery (${Math.round(daysOfStock * 10) / 10} days of stock vs ${leadTime} day lead time).`;
        } else if (netStockPosition <= reorderPoint) {
          urgency = 'high';
          reason = `Stock below reorder point (${netStockPosition} ≤ ${reorderPoint}).`;
        } else if (netStockPosition <= reorderPoint * 1.3) {
          urgency = 'medium';
          reason = `Stock approaching reorder point. Replenishment recommended soon.`;
        } else {
          urgency = 'low';
          reason = `Stock healthy. Optional replenishment to reach target level.`;
        }

        // Don't skip — include all products for visibility
        const estimatedArrival = new Date(Date.now() + leadTime * 86400000);
        const estimatedCost = suggestedQty * product.costPrice;
        const grossProfitPerUnit = product.sellingPrice - product.costPrice;

        const isVerified = product.openingStockVerified !== false;

        recommendations.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          icon: product.icon,
          currentStock: product.stock,
          incomingStock: product.incomingStock,
          avgDailySales: avgDaily,
          forecastLeadTimeDemand,
          safetyStock,
          reorderPoint,
          netStockPosition,
          targetStock,
          suggestedQty,
          supplierId: product.supplierId,
          supplierName: supplier ? supplier.name : 'Unknown',
          leadTime,
          estimatedArrival,
          shelfLifeDays: product.shelfLifeDays,
          shelfLifeWarning,
          shelfLifeCapped,
          expiryRisk,
          expiryDate: product.expiryDate,
          unitCost: product.costPrice,
          estimatedCost,
          grossProfitPerUnit,
          sellingPrice: product.sellingPrice,
          urgency,
          reason,
          openingStockVerified: isVerified,
          needsVerification: !isVerified
        });
      }

      // Sort by urgency (critical first), then by days of stock
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      recommendations.sort((a, b) => {
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency])
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        const aDays = a.avgDailySales > 0 ? a.currentStock / a.avgDailySales : Infinity;
        const bDays = b.avgDailySales > 0 ? b.currentStock / b.avgDailySales : Infinity;
        return aDays - bDays;
      });

      // Summary stats
      const needsReorder = recommendations.filter(r => r.suggestedQty > 0);
      const totalInvestment = needsReorder.reduce((s, r) => s + r.estimatedCost, 0);
      const criticalCount = recommendations.filter(r => r.urgency === 'critical').length;
      const highCount = recommendations.filter(r => r.urgency === 'high').length;
      const verifiedCount = recommendations.filter(r => r.openingStockVerified).length;
      const unverifiedCount = recommendations.filter(r => r.needsVerification).length;

      return {
        success: true,
        data: {
          recommendations,
          summary: {
            totalProducts: recommendations.length,
            needsReorder: needsReorder.length,
            totalInvestment,
            totalEstimatedCost: totalInvestment,
            criticalCount,
            highCount,
            mediumCount: recommendations.filter(r => r.urgency === 'medium').length,
            lowCount: recommendations.filter(r => r.urgency === 'low').length,
            verifiedCount,
            unverifiedCount
          }
        }
      };
    },
  };

  // ── Suppliers ──
  const Suppliers = {
    async getAll() {
      await simulateDelay();
      return { success: true, data: [...DemoData.suppliers] };
    },

    async getById(id) {
      await simulateDelay();
      return { success: true, data: DemoData.getSupplier(id) };
    },

    async create(supplierData) {
      await simulateDelay(300);
      const newSupplier = {
        ...supplierData,
        id: `SUP${String(DemoData.suppliers.length + 1).padStart(3, '0')}`,
      };
      DemoData.suppliers.push(newSupplier);
      return { success: true, data: newSupplier };
    },

    async update(id, updates) {
      await simulateDelay(300);
      const idx = DemoData.suppliers.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Supplier not found');
      DemoData.suppliers[idx] = { ...DemoData.suppliers[idx], ...updates };
      return { success: true, data: DemoData.suppliers[idx] };
    },
  };

  // ── Purchase Orders ──
  const PurchaseOrders = {
    async getAll(filters = {}) {
      await simulateDelay();
      let items = [...DemoData.purchaseOrders];
      if (filters.status) items = items.filter(o => o.status === filters.status);
      if (filters.supplierId) items = items.filter(o => o.supplierId === filters.supplierId);
      items.sort((a, b) => b.orderDate - a.orderDate);
      return { success: true, data: items };
    },

    async create(orderData) {
      await simulateDelay(300);
      const newOrder = {
        ...orderData,
        id: `PO-2024-${String(DemoData.purchaseOrders.length + 1).padStart(3, '0')}`,
        status: 'draft',
        orderDate: new Date(),
      };
      DemoData.purchaseOrders.push(newOrder);
      return { success: true, data: newOrder };
    },

    async updateStatus(id, status) {
      await simulateDelay(200);
      const order = DemoData.purchaseOrders.find(o => o.id === id);
      if (!order) throw new Error('Order not found');
      order.status = status;
      if (status === 'received') {
        order.receivedDate = new Date();
        // Update inventory
        order.items.forEach(item => {
          const product = DemoData.getProduct(item.productId);
          if (product) {
            product.stock += item.quantity;
            product.incomingStock = Math.max(0, product.incomingStock - item.quantity);
            item.received = item.quantity;
          }
        });
      }
      return { success: true, data: order };
    },

    async receivePartial(id, receivedItems) {
      await simulateDelay(200);
      const order = DemoData.purchaseOrders.find(o => o.id === id);
      if (!order) throw new Error('Order not found');

      receivedItems.forEach(ri => {
        const orderItem = order.items.find(i => i.productId === ri.productId);
        if (orderItem) {
          const product = DemoData.getProduct(ri.productId);
          if (product) {
            product.stock += ri.quantity;
            product.incomingStock = Math.max(0, product.incomingStock - ri.quantity);
          }
          orderItem.received = (orderItem.received || 0) + ri.quantity;
        }
      });

      const allReceived = order.items.every(i => (i.received || 0) >= i.quantity);
      order.status = allReceived ? 'received' : 'partially_received';

      return { success: true, data: order };
    },
  };

  // ── Reports ──
  const Reports = {
    async getSalesTrends(days = 30) {
      await simulateDelay();
      const dailyData = {};
      const cutoff = new Date(Date.now() - days * 86400000);

      DemoData.salesHistory.filter(s => s.date >= cutoff).forEach(s => {
        const key = s.date.toISOString().split('T')[0];
        if (!dailyData[key]) dailyData[key] = { date: key, revenue: 0, units: 0, transactions: 0 };
        dailyData[key].revenue += s.total;
        dailyData[key].units += s.quantitySold;
        dailyData[key].transactions++;
      });

      return { success: true, data: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)) };
    },

    async getInventoryValuation() {
      await simulateDelay();
      const byCategory = {};
      DemoData.products.forEach(p => {
        if (!byCategory[p.category]) byCategory[p.category] = { category: p.category, costValue: 0, retailValue: 0, units: 0 };
        byCategory[p.category].costValue += p.stock * p.costPrice;
        byCategory[p.category].retailValue += p.stock * p.sellingPrice;
        byCategory[p.category].units += p.stock;
      });
      return { success: true, data: Object.values(byCategory) };
    },

    async getSlowMoving(threshold = 2) {
      await simulateDelay();
      return {
        success: true,
        data: DemoData.products.filter(p => p.avgDailySales <= threshold && p.stock > 0)
          .sort((a, b) => a.avgDailySales - b.avgDailySales)
      };
    },

    async getExpiryRisks() {
      await simulateDelay();
      return {
        success: true,
        data: DemoData.products
          .filter(p => p.expiryDate && DemoData.daysUntil(p.expiryDate) <= 14 && p.stock > 0)
          .sort((a, b) => DemoData.daysUntil(a.expiryDate) - DemoData.daysUntil(b.expiryDate))
      };
    },
  };

  // ── Settings ──
  const Settings = {
    get(key, fallback = null) { return loadLocal(key, fallback); },
    set(key, value) { saveLocal(key, value); },

    getTheme() { return loadLocal('theme', 'light'); },
    setTheme(theme) {
      saveLocal('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    },

    getShopConfig() {
      return loadLocal('shopConfig', DemoData.shopConfig);
    },

    saveShopConfig(config) {
      saveLocal('shopConfig', config);
      Object.assign(DemoData.shopConfig, config);
    },
  };

  return {
    Auth,
    Products,
    Sales,
    Forecast,
    Reorder,
    Suppliers,
    PurchaseOrders,
    Reports,
    Settings,
    isDemo: () => isDemo,
    setDemoMode(val) {
      isDemo = !!val;
      localStorage.setItem('stocksense_is_demo', isDemo ? 'true' : 'false');
    },
    getBaseUrl: () => BASE_URL,
    setBaseUrl(url) {
      BASE_URL = url;
      localStorage.setItem('stocksense_api_base', url);
    },
    async checkBackendHealth() {
      try {
        const rootUrl = BASE_URL.replace(/\/api\/v1\/?$/, '');
        const res = await fetch(`${rootUrl}/health`, { method: 'GET' });
        return res.ok;
      } catch (e) {
        return false;
      }
    }
  };
})();
