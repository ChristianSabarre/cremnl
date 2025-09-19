// Google Apps Script Client
// This file provides Google Apps Script functionality for the receipt system

class AppScriptClient {
    constructor() {
        this.url = null;
        this.initialized = false;
    }

    init(url) {
        this.url = url;
        this.initialized = true;
        console.log('Google Apps Script client initialized');
    }

    async sendData(action, data) {
        if (!this.initialized) {
            throw new Error('Apps Script client not initialized');
        }

        const payload = {
            action: action,
            data: data
        };

        try {
            // For GET requests (like getData), use a simple fetch approach
            if (action === 'getData') {
                const url = new URL(this.url);
                url.searchParams.append('action', action);
                url.searchParams.append('type', data.type);
                
                const response = await fetch(url.toString(), {
                    method: 'GET',
                    mode: 'cors'
                });
                
                if (response.ok) {
                    return await response.json();
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } else {
                // For POST requests (save, delete operations)
                const response = await fetch(this.url, {
                    method: 'POST',
                    mode: 'no-cors', // Revert to no-cors to avoid CORS issues
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });

                // Note: With no-cors mode, we can't read the response
                // But we can check if the request was sent successfully
                console.log('Data sent to Apps Script:', action, data);
                console.log('Request sent successfully (no-cors mode)');
                
                // Return success - the Apps Script will handle the actual processing
                // We'll verify success by checking the Google Sheet directly
                return { success: true, message: 'Request sent to Apps Script' };
            }
        } catch (error) {
            console.error('Error sending data to Apps Script:', error);
            throw error;
        }
    }

    // Helper methods for receipt system data
    async saveCustomer(customer) {
        return await this.sendData('saveCustomer', customer);
    }

    async saveItem(item) {
        return await this.sendData('saveItem', item);
    }

    async saveOrder(order) {
        return await this.sendData('saveOrder', order);
    }

    async savePayment(payment) {
        return await this.sendData('savePayment', payment);
    }

    async deleteCustomer(customerId) {
        return await this.sendData('deleteCustomer', { id: customerId });
    }

    async deleteItem(itemId) {
        return await this.sendData('deleteItem', { id: itemId });
    }

    async deleteOrder(orderId) {
        return await this.sendData('deleteOrder', { id: orderId });
    }

    async updateOrder(orderData) {
        return await this.sendData('updateOrder', orderData);
    }

    async updateCustomer(customerData) {
        console.log('📤 AppScriptClient.updateCustomer called with:', customerData);
        const result = await this.sendData('updateCustomer', customerData);
        console.log('📥 AppScriptClient.updateCustomer result:', result);
        return result;
    }

    async updateItem(itemData) {
        return await this.sendData('updateItem', itemData);
    }

    async getData(type) {
        return await this.sendData('getData', { type: type });
    }
}

// Export for use in other files
window.AppScriptClient = AppScriptClient;
