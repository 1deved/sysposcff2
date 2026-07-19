// ===================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ===================================

// URL del Web App de Google Apps Script (REEMPLAZAR CON LA URL REAL)
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxYgEankz28RGX2Hx9NuLMHL9xrGnRjMK_X6OKRJO5D6vM1HHDiLwx3jSjYP92vdDC-/exec";

// Estado de la aplicación
let state = {
  products: [],
  categories: [],
  cart: [],
  currentView: "orden",
  selectedCategory: "all",
  productSearch: "",
  tempProduct: null,
  isAdminLoggedIn: false,
  currentUser: null,
};

// ===================================
// INICIALIZACIÓN
// ===================================

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setupEventListeners();
  // Buscar esta línea:
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => switchTab(e.target.dataset.tab));
  });

  // Y ASEGURARSE que switchTab esté así:
  function switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });

    document.querySelector(`[data-tab="${tab}"]`).classList.add("active");
    const tabId = "tab" + tab.charAt(0).toUpperCase() + tab.slice(1);
    document.getElementById(tabId).classList.add("active");

    // Si abre tab de órdenes y ya está logueado, cargar órdenes
    if (tab === "ordenes" && state.isAdminLoggedIn) {
      loadOrdersAdmin();
    }
  }
});

// --- EVENTOS PARA MOSTRAR VISTA ORDEN Y ADMIN --- //
document.getElementById("btnAdmin").addEventListener("click", () => {
  document.getElementById("vistaOrden").classList.add("hidden");
  document.getElementById("vistaAdmin").classList.remove("hidden");

  document.getElementById("btnAdmin").classList.add("active");
  document.getElementById("btnOrden").classList.remove("active");

  // Verificar si ya está logueado
  if (state.isAdminLoggedIn) {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("adminContent").style.display = "block";
    loadAdminData();
  } else {
    document.getElementById("loginScreen").style.display = "block";
    document.getElementById("adminContent").style.display = "none";
  }
});

document.getElementById("btnOrden").addEventListener("click", () => {
  document.getElementById("vistaAdmin").classList.add("hidden");
  document.getElementById("vistaOrden").classList.remove("hidden");

  document.getElementById("btnOrden").classList.add("active");
  document.getElementById("btnAdmin").classList.remove("active");
});

async function initializeApp() {
  showLoader(true);
  await loadCategories();
  await loadProducts();
  renderProducts();
  renderCategoryFilters();
  showLoader(false);
}

// ===================================
// EVENT LISTENERS
// ===================================

function setupEventListeners() {
  // Navegación
  document
    .getElementById("btnOrden")
    .addEventListener("click", () => switchView("orden"));
  document
    .getElementById("btnAdmin")
    .addEventListener("click", () => switchView("admin"));

  // Carrito
  document.getElementById("btnClearCart").addEventListener("click", clearCart);
  document
    .getElementById("btnProcessOrder")
    .addEventListener("click", processOrder);

  // Administración - Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => switchTab(e.target.dataset.tab));
  });

  // Administración - Botones
  document
    .getElementById("btnNewProduct")
    .addEventListener("click", () => openProductModal());
  document
    .getElementById("btnNewCategory")
    .addEventListener("click", () => openCategoryModal());
    
  // Administración - Borrar todas las órdenes
  document
    .getElementById("btnDeleteAllOrders")
    .addEventListener("click", deleteAllOrders);

  // Formularios
  document
    .getElementById("formProduct")
    .addEventListener("submit", saveProduct);
  document
    .getElementById("formCategory")
    .addEventListener("submit", saveCategory);

  // Filtros de categoría
  document.getElementById("categoryFilter").addEventListener("click", (e) => {
    if (e.target.classList.contains("category-btn")) {
      filterByCategory(e.target.dataset.category);
    }
  });

  document.getElementById("productSearch").addEventListener("input", (e) => {
    state.productSearch = e.target.value;
    renderProducts();
  });

  // Listener para notas rápidas
  document.getElementById("quickNotes").addEventListener("change", (e) => {
    const note = e.target.value;
    if (note) {
      const textarea = document.getElementById("productNotes");
      const currentText = textarea.value.trim();
      if (currentText) {
        textarea.value = currentText + ", " + note;
      } else {
        textarea.value = note;
      }
      e.target.value = ""; // Resetear el select para permitir elegir otra
      textarea.focus();
    }
  });

  // Listener para mostrar/ocultar campo de propina
  document.getElementById("addTip").addEventListener("change", (e) => {
    const tipField = document.getElementById("tipField");
    tipField.style.display = e.target.checked ? "block" : "none";
    if (e.target.checked) {
      document.getElementById("tipAmount").focus();
    } else {
      document.getElementById("tipAmount").value = "";
    }
  });
}

