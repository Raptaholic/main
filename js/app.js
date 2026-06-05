/* ─── State ─── */
let cart = JSON.parse(localStorage.getItem('novu_cart') || '[]');
let activeCat = 'all';
let activeBrands = new Set();
let sortMode = 'default';
let searchQ = '';
let currentProduct = null;

/* ─── DOM refs ─── */
const grid = document.getElementById('product-grid');
const resultCount = document.getElementById('result-count');
const areaTitle = document.getElementById('area-title');
const cartOverlay = document.getElementById('cart-overlay');
const cartDrawer = document.getElementById('cart-drawer');
const cartItemsEl = document.getElementById('cart-items');
const cartBadge = document.getElementById('cart-badge');
const cartEmptyMsg = document.getElementById('cart-empty');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartTotalEl = document.getElementById('cart-total');
const modalOverlay = document.getElementById('modal-overlay');
const checkoutOverlay = document.getElementById('checkout-overlay');
const successOverlay = document.getElementById('success-overlay');
const searchInput = document.getElementById('search-input');
const toast = document.getElementById('toast');
let toastTimer;

/* ═══════════════════════════════════════
   FILTERING & SORTING
═══════════════════════════════════════ */
function filtered() {
  let list = PRODUCTS;

  if (activeCat !== 'all') {
    list = list.filter(p => p.cat === activeCat);
  }

  if (activeBrands.size > 0) {
    list = list.filter(p => activeBrands.has(p.brand));
  }

  if (searchQ) {
    const q = searchQ.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (p.abbr || '').toLowerCase().includes(q)
    );
  }

  switch (sortMode) {
    case 'price-asc': list = [...list].sort((a, b) => a.price - b.price); break;
    case 'price-desc': list = [...list].sort((a, b) => b.price - a.price); break;
    case 'name-asc': list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'brand': list = [...list].sort((a, b) => a.brand.localeCompare(b.brand)); break;
  }

  return list;
}

