// ===================================
// GOOGLE APPS SCRIPT - CHARLIE FAST FOOD
// VERSIÓN FINAL - GET ONLY (EVITA CORS)
// ===================================

function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;
    const callback = params.callback; // Para JSONP

    // Si hay un parámetro 'data' con JSON, parsearlo
    let data = {};
    if (params.data) {
      try {
        data = JSON.parse(params.data);
      } catch (err) {
        data = params;
      }
    } else {
      data = params;
    }

    let response;

    switch (action) {
      case 'getCategories':
        response = { success: true, data: getCategories() };
        break;

      case 'getProducts':
        response = { success: true, data: getProducts() };
        break;

      case 'createCategory':
        response = createCategory(data);
        break;

      case 'updateCategory':
        response = updateCategory(data);
        break;

      case 'deleteCategory':
        response = deleteCategory(data);
        break;

      case 'createProduct':
        response = createProduct(data);
        break;

      case 'updateProduct':
        response = updateProduct(data);
        break;

      case 'deleteProduct':
        response = deleteProduct(data);
        break;

      case 'createOrder':
        response = createOrder(data);
        break;

      case 'login':
        response = validateLogin(data);
        break;
      case 'getPredefinedNotes':
        response = { success: true, data: getPredefinedNotes() };
        break;
      case 'addPredefinedNote':
        response = addPredefinedNote(data);
        break;
      case 'deletePredefinedNote':
        response = deletePredefinedNote(data);
        break;
      case 'getOrders':
        response = { success: true, data: getOrders(data.filters) };
        break;
      case 'getDashboardData':
        response = { success: true, data: getDashboardData(data.filters) };
        break;
      case 'updateOrder':
        response = updateOrder(data);
        break;
      case 'deleteOrder':
        response = deleteOrder(data);
        break;
      case 'deleteAllOrders':
        response = deleteAllOrders();
        break;

      default:
        response = {
          success: true,
          message: 'Charlie Fast Food POS API funcionando',
          timestamp: new Date().toISOString()
        };
    }

    // Si hay callback (JSONP), devolver como función JavaScript
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(response) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    // Si no hay callback, devolver JSON normal
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResponse = { success: false, error: error.toString() };

    if (e.parameter.callback) {
      return ContentService
        .createTextOutput(e.parameter.callback + '(' + JSON.stringify(errorResponse) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
  Logger.log("doGet recibido. action=%s, params=%s", action, JSON.stringify(params));

}

// También mantener doPost por compatibilidad
function doPost(e) {

  Logger.log("⚡ doGet PARAMS: " + JSON.stringify(e.parameter));
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let response;

    switch (action) {
      case 'getCategories':
        response = { success: true, data: getCategories() };
        break;

      case 'getProducts':
        response = { success: true, data: getProducts() };
        break;

      case 'createCategory':
        response = createCategory(data);
        break;

      case 'updateCategory':
        response = updateCategory(data);
        break;

      case 'deleteCategory':
        response = deleteCategory(data);
        break;

      case 'createProduct':
        response = createProduct(data);
        break;

      case 'updateProduct':
        response = updateProduct(data);
        break;

      case 'deleteProduct':
        response = deleteProduct(data);
        break;

      case 'createOrder':
        response = createOrder(data);
        break;

      case 'getOrders':
        response = { success: true, data: getOrders() };
        break;
      case 'getDashboardData':
        response = { success: true, data: getDashboardData(data.filters) };
        break;
        
      case 'deleteAllOrders':
        response = deleteAllOrders();
        break;

      default:
        response = { success: true, message: 'API funcionando' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  Logger.log("⚡ doGet DATA: " + JSON.stringify(data));
}

// ===================================
// INICIALIZACIÓN
// ===================================

function initializeTestData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  createSheetIfNotExists('Categorías', ['ID', 'Nombre', 'Fecha Creación']);
  createSheetIfNotExists('Productos', ['ID', 'Nombre', 'Categoría', 'Precio', 'Descripción', 'Fecha Creación']);
  createSheetIfNotExists('Órdenes', ['Número Orden', 'Fecha', 'Cliente', 'Tipo', 'Direccion', 'Valor Domicilio', 'Pago', 'Total', 'Subtotal', 'Estado']);
  createSheetIfNotExists('Detalle_Órdenes', ['Número Orden', 'Producto', 'Cantidad', 'Precio Unitario', 'Subtotal', 'Notas']);

  const categoriesSheet = ss.getSheetByName('Categorías');
  const categories = [
    ['CAT001', 'Salchipapas', new Date()],
    ['CAT002', 'Perros Calientes', new Date()],
    ['CAT003', 'Hamburguesas', new Date()],
    ['CAT004', 'Asados', new Date()],
    ['CAT005', 'Adicionales', new Date()]
  ];

  if (categoriesSheet.getLastRow() <= 1) {
    categoriesSheet.getRange(2, 1, categories.length, 3).setValues(categories);
  }

  const productsSheet = ss.getSheetByName('Productos');
  const products = [
    ['PROD001', 'Salchipapa Sencilla', 'Salchipapas', 12000, 'Papas a la francesa, salchicha, queso costeño, papa chongo, lechuga, salsa piña y salsa tártara.', new Date()],
    ['PROD002', 'Salchipapa Butifarra o Chorizo', 'Salchipapas', 16000, 'Papas a la francesa, chorizo o butifarra, queso costeño, papa chongo, lechuga, salsa piña y salsa tártara.', new Date()],
    ['PROD003', 'Salchipapa Suiza', 'Salchipapas', 16000, '', new Date()],
    ['PROD004', 'Salchipapa Suiza Gratinada', 'Salchipapas', 18000, '', new Date()],
    ['PROD005', 'Salchipapa Mixta', 'Salchipapas', 22000, '', new Date()],
    ['PROD006', 'Salchicarne', 'Salchipapas', 24000, '', new Date()],
    ['PROD007', 'Salchipollo', 'Salchipapas', 22000, '', new Date()],
    ['PROD008', 'Salchicarne-Pollo', 'Salchipapas', 24000, '', new Date()],
    ['PROD009', 'Salchipapa Para Dos', 'Salchipapas', 26000, '', new Date()],
    ['PROD010', 'Salchipapa Especial (3 personas)', 'Salchipapas', 32000, '', new Date()],
    ['PROD011', 'Salvajada (4 personas)', 'Salchipapas', 40000, '', new Date()],
    ['PROD012', 'Mega Salvajada (6 personas)', 'Salchipapas', 60000, '', new Date()],
    ['PROD013', 'Perro Sencillo', 'Perros Calientes', 6000, '', new Date()],
    ['PROD014', 'Perro Gratinado', 'Perros Calientes', 7000, '', new Date()],
    ['PROD015', 'Perro a la Plancha', 'Perros Calientes', 7000, '', new Date()],
    ['PROD016', 'Perro Plancha Gratinado', 'Perros Calientes', 8000, '', new Date()],
    ['PROD017', 'Perro Gemelo', 'Perros Calientes', 8000, '', new Date()],
    ['PROD018', 'Perro Gemelo Gratinado', 'Perros Calientes', 10000, '', new Date()],
    ['PROD019', 'Perro Suizo', 'Perros Calientes', 15000, '', new Date()],
    ['PROD020', 'Perro Suizo en Combo', 'Perros Calientes', 22000, '', new Date()],
    ['PROD021', 'Perro en Combo', 'Perros Calientes', 14000, '', new Date()],
    ['PROD022', 'Perropollo', 'Perros Calientes', 13000, '', new Date()],
    ['PROD023', 'Perro 4 Carnes', 'Perros Calientes', 17000, '', new Date()],
    ['PROD024', 'Perro Mixto', 'Perros Calientes', 15000, '', new Date()],
    ['PROD025', 'Butyperro', 'Perros Calientes', 15000, '', new Date()],
    ['PROD026', 'Choryperro', 'Perros Calientes', 12000, '', new Date()],
    ['PROD027', 'Miti Suizo', 'Perros Calientes', 10000, '', new Date()],
    ['PROD028', 'Hamburguesa de Carne', 'Hamburguesas', 14000, 'Carne, pan brioche, queso mozzarella, salsa tártara, salsa piña y vegetales.', new Date()],
    ['PROD029', 'Hamburguesa Doble Carne', 'Hamburguesas', 18000, '', new Date()],
    ['PROD030', 'Hamburguesa de Pollo', 'Hamburguesas', 14000, '', new Date()],
    ['PROD031', 'Hamburguesa en Combo', 'Hamburguesas', 19000, '', new Date()],
    ['PROD032', 'Hamburguesa Especial', 'Hamburguesas', 20000, '', new Date()],
    ['PROD033', 'Pechuga Asada', 'Asados', 22000, '', new Date()],
    ['PROD034', 'Pechuga Gratinada', 'Asados', 24000, '', new Date()],
    ['PROD035', 'Porción de Papas', 'Adicionales', 6000, '', new Date()],
    ['PROD036', 'Queso Mozzarella', 'Adicionales', 5000, '', new Date()],
    ['PROD037', 'Salchicha Suiza', 'Adicionales', 8000, '', new Date()]
  ];

  if (productsSheet.getLastRow() <= 1) {
    productsSheet.getRange(2, 1, products.length, 6).setValues(products);
  }

  Logger.log('✅ Datos cargados: ' + categories.length + ' categorías, ' + products.length + ' productos');
}

function createSheetIfNotExists(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground('#FFD700');
    headerRange.setFontWeight('bold');
    headerRange.setFontColor('#000000');
  }

  return sheet;
}

// ===================================
// CATEGORÍAS
// ===================================

function getCategories() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Categorías');
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

  return data.map(row => ({
    id: row[0],
    name: row[1],
    createdAt: row[2]
  }));
}