const DEFAULT_LOCAL_TIP = 2000;

function setDefaultTipForOrderType(orderType) {
  const addTip = document.getElementById("addTip");
  const tipAmount = document.getElementById("tipAmount");
  const tipField = document.getElementById("tipField");
  const isLocal = orderType === "local";

  addTip.checked = isLocal;
  tipAmount.value = isLocal ? DEFAULT_LOCAL_TIP : "";
  tipField.style.display = isLocal ? "block" : "none";
}

// ===================================
// NAVEGACIÓN Y VISTAS
// ===================================

function switchView(view) {
  // Actualizar botones de navegación
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (view === "orden") {
    document.getElementById("btnOrden").classList.add("active");
    document.getElementById("vistaOrden").classList.add("active");
    document.getElementById("vistaAdmin").classList.remove("active");
  } else {
    document.getElementById("btnAdmin").classList.add("active");
    document.getElementById("vistaAdmin").classList.add("active");
    document.getElementById("vistaOrden").classList.remove("active");
    loadAdminData();
  }

  state.currentView = view;
}

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  document.querySelector(`[data-tab="${tab}"]`).classList.add("active");
  document
    .getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)
    .classList.add("active");
}

// ===================================
// COMUNICACIÓN CON GOOGLE SHEETS
// ===================================

function fetchData(action, data = {}) {
  return new Promise((resolve, reject) => {
    try {
      // Crear nombre único para el callback
      const callbackName =
        "callback_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substr(2, 9);

      // Construir parámetros
      const params = new URLSearchParams({
        action: action,
        callback: callbackName,
      });

      // Para datos complejos, usar JSON
      if (Object.keys(data).length > 0) {
        params.set("data", JSON.stringify(data));
      }

      // Crear script tag para JSONP
      const script = document.createElement("script");
      const url = `${SCRIPT_URL}?${params.toString()}`;

      // Definir callback global
      window[callbackName] = function (response) {
        // Limpiar
        delete window[callbackName];
        document.body.removeChild(script);

        // Resolver promesa
        resolve(response);
      };

      // Manejar errores
      script.onerror = function () {
        delete window[callbackName];
        document.body.removeChild(script);
        showToast("Error de conexión con el servidor", "error");
        reject(new Error("Error al cargar script"));
      };

      // Agregar script al DOM
      script.src = url;
      document.body.appendChild(script);
    } catch (error) {
      console.error("Error al comunicarse con Google Sheets:", error);
      showToast("Error de conexión con el servidor", "error");
      reject(error);
    }
  });
}

async function loadCategories() {
  const result = await fetchData("getCategories");
  if (result && result.success) {
    state.categories = result.data;
  }
}

async function loadProducts() {
  const result = await fetchData("getProducts");
  if (result && result.success) {
    state.products = result.data;
  }
}

// ===================================
// RENDERIZADO DE PRODUCTOS
// ===================================

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const normalizeSearch = (text) =>
    String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const searchTerm = normalizeSearch(state.productSearch);
  const filteredProducts = state.products.filter((product) => {
    const matchesCategory =
      state.selectedCategory === "all" ||
      product.category === state.selectedCategory;
    const searchableText = normalizeSearch(
      `${product.name} ${product.description || ""}`
    );
    return matchesCategory && searchableText.includes(searchTerm);
  });

  if (filteredProducts.length === 0) {
    grid.innerHTML =
      '<div class="empty-cart"><p>📦</p><span>No hay productos disponibles</span></div>';
    return;
  }

  grid.innerHTML = filteredProducts
    .map(
      (product) => `
        <div class="product-card" onclick="addToCart('${product.id}')">
            <h3>${product.name}</h3>
            <div class="product-price">${formatPrice(product.price)}</div>
            ${
              product.description
                ? `<p class="product-description">${product.description}</p>`
                : ""
            }
        </div>
    `
    )
    .join("");
}

function renderCategoryFilters() {
  const filterContainer = document.getElementById("categoryFilter");

  const buttons = [
    '<button class="category-btn active" data-category="all">Todos</button>',
    ...state.categories.map(
      (cat) =>
        `<button class="category-btn" data-category="${cat.name}">${cat.name}</button>`
    ),
  ].join("");

  filterContainer.innerHTML = buttons;
}

