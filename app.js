// Receipt System - Order Management Application
class ReceiptSystem {
    constructor() {
        this.orders = [];
        this.customers = [];
        this.items = [];
        this.payments = [];
        this.currentOrderId = null;
        this.profitChart = null;
        this.itemsChart = null;
        this.topCustomersChart = null;
        this.orderFrequencyChart = null;
        this.useAppScript = window.USE_APPSCRIPT || false;
        this.appScriptClient = null;
        this.isAuthenticated = false;
        this.eventListenersAttached = false;
        this.isCreatingCustomer = false;
        this.currentReceiptOrderId = null;
        
        console.log('🚀 ReceiptSystem constructor called');
        console.log('🔧 useAppScript:', this.useAppScript);
        console.log('🔧 USE_APPSCRIPT from window:', window.USE_APPSCRIPT);
        console.log('🔧 APPSCRIPT_URL from window:', window.APPSCRIPT_URL);
        
        this.init();
    }

    async init() {
        // Check if user is already authenticated
        this.checkAuthentication();
        
        if (this.isAuthenticated) {
            this.initializeApp();
        } else {
            this.setupLoginEventListeners();
        }
    }

    checkAuthentication() {
        // Check if user is already logged in (session storage)
        const isLoggedIn = sessionStorage.getItem('cremnl_authenticated');
        if (isLoggedIn === 'true') {
            this.isAuthenticated = true;
            this.showMainApp();
        }
    }

    setupLoginEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        // Clear previous error
        errorDiv.classList.remove('show');