function createCategory(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Categorías');
  const id = 'CAT' + Utilities.getUuid().substring(0, 8);

  sheet.appendRow([id, data.name, new Date()]);

  return { success: true, id: id };
}

function updateCategory(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Categorías');
  const dataRange = sheet.getDataRange().getValues();

  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.id) {
      sheet.getRange(i + 1, 2).setValue(data.name);
      return { success: true };
    }
  }

  return { success: false, error: 'Categoría no encontrada' };
}

function deleteCategory(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Categorías');
  const dataRange = sheet.getDataRange().getValues();

  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: 'Categoría no encontrada' };
}

// ===================================
// PRODUCTOS
// ===================================

function getProducts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Productos');
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  return data.map(row => ({
    id: row[0],
    name: row[1],
    category: row[2],
    price: row[3],
    description: row[4],
    createdAt: row[5]
  }));
}

function createProduct(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Productos');
  const id = 'PROD' + Utilities.getUuid().substring(0, 8);

  sheet.appendRow([
    id,
    data.name,
    data.category,
    data.price,
    data.description || '',
    new Date()
  ]);

  return { success: true, id: id };
}

function updateProduct(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Productos');
  const dataRange = sheet.getDataRange().getValues();

  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.id) {
      sheet.getRange(i + 1, 2, 1, 4).setValues([[
        data.name,
        data.category,
        data.price,
        data.description || ''
      ]]);
      return { success: true };
    }
  }

  return { success: false, error: 'Producto no encontrado' };
}