function filterByCategory(category) {
  state.selectedCategory = category;

  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document
    .querySelector(`[data-category="${category}"]`)
    .classList.add("active");

  renderProducts();
}

// ===================================
// GESTIÓN DEL CARRITO
// ===================================

function addToCart(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  // Guardar producto temporal y abrir modal de notas
  state.tempProduct = { ...product, quantity: 1, notes: "" };
  openNotesModal(product);
}

function confirmNotes() {
  const notes = document.getElementById("productNotes").value.trim();
  state.tempProduct.notes = notes;

  // Verificar si el producto ya está en el carrito (mismo producto y mismas notas)
  const existingItem = state.cart.find(
    (item) => item.id === state.tempProduct.id && item.notes === notes
  );

  if (existingItem) {
    existingItem.quantity++;
  } else {
    state.cart.push({ ...state.tempProduct });
  }

  renderCart();
  closeModal("modalNotes");
  document.getElementById("productNotes").value = "";
  showToast("Producto agregado al carrito", "success");
}

function updateQuantity(index, change) {
  const item = state.cart[index];
  item.quantity += change;

  if (item.quantity <= 0) {
    removeFromCart(index);
  } else {
    renderCart();
  }
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  renderCart();
  showToast("Producto eliminado", "success");
}

function clearCart() {
  const customerName = document.getElementById("customerName").value.trim();
  if (state.cart.length === 0 && customerName === "") return;

  if (confirm("¿Estás seguro de limpiar la orden actual?")) {
    state.cart = [];
    
    // Limpiar inputs
    document.getElementById("customerName").value = "";
    document.getElementById("deliveryAddress").value = "";
    const deliveryInput = document.getElementById("deliveryCharge");
    deliveryInput.value = deliveryInput.defaultValue || "2000";
    
    // Resetear opciones
    document.querySelector('input[name="orderType"][value="local"]').checked = true;
    document.getElementById("deliveryFields").style.display = "none";
    document.querySelector('input[name="paymentMethod"][value="Efectivo"]').checked = true;
    setDefaultTipForOrderType("local");

    renderCart();
    showToast("Orden limpiada", "success");
  }
}

function renderCart() {
  const cartContainer = document.getElementById("cartItems");
  const totalElement = document.getElementById("totalAmount");

  if (state.cart.length === 0) {
    cartContainer.innerHTML = `
            <div class="empty-cart">
                <p>🛒</p>
                <span>Carrito vacío</span>
            </div>
        `;
    totalElement.textContent = "$0";
    return;
  }

  cartContainer.innerHTML = state.cart
    .map(
      (item, index) => `
        <div class="cart-item">
            <div class="cart-item-header">
                <span class="cart-item-name">${item.name}</span>
                <button class="cart-item-remove" onclick="removeFromCart(${index})">×</button>
            </div>
            ${
              item.notes
                ? `<div class="cart-item-notes">📝 ${item.notes}</div>`
                : ""
            }
            <div class="cart-item-footer">
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
                <span class="cart-item-price">${formatPrice(
                  item.price * item.quantity
                )}</span>
            </div>
        </div>
    `
    )
    .join("");

  const total = calculateTotal();
  totalElement.textContent = formatPrice(total);
}

function calculateTotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ===================================
// PROCESAR ORDEN
// ===================================

async function processOrder() {
  const customerName = document.getElementById("customerName").value.trim();
  const orderType = document.querySelector(
    'input[name="orderType"]:checked'
  ).value;
  const paymentMethod = document.querySelector(
    'input[name="paymentMethod"]:checked'
  ).value;

  let address = "";
  let deliveryCharge = 0;
  let tip = 0;

  if (orderType === "domicilio") {
    address = document.getElementById("deliveryAddress").value.trim();
    deliveryCharge =
      parseInt(document.getElementById("deliveryCharge").value) || 0;

    if (!address) {
      showToast("Ingrese la dirección de entrega", "error");
      return;
    }
  }

  // Calcular propina si está marcada
  if (document.getElementById("addTip").checked) {
    tip = parseInt(document.getElementById("tipAmount").value) || 0;
  }

  if (state.cart.length === 0) {
    showToast("Agregue productos a la orden", "error");
    return;
  }

  showLoader(true);

  const subtotal = calculateTotal();
  const total = subtotal + deliveryCharge;
  const amountToPay = total + tip;

  const orderData = {
    customerName: customerName || "Consumidor final",
    orderType,
    address,
    deliveryCharge,
    paymentMethod,
    tip, // Agregamos la propina a los datos de la orden
    items: state.cart,
    subtotal,
    total,
    amountToPay,
    date: new Date().toISOString(),
  };

  const result = await fetchData("createOrder", orderData);

  if (result && result.success) {
    await printReceipts(result.orderNumber, orderData);

    state.cart = [];
    document.getElementById("customerName").value = "";
    document.getElementById("deliveryAddress").value = "";
    document.getElementById("deliveryCharge").value = "";
    setDefaultTipForOrderType(orderType);
    renderCart();

    showToast(`Orden #${result.orderNumber} procesada`, "success");
  }

  showLoader(false);
}

