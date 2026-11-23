const PRODUCTOS = [
  { sku: "PAN-001", nombre: "Concha Tradicional de Vainilla", cat: "Pan Dulce", icono: "🥐", precio: 15, desc: "Masa esponjosa de mantequilla con costra crujiente de azúcar y vainilla natural." },
  { sku: "PAN-002", nombre: "Concha de Chocolate Semiamargo", cat: "Pan Dulce", icono: "🍫", precio: 16, desc: "Pan dulce tradicional cubierto con costra de cacao artesanal." },
  { sku: "PAN-003", nombre: "Oreja Caramelizada", cat: "Pan Dulce", icono: "🥨", precio: 14, desc: "Masa laminada de hojaldre horneada con azúcar caramelizada y toque de canela." },
  { sku: "PAN-004", nombre: "Cuernito de Mantequilla", cat: "Pan Dulce", icono: "🥐", precio: 18, desc: "Croissant clásico de textura hojaldrada con doble fermentación." },
  { sku: "PAN-005", nombre: "Beso de Nuez y Mermelada", cat: "Pan Dulce", icono: "🍓", precio: 19, desc: "Dos mitades de pan suave unidas con mermelada de fresa y cubiertas de nuez picada." },
  { sku: "HOJ-001", nombre: "Hojaldra de Jamón y Queso", cat: "Hojaldres y Salados", icono: "🥟", precio: 24, desc: "Hojaldre dorado relleno de jamón de pierna, queso crema y chipotle dulce." },
  { sku: "HOJ-002", nombre: "Hojaldra de Pollo en Escabeche", cat: "Hojaldres y Salados", icono: "🥧", precio: 26, desc: "Pasta hojaldrada rellena de pechuga deshebrada sazonada con especias tradicionales." },
  { sku: "HOJ-003", nombre: "Volován de Atún", cat: "Hojaldres y Salados", icono: "🥟", precio: 25, desc: "Canastilla crujiente de hojaldre rellena de guiso de atún a la mexicana." },
  { sku: "ESP-001", nombre: "Rebanada de Pan de Elote", cat: "Especialidades y Bebidas", icono: "🍰", precio: 32, desc: "Pan húmedo elaborado con granos de elote tierno natural y leche condensada." },
  { sku: "ESP-002", nombre: "Empanada de Cajeta y Nuez", cat: "Especialidades y Bebidas", icono: "🥮", precio: 20, desc: "Masa quebrada rellena de cajeta artesanal quemada y trozos de nuez." },
  { sku: "ESP-003", nombre: "Roles de Canela Glaseados", cat: "Especialidades y Bebidas", icono: "🍥", precio: 28, desc: "Rol horneado con canela Ceylán y glaseado ligero de queso crema." },
  { sku: "BEB-001", nombre: "Café de Olla (500 ml)", cat: "Especialidades y Bebidas", icono: "☕", precio: 35, desc: "Café de grano infusionado con piloncillo y canela, listo para llevar." },
  { sku: "PAQ-001", nombre: "Caja Degustación (6 piezas)", cat: "Paquetes", icono: "📦", precio: 85, desc: "Surtido a elegir entre conchas, orejas y cuernitos de la horneada del día." },
  { sku: "PAQ-002", nombre: "Charola Evento (20 Hojaldras)", cat: "Paquetes", icono: "🎉", precio: 420, desc: "Charola mixta de hojaldras de jamón y queso o pollo ideal para reuniones." }
];

let carrito = [];
let categoriaActual = "Todos";

// Observador para animar tarjetas y bloques al entrar en pantalla
const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      scrollObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

function observarElementos() {
  document.querySelectorAll(".reveal").forEach((el) => scrollObserver.observe(el));
}

function mostrarToast(texto) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = texto;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

function animarBotonCarrito() {
  const btn = document.getElementById("btn-carrito-nav");
  btn.classList.remove("cart-bounce");
  void btn.offsetWidth;
  btn.classList.add("cart-bounce");
}

function renderProductos() {
  const grid = document.getElementById("grid-productos");
  const filtrados = categoriaActual === "Todos"
    ? PRODUCTOS
    : PRODUCTOS.filter((p) => p.cat === categoriaActual);

  grid.innerHTML = filtrados.map((p, index) => `
    <article class="product-card reveal" style="transition-delay: ${(index % 3) * 70}ms">
      <div>
        <div class="card-top">
          <span class="cat-tag">${p.icono} ${p.cat}</span>
          <span class="sku-tag">${p.sku}</span>
        </div>
        <h3>${p.nombre}</h3>
        <p>${p.desc}</p>
      </div>
      <div class="card-footer">
        <span class="price">$${p.precio.toFixed(2)}</span>
        <button class="btn-add" onclick="agregar('${p.sku}')">+ Agregar</button>
      </div>
    </article>
  `).join("");

  observarElementos();
}