function deleteProduct(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Productos');
  const dataRange = sheet.getDataRange().getValues();

  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: 'Producto no encontrado' };
}

// ===================================
// ÓRDENES
// ===================================


function createOrder(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
  const ordersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Órdenes');
  const detailsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Detalle_Órdenes');
  const orderNumber = ordersSheet.getLastRow();

  ordersSheet.appendRow([
    orderNumber,
    new Date(),
    data.customerName,
    data.orderType,
    data.address || '',           // NUEVO
    data.deliveryCharge || 0,     // NUEVO
    data.paymentMethod || 'Efectivo', // NUEVO
    data.subtotal || data.total,   // NUEVO
    data.total,
    'Completada'
  ]);

  data.items.forEach(item => {
    detailsSheet.appendRow([
      orderNumber,
      item.name,
      item.quantity,
      item.price,
      item.price * item.quantity,
      item.notes || ''
    ]);
  });

  return { success: true, orderNumber: orderNumber };
  } finally {
    lock.releaseLock();
  }
}



// AGREGAR AL FINAL de tu appscript.gs actual

function validateLogin(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Configuración');
  const configData = sheet.getDataRange().getValues();
  let adminUser, adminPassword;
  for (let i = 1; i < configData.length; i++) {
    if (configData[i][0] === 'ADMIN_USER') adminUser = configData[i][1];
    if (configData[i][0] === 'ADMIN_PASSWORD') adminPassword = configData[i][1];
  }
  return data.username === adminUser && data.password === adminPassword
    ? { success: true, message: 'Login exitoso' }
    : { success: false, message: 'Credenciales incorrectas' };
}