// ===================================
// SISTEMA DE IMPRESIÓN - AJUSTADO PARA PAPEL 80MM
// ===================================

const RECEIPT_LINE_WIDTH = 26;

async function printReceipts(orderNumber, orderData) {
  // Generar contenido de la factura
  const receiptContent = generateReceiptContent(orderNumber, orderData);

  // Configurar número de copias y sus nombres
  const copies = [
    "CLIENTE", // Primera copia
    "COCINA", // Segunda copia
    // Agrega más si necesitas: 'CAJA', 'MESERO', etc.
  ];

  // Imprimir cada copia
  for (let i = 0; i < copies.length; i++) {
    await printToThermalPrinter(receiptContent, copies[i]);
  }
}

function generateReceiptContent(orderNumber, orderData) {
  const {
    customerName,
    orderType,
    address,
    deliveryCharge,
    tip,
    paymentMethod,
    items,
    subtotal,
    total,
    amountToPay,
    date,
  } = orderData;
  const now = new Date(date);
  const formattedDate = now.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Menos caracteres por línea permiten imprimir una letra más grande en 80 mm.
  const center = (text) => {
    const len = text.length;
    const padding = Math.max(
      0,
      Math.floor((RECEIPT_LINE_WIDTH - len) / 2)
    );
    return " ".repeat(padding) + text;
  };
  const separator = "=".repeat(RECEIPT_LINE_WIDTH);
  const alignValues = (left, right) => {
    const spaces = Math.max(1, RECEIPT_LINE_WIDTH - left.length - right.length);
    return `${left}${" ".repeat(spaces)}${right}`;
  };

  let content = `
${center("CHARLIE FAST FOOD")}
${separator}
CLL 5A #1 C SUR - 48, Bellavista
Tel: 324 2749206
@charliefastfood
${separator}

Factura: ${String(orderNumber).padStart(3, "0")}
Fecha: ${formattedDate} ${formattedTime}
Cliente: ${customerName || "Consumidor final"}
Tipo: ${orderType.toUpperCase()}
${address ? "Dirección: " + address : ""}
Pago: ${paymentMethod}

${separator}
PRODUCTOS
${separator}

`;

  items.forEach((item) => {
    content += `${item.name}\n`;
    const qtyPrice = `${item.quantity} x ${formatPrice(item.price)}`;
    const itemTotal = formatPrice(item.price * item.quantity);
    content += `${alignValues(qtyPrice, itemTotal)}\n`;
    if (item.notes) {
      item.notes.split(",").forEach((note) => {
        content += `  * ${note.trim()}\n`;
      });
    }
    content += `\n`;
  });

  content += `${separator}\n`;
  content += `${alignValues("Subtotal:", formatPrice(subtotal))}\n`;
  if (deliveryCharge > 0) {
    content += `${alignValues("Domicilio:", formatPrice(deliveryCharge))}\n`;
  }
  if (tip > 0) {
    content += `${alignValues("Propina voluntaria:", formatPrice(tip))}\n`;
    content += `${alignValues("TOTAL VENTA:", formatPrice(total))}\n`;
    content += `${alignValues(
      "TOTAL A PAGAR:",
      formatPrice(amountToPay || total + tip)
    )}\n`;
  } else {
    content += `${alignValues("TOTAL:", formatPrice(total))}\n`;
  }
  content += `${separator}\n\n`;
  content += `${center("¡Gracias por su compra!")}\n`;
  content += `${center("Vuelve pronto")}\n\n\n`;

  return content;
}