function filtrar(cat) {
  categoriaActual = cat;
  document.querySelectorAll(".filtro-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.textContent.trim() === cat);
  });
  renderProductos();
}

function agregar(sku) {
  const prod = PRODUCTOS.find((p) => p.sku === sku);
  const existe = carrito.find((i) => i.sku === sku);
  if (existe) existe.cantidad++;
  else carrito.push({ ...prod, cantidad: 1 });

  renderCarrito();
  animarBotonCarrito();
  mostrarToast(`+1 ${prod.nombre} agregado`);
}

function cambiarCantidad(sku, delta) {
  const item = carrito.find((i) => i.sku === sku);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter((i) => i.sku !== sku);
  renderCarrito();
}

function toggleCarrito() {
  document.getElementById("modal-carrito").classList.toggle("open");
}

function cerrarSiClickFuera(event) {
  if (event.target.id === "modal-carrito") {
    toggleCarrito();
  }
}

function renderCarrito() {
  const totalPiezas = carrito.reduce((acc, i) => acc + i.cantidad, 0);
  document.getElementById("contador-carrito").textContent = totalPiezas;

  const lista = document.getElementById("lista-carrito");
  if (carrito.length === 0) {
    lista.innerHTML = `<p style="text-align:center; color:#78716c; padding:1.5rem 0;">Tu carrito está vacío.</p>`;
  } else {
    lista.innerHTML = carrito.map((i) => `
      <div class="cart-item">
        <div>
          <strong>${i.nombre}</strong>
          <div style="font-size:0.78rem; color:#78716c;">$${i.precio.toFixed(2)} c/u (${i.sku})</div>
        </div>
        <div class="qty-controls">
          <button type="button" onclick="cambiarCantidad('${i.sku}', -1)">-</button>
          <span>${i.cantidad}</span>
          <button type="button" onclick="cambiarCantidad('${i.sku}', 1)">+</button>
        </div>
      </div>
    `).join("");
  }

  const subtotal = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const entrega = document.getElementById("tipo-entrega").value;
  const costoEnvio = (entrega === "Domicilio" && subtotal > 0 && subtotal < 200) ? 25 : 0;
  const total = subtotal + costoEnvio;

  document.getElementById("subtotal").textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById("envio").textContent = costoEnvio === 0 ? "Gratis ($0.00)" : `$${costoEnvio.toFixed(2)}`;
  document.getElementById("total").textContent = `$${total.toFixed(2)}`;
}

async function enviarPedido(e) {
  e.preventDefault();
  if (carrito.length === 0) {
    mostrarToast("Agrega al menos un pan antes de confirmar");
    return;
  }

  const btn = document.getElementById("btn-confirmar");
  const box = document.getElementById("resultado-pedido");
  btn.disabled = true;
  btn.textContent = "Procesando en ERP y CRM...";
  box.className = "order-feedback hidden";

  const subtotal = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const entrega = document.getElementById("tipo-entrega").value;
  const costoEnvio = (entrega === "Domicilio" && subtotal < 200) ? 25 : 0;

  const payload = {
    cliente: {
      nombre: document.getElementById("cliente-nombre").value.trim(),
      correo: document.getElementById("cliente-correo").value.trim(),
      telefono: document.getElementById("cliente-telefono").value.trim()
    },
    entrega,
    metodoPago: document.getElementById("metodo-pago").value,
    items: carrito,
    total: subtotal + costoEnvio
  };

  try {
    const res = await fetch("/api/pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok || !data.ok) throw new Error(data.error || "Error al registrar pedido");

    box.className = "order-feedback success";
    box.innerHTML = `
      <strong>¡Pedido registrado con éxito!</strong><br/>
      • Orden en Odoo ERP: <strong>#${data.odooOrderId}</strong> (stock actualizado)<br/>
      • Negocio en HubSpot CRM: <strong>#${data.hubspotDealId}</strong> (Venta Cerrada)
    `;
    carrito = [];
    renderCarrito();
    e.target.reset();
    mostrarToast("¡Compra registrada en Odoo y HubSpot!");
  } catch (err) {
    box.className = "order-feedback error";
    box.textContent = "Detalle: " + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirmar Compra";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderProductos();
  renderCarrito();
  observarElementos();
});