function getPredefinedNotes() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Notas_Predefinidas');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  return sheet.getRange(2, 1, lastRow - 1, 2).getValues().map(row => ({
    id: row[0],
    text: row[1]
  }));
}

function addPredefinedNote(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Notas_Predefinidas');
  const id = 'NOTA' + Date.now().toString().slice(-6);
  sheet.appendRow([id, data.text]);
  return { success: true, id: id };
}

function deletePredefinedNote(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Notas_Predefinidas');
  const dataRange = sheet.getDataRange().getValues();
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Nota no encontrada' };
}

/**
 * Devuelve las órdenes aplicando filtros opcionales.
 * Reemplaza cualquier otra implementación de getOrders en tu archivo.
 */
function getOrders(filters) {
  try {
    Logger.log("getOrders llamado con filters: %s", JSON.stringify(filters));

    // Asegurar que 'filters' sea un objeto, incluso si llega como string
    if (typeof filters === "string") {
      try {
        filters = JSON.parse(filters);
      } catch (err) {
        filters = {};
      }
    }
    filters = filters || {};

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Órdenes');
    if (!sheet) {
      Logger.log("Hoja 'Órdenes' no encontrada");
      return [];
    }

    const dataRange = sheet.getDataRange();
    const allData = dataRange.getValues();

    if (allData.length <= 1) return [];

    const headers = allData.shift(); // Quita la fila de encabezados

    // Preparar filtros
    const dateStart = filters.dateStart ? new Date(filters.dateStart) : null;
    const dateEnd = filters.dateEnd ? new Date(filters.dateEnd) : null;
    const filterPayment = (filters.paymentMethod || "").trim();

    Logger.log("Aplicando filtros -> Fecha Inicio: %s, Fecha Fin: %s, Pago: %s", dateStart, dateEnd, filterPayment);

    const filteredOrders = allData.map((row, index) => {
      // Guardamos el número de fila original (index + 2 porque quitamos encabezados y las filas empiezan en 1)
      return { data: row, originalRowIndex: index + 2 };
    }).filter(item => {
      const row = item.data;
      const orderDate = new Date(row[1]); // Columna B: Fecha
      const paymentMethod = (row[6] || "").toString(); // Columna G: Pago

      let dateMatch = true;
      if (dateStart && dateEnd) {
        dateMatch = orderDate >= dateStart && orderDate <= dateEnd;
      }

      let paymentMatch = true;
      if (filterPayment && filterPayment !== "all") {
        paymentMatch = paymentMethod.toLowerCase() === filterPayment.toLowerCase();
      }

      return dateMatch && paymentMatch;
    });

    // Mapear los datos filtrados al formato que espera el frontend
    return filteredOrders.map(item => ({
      rowIndex: item.originalRowIndex, // ¡Importante para poder eliminar!
      orderNumber: item.data[0],
      rawDate: item.data[1],
      customer: item.data[2],
      type: item.data[3],
      address: item.data[4],
      paymentMethod: item.data[6],
      total: item.data[8],
    }));
  } catch (err) {
    Logger.log("Error en getOrders: %s", err.toString());
    return [];
  }
}


function updateOrder(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Órdenes');
  sheet.getRange(data.rowIndex, 3, 1, 7).setValues([[
    data.customer,
    data.type,
    data.address || '',
    data.deliveryCharge || 0,
    data.paymentMethod,
    data.subtotal,
    data.total
  ]]);
  return { success: true };
}



function deleteOrder(data) {
  const ordersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Órdenes');
  const detailsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Detalle_Órdenes');

  // Eliminar detalles
  const detailsData = detailsSheet.getDataRange().getValues();
  for (let i = detailsData.length - 1; i >= 1; i--) {
    if (detailsData[i][0] === data.orderNumber) {
      detailsSheet.deleteRow(i + 1);
    }
  }

  // Eliminar orden
  ordersSheet.deleteRow(data.rowIndex);
  return { success: true };
}