async function printToThermalPrinter(content, copy) {
  try {
    // Agregar encabezado de copia
    const fullContent = `\n${copy}\n${"-".repeat(RECEIPT_LINE_WIDTH)}\n${content}`;

    // Abrir ventana de impresión
    const printWindow = window.open("", "_blank", "width=300,height=600");
    printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Factura - ${copy}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    @page {
                        size: auto;
                        margin: 0;
                    }
                    
                     body {
                         font-family: 'Courier New', Courier, monospace;
                         font-size: 13pt;
                         font-weight: 700;
                         width: 80mm;
                         margin: 0;
                         padding: 1.5mm;
                        background: white;
                        color: black;
                    }
                    
                     pre {
                         font-family: 'Courier New', Courier, monospace;
                         font-size: 13pt;
                         font-weight: 700;
                         white-space: pre-wrap;
                         overflow-wrap: anywhere;
                         margin: 0;
                         line-height: 1.25;
                    }
                </style>
            </head>
            <body>
                <pre>${fullContent}</pre>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            // Cerrar después de imprimir o cancelar
                            setTimeout(function() {
                                window.close();
                            }, 100);
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
    printWindow.document.close();
  } catch (error) {
    console.error("Error al imprimir:", error);
    showToast("Error al imprimir la factura", "error");
  }
}

// ===================================
// ADMINISTRACIÓN - PRODUCTOS
// ===================================

// --- LOGIN DE ADMINISTRACIÓN --- //

async function loadAdminData() {
  showLoader(true);
  await loadProducts();
  await loadCategories();
  renderProductsTable();
  renderCategoriesGrid();
  updateCategorySelects();
  showLoader(false);
}

function renderProductsTable() {
  const tbody = document.getElementById("productsTableBody");

  if (state.products.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;">No hay productos registrados</td></tr>';
    return;
  }

  tbody.innerHTML = state.products
    .map(
      (product) => `
        <tr>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${formatPrice(product.price)}</td>
            <td>${product.description || "-"}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editProduct('${
                      product.id
                    }')">Editar</button>
                    <button class="btn-delete" onclick="deleteProduct('${
                      product.id
                    }')">Eliminar</button>
                </div>
            </td>
        </tr>
    `
    )
    .join("");
}

function openProductModal(productId = null) {
  const modal = document.getElementById("modalProduct");
  const title = document.getElementById("modalProductTitle");
  const form = document.getElementById("formProduct");

  form.reset();
  updateCategorySelects();

  if (productId) {
    const product = state.products.find((p) => p.id === productId);
    if (product) {
      title.textContent = "Editar Producto";
      document.getElementById("productId").value = product.id;
      document.getElementById("productName").value = product.name;
      document.getElementById("productCategory").value = product.category;
      document.getElementById("productPrice").value = product.price;
      document.getElementById("productDescription").value =
        product.description || "";
    }
  } else {
    title.textContent = "Nuevo Producto";
    document.getElementById("productId").value = "";
  }

  openModal("modalProduct");
}

function editProduct(productId) {
  openProductModal(productId);
}

async function deleteProduct(productId) {
  if (!confirm("¿Estás seguro de eliminar este producto?")) return;

  showLoader(true);
  const result = await fetchData("deleteProduct", { id: productId });

  if (result && result.success) {
    await loadProducts();
    renderProductsTable();
    renderProducts();
    showToast("Producto eliminado correctamente", "success");
  } else {
    showToast("Error al eliminar el producto", "error");
  }

  showLoader(false);
}

async function saveProduct(e) {
  e.preventDefault();

  const productData = {
    id: document.getElementById("productId").value,
    name: document.getElementById("productName").value.trim(),
    category: document.getElementById("productCategory").value,
    price: parseInt(document.getElementById("productPrice").value),
    description: document.getElementById("productDescription").value.trim(),
  };

  showLoader(true);
  const action = productData.id ? "updateProduct" : "createProduct";
  const result = await fetchData(action, productData);

  if (result && result.success) {
    await loadProducts();
    renderProductsTable();
    renderProducts();
    renderCategoryFilters();
    closeModal("modalProduct");
    showToast(
      productData.id
        ? "Producto actualizado correctamente"
        : "Producto creado correctamente",
      "success"
    );
  } else {
    showToast("Error al guardar el producto", "error");
  }

  showLoader(false);
}

// ===================================
// ADMINISTRACIÓN - CATEGORÍAS
// ===================================

