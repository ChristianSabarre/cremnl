// Google Apps Script Code for Receipt System
// Copy this code into your Google Apps Script project

// Test function to verify Apps Script is working
function testFunction() {
  console.log('Test function called - Apps Script is working');
  return { success: true, message: 'Apps Script is working' };
}

// Helper function to get or create a sheet
function getOrCreateSheet(sheet, sheetName) {
  let targetSheet = sheet.getSheetByName(sheetName);
  if (!targetSheet) {
    targetSheet = sheet.insertSheet(sheetName);
    // Add headers based on sheet type
    if (sheetName === 'Customers') {
      targetSheet.getRange(1, 1, 1, 5).setValues([['ID', 'Name', 'Email', 'Phone', 'Created At']]);
    } else if (sheetName === 'Items') {
      targetSheet.getRange(1, 1, 1, 6).setValues([['ID', 'Name', 'Size', 'Cost to Make', 'Price', 'Created At']]);
    } else if (sheetName === 'Orders') {
      targetSheet.getRange(1, 1, 1, 6).setValues([['ID', 'Customer ID', 'Status', 'Date Ordered', 'Date Completed', 'Items JSON']]);
    } else if (sheetName === 'Payments') {
      targetSheet.getRange(1, 1, 1, 9).setValues([['ID', 'Order ID', 'Receipt ID', 'Ref ID', 'Method', 'Amount Due', 'Amount Paid', 'Balance', 'Paid At']]);
    }
  }
  return targetSheet;
}

// Handle OPTIONS requests for CORS preflight
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600'
    });
}