        // Check credentials
        if (username === 'admin' && password === 'cremnl2025sd') {
            this.isAuthenticated = true;
            sessionStorage.setItem('cremnl_authenticated', 'true');
            this.showMainApp();
        } else {
            errorDiv.textContent = 'Invalid username or password. Please try again.';
            errorDiv.classList.add('show');
        }
    }

    showMainApp() {
        // Hide login form
        const loginContainer = document.getElementById('loginContainer');
        const mainApp = document.getElementById('mainApp');
        
        if (loginContainer) loginContainer.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        
        // Initialize the main application
        this.initializeApp();
    }

    async initializeApp() {
        this.initializeAppScript();
        this.loadData();
        this.setupEventListeners();
        this.setupLogoutListener();
        this.renderOrders();
        this.renderCustomers();
        this.renderItems();
        this.updateAnalytics();
        this.setDefaultDates();
    }

    setupLogoutListener() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    handleLogout() {
        // Clear authentication
        this.isAuthenticated = false;
        sessionStorage.removeItem('cremnl_authenticated');
        
        // Show login form
        const loginContainer = document.getElementById('loginContainer');
        const mainApp = document.getElementById('mainApp');
        
        if (loginContainer) loginContainer.style.display = 'flex';
        if (mainApp) mainApp.style.display = 'none';
        
        // Clear form
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const errorDiv = document.getElementById('loginError');
        
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (errorDiv) errorDiv.classList.remove('show');
    }

    initializeAppScript() {
        try {
            // Check if Google Apps Script is configured
            console.log('Checking Google Apps Script configuration...');
            console.log('USE_APPSCRIPT:', window.USE_APPSCRIPT);
            
            if (window.USE_APPSCRIPT && window.APPSCRIPT_URL) {
                this.useAppScript = true;
                this.appScriptClient = new AppScriptClient();
                this.appScriptClient.init(window.APPSCRIPT_URL);
                console.log('✅ Google Apps Script integration enabled');
            } else {
                console.log('📝 Using local storage for data');
            }
        } catch (error) {
            console.error('Error initializing Google Apps Script:', error);
            console.log('Falling back to local storage');
        }
    }

    async loadData() {
        // Start with empty data - no sample data
        this.customers = [];
        this.items = [];
        this.orders = [];
        this.payments = [];
        
        // If Apps Script is enabled, try to fetch data from Google Sheets first
        if (this.useAppScript && this.appScriptClient) {
            try {
                console.log('🔄 Attempting to sync data from Google Sheets...');
                await this.syncDataFromGoogleSheets(false); // Don't show alerts for automatic sync
                console.log('✅ Data synced from Google Sheets successfully');
                return; // Exit early if sync was successful
            } catch (error) {
                console.warn('⚠️ Failed to sync from Google Sheets, falling back to local storage:', error);
            }
        }
        
        // Fallback to local storage if Apps Script sync fails or is disabled
        this.loadFromLocalStorage();
        this.saveToLocalStorage();
        
        // Populate filter dropdowns after data is loaded
        this.populateFilterDropdowns();
        
        // Ensure order statuses are consistent with payment-based logic
        this.syncOrderStatuses();
    }

    async fetchDataFromGoogleSheets() {
        try {
            // Fetch all data types from Google Sheets
            const [customersResponse, itemsResponse, ordersResponse, paymentsResponse] = await Promise.all([
                this.appScriptClient.getData('customers'),
                this.appScriptClient.getData('items'),
                this.appScriptClient.getData('orders'),
                this.appScriptClient.getData('payments')
            ]);

            // Process customers data
            if (customersResponse.success && customersResponse.data) {
                this.customers = customersResponse.data.map(customer => ({
                    id: customer.ID.toString(),
                    name: customer.Name,
                    email: customer.Email || null,
                    phone: customer.Phone || null,
                    created_at: customer['Created At']
                }));
                console.log('Loaded customers from Google Sheets:', this.customers.length);
            }

            // Process items data
            if (itemsResponse.success && itemsResponse.data) {
                this.items = itemsResponse.data.map(item => ({
                    id: item.ID.toString(),
                    name: item.Name,
                    size: item.Size,
                    cost_to_make: parseFloat(item['Cost to Make']),
                    price: parseFloat(item.Price),
                    created_at: item['Created At']
                }));
                console.log('Loaded items from Google Sheets:', this.items.length);
            }

            // Process orders data
            if (ordersResponse.success && ordersResponse.data) {
                this.orders = ordersResponse.data.map(order => ({
                    id: order.ID.toString(), // Ensure ID is always a string
                    customer_id: order['Customer ID'],
                    status: order.Status,
                    date_ordered: order['Date Ordered'],
                    date_completed: order['Date Completed'] || null,
                    items: JSON.parse(order['Items JSON'] || '[]')
                }));
                console.log('Loaded orders from Google Sheets:', this.orders.length);
            }

            // Process payments data
            if (paymentsResponse.success && paymentsResponse.data) {
                this.payments = paymentsResponse.data.map(payment => ({
                    id: payment.ID.toString(),
                    order_id: payment['Order ID'],
                    receipt_id: payment['Receipt ID'],
                    refid: payment['Ref ID'],
                    method: payment.Method,
                    amount_due: parseFloat(payment['Amount Due']),
                    amount_paid: parseFloat(payment['Amount Paid']),
                    balance: parseFloat(payment.Balance),
                    paid_at: payment['Paid At']
                }));
                console.log('Loaded payments from Google Sheets:', this.payments.length);
            }

        } catch (error) {
            console.error('Error fetching data from Google Sheets:', error);
            throw error;
        }
    }

    async syncDataFromGoogleSheets(showAlert = true) {
        if (!this.useAppScript || !this.appScriptClient) {
            if (showAlert) {
                alert('Google Sheets integration is not enabled. Please check your configuration.');
            }
            return;
        }

        try {
            if (showAlert) {
                this.showLoading('Syncing data from Google Sheets...');
            }
            
            // Fetch all data types from Google Sheets
            const [customersResponse, itemsResponse, ordersResponse, paymentsResponse] = await Promise.all([
                this.appScriptClient.getData('customers'),
                this.appScriptClient.getData('items'),
                this.appScriptClient.getData('orders'),
                this.appScriptClient.getData('payments')
            ]);

            let syncedCount = 0;

            // Process customers data
            if (customersResponse.success && customersResponse.data) {
                this.customers = customersResponse.data.map(customer => ({
                    id: customer.ID.toString(),
                    name: customer.Name,
                    email: customer.Email || null,
                    phone: customer.Phone || null,
                    created_at: customer['Created At']
                }));
                syncedCount += this.customers.length;
                console.log('✅ Synced customers from Google Sheets:', this.customers.length);
                console.log('Customer IDs:', this.customers.map(c => ({ id: c.id, name: c.name, type: typeof c.id })));
            }

            // Process items data
            if (itemsResponse.success && itemsResponse.data) {
                this.items = itemsResponse.data.map(item => ({
                    id: item.ID.toString(),
                    name: item.Name,
                    size: item.Size,
                    cost_to_make: parseFloat(item['Cost to Make']),
                    price: parseFloat(item.Price),
                    created_at: item['Created At']
                }));
                syncedCount += this.items.length;
                console.log('✅ Synced items from Google Sheets:', this.items.length);
            }

            // Process orders data
            if (ordersResponse.success && ordersResponse.data) {
                this.orders = ordersResponse.data.map(order => ({
                    id: order.ID.toString(), // Ensure ID is always a string
                    customer_id: order['Customer ID'].toString(), // Ensure customer_id is also a string
                    status: order.Status,
                    date_ordered: order['Date Ordered'],
                    date_completed: order['Date Completed'] || null,
                    items: JSON.parse(order['Items JSON'] || '[]')
                }));
                syncedCount += this.orders.length;
                console.log('✅ Synced orders from Google Sheets:', this.orders.length);
                console.log('Order customer IDs:', this.orders.map(o => ({ orderId: o.id, customerId: o.customer_id, type: typeof o.customer_id })));
            }

            // Process payments data
            if (paymentsResponse.success && paymentsResponse.data) {
                this.payments = paymentsResponse.data.map(payment => ({
                    id: payment.ID.toString(),
                    order_id: payment['Order ID'].toString(), // Ensure order_id is also a string
                    receipt_id: payment['Receipt ID'],
                    refid: payment['Ref ID'],
                    method: payment.Method,
                    amount_due: parseFloat(payment['Amount Due']),
                    amount_paid: parseFloat(payment['Amount Paid']),
                    balance: parseFloat(payment.Balance),
                    paid_at: payment['Paid At']
                }));
                syncedCount += this.payments.length;
                console.log('✅ Synced payments from Google Sheets:', this.payments.length);
                console.log('Payment order IDs:', this.payments.map(p => ({ paymentId: p.id, orderId: p.order_id, type: typeof p.order_id })));
            }

            // Update order status based on payments (payment-based logic)
            this.orders.forEach(order => {
                const hasPayment = this.payments.some(payment => payment.order_id === order.id);
                if (hasPayment && order.status !== 'completed') {
                    order.status = 'completed';
                    // Set date_completed to the payment date if not already set
                    if (!order.date_completed) {
                        const payment = this.payments.find(p => p.order_id === order.id);
                        if (payment && payment.paid_at) {
                            order.date_completed = payment.paid_at;
                        }
                    }
                    console.log(`✅ Updated order ${order.id} status to completed based on payment`);
                }
            });

            // Save to local storage
            this.saveToLocalStorage();

            // Update UI
            this.renderCustomers();
            this.renderItems();
            this.renderOrders();
            this.updateAnalytics();
            this.populateFilterDropdowns();

            if (showAlert) {
                this.hideLoading();
                
                // Show success message
                alert(`✅ Successfully synced ${syncedCount} records from Google Sheets!\n\n- Customers: ${this.customers.length}\n- Items: ${this.items.length}\n- Orders: ${this.orders.length}\n- Payments: ${this.payments.length}\n\nAnalytics have been updated with the latest data.`);
            }

        } catch (error) {
            if (showAlert) {
                this.hideLoading();
                console.error('Error syncing data from Google Sheets:', error);
                alert('❌ Failed to sync data from Google Sheets. Please check your internet connection and try again.\n\nError: ' + error.message);
            } else {
                console.error('Error syncing data from Google Sheets:', error);
                throw error; // Re-throw for automatic sync
            }
        }
    }

    loadFromLocalStorage() {
        try {
            const savedCustomers = localStorage.getItem('receiptSystem_customers');
            const savedItems = localStorage.getItem('receiptSystem_items');
            const savedOrders = localStorage.getItem('receiptSystem_orders');
            const savedPayments = localStorage.getItem('receiptSystem_payments');

            if (savedCustomers) this.customers = JSON.parse(savedCustomers);
            if (savedItems) this.items = JSON.parse(savedItems);
            if (savedOrders) this.orders = JSON.parse(savedOrders);
            if (savedPayments) this.payments = JSON.parse(savedPayments);

            console.log('📁 Data loaded from localStorage');
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('receiptSystem_customers', JSON.stringify(this.customers));
            localStorage.setItem('receiptSystem_items', JSON.stringify(this.items));
            localStorage.setItem('receiptSystem_orders', JSON.stringify(this.orders));
            localStorage.setItem('receiptSystem_payments', JSON.stringify(this.payments));
            console.log('💾 Data saved to localStorage');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    setupEventListeners() {
        // Prevent duplicate event listeners
        if (this.eventListenersAttached) {
            console.log('⚠️ Event listeners already attached, skipping...');
            return;
        }
        
        console.log('🔧 Setting up event listeners...');
        
        // Navigation tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    this.switchTab(e.currentTarget.dataset.tab);
                });
            }
        });

        // Order management
        const addOrderBtn = document.getElementById('addOrderBtn');
        if (addOrderBtn) {
            addOrderBtn.addEventListener('click', () => {
                this.openOrderModal();
            });
        }

        const addOrderItemBtn = document.getElementById('addOrderItemBtn');
        if (addOrderItemBtn) {
            addOrderItemBtn.addEventListener('click', () => {
                this.addOrderItemRow();
            });
        }

        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createOrder();
            });
        }

        const cancelOrder = document.getElementById('cancelOrder');
        if (cancelOrder) {
            cancelOrder.addEventListener('click', () => {
                this.closeModal('orderModal');
            });
        }

        // Payment processing
        const paymentMethod = document.getElementById('paymentMethod');
        if (paymentMethod) {
            paymentMethod.addEventListener('change', (e) => {
                this.toggleRefIdField(e.target.value);
            });
        }

        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processPayment();
            });
        }

        // Add real-time balance update when amount paid changes
        const amountPaidInput = document.getElementById('amountPaid');
        if (amountPaidInput) {
            amountPaidInput.addEventListener('input', () => {
                this.updateBalance();
            });
        }

        const cancelPayment = document.getElementById('cancelPayment');
        if (cancelPayment) {
            cancelPayment.addEventListener('click', () => {
                this.closeModal('paymentModal');
            });
        }

        // Customer management
        const addCustomerBtn = document.getElementById('addCustomerBtn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => {
                this.openCustomerModal();
            });
        }

        const customerForm = document.getElementById('customerForm');
        if (customerForm) {
            customerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createCustomer();
            });
        }

        const cancelCustomer = document.getElementById('cancelCustomer');
        if (cancelCustomer) {
            cancelCustomer.addEventListener('click', () => {
                this.closeModal('customerModal');
            });
        }

        // Item management
        const addItemBtn = document.getElementById('addItemBtn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                console.log('Add Item button clicked');
                this.openItemModal();
            });
            console.log('Add Item button event listener attached');
        } else {
            console.error('Add Item button not found');
        }

        const itemForm = document.getElementById('itemForm');
        if (itemForm) {
            itemForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Item form submitted');
                this.createItem();
            });
        }

        const cancelItem = document.getElementById('cancelItem');
        if (cancelItem) {
            cancelItem.addEventListener('click', () => {
                this.closeModal('itemModal');
            });
        }

        // Analytics
        const updateAnalytics = document.getElementById('updateAnalytics');
        if (updateAnalytics) {
            updateAnalytics.addEventListener('click', () => {
                this.updateAnalytics();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.renderOrders();
            });
        }

        // Date filter
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    const customDateRange = document.getElementById('customDateRange');
                    if (customDateRange) customDateRange.style.display = 'flex';
                } else {
                    const customDateRange = document.getElementById('customDateRange');
                    if (customDateRange) customDateRange.style.display = 'none';
                    this.renderOrders();
                }
            });
        }

        // Customer filter
        const customerFilter = document.getElementById('customerFilter');
        if (customerFilter) {
            customerFilter.addEventListener('change', () => {
                this.renderOrders();
            });
        }

        // Item filter
        const itemFilter = document.getElementById('itemFilter');
        if (itemFilter) {
            itemFilter.addEventListener('change', () => {
                this.renderOrders();
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Custom date range
        const applyDateRangeBtn = document.getElementById('applyDateRangeBtn');
        if (applyDateRangeBtn) {
            applyDateRangeBtn.addEventListener('click', () => {
                this.renderOrders();
            });
        }

        // Print receipt
        const printReceipt = document.getElementById('printReceipt');
        if (printReceipt) {
            printReceipt.addEventListener('click', () => {
                this.printReceipt();
            });
        }

        // Save receipt as photo
        const saveReceiptPhoto = document.getElementById('saveReceiptPhoto');
        console.log('Save receipt photo button found:', saveReceiptPhoto);
        if (saveReceiptPhoto) {
            console.log('Adding event listener to save receipt photo button');
            saveReceiptPhoto.addEventListener('click', () => {
                this.saveReceiptAsPhoto();
            });
        } else {
            console.error('Save receipt photo button not found!');
        }

        // Modal close buttons
        document.querySelectorAll('.close').forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    const modal = e.target.closest('.modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                });
            }
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Event delegation for dynamically created buttons
        document.addEventListener('click', (e) => {
            // Handle process payment buttons
            if (e.target.closest('.process-payment-btn')) {
                console.log('Process payment button clicked');
                const button = e.target.closest('.process-payment-btn');
                const orderId = button.getAttribute('data-order-id');
                console.log('Order ID:', orderId);
                if (orderId) {
                    e.preventDefault();
                    this.processPaymentModal(orderId);
                }
            }
            
            // Handle view receipt buttons
            if (e.target.closest('.view-receipt-btn')) {
                const button = e.target.closest('.view-receipt-btn');
                const orderId = button.getAttribute('data-order-id');
                if (orderId) {
                    e.preventDefault();
                    this.viewReceipt(orderId);
                }
            }
            
            // Handle edit order buttons
            if (e.target.closest('.edit-order-btn')) {
                const button = e.target.closest('.edit-order-btn');
                const orderId = button.getAttribute('data-order-id');
                if (orderId) {
                    e.preventDefault();
                    this.editOrder(orderId);
                }
            }
            
            // Handle delete order buttons
            if (e.target.closest('.delete-order-btn')) {
                const button = e.target.closest('.delete-order-btn');
                const orderId = button.getAttribute('data-order-id');
                if (orderId) {
                    e.preventDefault();
                    this.deleteOrder(orderId);
                }
            }
        });
        
        // Mark that event listeners have been attached
        this.eventListenersAttached = true;
        console.log('✅ Event listeners attached successfully');
    }

    switchTab(tabName) {
        // Validate tab name exists
        const navButton = document.querySelector(`[data-tab="${tabName}"]`);
        const tabContent = document.getElementById(tabName);
        
        if (!navButton || !tabContent) {
            console.warn(`Tab '${tabName}' not found`);
            return;
        }

        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn && btn.classList) {
                btn.classList.remove('active');
            }
        });
        if (navButton && navButton.classList) {
            navButton.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content && content.classList) {
                content.classList.remove('active');
            }
        });
        if (tabContent && tabContent.classList) {
            tabContent.classList.add('active');
        }

        // Update analytics when switching to analytics tab
        if (tabName === 'analytics') {
            this.updateAnalytics();
        }
        
        // Update customer analytics and refresh data when switching to customers tab
        if (tabName === 'customers') {
            this.refreshDataFromBackend(tabName);
            this.updateCustomerAnalytics(this.orders);
        }
        
        // Refresh data from Google Sheets when switching to orders tab
        if (tabName === 'orders') {
            this.refreshDataFromBackend(tabName);
        }
    }

    async refreshDataFromBackend(tabName = 'orders') {
        console.log(`🔄 Refreshing data from backend when switching to ${tabName} tab...`);
        
        try {
            // Show a subtle loading indicator with appropriate message
            const loadingMessage = tabName === 'customers' 
                ? 'Refreshing customers from Google Sheets...' 
                : 'Refreshing orders from Google Sheets...';
            this.showLoading(loadingMessage);
            
            // Sync data from Google Sheets without showing the success alert
            await this.syncDataFromGoogleSheets(false);
            
            // Re-render the appropriate content based on tab
            if (tabName === 'customers') {
                this.renderCustomers();
                console.log('✅ Customers tab data refreshed successfully');
            } else if (tabName === 'orders') {
                this.renderOrders();
                console.log('✅ Orders tab data refreshed successfully');
            }
            
        } catch (error) {
            console.error('❌ Error refreshing data from backend:', error);
            alert('Error refreshing data from Google Sheets. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    loadSampleData() {
        // No sample data - start with empty arrays
        this.customers = [];
        this.items = [];
        this.orders = [];
        this.payments = [];
    }

    openOrderModal() {
        this.populateCustomerSelect();
        this.populateItemSelects();
        document.getElementById('orderModal').style.display = 'block';
    }

    populateCustomerSelect() {
        const select = document.getElementById('customerSelect');
        select.innerHTML = '<option value="">Select Customer</option>';
        this.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });
    }

    populateItemSelects() {
        document.querySelectorAll('.item-select').forEach(select => {
            select.innerHTML = '<option value="">Select Item</option>';
            this.items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.name} (${item.size}) - ₱${item.price.toFixed(2)}`;
                select.appendChild(option);
            });
        });
    }

    addOrderItemRow() {
        const container = document.getElementById('orderItems');
        const row = document.createElement('div');
        row.className = 'order-item-row';
        row.innerHTML = `
            <select class="item-select" required>
                <option value="">Select Item</option>
            </select>
            <input type="number" class="quantity-input" placeholder="Qty" min="1" value="1" required>
            <button type="button" class="btn btn-danger remove-item">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(row);
        this.populateItemSelects();
        
        // Add remove functionality
        row.querySelector('.remove-item').addEventListener('click', () => {
            row.remove();
        });
    }

    async createOrder() {
        const customerId = document.getElementById('customerSelect').value;
        const itemRows = document.querySelectorAll('.order-item-row');
        const form = document.getElementById('orderForm');
        const isEditing = form.dataset.editingId;
        
        if (!customerId || itemRows.length === 0) {
            alert('Please select a customer and add at least one item.');
            return;
        }

        // Check if items are available
        if (!this.items || this.items.length === 0) {
            alert('No items available. Please add some items first or sync from Google Sheets.');
            return;
        }

        const orderItems = [];
        let totalCost = 0;
        let totalSales = 0;

        itemRows.forEach(row => {
            const itemId = row.querySelector('.item-select').value;
            const quantity = parseInt(row.querySelector('.quantity-input').value);
            
            if (itemId && quantity > 0) {
                const item = this.items.find(i => i.id === itemId);
                
                if (!item) {
                    console.error(`Item with ID ${itemId} not found`);
                    alert(`Error: Item with ID ${itemId} not found. Please refresh the page and try again.`);
                    return;
                }
                
                if (typeof item.cost_to_make !== 'number' || typeof item.price !== 'number') {
                    console.error(`Invalid item data for ID ${itemId}:`, item);
                    alert(`Error: Invalid item data for "${item.name}". Please check the item details.`);
                    return;
                }
                
                const cost = item.cost_to_make * quantity;
                const sales = item.price * quantity;
                const profit = sales - cost;
                
                orderItems.push({
                    item_id: itemId,
                    quantity: quantity,
                    cost: cost,
                    sales: sales,
                    profit: profit
                });
                
                totalCost += cost;
                totalSales += sales;
            }
        });

        if (orderItems.length === 0) {
            alert('Please add at least one valid item.');
            return;
        }

        this.showLoading(isEditing ? 'Updating order...' : 'Creating order...');
        
        try {
            if (isEditing) {
                // Update existing order
                const orderIndex = this.orders.findIndex(o => o.id === isEditing);
                if (orderIndex !== -1) {
                    const existingOrder = this.orders[orderIndex];
                    
                    // Preserve the original date_ordered and status
                    const updatedOrder = {
                        ...existingOrder,
                        customer_id: customerId,
                        items: orderItems
                    };
                    
                    this.orders[orderIndex] = updatedOrder;
                    this.saveToLocalStorage();
                    
                    // Update in Google Sheets
                    if (this.useAppScript && this.appScriptClient) {
                        try {
                            await this.appScriptClient.updateOrder(updatedOrder);
                            console.log('✅ Order updated in Google Sheets via Apps Script');
                        } catch (error) {
                            console.warn('⚠️ Failed to update in Apps Script, but updated locally:', error);
                        }
                    }
                    
                    this.renderOrders();
                    this.closeModal('orderModal');
                    this.resetOrderForm();
                    this.hideLoading();
                    alert('Order updated successfully!');
                } else {
                    this.hideLoading();
                    alert('Order not found for editing.');
                }
            } else {
                // Create new order
                const newOrder = {
                    id: Date.now().toString(),
                    customer_id: customerId,
                    status: 'pending',
                    date_ordered: new Date(),
                    date_completed: null,
                    items: orderItems
                };

                this.orders.push(newOrder);
                this.saveToLocalStorage();
                
                // Also save to Apps Script if enabled
                if (this.useAppScript && this.appScriptClient) {
                    try {
                        await this.appScriptClient.saveOrder(newOrder);
                        console.log('✅ Order saved to Google Sheets via Apps Script');
                    } catch (error) {
                        console.warn('⚠️ Failed to save to Apps Script, but saved locally:', error);
                    }
                }
                
                this.renderOrders();
                this.closeModal('orderModal');
                this.resetOrderForm();
                this.hideLoading();
                alert('Order created successfully!');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Error processing order:', error);
            alert('Error processing order. Please try again.');
        }
    }

    resetOrderForm() {
        const form = document.getElementById('orderForm');
        form.reset();
        
        // Clear editing state
        delete form.dataset.editingId;
        
        // Reset form title and button
        const modalTitle = document.querySelector('#orderModal .modal-header h3');
        const submitButton = document.querySelector('#orderForm button[type="submit"]');
        
        if (modalTitle) {
            modalTitle.textContent = 'Add New Order';
        }
        if (submitButton) {
            submitButton.textContent = 'Create Order';
        }
        
        document.getElementById('orderItems').innerHTML = `
            <div class="order-item-row">
                <select class="item-select" required>
                    <option value="">Select Item</option>
                </select>
                <input type="number" class="quantity-input" placeholder="Qty" min="1" value="1" required>
                <button type="button" class="btn btn-danger remove-item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        this.populateItemSelects();
    }

    renderOrders() {
        const container = document.getElementById('ordersList');
        if (!container) return;
        
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const dateFilter = document.getElementById('dateFilter')?.value || '';
        const customerFilter = document.getElementById('customerFilter')?.value || '';
        const itemFilter = document.getElementById('itemFilter')?.value || '';
        
        let filteredOrders = this.orders;
        
        // Status filter (using payment-based logic)
        if (statusFilter) {
            filteredOrders = filteredOrders.filter(order => {
                const hasPayment = this.payments.some(payment => payment.order_id === order.id);
                const orderStatus = hasPayment ? 'completed' : 'pending';
                return orderStatus === statusFilter;
            });
        }
        
        // Date filter
        if (dateFilter && dateFilter !== 'custom') {
            filteredOrders = this.filterOrdersByDate(filteredOrders, dateFilter);
        } else if (dateFilter === 'custom') {
            const startDateEl = document.getElementById('startDate');
            const endDateEl = document.getElementById('endDate');
            if (startDateEl && endDateEl) {
                const startDate = startDateEl.value;
                const endDate = endDateEl.value;
                if (startDate && endDate) {
                    filteredOrders = filteredOrders.filter(order => {
                        const orderDate = new Date(order.date_ordered);
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        return orderDate >= start && orderDate <= end;
                    });
                }
            }
        }
        
        // Customer filter
        if (customerFilter) {
            filteredOrders = filteredOrders.filter(order => order.customer_id === customerFilter);
        }
        
        // Item filter
        if (itemFilter) {
            filteredOrders = filteredOrders.filter(order => 
                order.items.some(item => item.item_id === itemFilter)
            );
        }

        if (filteredOrders.length === 0) {
            container.innerHTML = '<p class="no-data">No orders found.</p>';
            return;
        }

        container.innerHTML = filteredOrders.map(order => {
            const customer = this.customers.find(c => c.id === order.customer_id);
            
            // Debug logging for customer lookup issues
            if (!customer) {
                console.warn(`Customer not found for order ${order.id}. Customer ID: ${order.customer_id} (type: ${typeof order.customer_id})`);
                console.log('Available customers:', this.customers.map(c => ({ id: c.id, name: c.name, type: typeof c.id })));
            }
            
            // Check if order has a payment (if yes, it's completed)
            const hasPayment = this.payments.some(payment => payment.order_id === order.id);
            const orderStatus = hasPayment ? 'completed' : 'pending';
            
            
            const totalSales = order.items.reduce((sum, item) => sum + (item.sales || 0), 0);
            const totalCost = order.items.reduce((sum, item) => sum + (item.cost || 0), 0);
            const totalProfit = totalSales - totalCost;

            return `
                <div class="order-card">
                    <div class="order-header">
                        <span class="order-id">Order #${order.id}</span>
                        <span class="order-status status-${orderStatus}">${orderStatus}</span>
                    </div>
                    <div class="order-details">
                        <div class="order-detail">
                            <label>Customer</label>
                            <span>${customer ? customer.name : 'Unknown'}</span>
                        </div>
                        <div class="order-detail">
                            <label>Date Ordered</label>
                            <span>${this.formatDateTime(order.date_ordered)}</span>
                        </div>
                        <div class="order-detail">
                            <label>Date Completed</label>
                            <span>${hasPayment ? this.formatDateTime(this.payments.find(p => p.order_id === order.id).paid_at) : 'N/A'}</span>
                        </div>
                        <div class="order-detail">
                            <label>Total Sales</label>
                            <span>₱${totalSales.toFixed(2)}</span>
                        </div>
                        <div class="order-detail">
                            <label>Total Profit</label>
                            <span>₱${totalProfit.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="order-items">
                        <h4>Items:</h4>
                        <div class="item-list">
                            ${order.items.map(item => {
                                const itemData = this.items.find(i => i.id === item.item_id);
                                return `
                                    <div class="item-row">
                                        <span class="item-name">${itemData ? itemData.name : 'Unknown'} (${itemData ? itemData.size : 'N/A'})</span>
                                        <span class="item-quantity">Qty: ${item.quantity}</span>
                                        <span class="item-price">₱${item.sales.toFixed(2)}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="order-total">Total: ₱${totalSales.toFixed(2)}</div>
                    <div class="order-actions">
                        ${orderStatus === 'pending' ? `
                            <button class="btn btn-primary process-payment-btn" data-order-id="${order.id}">
                                <i class="fas fa-credit-card"></i> Process Payment
                            </button>
                        ` : `
                            <button class="btn btn-primary view-receipt-btn" data-order-id="${order.id}">
                                <i class="fas fa-receipt"></i> View Receipt
                            </button>
                        `}
                        <button class="btn btn-secondary edit-order-btn" data-order-id="${order.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger delete-order-btn" data-order-id="${order.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }


    processPaymentModal(orderId) {
        console.log('Processing payment for order:', orderId);
        console.log('Available orders:', this.orders.map(o => o.id));
        
        this.currentOrderId = orderId;
        const order = this.orders.find(o => o.id == orderId); // Use == for type coercion
        if (order) {
            console.log('Order found:', order);
            const totalSales = order.items.reduce((sum, item) => sum + item.sales, 0);
            // Set amount due with peso symbol to match HTML structure
            document.getElementById('amountDue').textContent = `₱${totalSales.toFixed(2)}`;
            document.getElementById('amountPaid').value = totalSales.toFixed(2);
            this.updateBalance();
            document.getElementById('paymentModal').style.display = 'block';
            console.log('Payment modal opened');
        } else {
            console.error('Order not found:', orderId);
            console.error('Available order IDs:', this.orders.map(o => o.id));
            alert(`Error: Order with ID ${orderId} not found. The order may have been deleted or there's a data sync issue. Please refresh the page and try again.`);
        }
    }

    toggleRefIdField(method) {
        const refIdGroup = document.getElementById('refIdGroup');
        const refIdInput = document.getElementById('refId');
        
        if (method === 'cash') {
            refIdGroup.style.display = 'none';
            refIdInput.value = 'cash payment';
        } else {
            refIdGroup.style.display = 'block';
            refIdInput.value = '';
            refIdInput.required = true;
        }
    }

    updateBalance() {
        const amountDueText = document.getElementById('amountDue').textContent;
        const amountDue = parseFloat(amountDueText.replace(/[₱$,]/g, '')) || 0;
        const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
        const balance = amountDue - amountPaid;
        document.getElementById('balance').textContent = `₱${balance.toFixed(2)}`;
    }

    async processPayment() {
        const method = document.getElementById('paymentMethod').value;
        const refId = document.getElementById('refId').value;
        const amountPaidInput = document.getElementById('amountPaid').value;
        const amountDueText = document.getElementById('amountDue').textContent;

        if (!method || !refId || !amountPaidInput) {
            alert('Please fill in all payment fields.');
            return;
        }

        // Parse amounts more safely
        const amountPaid = parseFloat(amountPaidInput);
        const amountDue = parseFloat(amountDueText.replace(/[₱$,]/g, '')); // Remove currency symbols and commas

        // Debug logging for amount calculations
        console.log('Payment processing debug:');
        console.log('- amountPaidInput:', amountPaidInput);
        console.log('- amountDueText:', amountDueText);
        console.log('- parsed amountPaid:', amountPaid);
        console.log('- parsed amountDue:', amountDue);

        if (isNaN(amountPaid) || isNaN(amountDue)) {
            console.error('Invalid amount values detected:', { amountPaid, amountDue });
            alert('Invalid amount values. Please check the payment amounts.');
            return;
        }

        const order = this.orders.find(o => o.id === this.currentOrderId);
        if (order) {
            const receiptId = this.generateReceiptId();
            const payment = {
                id: Date.now().toString(),
                order_id: this.currentOrderId,
                receipt_id: receiptId,
                refid: refId,
                method: method,
                amount_due: amountDue,
                amount_paid: amountPaid,
                balance: amountDue - amountPaid,
                paid_at: new Date()
            };

            this.showLoading('Processing payment...');
            
            try {
                this.payments.push(payment);
                
                // Update the order status to completed locally
                const orderIndex = this.orders.findIndex(o => o.id === this.currentOrderId);
                if (orderIndex !== -1) {
                    this.orders[orderIndex].status = 'completed';
                    this.orders[orderIndex].date_completed = new Date();
                    console.log('✅ Order status updated to completed locally');
                }
                
                this.saveToLocalStorage();
                
                // Also save to Apps Script if enabled
                if (this.useAppScript && this.appScriptClient) {
                    try {
                        // Save the payment
                        await this.appScriptClient.savePayment(payment);
                        console.log('✅ Payment saved to Google Sheets via Apps Script');
                        
                        // Update the order status in Google Sheets
                        if (orderIndex !== -1) {
                            console.log('🔄 Updating order status in Google Sheets...');
                            console.log('Order ID:', this.currentOrderId);
                            console.log('Order ID type:', typeof this.currentOrderId);
                            
                            const updateResult = await this.appScriptClient.updateOrder({
                                id: this.currentOrderId,
                                status: 'completed',
                                date_completed: new Date()
                            });
                            
                            console.log('Update result:', updateResult);
                            if (updateResult.success) {
                                console.log('✅ Order status updated in Google Sheets');
                            } else {
                                console.error('❌ Failed to update order status in Google Sheets:', updateResult.message);
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️ Failed to save to Apps Script, but saved locally:', error);
                    }
                }
                
                this.renderOrders();
                this.updateAnalytics();
                this.closeModal('paymentModal');
                this.hideLoading();
                this.viewReceipt(this.currentOrderId);
            } catch (error) {
                this.hideLoading();
                console.error('Error processing payment:', error);
                alert('Error processing payment. Please try again.');
            }
        }
    }

    generateReceiptId() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `RCP-${timestamp}-${random}`;
    }

    viewReceipt(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        const payment = this.payments.find(p => p.order_id === orderId);
        const customer = this.customers.find(c => c.id === order.customer_id);

        if (!order || !payment) {
            alert('Receipt not found.');
            return;
        }

        // Store the current order ID for mobile screenshot functionality
        this.currentReceiptOrderId = orderId;

        const receiptContent = document.getElementById('receiptContent');
        receiptContent.innerHTML = `
            <div class="receipt-header">
                <h2>CRE.MNL</h2>
                <p>Pasig City</p>
                <p>Phone: +639277747832</p>
            </div>
            <div class="receipt-info">
                <p><strong>Receipt ID:</strong> ${payment.receipt_id}</p>
                <p><strong>Date & Time:</strong> ${this.formatDateTime(payment.paid_at)}</p>
                <p><strong>Customer:</strong> ${customer ? customer.name : 'Unknown'}</p>
                <p><strong>Ref ID:</strong> ${payment.refid}</p>
            </div>
            <div class="receipt-items">
                ${order.items.map(item => {
                    const itemData = this.items.find(i => i.id === item.item_id);
                    return `
                        <div class="receipt-item">
                            <span>${itemData ? itemData.name : 'Unknown'} (${itemData ? itemData.size : 'N/A'}) x${item.quantity}</span>
                            <span>₱${item.sales.toFixed(2)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="receipt-totals">
                <div class="receipt-total">
                    <span>Amount Due:</span>
                    <span>₱${payment.amount_due.toFixed(2)}</span>
                </div>
                <div class="receipt-total">
                    <span>Total Paid:</span>
                    <span>₱${payment.amount_paid.toFixed(2)}</span>
                </div>
                <div class="receipt-total">
                    <span>Balance:</span>
                    <span>₱${payment.balance.toFixed(2)}</span>
                </div>
            </div>
            <div class="receipt-footer">
                <p>Thank you for your business!</p>
                <p>Payment Method: ${payment.method.toUpperCase()}</p>
            </div>
        `;

        document.getElementById('receiptModal').style.display = 'block';
        
        // Debug: Check if save button exists after modal is shown
        setTimeout(() => {
            const saveBtn = document.getElementById('saveReceiptPhoto');
            console.log('Save button after modal shown:', saveBtn);
            if (saveBtn) {
                console.log('Save button is visible:', saveBtn.offsetWidth > 0 && saveBtn.offsetHeight > 0);
                console.log('Save button computed style:', window.getComputedStyle(saveBtn).display);
            }
        }, 100);
    }

    printReceipt() {
        const receiptContent = document.getElementById('receiptContent').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt</title>
                    <style>
                        body { font-family: 'Courier New', monospace; margin: 20px; }
                        .receipt-header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 15px; }
                        .receipt-info { margin-bottom: 20px; font-size: 12px; }
                        .receipt-item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .receipt-totals { border-top: 2px dashed #000; padding-top: 15px; margin-bottom: 20px; }
                        .receipt-total { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; }
                        .receipt-footer { text-align: center; font-size: 12px; border-top: 2px dashed #000; padding-top: 15px; }
                    </style>
                </head>
                <body>
                    ${receiptContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    async saveReceiptAsPhoto() {
        try {
            const receiptContent = document.getElementById('receiptContent');
            if (!receiptContent) {
                alert('Receipt content not found.');
                return;
            }

            // Detect mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // For mobile, use a simpler approach - open receipt in new tab for screenshot
                this.openReceiptForMobileScreenshot();
                return;
            }

            // Show loading indicator for desktop
            this.showLoading('Generating receipt image...');

            // Use html2canvas library to convert receipt to image
            if (typeof html2canvas === 'undefined') {
                // Load html2canvas library if not already loaded
                await this.loadHtml2Canvas();
            }

            // Create canvas from receipt content
            const canvas = await html2canvas(receiptContent, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher resolution
                useCORS: true,
                allowTaint: true,
                width: receiptContent.offsetWidth,
                height: receiptContent.offsetHeight
            });

            // Convert canvas to blob
            canvas.toBlob((blob) => {
                if (!blob) {
                    this.hideLoading();
                    alert('Failed to generate image. Please try again.');
                    return;
                }

                // For desktop, use direct download
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                
                // Generate filename with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                link.download = `receipt-${timestamp}.png`;
                
                // Trigger download
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up
                URL.revokeObjectURL(url);
                this.hideLoading();
                
                // Show success message
                alert('Receipt saved as photo successfully!');
                
            }, 'image/png', 0.95);

        } catch (error) {
            this.hideLoading();
            console.error('Error saving receipt as photo:', error);
            alert('Error saving receipt as photo. Please try again.');
        }
    }

    openReceiptForMobileScreenshot() {
        // Get the current receipt data
        const orderId = this.currentOrderId || this.getCurrentReceiptOrderId();
        if (!orderId) {
            alert('No receipt data available.');
            return;
        }

        const order = this.orders.find(o => o.id === orderId);
        const payment = this.payments.find(p => p.order_id === orderId);
        const customer = this.customers.find(c => c.id === order.customer_id);

        if (!order || !payment) {
            alert('Receipt not found.');
            return;
        }

        // Create a mobile-optimized receipt page
        const mobileReceiptHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CRE.MNL Receipt</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Courier New', monospace; 
                        background: white; 
                        padding: 20px; 
                        line-height: 1.4;
                        color: #333;
                    }
                    .receipt-container {
                        max-width: 400px;
                        margin: 0 auto;
                        background: white;
                        border: 2px solid #8B4513;
                        border-radius: 10px;
                        overflow: hidden;
                    }
                    .receipt-header {
                        background: #8B4513;
                        color: white;
                        text-align: center;
                        padding: 20px;
                    }
                    .receipt-header h2 {
                        font-size: 1.8rem;
                        margin-bottom: 5px;
                    }
                    .receipt-header p {
                        font-size: 0.9rem;
                        opacity: 0.9;
                    }
                    .receipt-info {
                        padding: 20px;
                        background: #f8f8f8;
                        border-bottom: 1px solid #ddd;
                    }
                    .receipt-info p {
                        margin: 5px 0;
                        font-size: 0.9rem;
                    }
                    .receipt-items {
                        padding: 20px;
                    }
                    .receipt-item {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        padding: 5px 0;
                        border-bottom: 1px dotted #ccc;
                    }
                    .receipt-totals {
                        padding: 20px;
                        background: #f8f8f8;
                        border-top: 2px solid #8B4513;
                    }
                    .receipt-total {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        font-weight: bold;
                        font-size: 1.1rem;
                    }
                    .receipt-footer {
                        padding: 20px;
                        text-align: center;
                        background: #8B4513;
                        color: white;
                    }
                    .instructions {
                        margin-top: 20px;
                        padding: 15px;
                        background: #e8f4f8;
                        border-radius: 8px;
                        border-left: 4px solid #8B4513;
                    }
                    .instructions h3 {
                        color: #8B4513;
                        margin-bottom: 10px;
                    }
                    .instructions p {
                        margin: 5px 0;
                        font-size: 0.9rem;
                    }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <div class="receipt-header">
                        <h2>CRE.MNL</h2>
                        <p>Pasig City</p>
                        <p>Phone: +639277747832</p>
                    </div>
                    <div class="receipt-info">
                        <p><strong>Receipt ID:</strong> ${payment.receipt_id}</p>
                        <p><strong>Date & Time:</strong> ${this.formatDateTime(payment.paid_at)}</p>
                        <p><strong>Customer:</strong> ${customer ? customer.name : 'Unknown'}</p>
                        <p><strong>Ref ID:</strong> ${payment.refid}</p>
                    </div>
                    <div class="receipt-items">
                        ${order.items.map(item => {
                            const itemData = this.items.find(i => i.id === item.item_id);
                            return `
                                <div class="receipt-item">
                                    <span>${itemData ? itemData.name : 'Unknown'} (${itemData ? itemData.size : 'N/A'}) x${item.quantity}</span>
                                    <span>₱${item.sales.toFixed(2)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="receipt-totals">
                        <div class="receipt-total">
                            <span>Amount Due:</span>
                            <span>₱${payment.amount_due.toFixed(2)}</span>
                        </div>
                        <div class="receipt-total">
                            <span>Total Paid:</span>
                            <span>₱${payment.amount_paid.toFixed(2)}</span>
                        </div>
                        <div class="receipt-total">
                            <span>Balance:</span>
                            <span>₱${payment.balance.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="receipt-footer">
                        <p>Thank you for your business!</p>
                        <p>Payment Method: ${payment.method.toUpperCase()}</p>
                    </div>
                </div>
                <div class="instructions">
                    <h3>📱 How to Save This Receipt:</h3>
                    <p><strong>iPhone/iPad:</strong> Take a screenshot (Power + Volume Up)</p>
                    <p><strong>Android:</strong> Take a screenshot (Power + Volume Down)</p>
                    <p><strong>Alternative:</strong> Use your device's screenshot feature</p>
                    <p><em>The receipt is optimized for mobile screenshots!</em></p>
                </div>
            </body>
            </html>
        `;

        // Open in new tab
        const newWindow = window.open('', '_blank');
        newWindow.document.write(mobileReceiptHTML);
        newWindow.document.close();
        
        // Show instruction
        alert('📱 Receipt opened in new tab! Take a screenshot to save it to your device.');
    }

    getCurrentReceiptOrderId() {
        // Return the stored current receipt order ID
        return this.currentReceiptOrderId || null;
    }

    async loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            // Check if html2canvas is already loaded
            if (typeof html2canvas !== 'undefined') {
                resolve();
                return;
            }

            // Create script element to load html2canvas
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => {
                console.log('html2canvas library loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load html2canvas library');
                reject(new Error('Failed to load html2canvas library'));
            };
            
            document.head.appendChild(script);
        });
    }

    editOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            alert('Order not found');
            return;
        }

        // Populate the form with existing order data
        document.getElementById('customerSelect').value = order.customer_id;
        
        // Clear existing items and populate with order items
        const orderItemsContainer = document.getElementById('orderItems');
        orderItemsContainer.innerHTML = '';
        
        order.items.forEach((item, index) => {
            this.addOrderItemRow();
            const itemRows = orderItemsContainer.querySelectorAll('.order-item-row');
            const currentRow = itemRows[itemRows.length - 1];
            
            const itemSelect = currentRow.querySelector('.item-select');
            const quantityInput = currentRow.querySelector('.quantity-input');
            
            itemSelect.value = item.item_id;
            quantityInput.value = item.quantity;
        });
        
        // Store the order ID for updating
        document.getElementById('orderForm').dataset.editingId = orderId;
        
        // Change the form title and button
        const modalTitle = document.querySelector('#orderModal .modal-header h3');
        const submitButton = document.querySelector('#orderForm button[type="submit"]');
        
        if (modalTitle) {
            modalTitle.textContent = 'Edit Order';
        }
        if (submitButton) {
            submitButton.textContent = 'Update Order';
        }
        
        this.openOrderModal();
    }

    editCustomer(customerId) {
        console.log('✏️ editCustomer function called with ID:', customerId);
        
        const customer = this.customers.find(c => c.id === customerId);
        console.log('🔍 Found customer:', customer);
        
        if (customer) {
            // Populate the form with existing data
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerPhone').value = customer.phone || '';
            
            // Store the customer ID for updating
            document.getElementById('customerForm').dataset.editingId = customerId;
            
            // Change the form title and button with null checks
            const modalTitle = document.querySelector('#customerModal .modal-title');
            const submitButton = document.querySelector('#customerForm button[type="submit"]');
            
            if (modalTitle) {
                modalTitle.textContent = 'Edit Customer';
            }
            if (submitButton) {
                submitButton.textContent = 'Update Customer';
            }
            
            this.openCustomerModal();
        }
    }

    editItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (item) {
            // Populate the form with existing data
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemSize').value = item.size;
            document.getElementById('costToMake').value = item.cost_to_make;
            document.getElementById('itemPrice').value = item.price;
            
            // Store the item ID for updating
            document.getElementById('itemForm').dataset.editingId = itemId;
            
            // Change the form title and button with null checks
            const modalTitle = document.querySelector('#itemModal .modal-title');
            const submitButton = document.querySelector('#itemForm button[type="submit"]');
            
            if (modalTitle) {
                modalTitle.textContent = 'Edit Item';
            }
            if (submitButton) {
                submitButton.textContent = 'Update Item';
            }
            
            this.openItemModal();
        }
    }

    async deleteOrder(orderId) {
        if (confirm('Are you sure you want to delete this order?')) {
            this.showLoading('Deleting order...');
            
            try {
                this.orders = this.orders.filter(o => o.id !== orderId);
                this.payments = this.payments.filter(p => p.order_id !== orderId);
                this.saveToLocalStorage();
                
                // Also delete from Apps Script if enabled
                if (this.useAppScript && this.appScriptClient) {
                    try {
                        await this.appScriptClient.deleteOrder(orderId);
                        console.log('✅ Order deleted from Google Sheets via Apps Script');
                    } catch (error) {
                        console.warn('⚠️ Failed to delete from Apps Script, but deleted locally:', error);
                    }
                }
                
                this.renderOrders();
                this.updateAnalytics();
                this.hideLoading();
            } catch (error) {
                this.hideLoading();
                console.error('Error deleting order:', error);
                alert('Error deleting order. Please try again.');
            }
        }
    }

    filterOrders(status) {
        this.renderOrders();
    }

    populateFilterDropdowns() {
        // Populate customer filter
        const customerFilter = document.getElementById('customerFilter');
        if (customerFilter) {
            customerFilter.innerHTML = '<option value="">All Customers</option>';
            this.customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.name;
                customerFilter.appendChild(option);
            });
        }

        // Populate item filter
        const itemFilter = document.getElementById('itemFilter');
        if (itemFilter) {
            itemFilter.innerHTML = '<option value="">All Items</option>';
            this.items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.name} (${item.size})`;
                itemFilter.appendChild(option);
            });
        }
    }

    filterOrdersByDate(orders, dateFilter) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return orders.filter(order => {
            const orderDate = new Date(order.date_ordered);
            const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
            
            switch (dateFilter) {
                case 'today':
                    return orderDateOnly.getTime() === today.getTime();
                case 'yesterday':
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    return orderDateOnly.getTime() === yesterday.getTime();
                case 'thisWeek':
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());
                    return orderDateOnly >= startOfWeek;
                case 'lastWeek':
                    const startOfLastWeek = new Date(today);
                    startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
                    const endOfLastWeek = new Date(today);
                    endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
                    return orderDateOnly >= startOfLastWeek && orderDateOnly <= endOfLastWeek;
                case 'thisMonth':
                    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
                case 'lastMonth':
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                    return orderDate >= lastMonth && orderDate <= endOfLastMonth;
                case 'thisYear':
                    return orderDate.getFullYear() === now.getFullYear();
                default:
                    return true;
            }
        });
    }

    clearAllFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const dateFilter = document.getElementById('dateFilter');
        const customerFilter = document.getElementById('customerFilter');
        const itemFilter = document.getElementById('itemFilter');
        const customDateRange = document.getElementById('customDateRange');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        
        if (statusFilter) statusFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        if (customerFilter) customerFilter.value = '';
        if (itemFilter) itemFilter.value = '';
        if (customDateRange) customDateRange.style.display = 'none';
        if (startDate) startDate.value = '';
        if (endDate) endDate.value = '';
        
        this.renderOrders();
    }

    // Test Apps Script connection
    async testAppsScriptConnection() {
        if (!this.useAppScript || !this.appScriptClient) {
            console.log('❌ Apps Script not available for testing');
            return;
        }
        
        try {
            console.log('🧪 Testing Apps Script connection...');
            const result = await this.appScriptClient.getData('customers');
            console.log('✅ Apps Script connection test result:', result);
        } catch (error) {
            console.error('❌ Apps Script connection test failed:', error);
        }
    }

    // Utility function to ensure order status is consistent with payment-based logic
    syncOrderStatuses() {
        this.orders.forEach(order => {
            const hasPayment = this.payments.some(payment => payment.order_id === order.id);
            const shouldBeCompleted = hasPayment;
            
            if (shouldBeCompleted && order.status !== 'completed') {
                order.status = 'completed';
                if (!order.date_completed) {
                    const payment = this.payments.find(p => p.order_id === order.id);
                    if (payment && payment.paid_at) {
                        order.date_completed = payment.paid_at;
                    }
                }
                console.log(`✅ Synced order ${order.id} status to completed`);
            } else if (!shouldBeCompleted && order.status === 'completed') {
                order.status = 'pending';
                order.date_completed = null;
                console.log(`✅ Synced order ${order.id} status to pending`);
            }
        });
    }

    renderCustomers() {
        const container = document.getElementById('customersList');
        if (this.customers.length === 0) {
            container.innerHTML = '<p class="no-data">No customers found.</p>';
            return;
        }

        container.innerHTML = this.customers.map(customer => {
            const customerOrders = this.orders.filter(order => order.customer_id === customer.id);
            const completedOrders = customerOrders.filter(order => {
                // Check if order has a payment (if yes, it's completed)
                return this.payments.some(payment => payment.order_id === order.id);
            });
            const totalSpent = completedOrders.reduce((sum, order) => 
                sum + order.items.reduce((itemSum, item) => itemSum + item.sales, 0), 0
            );

            return `
                <div class="customer-card">
                    <div class="customer-header">
                        <span class="customer-name">${customer.name}</span>
                        <button class="btn btn-secondary" onclick="receiptSystem.editCustomer('${customer.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="receiptSystem.deleteCustomer('${customer.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="customer-details">
                        <div class="customer-detail">
                            <label>Email</label>
                            <span>${customer.email || 'N/A'}</span>
                        </div>
                        <div class="customer-detail">
                            <label>Phone</label>
                            <span>${customer.phone || 'N/A'}</span>
                        </div>
                        <div class="customer-detail">
                            <label>Orders</label>
                            <span>${customerOrders.length} (${completedOrders.length} completed)</span>
                        </div>
                        <div class="customer-detail">
                            <label>Total Spent</label>
                            <span>₱${totalSpent.toFixed(2)}</span>
                        </div>
                        <div class="customer-detail">
                            <label>Created</label>
                            <span>${this.formatDate(customer.created_at)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    openCustomerModal() {
        document.getElementById('customerModal').style.display = 'block';
    }

    async createCustomer() {
        console.log('🎯 createCustomer function called');
        console.log('🔍 Stack trace:', new Error().stack);
        
        // Prevent multiple simultaneous executions
        if (this.isCreatingCustomer) {
            console.log('⚠️ Customer creation already in progress, skipping...');
            return;
        }
        
        this.isCreatingCustomer = true;
        
        const name = document.getElementById('customerName').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const editingId = document.getElementById('customerForm').dataset.editingId;
        
        console.log('📝 Form data:', { name, email, phone, editingId });

        if (!name) {
            alert('Customer name is required.');
            this.isCreatingCustomer = false;
            return;
        }

        const customerData = {
            name: name,
            email: email || null,
            phone: phone || null,
            created_at: new Date().toISOString()
        };

        // If editing, use existing ID, otherwise create new
        if (editingId) {
            customerData.id = editingId;
        } else {
            customerData.id = Date.now().toString();
        }

        try {
            this.showLoading(editingId ? 'Updating customer...' : 'Saving customer...');
            console.log(editingId ? 'Updating customer...' : 'Saving customer...');
            
            if (editingId) {
                // Update existing customer
                const index = this.customers.findIndex(c => c.id === editingId);
                if (index !== -1) {
                    this.customers[index] = customerData;
                }
            } else {
                // Add new customer
                this.customers.push(customerData);
            }
            
            this.saveToLocalStorage();
            
            // Also save to Apps Script if enabled
            if (this.useAppScript && this.appScriptClient) {
                try {
                    if (editingId) {
                        // Update existing customer
                        console.log('🔄 Attempting to update customer in Google Sheets:', customerData);
                        const result = await this.appScriptClient.updateCustomer(customerData);
                        console.log('📋 Update result:', result);
                        console.log('✅ Customer updated in Google Sheets via Apps Script');
                    } else {
                        // Save new customer
                        console.log('🔄 Attempting to save new customer to Google Sheets:', customerData);
                        const result = await this.appScriptClient.saveCustomer(customerData);
                        console.log('📋 Save result:', result);
                        console.log('✅ Customer saved to Google Sheets via Apps Script');
                    }
                } catch (error) {
                    console.error('❌ Failed to save to Apps Script:', error);
                    console.warn('⚠️ Failed to save to Apps Script, but saved locally:', error);
                }
            } else {
                console.log('⚠️ Apps Script not enabled or client not available');
                console.log('useAppScript:', this.useAppScript);
                console.log('appScriptClient:', this.appScriptClient);
            }
            
            // Test Apps Script connection
            this.testAppsScriptConnection();
            
            this.renderCustomers();
            
            // If order modal is open, refresh the customer dropdown
            const orderModal = document.getElementById('orderModal');
            if (orderModal && orderModal.style.display === 'block') {
                this.populateCustomerSelect();
                console.log('🔄 Refreshed customer dropdown in order modal');
            }
            
            this.closeModal('customerModal');
            this.resetCustomerForm();
            this.hideLoading();
            
            // Show success message
            console.log('✅ Customer saved successfully:', customerData);
            alert(editingId ? 'Customer updated successfully!' : 'Customer added successfully!');
        } catch (error) {
            this.hideLoading();
            console.error('❌ Error saving customer:', error);
            alert('Error saving customer. Please try again.');
        } finally {
            // Reset the flag to allow future customer creation
            this.isCreatingCustomer = false;
        }
    }

    resetCustomerForm() {
        document.getElementById('customerForm').reset();
        delete document.getElementById('customerForm').dataset.editingId;
        
        // Reset modal title and button text with null checks
        const modalTitle = document.querySelector('#customerModal .modal-title');
        const submitButton = document.querySelector('#customerForm button[type="submit"]');
        
        if (modalTitle) {
            modalTitle.textContent = 'Add Customer';
        }
        if (submitButton) {
            submitButton.textContent = 'Add Customer';
        }
    }

    async deleteCustomer(customerId) {
        if (confirm('Are you sure you want to delete this customer?')) {
            this.showLoading('Deleting customer...');
            
            try {
                this.customers = this.customers.filter(c => c.id !== customerId);
                this.saveToLocalStorage();
                
                // Also delete from Apps Script if enabled
                if (this.useAppScript && this.appScriptClient) {
                    try {
                        await this.appScriptClient.deleteCustomer(customerId);
                        console.log('✅ Customer deleted from Google Sheets via Apps Script');
                    } catch (error) {
                        console.warn('⚠️ Failed to delete from Apps Script, but deleted locally:', error);
                    }
                }
                
                this.renderCustomers();
                this.hideLoading();
            } catch (error) {
                this.hideLoading();
                console.error('Error deleting customer:', error);
                alert('Error deleting customer. Please try again.');
            }
        }
    }

    renderItems() {
        const container = document.getElementById('itemsList');
        if (this.items.length === 0) {
            container.innerHTML = '<p class="no-data">No items found.</p>';
            return;
        }

        container.innerHTML = this.items.map(item => `
            <div class="item-card">
                <div class="item-header">
                    <span class="item-name">${item.name} (${item.size})</span>
                    <button class="btn btn-secondary" onclick="receiptSystem.editItem('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="receiptSystem.deleteItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="item-details">
                    <div class="item-detail">
                        <label>Cost to Make</label>
                        <span>₱${item.cost_to_make.toFixed(2)}</span>
                    </div>
                    <div class="item-detail">
                        <label>Selling Price</label>
                        <span>₱${item.price.toFixed(2)}</span>
                    </div>
                    <div class="item-detail">
                        <label>Profit Margin</label>
                        <span>₱${(item.price - item.cost_to_make).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    openItemModal() {
        console.log('openItemModal called');
        const modal = document.getElementById('itemModal');
        if (modal) {
            modal.style.display = 'block';
            console.log('Item modal opened');
        } else {
            console.error('Item modal not found');
        }
    }

    async createItem() {
        console.log('createItem method called');
        
        const name = document.getElementById('itemName').value.trim();
        const size = document.getElementById('itemSize').value.trim();
        const costToMake = parseFloat(document.getElementById('costToMake').value);
        const price = parseFloat(document.getElementById('itemPrice').value);
        const editingId = document.getElementById('itemForm').dataset.editingId;

        console.log('Form values:', { name, size, costToMake, price });

        if (!name || !size) {
            alert('Item name and size are required.');
            return;
        }

        if (isNaN(costToMake) || costToMake < 0) {
            alert('Please enter a valid cost to make.');
            return;
        }

        if (isNaN(price) || price < 0) {
            alert('Please enter a valid selling price.');
            return;
        }

        const itemData = {
            name: name,
            size: size,
            cost_to_make: costToMake,
            price: price,
            created_at: new Date().toISOString()
        };

        // If editing, use existing ID, otherwise create new
        if (editingId) {
            itemData.id = editingId;
        } else {
            itemData.id = Date.now().toString();
        }

        console.log('Item data:', itemData);

        try {
            this.showLoading(editingId ? 'Updating item...' : 'Saving item...');
            console.log(editingId ? 'Updating item...' : 'Saving item...');
            
            if (editingId) {
                // Update existing item
                const index = this.items.findIndex(i => i.id === editingId);
                if (index !== -1) {
                    this.items[index] = itemData;
                }
            } else {
                // Add new item
                this.items.push(itemData);
            }
            
            this.saveToLocalStorage();
            
            // Also save to Apps Script if enabled
            if (this.useAppScript && this.appScriptClient) {
                try {
                    if (editingId) {
                        // Update existing item
                        await this.appScriptClient.updateItem(itemData);
                        console.log('✅ Item updated in Google Sheets via Apps Script');
                    } else {
                        // Save new item
                        await this.appScriptClient.saveItem(itemData);
                        console.log('✅ Item saved to Google Sheets via Apps Script');
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to save to Apps Script, but saved locally:', error);
                }
            }
            
            console.log('Items array after saving:', this.items);
            this.renderItems();
            
            // If order modal is open, refresh the item dropdowns
            const orderModal = document.getElementById('orderModal');
            if (orderModal && orderModal.style.display === 'block') {
                this.populateItemSelects();
                console.log('🔄 Refreshed item dropdowns in order modal');
            }
            
            this.closeModal('itemModal');
            this.resetItemForm();
            this.hideLoading();
            
            // Show success message
            console.log('✅ Item saved successfully:', itemData);
            alert(editingId ? 'Item updated successfully!' : 'Item added successfully!');
        } catch (error) {
            this.hideLoading();
            console.error('❌ Error saving item:', error);
            alert('Error saving item. Please try again.');
        }
    }

    resetItemForm() {
        document.getElementById('itemForm').reset();
        delete document.getElementById('itemForm').dataset.editingId;
        
        // Reset modal title and button text with null checks
        const modalTitle = document.querySelector('#itemModal .modal-title');
        const submitButton = document.querySelector('#itemForm button[type="submit"]');
        
        if (modalTitle) {
            modalTitle.textContent = 'Add Item';
        }
        if (submitButton) {
            submitButton.textContent = 'Add Item';
        }
    }

    async deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            this.showLoading('Deleting item...');
            
            try {
                this.items = this.items.filter(i => i.id !== itemId);
                this.saveToLocalStorage();
                
                // Also delete from Apps Script if enabled
                if (this.useAppScript && this.appScriptClient) {
                    try {
                        await this.appScriptClient.deleteItem(itemId);
                        console.log('✅ Item deleted from Google Sheets via Apps Script');
                    } catch (error) {
                        console.warn('⚠️ Failed to delete from Apps Script, but deleted locally:', error);
                    }
                }
                
                this.renderItems();
                this.hideLoading();
            } catch (error) {
                this.hideLoading();
                console.error('Error deleting item:', error);
                alert('Error deleting item. Please try again.');
            }
        }
    }

    updateAnalytics() {
        console.log('Updating analytics...');
        console.log('Total orders:', this.orders.length);
        console.log('Total customers:', this.customers.length);
        console.log('Total items:', this.items.length);
        
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        let filteredOrders = this.orders;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filteredOrders = this.orders.filter(order => {
                const orderDate = new Date(order.date_ordered);
                return orderDate >= start && orderDate <= end;
            });
            console.log('Filtered orders by date:', filteredOrders.length);
        }

        const completedOrders = filteredOrders.filter(order => {
            // Check if order has a payment (if yes, it's completed)
            return this.payments.some(payment => payment.order_id === order.id);
        });
        console.log('Completed orders:', completedOrders.length);
        
        const totalRevenue = completedOrders.reduce((sum, order) => {
            const orderRevenue = order.items.reduce((itemSum, item) => {
                return itemSum + (item.sales || 0);
            }, 0);
            return sum + orderRevenue;
        }, 0);
        
        const totalCost = completedOrders.reduce((sum, order) => {
            const orderCost = order.items.reduce((itemSum, item) => {
                return itemSum + (item.cost || 0);
            }, 0);
            return sum + orderCost;
        }, 0);
        
        const totalProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        console.log('Analytics calculated:', {
            totalRevenue,
            totalCost,
            totalProfit,
            profitMargin,
            totalOrders: completedOrders.length
        });

        // If no data, show helpful message
        if (completedOrders.length === 0) {
            console.log('No completed orders found. Analytics will show zero values.');
        }

        // Update the display elements
        const totalRevenueEl = document.getElementById('totalRevenue');
        const totalProfitEl = document.getElementById('totalProfit');
        const totalOrdersEl = document.getElementById('totalOrders');
        const profitMarginEl = document.getElementById('profitMargin');

        if (totalRevenueEl) totalRevenueEl.textContent = `₱${totalRevenue.toFixed(2)}`;
        if (totalProfitEl) totalProfitEl.textContent = `₱${totalProfit.toFixed(2)}`;
        if (totalOrdersEl) totalOrdersEl.textContent = completedOrders.length;
        if (profitMarginEl) profitMarginEl.textContent = `${profitMargin.toFixed(1)}%`;

        try {
            this.updateCharts(filteredOrders);
            this.updateCustomerAnalytics(filteredOrders);
            console.log('✅ Analytics updated successfully');
        } catch (error) {
            console.error('❌ Error updating charts/analytics:', error);
        }
    }

    updateCharts(orders) {
        this.updateProfitChart(orders);
        this.updateItemsChart(orders);
        this.updateTopCustomersChart(orders);
        this.updateOrderFrequencyChart(orders);
    }

    updateCustomerAnalytics(orders) {
        const completedOrders = orders.filter(order => {
            // Check if order has a payment (if yes, it's completed)
            return this.payments.some(payment => payment.order_id === order.id);
        });
        
        // Calculate customer statistics
        const customerStats = {};
        this.customers.forEach(customer => {
            // Count ALL orders for this customer (not just completed)
            const allCustomerOrders = this.orders.filter(order => order.customer_id === customer.id);
            // But only count completed orders for spending calculations
            const completedCustomerOrders = allCustomerOrders.filter(order => {
                // Check if order has a payment (if yes, it's completed)
                return this.payments.some(payment => payment.order_id === order.id);
            });
            const totalSpent = completedCustomerOrders.reduce((sum, order) => 
                sum + order.items.reduce((itemSum, item) => itemSum + (item.sales || 0), 0), 0
            );
            
            customerStats[customer.id] = {
                name: customer.name,
                orderCount: allCustomerOrders.length, // Total orders (all statuses)
                completedOrderCount: completedCustomerOrders.length, // Completed orders only
                totalSpent: totalSpent,
                avgOrderValue: completedCustomerOrders.length > 0 ? totalSpent / completedCustomerOrders.length : 0,
                isReturning: allCustomerOrders.length > 1 // Return customer if they have more than 1 order total
            };
        });

        const totalCustomers = this.customers.length;
        const returningCustomers = Object.values(customerStats).filter(stat => stat.isReturning).length;
        const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
        const avgOrderValue = completedOrders.length > 0 ? 
            completedOrders.reduce((sum, order) => 
                sum + order.items.reduce((itemSum, item) => itemSum + item.sales, 0), 0
            ) / completedOrders.length : 0;

        // Update customer analytics stats
        document.getElementById('totalCustomers').textContent = totalCustomers;
        document.getElementById('returningCustomers').textContent = returningCustomers;
        document.getElementById('retentionRate').textContent = `${retentionRate.toFixed(1)}%`;
        document.getElementById('avgOrderValue').textContent = `₱${avgOrderValue.toFixed(2)}`;

        // Render customer analytics list
        this.renderCustomerAnalyticsList(customerStats);
    }

    renderCustomerAnalyticsList(customerStats) {
        const container = document.getElementById('customerAnalyticsList');
        const sortedCustomers = Object.values(customerStats)
            .sort((a, b) => b.totalSpent - a.totalSpent);

        if (sortedCustomers.length === 0) {
            container.innerHTML = '<p class="no-data">No customer data available.</p>';
            return;
        }

        container.innerHTML = sortedCustomers.map(stat => {
            let badgeClass = 'badge-new';
            let badgeText = 'New';
            
            if (stat.orderCount > 5) {
                badgeClass = 'badge-vip';
                badgeText = 'VIP';
            } else if (stat.isReturning) {
                badgeClass = 'badge-returning';
                badgeText = 'Returning';
            }

            return `
                <div class="customer-analytics-card">
                    <div class="customer-analytics-header">
                        <span class="customer-analytics-name">${stat.name}</span>
                        <span class="customer-analytics-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="customer-analytics-details">
                        <div class="customer-analytics-detail">
                            <label>Total Orders</label>
                            <span>${stat.orderCount} (${stat.completedOrderCount} completed)</span>
                        </div>
                        <div class="customer-analytics-detail">
                            <label>Total Spent</label>
                            <span>₱${stat.totalSpent.toFixed(2)}</span>
                        </div>
                        <div class="customer-analytics-detail">
                            <label>Avg Order Value</label>
                            <span>₱${stat.avgOrderValue.toFixed(2)}</span>
                        </div>
                        <div class="customer-analytics-detail">
                            <label>Customer Type</label>
                            <span>${stat.isReturning ? 'Returning' : 'New'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateProfitChart(orders) {
        const chartElement = document.getElementById('profitChart');
        if (!chartElement) {
            console.warn('Profit chart element not found');
            return;
        }
        
        const ctx = chartElement.getContext('2d');
        
        if (this.profitChart) {
            this.profitChart.destroy();
        }

        // Group orders by date
        const dailyData = {};
        orders.filter(order => {
            // Check if order has a payment (if yes, it's completed)
            return this.payments.some(payment => payment.order_id === order.id);
        }).forEach(order => {
            const date = new Date(order.date_ordered).toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { revenue: 0, profit: 0 };
            }
            const revenue = order.items.reduce((sum, item) => sum + item.sales, 0);
            const cost = order.items.reduce((sum, item) => sum + item.cost, 0);
            dailyData[date].revenue += revenue;
            dailyData[date].profit += (revenue - cost);
        });

        const dates = Object.keys(dailyData).sort();
        const profits = dates.map(date => dailyData[date].profit);

        this.profitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Daily Profit',
                    data: profits,
                    borderColor: '#8B4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.15)',
                    borderWidth: 3,
                    pointBackgroundColor: '#D2B48C',
                    pointBorderColor: '#8B4513',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(93, 64, 55, 0.9)',
                        titleColor: '#F5F5DC',
                        bodyColor: '#F5F5DC',
                        borderColor: '#8B4513',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(210, 180, 140, 0.2)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#5D4037',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(210, 180, 140, 0.2)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#5D4037',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            callback: function(value) {
                                return '₱' + value.toFixed(2);
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#D2B48C'
                    }
                }
            }
        });
    }

    updateItemsChart(orders) {
        const ctx = document.getElementById('itemsChart').getContext('2d');
        
        if (this.itemsChart) {
            this.itemsChart.destroy();
        }

        // Count item sales
        const itemSales = {};
        orders.filter(order => {
            // Check if order has a payment (if yes, it's completed)
            return this.payments.some(payment => payment.order_id === order.id);
        }).forEach(order => {
            order.items.forEach(item => {
                const itemData = this.items.find(i => i.id === item.item_id);
                if (itemData) {
                    const key = `${itemData.name} (${itemData.size})`;
                    if (!itemSales[key]) {
                        itemSales[key] = 0;
                    }
                    itemSales[key] += item.quantity;
                }
            });
        });

        const labels = Object.keys(itemSales);
        const data = Object.values(itemSales);

        this.itemsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#8B4513',
                        '#A0522D',
                        '#D2B48C',
                        '#F5DEB3',
                        '#DEB887',
                        '#CD853F',
                        '#BC9A6A',
                        '#F4A460'
                    ],
                    borderColor: '#5D4037',
                    borderWidth: 2,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#5D4037',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(93, 64, 55, 0.9)',
                        titleColor: '#F5F5DC',
                        bodyColor: '#F5F5DC',
                        borderColor: '#8B4513',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    updateTopCustomersChart(orders) {
        const ctx = document.getElementById('topCustomersChart').getContext('2d');
        
        if (this.topCustomersChart) {
            this.topCustomersChart.destroy();
        }

        const completedOrders = orders.filter(order => {
            // Check if order has a payment (if yes, it's completed)
            return this.payments.some(payment => payment.order_id === order.id);
        });
        const customerRevenue = {};
        
        completedOrders.forEach(order => {
            const customer = this.customers.find(c => c.id === order.customer_id);
            if (customer) {
                const revenue = order.items.reduce((sum, item) => sum + item.sales, 0);
                if (!customerRevenue[customer.name]) {
                    customerRevenue[customer.name] = 0;
                }
                customerRevenue[customer.name] += revenue;
            }
        });

        const sortedCustomers = Object.entries(customerRevenue)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        const labels = sortedCustomers.map(([name]) => name);
        const data = sortedCustomers.map(([,revenue]) => revenue);

        this.topCustomersChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue',
                    data: data,
                    backgroundColor: 'rgba(139, 69, 19, 0.8)',
                    borderColor: '#8B4513',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(93, 64, 55, 0.9)',
                        titleColor: '#F5F5DC',
                        bodyColor: '#F5F5DC',
                        borderColor: '#8B4513',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Revenue: ₱${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(210, 180, 140, 0.2)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#5D4037',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(210, 180, 140, 0.2)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#5D4037',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            callback: function(value) {
                                return '₱' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    updateOrderFrequencyChart(orders) {
        const ctx = document.getElementById('orderFrequencyChart').getContext('2d');
        
        if (this.orderFrequencyChart) {
            this.orderFrequencyChart.destroy();
        }

        const completedOrders = orders.filter(order => {
            // Check if order has a payment (if yes, it's completed)
            return this.payments.some(payment => payment.order_id === order.id);
        });
        const frequencyData = {};

        completedOrders.forEach(order => {
            const customer = this.customers.find(c => c.id === order.customer_id);
            if (customer) {
                if (!frequencyData[customer.name]) {
                    frequencyData[customer.name] = 0;
                }
                frequencyData[customer.name]++;
            }
        });

        const frequencyCounts = {};
        Object.values(frequencyData).forEach(count => {
            frequencyCounts[count] = (frequencyCounts[count] || 0) + 1;
        });

        const labels = Object.keys(frequencyCounts).map(count => 
            count === '1' ? '1 Order' : `${count} Orders`
        );
        const data = Object.values(frequencyCounts);

        this.orderFrequencyChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#8B4513',
                        '#A0522D',
                        '#D2B48C',
                        '#F5DEB3',
                        '#DEB887'
                    ],
                    borderColor: '#5D4037',
                    borderWidth: 2,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#5D4037',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(93, 64, 55, 0.9)',
                        titleColor: '#F5F5DC',
                        bodyColor: '#F5F5DC',
                        borderColor: '#8B4513',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} customers (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    setDefaultDates() {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        document.getElementById('startDate').value = lastWeek.toISOString().split('T')[0];
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    formatDateTime(date) {
        if (!date) return 'N/A';
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        
        return new Intl.DateTimeFormat('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(dateObj);
    }

    formatDate(date) {
        if (!date) return 'N/A';
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(dateObj);
    }

    showLoading(message = 'Loading...') {
        // Create loading overlay if it doesn't exist
        let loadingOverlay = document.getElementById('loadingOverlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loadingOverlay';
            loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${message}</div>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
        } else {
            loadingOverlay.querySelector('.loading-text').textContent = message;
        }
        loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Initialize the application
window.receiptSystem = new ReceiptSystem();

// Add event listener for amount paid input
document.addEventListener('DOMContentLoaded', function() {
    const amountPaidInput = document.getElementById('amountPaid');
    if (amountPaidInput) {
        amountPaidInput.addEventListener('input', function() {
            receiptSystem.updateBalance();
        });
    }
});