function deleteAllOrders() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Borrar hoja de Órdenes (manteniendo encabezados)
    const ordersSheet = ss.getSheetByName('Órdenes');
    if (ordersSheet) {
      const lastRow = ordersSheet.getLastRow();
      if (lastRow > 1) {
        ordersSheet.deleteRows(2, lastRow - 1);
      }
    }
    
    // 2. Borrar hoja de Detalles (manteniendo encabezados)
    const detailsSheet = ss.getSheetByName('Detalle_Órdenes');
    if (detailsSheet) {
      const lastRow = detailsSheet.getLastRow();
      if (lastRow > 1) {
        detailsSheet.deleteRows(2, lastRow - 1);
      }
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function parseSheetDate(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof value === "string") {
    const datePart = value.split(" ")[0]; // "13/11/2025" de "13/11/2025 22:22:53"
    const parts = datePart.split("/");    // ["13","11","2025"]

    if (parts.length === 3) {
      const d = parts[0];
      const m = parts[1];
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
  }

  return "";
}

function createConfigSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Configuración');
  if (!sheet) sheet = ss.insertSheet('Configuración');

  sheet.clear();
  sheet.appendRow(['ADMIN_USER', 'admin']);
  sheet.appendRow(['ADMIN_PASSWORD', 'charlie2025']);
}

function getDashboardData(filters) {
  filters = filters || {};
  if (typeof filters === 'string') {
    try { filters = JSON.parse(filters); } catch (e) { filters = {}; }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ordersSheet = ss.getSheetByName('Órdenes');
  const detailsSheet = ss.getSheetByName('Detalle_Órdenes');
  const orders = ordersSheet && ordersSheet.getLastRow() > 1
    ? ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, 10).getValues()
    : [];
  const details = detailsSheet && detailsSheet.getLastRow() > 1
    ? detailsSheet.getRange(2, 1, detailsSheet.getLastRow() - 1, 6).getValues()
    : [];

  const start = filters.dateStart || null;
  const end = filters.dateEnd || null;
  const filtered = orders.filter(row => {
    const operationalDate = getOperationalDate(row);
    return (!start || operationalDate >= start) && (!end || operationalDate <= end);
  });
  const orderIds = {};
  const payments = {};
  const types = { local: 0, domicilio: 0 };
  const daily = {};
  let sales = 0;

  filtered.forEach(row => {
    orderIds[String(row[0])] = true;
    const total = Number(row[8]) || 0;
    sales += total;
    const payment = String(row[6] || 'Sin definir');
    payments[payment] = (payments[payment] || 0) + total;
    const type = String(row[3] || 'local').toLowerCase();
    types[type] = (types[type] || 0) + 1;
    const key = getOperationalDate(row);
    daily[key] = (daily[key] || 0) + total;
  });

  const products = {};
  details.forEach(row => {
    if (!orderIds[String(row[0])]) return;
    const name = String(row[1] || 'Producto');
    if (!products[name]) products[name] = { name: name, quantity: 0, revenue: 0 };
    products[name].quantity += Number(row[2]) || 0;
    products[name].revenue += Number(row[4]) || 0;
  });

  return {
    sales: sales,
    orderCount: filtered.length,
    averageTicket: filtered.length ? sales / filtered.length : 0,
    unitsSold: Object.keys(products).reduce((sum, key) => sum + products[key].quantity, 0),
    payments: Object.keys(payments).map(name => ({ name: name, total: payments[name] })),
    types: types,
    topProducts: Object.keys(products).map(key => products[key])
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue),
    dailySales: Object.keys(daily).sort().map(date => ({ date: date, total: daily[date] }))
  };
}

// ===================================
// DÍA OPERATIVO CON CORTE AUTOMÁTICO A LAS 5:00 A. M.
// ===================================

const OPERATIONAL_CUTOFF_HOURS = 5;

function getOperationalDate(row) {
  const orderDate = new Date(row[1]);
  const shiftedDate = new Date(orderDate.getTime() - OPERATIONAL_CUTOFF_HOURS * 60 * 60 * 1000);
  return Utilities.formatDate(shiftedDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