function doGet(e) {
  try {
    console.log('doGet called with parameters:', e.parameter);
    const action = e.parameter.action;
    const type = e.parameter.type;
    const callback = e.parameter.callback;

    // Get the spreadsheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    let result = { success: false, message: '' };

    if (action === 'getData') {
      result = getData(spreadsheet, type);
    } else {
      result = { success: true, message: 'Apps Script is working - no action specified' };
    }

    // If callback is provided, use JSONP
    if (callback) {
      const jsonpResponse = `${callback}(${JSON.stringify(result)});`;
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // Regular JSON response
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    const errorResult = { 
      success: false, 
      message: error.toString() 
    };
    
    const callback = e.parameter.callback;
    
    if (callback) {
      const jsonpResponse = `${callback}(${JSON.stringify(errorResult)});`;
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify(errorResult))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
}

function doPost(e) {
  try {
    console.log('doPost function started');
    console.log('e:', e);
    console.log('e.postData:', e.postData);
    
    // Check if postData exists
    if (!e.postData) {
      console.log('ERROR: e.postData is undefined');
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: false, 
          message: 'No POST data received' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    console.log('e.postData.contents:', e.postData.contents);
    
    // Parse the incoming data
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    // Enhanced data parsing - try multiple ways to get the data
    let data = payload.data || payload;
    
    // If data is still undefined or empty, try to extract from payload directly
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      // Remove action from payload to get the actual data
      const { action: _, ...rest } = payload;
      data = rest;
    }

    console.log('doPost called with action:', action);
    console.log('doPost payload:', payload);
    console.log('doPost data:', data);
    console.log('doPost data type:', typeof data);
    console.log('doPost data keys:', data ? Object.keys(data) : 'data is null/undefined');

    // Get the spreadsheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    let result = { success: false, message: '' };

    switch (action) {
      case 'saveCustomer':
        result = saveCustomer(spreadsheet, data);
        break;
      case 'updateCustomer':
        result = updateCustomer(spreadsheet, data);
        break;
      case 'saveItem':
        result = saveItem(spreadsheet, data);
        break;
      case 'updateItem':
        result = updateItem(spreadsheet, data);
        break;
      case 'saveOrder':
        result = saveOrder(spreadsheet, data);
        break;
      case 'savePayment':
        result = savePayment(spreadsheet, data);
        // Also update the order status to completed
        if (result.success) {
          const updateResult = updateOrder(spreadsheet, {
            id: data.order_id,
            status: 'completed',
            date_completed: new Date()
          });
          if (!updateResult.success) {
            console.log('Warning: Payment saved but order status update failed:', updateResult.message);
          }
        }
        break;
      case 'deleteCustomer':
        result = deleteCustomer(spreadsheet, data.id);
        break;
      case 'deleteItem':
        result = deleteItem(spreadsheet, data.id);
        break;
      case 'deleteOrder':
        result = deleteOrder(spreadsheet, data.id);
        break;
      case 'deletePayment':
        result = deletePayment(spreadsheet, data.id);
        break;
      case 'updateOrder':
        result = updateOrder(spreadsheet, data);
        break;
      case 'getData':
        result = getData(spreadsheet, data.type);
        break;
      default:
        result = { success: false, message: 'Unknown action' };
    }

    console.log('doPost result:', result);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600'
      });

  } catch (error) {
    console.log('=== ERROR IN doPost ===');
    console.log('Error type:', typeof error);
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
    console.log('Error toString:', error.toString());
    console.log('Full error object:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        message: error.toString(),
        errorType: typeof error,
        errorMessage: error.message,
        errorStack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}

function saveCustomer(spreadsheet, customer) {
  try {
    let customerSheet = spreadsheet.getSheetByName('Customers');
    if (!customerSheet) {
      customerSheet = spreadsheet.insertSheet('Customers');
      // Add headers
      customerSheet.getRange(1, 1, 1, 5).setValues([['ID', 'Name', 'Email', 'Phone', 'Created At']]);
    }

    const row = [
      customer.id,
      customer.name,
      customer.email || '',
      customer.phone || '',
      new Date(customer.created_at)
    ];

    customerSheet.appendRow(row);
    return { success: true, message: 'Customer saved successfully' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateCustomer(spreadsheet, customer) {
  try {
    console.log('updateCustomer called with:', customer);
    console.log('Customer ID type:', typeof customer.id);
    console.log('Customer ID value:', customer.id);
    
    const customerSheet = getOrCreateSheet(spreadsheet, 'Customers');
    console.log('Customer sheet found:', customerSheet ? 'YES' : 'NO');
    
    const data = customerSheet.getDataRange().getValues();
    console.log('Customers sheet data length:', data.length);
    console.log('All sheet data:', data);
    console.log('Looking for customer ID:', customer.id);
    
    // Enhanced debugging for ID comparison
    console.log('=== ID COMPARISON DEBUG ===');
    for (let i = 1; i < data.length; i++) {
      const sheetId = data[i][0];
      console.log(`Row ${i}: Sheet ID = "${sheetId}" (type: ${typeof sheetId}), Customer ID = "${customer.id}" (type: ${typeof customer.id})`);
      console.log(`Row ${i}: Loose equality (==): ${sheetId == customer.id}`);
      console.log(`Row ${i}: Strict equality (===): ${sheetId === customer.id}`);
    }
    
    // Find the customer by ID (assuming ID is in column A)
    const customerId = customer.id;
    let customerRowIndex = -1;
    
    for (let i = 1; i < data.length; i++) { // Skip header row
      console.log('Checking row', i, 'ID:', data[i][0], 'Type:', typeof data[i][0]);
      if (data[i][0] == customerId) { // Column A contains ID
        customerRowIndex = i + 1; // +1 because sheet rows are 1-indexed
        console.log('Found customer at row:', customerRowIndex);
        break;
      }
    }
    
    if (customerRowIndex === -1) {
      console.log('Customer not found in sheet');
      return { success: false, message: 'Customer not found with ID: ' + customerId };
    }
    
    // Update the customer data
    // Assuming columns: ID, Name, Email, Phone, Created At
    
    console.log('=== UPDATING CUSTOMER DATA ===');
    console.log('Customer row index:', customerRowIndex);
    
    // Update name if provided
    if (customer.name) {
      console.log('Updating name to:', customer.name);
      console.log('Setting range:', customerRowIndex, 2, 1, 1);
      customerSheet.getRange(customerRowIndex, 2, 1, 1).setValue(customer.name); // Name column
      console.log('Name updated successfully');
    }
    
    // Update email if provided
    if (customer.email !== undefined) {
      console.log('Updating email to:', customer.email);
      console.log('Setting range:', customerRowIndex, 3, 1, 1);
      customerSheet.getRange(customerRowIndex, 3, 1, 1).setValue(customer.email || ''); // Email column
      console.log('Email updated successfully');
    }
    
    // Update phone if provided
    if (customer.phone !== undefined) {
      console.log('Updating phone to:', customer.phone);
      console.log('Setting range:', customerRowIndex, 4, 1, 1);
      customerSheet.getRange(customerRowIndex, 4, 1, 1).setValue(customer.phone || ''); // Phone column
      console.log('Phone updated successfully');
    }
    
    console.log('=== CUSTOMER UPDATE COMPLETED ===');
    console.log('Customer updated successfully');
    return { success: true, message: 'Customer updated successfully' };
    
  } catch (error) {
    console.log('Error in updateCustomer:', error.toString());
    return { success: false, message: error.toString() };
  }
}

function saveItem(spreadsheet, item) {
  try {
    let itemSheet = spreadsheet.getSheetByName('Items');
    if (!itemSheet) {
      itemSheet = spreadsheet.insertSheet('Items');
      // Add headers
      itemSheet.getRange(1, 1, 1, 6).setValues([['ID', 'Name', 'Size', 'Cost to Make', 'Price', 'Created At']]);
    }

    const row = [
      item.id,
      item.name,
      item.size,
      item.cost_to_make,
      item.price,
      new Date(item.created_at)
    ];

    itemSheet.appendRow(row);
    return { success: true, message: 'Item saved successfully' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateItem(spreadsheet, item) {
  try {
    console.log('updateItem called with:', item);
    
    const itemSheet = getOrCreateSheet(spreadsheet, 'Items');
    const data = itemSheet.getDataRange().getValues();
    
    console.log('Items sheet data length:', data.length);
    console.log('Looking for item ID:', item.id);
    
    // Find the item by ID (assuming ID is in column A)
    const itemId = item.id;
    let itemRowIndex = -1;
    
    for (let i = 1; i < data.length; i++) { // Skip header row
      console.log('Checking row', i, 'ID:', data[i][0], 'Type:', typeof data[i][0]);
      if (data[i][0] == itemId) { // Column A contains ID
        itemRowIndex = i + 1; // +1 because sheet rows are 1-indexed
        console.log('Found item at row:', itemRowIndex);
        break;
      }
    }
    
    if (itemRowIndex === -1) {
      console.log('Item not found in sheet');
      return { success: false, message: 'Item not found with ID: ' + itemId };
    }
    
    // Update the item data
    // Assuming columns: ID, Name, Size, Cost to Make, Price, Created At
    
    // Update name if provided
    if (item.name) {
      console.log('Updating name to:', item.name);
      itemSheet.getRange(itemRowIndex, 2, 1, 1).setValue(item.name); // Name column
    }
    
    // Update size if provided
    if (item.size !== undefined) {
      console.log('Updating size to:', item.size);
      itemSheet.getRange(itemRowIndex, 3, 1, 1).setValue(item.size || ''); // Size column
    }
    
    // Update cost_to_make if provided
    if (item.cost_to_make !== undefined) {
      console.log('Updating cost_to_make to:', item.cost_to_make);
      itemSheet.getRange(itemRowIndex, 4, 1, 1).setValue(item.cost_to_make); // Cost to Make column
    }
    
    // Update price if provided
    if (item.price !== undefined) {
      console.log('Updating price to:', item.price);
      itemSheet.getRange(itemRowIndex, 5, 1, 1).setValue(item.price); // Price column
    }
    
    console.log('Item updated successfully');
    return { success: true, message: 'Item updated successfully' };
    
  } catch (error) {
    console.log('Error in updateItem:', error.toString());
    return { success: false, message: error.toString() };
  }
}

function saveOrder(spreadsheet, order) {
  try {
    let orderSheet = spreadsheet.getSheetByName('Orders');
    if (!orderSheet) {
      orderSheet = spreadsheet.insertSheet('Orders');
      // Add headers
      orderSheet.getRange(1, 1, 1, 6).setValues([['ID', 'Customer ID', 'Status', 'Date Ordered', 'Date Completed', 'Items JSON']]);
    }

    const row = [
      order.id,
      order.customer_id,
      order.status,
      order.date_ordered,
      order.date_completed || '',
      JSON.stringify(order.items)
    ];

    orderSheet.appendRow(row);
    return { success: true, message: 'Order saved successfully' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function savePayment(spreadsheet, payment) {
  try {
    let paymentSheet = spreadsheet.getSheetByName('Payments');
    if (!paymentSheet) {
      paymentSheet = spreadsheet.insertSheet('Payments');
      // Add headers
      paymentSheet.getRange(1, 1, 1, 9).setValues([['ID', 'Order ID', 'Receipt ID', 'Ref ID', 'Method', 'Amount Due', 'Amount Paid', 'Balance', 'Paid At']]);
    }

    const row = [
      payment.id,
      payment.order_id,
      payment.receipt_id,
      payment.refid,
      payment.method,
      payment.amount_due,
      payment.amount_paid,
      payment.balance,
      payment.paid_at
    ];

    paymentSheet.appendRow(row);
    return { success: true, message: 'Payment saved successfully' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteCustomer(spreadsheet, customerId) {
  try {
    console.log('deleteCustomer called with customerId:', customerId, 'type:', typeof customerId);
    
    const customerSheet = spreadsheet.getSheetByName('Customers');
    if (!customerSheet) return { success: false, message: 'Customers sheet not found' };

    const data = customerSheet.getDataRange().getValues();
    console.log('Customers sheet has', data.length, 'rows');
    
    for (let i = data.length - 1; i >= 1; i--) { // Skip header row
      const sheetCustomerId = data[i][0];
      console.log('Checking row', i, 'sheetCustomerId:', sheetCustomerId, 'type:', typeof sheetCustomerId);
      
      // Use loose equality to handle type mismatches
      if (sheetCustomerId == customerId) {
        console.log('Found matching customer, deleting row', i + 1);
        customerSheet.deleteRow(i + 1);
        break;
      }
    }
    return { success: true, message: 'Customer deleted successfully' };
  } catch (error) {
    console.log('Error in deleteCustomer:', error);
    return { success: false, message: error.toString() };
  }
}

function deleteItem(spreadsheet, itemId) {
  try {
    console.log('deleteItem called with itemId:', itemId, 'type:', typeof itemId);
    
    const itemSheet = spreadsheet.getSheetByName('Items');
    if (!itemSheet) return { success: false, message: 'Items sheet not found' };

    const data = itemSheet.getDataRange().getValues();
    console.log('Items sheet has', data.length, 'rows');
    
    for (let i = data.length - 1; i >= 1; i--) { // Skip header row
      const sheetItemId = data[i][0];
      console.log('Checking row', i, 'sheetItemId:', sheetItemId, 'type:', typeof sheetItemId);
      
      // Use loose equality to handle type mismatches
      if (sheetItemId == itemId) {
        console.log('Found matching item, deleting row', i + 1);
        itemSheet.deleteRow(i + 1);
        break;
      }
    }
    return { success: true, message: 'Item deleted successfully' };
  } catch (error) {
    console.log('Error in deleteItem:', error);
    return { success: false, message: error.toString() };
  }
}

function deleteOrder(spreadsheet, orderId) {
  try {
    console.log('deleteOrder called with orderId:', orderId, 'type:', typeof orderId);
    
    // Delete the order
    const orderSheet = spreadsheet.getSheetByName('Orders');
    if (!orderSheet) return { success: false, message: 'Orders sheet not found' };

    const orderData = orderSheet.getDataRange().getValues();
    console.log('Orders sheet has', orderData.length, 'rows');
    
    for (let i = orderData.length - 1; i >= 1; i--) { // Skip header row
      const sheetOrderId = orderData[i][0];
      console.log('Checking row', i, 'sheetOrderId:', sheetOrderId, 'type:', typeof sheetOrderId);
      
      // Use loose equality to handle type mismatches
      if (sheetOrderId == orderId) {
        console.log('Found matching order, deleting row', i + 1);
        orderSheet.deleteRow(i + 1);
        break;
      }
    }
    
    // Also delete any payments for this order
    const paymentsSheet = spreadsheet.getSheetByName('Payments');
    if (paymentsSheet) {
      const paymentsData = paymentsSheet.getDataRange().getValues();
      console.log('Payments sheet has', paymentsData.length, 'rows');
      
      for (let i = paymentsData.length - 1; i >= 1; i--) { // Skip header row
        const paymentOrderId = paymentsData[i][1]; // Column B contains Order ID
        console.log('Checking payment row', i, 'paymentOrderId:', paymentOrderId, 'type:', typeof paymentOrderId);
        
        // Use loose equality to handle type mismatches
        if (paymentOrderId == orderId) {
          console.log('Found matching payment, deleting row', i + 1);
          paymentsSheet.deleteRow(i + 1);
        }
      }
    }
    
    return { success: true, message: 'Order and related payments deleted successfully' };
  } catch (error) {
    console.log('Error in deleteOrder:', error);
    return { success: false, message: error.toString() };
  }
}

// Delete payment
function deletePayment(spreadsheet, paymentId) {
  try {
    const paymentsSheet = spreadsheet.getSheetByName('Payments');
    if (!paymentsSheet) return { success: false, message: 'Payments sheet not found' };

    const data = paymentsSheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) { // Skip header row
      if (data[i][0] === paymentId) {
        paymentsSheet.deleteRow(i + 1);
        break;
      }
    }
    return { success: true, message: 'Payment deleted successfully' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getData(spreadsheet, type) {
  try {
    let targetSheet;
    switch (type) {
      case 'customers':
        targetSheet = spreadsheet.getSheetByName('Customers');
        break;
      case 'items':
        targetSheet = spreadsheet.getSheetByName('Items');
        break;
      case 'orders':
        targetSheet = spreadsheet.getSheetByName('Orders');
        break;
      case 'payments':
        targetSheet = spreadsheet.getSheetByName('Payments');
        break;
      default:
        return { success: false, message: 'Unknown data type' };
    }

    if (!targetSheet) {
      return { success: true, data: [] };
    }

    const data = targetSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const result = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// Update an existing order
function updateOrder(spreadsheet, orderData) {
  try {
    console.log('=== updateOrder called ===');
    console.log('Order data:', orderData);
    console.log('Order ID type:', typeof orderData.id);
    console.log('Order ID value:', orderData.id);
    
    const ordersSheet = getOrCreateSheet(spreadsheet, 'Orders');
    const data = ordersSheet.getDataRange().getValues();
    
    console.log('Orders sheet data length:', data.length);
    console.log('All orders data:', data);
    console.log('Looking for order ID:', orderData.id);
    
    // Enhanced debugging for ID comparison
    console.log('=== ORDER ID COMPARISON DEBUG ===');
    for (let i = 1; i < data.length; i++) {
      const sheetId = data[i][0];
      console.log(`Row ${i}: Sheet ID = "${sheetId}" (type: ${typeof sheetId}), Order ID = "${orderData.id}" (type: ${typeof orderData.id})`);
      console.log(`Row ${i}: Loose equality (==): ${sheetId == orderData.id}`);
      console.log(`Row ${i}: Strict equality (===): ${sheetId === orderData.id}`);
    }
    
    // Find the order by ID (assuming ID is in column A)
    const orderId = orderData.id;
    let orderRowIndex = -1;
    
    for (let i = 1; i < data.length; i++) { // Skip header row
      console.log('Checking row', i, 'ID:', data[i][0], 'Type:', typeof data[i][0]);
      if (data[i][0] == orderId) { // Column A contains ID
        orderRowIndex = i + 1; // +1 because sheet rows are 1-indexed
        console.log('Found order at row:', orderRowIndex);
        break;
      }
    }
    
    if (orderRowIndex === -1) {
      console.log('Order not found in sheet');
      return { success: false, message: 'Order not found with ID: ' + orderId };
    }
    
    // Update the order data
    // Assuming columns: ID, Customer ID, Status, Date Ordered, Date Completed, Items JSON
    
    console.log('=== UPDATING ORDER DATA ===');
    console.log('Order row index:', orderRowIndex);
    
    // Update customer ID if provided
    if (orderData.customer_id) {
      console.log('Updating customer_id to:', orderData.customer_id);
      console.log('Setting range:', orderRowIndex, 2, 1, 1);
      ordersSheet.getRange(orderRowIndex, 2, 1, 1).setValue(orderData.customer_id); // Customer ID column
      console.log('Customer ID updated successfully');
    }
    
    // Update status if provided
    if (orderData.status) {
      console.log('Updating status to:', orderData.status);
      console.log('Setting range:', orderRowIndex, 3, 1, 1);
      ordersSheet.getRange(orderRowIndex, 3, 1, 1).setValue(orderData.status); // Status column
      console.log('Status updated successfully');
    }
    
    // Update date_completed if provided
    if (orderData.date_completed) {
      console.log('Updating date_completed to:', orderData.date_completed);
      console.log('Setting range:', orderRowIndex, 5, 1, 1);
      ordersSheet.getRange(orderRowIndex, 5, 1, 1).setValue(new Date(orderData.date_completed)); // Date Completed column
      console.log('Date completed updated successfully');
    }
    
    // Update items JSON if provided
    if (orderData.items) {
      console.log('Updating items JSON to:', JSON.stringify(orderData.items));
      console.log('Setting range:', orderRowIndex, 6, 1, 1);
      ordersSheet.getRange(orderRowIndex, 6, 1, 1).setValue(JSON.stringify(orderData.items)); // Items JSON column
      console.log('Items JSON updated successfully');
    }
    
    console.log('=== ORDER UPDATE COMPLETED ===');
    console.log('Order updated successfully');
    return { success: true, message: 'Order updated successfully' };
    
  } catch (error) {
    console.log('Error in updateOrder:', error.toString());
    return { success: false, message: error.toString() };
  }
}

// Test function to verify the script is working
function testScript() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  var customer = {
    id: "1758277747428",
    name: "Christian Sabarre",
    email: "iansabarre@gmail.com",
    phone: "639083532956",
    created_at:"9/19/2025 18:29:07"
  };

  updateCustomer(spreadsheet, customer)
}


