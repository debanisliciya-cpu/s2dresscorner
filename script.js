const productGrid = document.querySelector("#product-grid");
const products = [...productGrid.querySelectorAll(".product-card")];
const filterButtons = [...document.querySelectorAll(".filter-button")];
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");
const bagDrawer = document.querySelector("#bag-drawer");
const bagItems = document.querySelector("#bag-items");
const bagEmpty = document.querySelector("#bag-empty");
const bagFooter = document.querySelector("#bag-footer");
const bagBackdrop = document.querySelector("#bag-backdrop");
const bagCount = document.querySelector(".bag-count");
const drawerCount = document.querySelector(".drawer-count");
const toast = document.querySelector("#toast");
const cart = new Map();
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
let activeFilter = "All";
let toastTimer;

function formatPrice(amount) {
  return inrFormatter.format(amount);
}

function getVisibleProducts(filter) {
  return products.filter((product) => {
    if (filter === "All") return true;
    if (filter === "New in") return product.dataset.new === "true";
    return product.dataset.category === filter;
  });
}

function applyFilter(filter) {
  activeFilter = filter;
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  const visibleProducts = getVisibleProducts(filter);
  products.forEach((product) => {
    product.hidden = !visibleProducts.includes(product);
  });
  resultsCount.textContent = String(visibleProducts.length);
  emptyState.hidden = visibleProducts.length > 0;
}

filterButtons.forEach((button) => {
  button.setAttribute("aria-pressed", String(button.dataset.filter === activeFilter));
  button.addEventListener("click", () => applyFilter(button.dataset.filter));
});

document.querySelectorAll("[data-nav-filter]").forEach((link) => {
  link.addEventListener("click", () => {
    applyFilter(link.dataset.navFilter);
    document.querySelector(".main-nav").classList.remove("is-open");
    document.querySelector(".menu-toggle").setAttribute("aria-expanded", "false");
  });
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function renderCart() {
  const entries = [...cart.values()];
  const quantity = entries.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = entries.reduce((sum, item) => sum + item.price * item.quantity, 0);

  bagCount.textContent = String(quantity);
  drawerCount.textContent = `(${quantity})`;
  bagEmpty.hidden = quantity > 0;
  bagFooter.hidden = quantity === 0;
  bagItems.replaceChildren();

  entries.forEach((item) => {
    const row = document.createElement("article");
    row.className = "bag-item";

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = "";

    const details = document.createElement("div");
    const name = document.createElement("h3");
    name.className = "bag-item-name";
    name.textContent = item.name;
    const meta = document.createElement("p");
    meta.className = "bag-item-meta";
    meta.textContent = formatPrice(item.price);

    const controls = document.createElement("div");
    controls.className = "quantity-control";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Remove one ${item.name}`);
    decrease.addEventListener("click", () => changeQuantity(item.name, -1));
    const count = document.createElement("span");
    count.textContent = String(item.quantity);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Add one ${item.name}`);
    increase.addEventListener("click", () => changeQuantity(item.name, 1));
    controls.append(decrease, count, increase);
    details.append(name, meta, controls);

    const price = document.createElement("span");
    price.className = "bag-item-price";
    price.textContent = formatPrice(item.price * item.quantity);
    row.append(image, details, price);
    bagItems.append(row);
  });

  document.querySelector("#bag-subtotal").textContent = formatPrice(subtotal);
}

function changeQuantity(name, amount) {
  const item = cart.get(name);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart.delete(name);
  renderCart();
}

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".quick-add");
  if (!button) return;

  const product = button.closest(".product-card");
  const name = product.dataset.name;
  const existing = cart.get(name);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.set(name, {
      name,
      price: Number(product.dataset.price),
      image: product.querySelector("img").src,
      quantity: 1,
    });
  }
  renderCart();
  showToast(`${name} added to your bag`);
});

function setBagOpen(isOpen) {
  document.body.classList.toggle("bag-open", isOpen);
  bagDrawer.setAttribute("aria-hidden", String(!isOpen));
  if (isOpen) document.querySelector(".close-bag").focus();
}

document.querySelector(".bag-button").addEventListener("click", () => setBagOpen(true));
document.querySelector(".close-bag").addEventListener("click", () => setBagOpen(false));
bagBackdrop.addEventListener("click", () => setBagOpen(false));
document.querySelector(".continue-shopping").addEventListener("click", () => setBagOpen(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setBagOpen(false);
});

const menuToggle = document.querySelector(".menu-toggle");
menuToggle.addEventListener("click", () => {
  const nav = document.querySelector(".main-nav");
  const isOpen = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelector("#newsletter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#email-address");
  if (!email.reportValidity()) return;
  document.querySelector("#newsletter-note").textContent = "You're on the list — keep an eye on your inbox. ♡";
  email.value = "";
});

document.querySelector(".checkout-button").addEventListener("click", () => {
  showToast("Checkout is coming soon — thanks for stopping by!");
});

renderCart();