/* ═══════════════════════════════════════
   RENDER PRODUCTS
═══════════════════════════════════════ */
function renderProducts() {
  const list = filtered();
  grid.innerHTML = '';

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try adjusting your filters or search term.</p>
      </div>`;
    resultCount.textContent = '0 products';
    return;
  }

  resultCount.textContent = `${list.length} product${list.length !== 1 ? 's' : ''}`;

  list.forEach(product => {
    const bc = BRAND_CFG[product.brand] || { color: '#64748b', light: '#f1f5f9' };
    const cc = CAT_CFG[product.cat] || { grad: 'linear-gradient(135deg,#1e293b,#334155)', icon: '📦' };
    const inCart = cart.some(c => c.id === product.id);

    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;

    card.innerHTML = `
      <div class="card-visual" style="background:${cc.grad}">
        <div class="card-abbr">${product.abbr || product.name.split(' ')[0]}</div>
        <div class="card-form-badge">${product.form}</div>
      </div>
      <div class="card-body">
        <span class="card-brand-badge" style="background:${bc.light};color:${bc.color}">
          ${product.brand}
        </span>
        <div class="card-name">${product.name}</div>
        <div class="card-footer">
          <div class="card-price"><span class="currency">AED </span>${product.price.toLocaleString()}</div>
          <button class="btn-add ${inCart ? 'added' : ''}" data-id="${product.id}" aria-label="Add to cart">
            ${inCart ? '✓' : '+'}
          </button>
        </div>
      </div>`;

    card.addEventListener('click', e => {
      if (!e.target.closest('.btn-add')) openModal(product);
    });

    card.querySelector('.btn-add').addEventListener('click', e => {
      e.stopPropagation();
      addToCart(product);
    });

    grid.appendChild(card);
  });
}

/* ═══════════════════════════════════════
   RENDER SIDEBAR BRAND LIST
═══════════════════════════════════════ */
function renderBrandFilters() {
  const container = document.getElementById('brand-filter-list');
  if (!container) return;

  const counts = {};
  const relevantProducts = activeCat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.cat === activeCat);
  relevantProducts.forEach(p => { counts[p.brand] = (counts[p.brand] || 0) + 1; });

  const brands = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  container.innerHTML = brands.map(brand => {
    const bc = BRAND_CFG[brand] || { color: '#64748b', light: '#f1f5f9' };
    const isActive = activeBrands.has(brand);
    return `
      <div class="brand-chip ${isActive ? 'active' : ''}" data-brand="${brand}">
        <span class="brand-dot" style="background:${bc.color}"></span>
        <span>${brand}</span>
        <span class="brand-count">${counts[brand]}</span>
      </div>`;
  }).join('');

  container.querySelectorAll('.brand-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const brand = chip.dataset.brand;
      if (activeBrands.has(brand)) {
        activeBrands.delete(brand);
      } else {
        activeBrands.add(brand);
      }
      renderBrandFilters();
      renderProducts();
    });
  });
}

/* ═══════════════════════════════════════
   CATEGORY NAV
═══════════════════════════════════════ */
function initCatNav() {
  const nav = document.getElementById('cat-nav');
  if (!nav) return;

  const cats = [{ id: 'all', label: 'All Products', icon: '🛒' }, ...Object.entries(CAT_CFG).map(([id, c]) => ({ id, label: c.label, icon: c.icon }))];

  nav.innerHTML = cats.map(c => `
    <button class="cat-btn ${c.id === activeCat ? 'active' : ''}" data-cat="${c.id}">
      <span class="cat-icon">${c.icon}</span>
      <span>${c.label}</span>
    </button>`).join('');

  nav.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.cat;
      activeBrands.clear();
      nav.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      areaTitle.textContent = activeCat === 'all' ? 'All Products' : CAT_CFG[activeCat]?.label || 'Products';
      renderBrandFilters();
      renderProducts();
    });
  });
}

/* ═══════════════════════════════════════
   PRODUCT MODAL
═══════════════════════════════════════ */
function openModal(product) {
  currentProduct = product;
  const bc = BRAND_CFG[product.brand] || { color: '#64748b', light: '#f1f5f9' };
  const cc = CAT_CFG[product.cat] || { grad: 'linear-gradient(135deg,#1e293b,#334155)' };

  document.getElementById('modal-visual').style.background = cc.grad;
  document.getElementById('modal-abbr').textContent = product.abbr || product.name.split(' ')[0];
  document.getElementById('modal-brand').textContent = product.brand;
  document.getElementById('modal-brand').style.background = bc.light;
  document.getElementById('modal-brand').style.color = bc.color;
  document.getElementById('modal-name').textContent = product.name;
  document.getElementById('modal-form').textContent = product.form;
  document.getElementById('modal-price').innerHTML = `<span class="cur">AED </span>${product.price.toLocaleString()}`;

  const tagsEl = document.getElementById('modal-tags');
  if (product.tags && product.tags.length) {
    tagsEl.innerHTML = product.tags.map(t => `<span class="tag-chip">${t}</span>`).join('');
    tagsEl.style.display = 'flex';
  } else {
    tagsEl.style.display = 'none';
  }

  const inCart = cart.some(c => c.id === product.id);
  const addBtn = document.getElementById('modal-add-btn');
  addBtn.textContent = inCart ? '✓ Added to Cart' : 'Add to Cart';
  addBtn.style.background = inCart ? 'var(--green)' : '';

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  currentProduct = null;
}

/* ═══════════════════════════════════════
   CART
═══════════════════════════════════════ */
function saveCart() {
  localStorage.setItem('novu_cart', JSON.stringify(cart));
}

function addToCart(product) {
  const existing = cart.find(c => c.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: product.id, name: product.name, brand: product.brand, price: product.price, abbr: product.abbr || product.name.split(' ')[0], cat: product.cat, qty: 1 });
  }
  saveCart();
  updateCartBadge();
  renderCartItems();
  renderProducts();
  showToast(`${product.name} added to cart`);
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart();
  updateCartBadge();
  renderCartItems();
  renderProducts();
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) return removeFromCart(id);
  saveCart();
  updateCartBadge();
  renderCartItems();
}

function cartTotal() {
  return cart.reduce((s, c) => s + c.price * c.qty, 0);
}

function cartCount() {
  return cart.reduce((s, c) => s + c.qty, 0);
}

function updateCartBadge() {
  const count = cartCount();
  cartBadge.textContent = count;
  cartBadge.classList.toggle('visible', count > 0);
}

function renderCartItems() {
  if (cart.length === 0) {
    cartEmptyMsg.style.display = 'flex';
    cartItemsEl.style.display = 'none';
    cartSubtotalEl.textContent = 'AED 0';
    cartTotalEl.textContent = 'AED 0';
    return;
  }

  cartEmptyMsg.style.display = 'none';
  cartItemsEl.style.display = 'flex';

  cartItemsEl.innerHTML = cart.map(item => {
    const cc = CAT_CFG[item.cat] || { grad: 'linear-gradient(135deg,#1e293b,#334155)' };
    return `
      <div class="cart-item">
        <div class="cart-item-thumb" style="background:${cc.grad}">${item.abbr}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-brand">${item.brand}</div>
          <div class="cart-item-actions">
            <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
            <button class="btn-remove" data-id="${item.id}" title="Remove">✕</button>
          </div>
        </div>
        <div class="cart-item-price">AED ${(item.price * item.qty).toLocaleString()}</div>
      </div>`;
  }).join('');

  cartItemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = btn.dataset.action === 'inc' ? 1 : -1;
      changeQty(Number(btn.dataset.id), delta);
    });
  });

  cartItemsEl.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(Number(btn.dataset.id)));
  });

  const total = cartTotal();
  const shipping = total > 0 ? 0 : 0;
  cartSubtotalEl.textContent = `AED ${total.toLocaleString()}`;
  cartTotalEl.textContent = `AED ${(total + shipping).toLocaleString()}`;
}

function openCart() {
  renderCartItems();
  cartOverlay.classList.add('open');
  cartDrawer.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartOverlay.classList.remove('open');
  cartDrawer.classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════
   CHECKOUT
═══════════════════════════════════════ */
function openCheckout() {
  if (cart.length === 0) return;
  closeCart();

  const summaryEl = document.getElementById('checkout-summary');
  summaryEl.innerHTML = cart.map(item => `
    <div class="summary-item">
      <span>${item.name} × ${item.qty}</span>
      <span>AED ${(item.price * item.qty).toLocaleString()}</span>
    </div>`).join('');

  document.getElementById('checkout-total').textContent = `AED ${cartTotal().toLocaleString()}`;
  checkoutOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  checkoutOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function placeOrder(e) {
  e.preventDefault();
  const form = e.target;
  const orderData = {
    id: `NP-${Date.now()}`,
    timestamp: new Date().toISOString(),
    customer: {
      name: form.querySelector('#cust-name').value,
      phone: form.querySelector('#cust-phone').value,
      email: form.querySelector('#cust-email').value,
      address: form.querySelector('#cust-address').value,
      city: form.querySelector('#cust-city').value,
      notes: form.querySelector('#cust-notes').value,
    },
    items: cart.map(c => ({ id: c.id, name: c.name, brand: c.brand, qty: c.qty, price: c.price })),
    total: cartTotal(),
    currency: 'AED',
  };

  console.log('📦 New Order Placed:', orderData);

  cart = [];
  saveCart();
  updateCartBadge();
  renderCartItems();
  renderProducts();
  form.reset();

  closeCheckout();
  successOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ═══════════════════════════════════════
   SEARCH
═══════════════════════════════════════ */
function initSearch() {
  if (!searchInput) return;
  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      searchQ = searchInput.value.trim();
      renderProducts();
    }, 250);
  });
}

/* ═══════════════════════════════════════
   SORT
═══════════════════════════════════════ */
function initSort() {
  const sel = document.getElementById('sort-select');
  if (!sel) return;
  sel.addEventListener('change', () => {
    sortMode = sel.value;
    renderProducts();
  });
}

/* ═══════════════════════════════════════
   CLEAR FILTERS
═══════════════════════════════════════ */
function clearFilters() {
  activeCat = 'all';
  activeBrands.clear();
  sortMode = 'default';
  searchQ = '';
  if (searchInput) searchInput.value = '';
  const sortSel = document.getElementById('sort-select');
  if (sortSel) sortSel.value = 'default';

  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
  areaTitle.textContent = 'All Products';

  renderBrandFilters();
  renderProducts();
}

/* ═══════════════════════════════════════
   EVENT BINDINGS
═══════════════════════════════════════ */
function bindEvents() {
  /* Cart open/close */
  document.getElementById('btn-cart').addEventListener('click', openCart);
  cartOverlay.addEventListener('click', closeCart);
  document.getElementById('btn-close-cart').addEventListener('click', closeCart);

  /* Modal close */
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);

  /* Modal add to cart */
  document.getElementById('modal-add-btn').addEventListener('click', () => {
    if (currentProduct) {
      addToCart(currentProduct);
      const btn = document.getElementById('modal-add-btn');
      btn.textContent = '✓ Added to Cart';
      btn.style.background = 'var(--green)';
    }
  });

  /* Modal open cart */
  document.getElementById('modal-cart-btn').addEventListener('click', () => {
    closeModal();
    openCart();
  });

  /* Checkout */
  document.getElementById('btn-checkout').addEventListener('click', openCheckout);
  document.getElementById('btn-close-checkout').addEventListener('click', closeCheckout);
  checkoutOverlay.addEventListener('click', e => { if (e.target === checkoutOverlay) closeCheckout(); });
  document.getElementById('checkout-form').addEventListener('submit', placeOrder);

  /* Success */
  document.getElementById('btn-continue').addEventListener('click', () => {
    successOverlay.classList.remove('open');
    document.body.style.overflow = '';
  });

  /* Clear filters */
  document.getElementById('btn-clear-filters').addEventListener('click', clearFilters);

  /* Keyboard close */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeCart();
      closeCheckout();
      successOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
function init() {
  initCatNav();
  renderBrandFilters();
  initSearch();
  initSort();
  bindEvents();
  updateCartBadge();
  renderProducts();
}

document.addEventListener('DOMContentLoaded', init);