function renderCategoriesGrid() {
  const grid = document.getElementById("categoriesGrid");

  if (state.categories.length === 0) {
    grid.innerHTML =
      '<div class="empty-cart"><p>📁</p><span>No hay categorías registradas</span></div>';
    return;
  }

  grid.innerHTML = state.categories
    .map(
      (category) => `
        <div class="category-card">
            <h3>${category.name}</h3>
            <div class="action-btns">
                <button class="btn-edit" onclick="editCategory('${category.id}')">Editar</button>
                <button class="btn-delete" onclick="deleteCategory('${category.id}')">Eliminar</button>
            </div>
        </div>
    `
    )
    .join("");
}

function openCategoryModal(categoryId = null) {
  const modal = document.getElementById("modalCategory");
  const title = document.getElementById("modalCategoryTitle");
  const form = document.getElementById("formCategory");

  form.reset();

  if (categoryId) {
    const category = state.categories.find((c) => c.id === categoryId);
    if (category) {
      title.textContent = "Editar Categoría";
      document.getElementById("categoryId").value = category.id;
      document.getElementById("categoryName").value = category.name;
    }
  } else {
    title.textContent = "Nueva Categoría";
    document.getElementById("categoryId").value = "";
  }

  openModal("modalCategory");
}

function editCategory(categoryId) {
  openCategoryModal(categoryId);
}

async function deleteCategory(categoryId) {
  // Verificar si hay productos con esta categoría
  const hasProducts = state.products.some(
    (p) =>
      p.category === state.categories.find((c) => c.id === categoryId)?.name
  );

  if (hasProducts) {
    showToast(
      "No se puede eliminar una categoría con productos asociados",
      "error"
    );
    return;
  }

  if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;

  showLoader(true);
  const result = await fetchData("deleteCategory", { id: categoryId });

  if (result && result.success) {
    await loadCategories();
    renderCategoriesGrid();
    renderCategoryFilters();
    updateCategorySelects();
    showToast("Categoría eliminada correctamente", "success");
  } else {
    showToast("Error al eliminar la categoría", "error");
  }

  showLoader(false);
}

async function saveCategory(e) {
  e.preventDefault();

  const categoryData = {
    id: document.getElementById("categoryId").value,
    name: document.getElementById("categoryName").value.trim(),
  };

  showLoader(true);
  const action = categoryData.id ? "updateCategory" : "createCategory";
  const result = await fetchData(action, categoryData);

  if (result && result.success) {
    await loadCategories();
    renderCategoriesGrid();
    renderCategoryFilters();
    updateCategorySelects();
    closeModal("modalCategory");
    showToast(
      categoryData.id
        ? "Categoría actualizada correctamente"
        : "Categoría creada correctamente",
      "success"
    );
  } else {
    showToast("Error al guardar la categoría", "error");
  }

  showLoader(false);
}

function updateCategorySelects() {
  const select = document.getElementById("productCategory");
  select.innerHTML =
    '<option value="">Seleccione una categoría</option>' +
    state.categories
      .map((cat) => `<option value="${cat.name}">${cat.name}</option>`)
      .join("");
}

// ===================================
// UTILIDADES
// ===================================

function formatPrice(price) {
  return "$" + price.toLocaleString("es-CO");
}

function showLoader(show) {
  const loader = document.getElementById("loader");
  if (show) {
    loader.classList.add("active");
  } else {
    loader.classList.remove("active");
  }
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function openNotesModal(product) {
  document.getElementById("notesProductName").textContent = product.name;
  document.getElementById("productNotes").value = "";
  
  // Resetear select de notas rápidas
  const quickNotes = document.getElementById("quickNotes");
  if (quickNotes) quickNotes.value = "";
  
  openModal("modalNotes");
}

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon = type === "success" ? "✓" : "✕";

  toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideInRight 0.3s ease reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cerrar modales al hacer clic fuera
window.onclick = function (event) {
  if (event.target.classList.contains("modal")) {
    event.target.classList.remove("active");
  }
};

// AGREGAR AL FINAL DE app.js

// Cargar notas predefinidas
async function loadPredefinedNotes() {
  const result = await fetchData("getPredefinedNotes");
  if (result && result.success) {
    state.predefinedNotes = result.data;
  }
}

// Cargar órdenes con filtros
async function loadOrdersAdmin() {
  const dateValue = document.getElementById("filterDate").value;
  const paymentMethod = document.getElementById("filterPayment").value;

  let filters = {
    paymentMethod,
  };

  // Si se seleccionó una fecha, crea un rango de inicio y fin para ese día.
  if (dateValue) {
    // Corregir zona horaria: crear fecha local explícita
    const [year, month, day] = dateValue.split("-").map(Number);
    const dateStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dateEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Enviamos las fechas en formato ISO, que es estándar y fácil de parsear en el backend.
    filters.dateStart = dateStart.toISOString();
    filters.dateEnd = dateEnd.toISOString();
  }

  showLoader(true);
  // Enviamos el objeto de filtros completo.
  const result = await fetchData("getOrders", { filters });
  showLoader(false);

  if (result && result.success) {
    let orders = result.data;

    // --- FILTRADO CLIENT-SIDE ---
    if (dateValue) {
      orders = orders.filter((order) => {
        const orderDateStr = order.rawDate || order.date;
        if (!orderDateStr) return false;
        const orderDate = new Date(orderDateStr);
        const oYear = orderDate.getFullYear();
        const oMonth = String(orderDate.getMonth() + 1).padStart(2, "0");
        const oDay = String(orderDate.getDate()).padStart(2, "0");
        return `${oYear}-${oMonth}-${oDay}` === dateValue;
      });
    }

    // Asegurar filtrado de pago
    if (paymentMethod !== "all") {
      orders = orders.filter(
        (order) => (order.paymentMethod || "Efectivo") === paymentMethod
      );
    }

    // Calcular total de ventas filtradas
    const totalSales = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const totalDisplay = document.getElementById("ordersTotalDisplay");
    if (totalDisplay) {
      totalDisplay.textContent = formatPrice(totalSales);
    }

    renderOrdersTable(orders);
  }
}

// Mostrar tabla de órdenes - VERSIÓN CORREGIDA
function renderOrdersTable(orders) {
  const tbody = document.getElementById("ordersTableBody");

  console.log("📊 Renderizando órdenes:", orders);

  if (!orders || orders.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--gray-medium);">No hay órdenes para mostrar</td></tr>';
    return;
  }

  tbody.innerHTML = orders
    .map((order) => {
      // Formatear fecha
      let formattedDate = "";
      try {
        const dateValue = order.rawDate || order.date; // <- AHORA SÍ
        if (dateValue) {
          const dateObj =
            dateValue instanceof Date ? dateValue : new Date(dateValue);
          formattedDate = dateObj.toLocaleString("es-CO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      } catch (e) {
        formattedDate = order.rawDate || "-";
      }

      return `
        <tr>
            <td><strong>${String(order.orderNumber || 0).padStart(3, "0")}</strong></td>
            <td>${formattedDate}</td>
            <td>${order.customer || "-"}</td>
            <td>
              <span style="background: ${
                order.type === "domicilio"
                  ? "var(--primary-orange)"
                  : "var(--primary-yellow)"
              }; 
              color: var(--dark-bg); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                ${(order.type || "local").toUpperCase()}
              </span>
            </td>
            <td>${order.address || "-"}</td>
            <td>
              <span style="background: ${
                order.paymentMethod === "Efectivo" ? "#22c55e" : "#3b82f6"
              }; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                ${order.paymentMethod || "Efectivo"}
              </span>
            </td>
            <td style="font-weight: 700; color: var(--primary-yellow);">${formatPrice(
              order.total || 0
            )}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-delete" onclick="deleteOrderAdmin(${
                      order.orderNumber
                    }, ${order.rowIndex})">
                        Eliminar
                    </button>
                </div>
            </td>
        </tr>
      `;
    })
    .join("");
}


// Función auxiliar para formatear fecha de orden
function formatOrderDate(dateStr) {
  try {
    // Si ya es formato YYYY-MM-DD
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Si es objeto Date
    if (dateStr instanceof Date) {
      return dateStr.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    }
    
    // Si es string con formato DD/MM/YYYY
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      return dateStr.split(' ')[0]; // Remover hora si existe
    }
    
    // Intentar parsear como fecha
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    }
    
    return dateStr;
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return dateStr;
  }
}

// Eliminar orden
async function deleteOrderAdmin(orderNumber, rowIndex) {
  if (!confirm("¿Eliminar esta orden?")) return;

  showLoader(true);
  const result = await fetchData("deleteOrder", { orderNumber, rowIndex });
  showLoader(false);

  if (result && result.success) {
    loadOrdersAdmin();
    showToast("Orden eliminada", "success");
  }
}

// Eliminar TODAS las órdenes
async function deleteAllOrders() {
  // Primera advertencia
  if (!confirm("⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n¿Estás seguro de que deseas ELIMINAR TODO el historial de órdenes?\n\nEsta acción borrará todas las ventas de la base de datos y NO se puede deshacer.")) {
    return;
  }

  // Segunda confirmación de seguridad
  if (!confirm("¿Realmente estás seguro?\n\nSe perderán todos los registros de ventas permanentemente.")) {
    return;
  }

  showLoader(true);
  const result = await fetchData("deleteAllOrders");
  showLoader(false);

  if (result && result.success) {
    loadOrdersAdmin();
    showToast("Historial de órdenes eliminado completamente", "success");
    // Actualizar el total visual a 0
    document.getElementById("ordersTotalDisplay").textContent = "$0";
  } else {
    showToast("Error al eliminar el historial", "error");
  }
}

// Inicializar al cargar
document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();
  await loadPredefinedNotes();

  // Evento para tipo de orden
  document.querySelectorAll('input[name="orderType"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const deliveryFields = document.getElementById("deliveryFields");
      deliveryFields.style.display =
        e.target.value === "domicilio" ? "block" : "none";
      setDefaultTipForOrderType(e.target.value);
    });
  });

  const initialOrderType = document.querySelector(
    'input[name="orderType"]:checked'
  ).value;
  setDefaultTipForOrderType(initialOrderType);

  // Vista por defecto
  switchView("orden");

  // Listeners para el login
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("btnLogout").addEventListener("click", logout);
});

// --- FUNCIONAMIENTO DE LAS PESTAÑAS (TABS) DEL ADMIN --- //
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((tab) => tab.classList.remove("active"));

    btn.classList.add("active");

    const tabId = btn.dataset.tab; // productos, categorias u ordenes
    document
      .getElementById("tab" + tabId.charAt(0).toUpperCase() + tabId.slice(1))
      .classList.add("active");
  });
});

window.addEventListener("load", () => {
  if (typeof loadOrdersAdmin === "function") {
    loadOrdersAdmin();
  }
});

// ===================================
// SISTEMA DE LOGIN
// ===================================

async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  
  if (!username || !password) {
    showToast("Por favor complete todos los campos", "error");
    return;
  }
  
  showLoader(true);
  
  // Simulación de retardo para una mejor UX
  await new Promise(resolve => setTimeout(resolve, 300));

  if (username === "Charlie" && password === "123456789") {
    // Login exitoso
    state.isAdminLoggedIn = true;
    state.currentUser = username;

    // Guardar sesión en localStorage (temporal)
    localStorage.setItem(
      "adminSession",
      JSON.stringify({
        username: username,
        timestamp: Date.now(),
      })
    );

    // Ocultar login y mostrar contenido admin
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("adminContent").style.display = "block";

    // Cargar datos
    await loadAdminData();

    showToast("Bienvenido, " + username, "success");

    // Limpiar formulario
    document.getElementById("loginForm").reset();
  } else {
    showToast("Usuario o contraseña incorrectos", "error");
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginPassword").focus();
  }
  
  showLoader(false);
}

function logout() {
  state.isAdminLoggedIn = false;
  state.currentUser = null;
  localStorage.removeItem("adminSession");
  
  document.getElementById("loginScreen").style.display = "block";
  document.getElementById("adminContent").style.display = "none";
  
  // Volver a vista de orden
  document.getElementById("vistaAdmin").classList.add("hidden");
  document.getElementById("vistaOrden").classList.remove("hidden");
  document.getElementById("btnOrden").classList.add("active");
  document.getElementById("btnAdmin").classList.remove("active");
  
  showToast("Sesión cerrada", "success");
}

// Verificar sesión al cargar la página
function checkSession() {
  const session = localStorage.getItem("adminSession");
  
  if (session) {
    try {
      const sessionData = JSON.parse(session);
      const hoursPassed = (Date.now() - sessionData.timestamp) / (1000 * 60 * 60);
      
      // Sesión válida por 8 horas
      if (hoursPassed < 8) {
        state.isAdminLoggedIn = true;
        state.currentUser = sessionData.username;
      } else {
        // Sesión expirada
        localStorage.removeItem("adminSession");
      }
    } catch (error) {
      localStorage.removeItem("adminSession");
    }
  }
}

// Ejecutar verificación de sesión al cargar
checkSession();
