const productGrid = document.querySelector("#product-grid");
const products = [...productGrid.querySelectorAll(".product-card")];
const filterButtons = [...document.querySelectorAll(".filter-button")];
const collectionToolbar = document.querySelector(".collection-toolbar");
const emptyState = document.querySelector("#empty-state");
const resultsCount = document.querySelector("#results-count");
const productDetail = document.querySelector("#product-detail");
const productOptions = document.querySelector("#product-options");
const optionSection = document.querySelector("#option-section");
const optionLabel = document.querySelector("#option-label");
const optionGuide = document.querySelector("#option-guide");
const optionMessage = document.querySelector("#option-message");
const detailAddButton = document.querySelector("#detail-add-button");
const detailSoldOut = document.querySelector("#detail-sold-out");
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
let selectedProduct = null;
let selectedOption = null;
let productCatalog = null;

products.forEach((product) => {
  const quickAdd = product.querySelector(".quick-add");
  if (!quickAdd.disabled) {
    quickAdd.setAttribute("aria-label", `Choose a size for ${product.dataset.name}`);
    quickAdd.title = "Choose a size";
  }
});

function formatPrice(amount) {
  return inrFormatter.format(amount);
}

function getDefaultOption(config) {
  if (config.optionType === "size") {
    const xlPrice = config.options.XL;
    if (Number.isFinite(xlPrice) && xlPrice > 0) {
      return { label: "XL", price: xlPrice };
    }

    const [label, price] = Object.entries(config.options).find(([, optionPrice]) => optionPrice > 0) ?? [];
    return label ? { label, price } : null;
  }

  const [label, price] = Object.entries(config.options)[0] ?? [];
  if (!label || !Number.isFinite(price)) {
    throw new Error("Material-based dresses must define at least one priced material.");
  }
  return { label, price };
}

async function loadProductCatalog() {
  const response = await fetch("./product-options.json");
  if (!response.ok) {
    throw new Error(`Could not load product-options.json (${response.status}).`);
  }

  const catalog = await response.json();
  if (catalog.currency !== "INR" || !catalog.products) {
    throw new Error("product-options.json has an invalid catalog format.");
  }

  products.forEach((product) => {
    const config = catalog.products[product.dataset.name];
    if (
      !config ||
      !["size", "material"].includes(config.optionType) ||
      !Number.isFinite(config.basePrice) ||
      !config.options ||
      typeof config.options !== "object"
    ) {
      throw new Error(`Missing or invalid option settings for ${product.dataset.name}.`);
    }

    const prices = Object.values(config.options);
    if (
      prices.length === 0 ||
      prices.some((price) => !Number.isFinite(price) || price < 0)
    ) {
      throw new Error(`Invalid option prices for ${product.dataset.name}.`);
    }

    const defaultOption = getDefaultOption(config);
    if (defaultOption) {
      product.dataset.price = String(defaultOption.price);
      product.querySelector(".product-price").textContent = formatPrice(defaultOption.price);
    } else {
      product.dataset.soldOut = "true";
      product.querySelector(".product-price").textContent = "Sold out";
      if (!product.querySelector(".sold-out-tag")) {
        const tag = document.createElement("span");
        tag.className = "product-tag sold-out-tag";
        tag.textContent = "Sold out";
        product.querySelector(".product-image").append(tag);
      }
    }
    const quickAdd = product.querySelector(".quick-add");
    if (!quickAdd.disabled) {
      const optionName = config.optionType === "size" ? "size" : "material";
      quickAdd.setAttribute("aria-label", `Choose a ${optionName} for ${product.dataset.name}`);
      quickAdd.title = `Choose a ${optionName}`;
    }
  });

  productCatalog = catalog;
}

loadProductCatalog().catch((error) => {
  console.error("Product option settings failed to load:", error);
  showToast("Product options could not be loaded. Open the shop through a local web server.");
});

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
    const optionName = item.optionType === "size" ? "Size" : "Material";
    meta.textContent = `${optionName}: ${item.optionLabel} · ${formatPrice(item.price)}`;

    const controls = document.createElement("div");
    controls.className = "quantity-control";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Remove one ${item.name}, ${optionName.toLowerCase()} ${item.optionLabel}`);
    decrease.addEventListener("click", () => changeQuantity(item.key, -1));
    const count = document.createElement("span");
    count.textContent = String(item.quantity);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Add one ${item.name}, ${optionName.toLowerCase()} ${item.optionLabel}`);
    increase.addEventListener("click", () => changeQuantity(item.key, 1));
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

function changeQuantity(key, amount) {
  const item = cart.get(key);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart.delete(key);
  renderCart();
}

function openProduct(product) {
  if (!productCatalog) {
    showToast("Product options are still loading. Please try again.");
    return;
  }

  selectedProduct = product;
  const image = product.querySelector(".product-image img");
  const config = productCatalog.products[product.dataset.name];
  selectedOption = getDefaultOption(config);
  const isSoldOut = product.dataset.soldOut === "true" || !selectedOption;

  document.querySelector("#product-detail-image").src = image.src;
  document.querySelector("#product-detail-image").alt = image.alt;
  document.querySelector("#product-detail-name").textContent = product.dataset.name;
  document.querySelector("#product-detail-description").textContent =
    product.querySelector(".product-info p").textContent;
  document.querySelector("#product-detail-price").textContent = selectedOption
    ? formatPrice(selectedOption.price)
    : "Sold out";
  optionSection.hidden = isSoldOut;
  detailSoldOut.hidden = !isSoldOut;
  detailAddButton.hidden = isSoldOut;
  detailAddButton.disabled = isSoldOut;
  optionMessage.textContent = selectedOption
    ? `${config.optionType === "size" ? "Size" : "Material"} ${selectedOption.label} selected.`
    : "No sizes are currently available.";
  optionMessage.classList.remove("is-error");
  optionLabel.textContent = config.optionType === "size" ? "Choose your size" : "Choose your material";
  optionGuide.textContent = config.optionType === "size" ? "Available sizes" : "Available materials";
  productOptions.setAttribute(
    "aria-label",
    config.optionType === "size" ? "Available sizes" : "Available materials",
  );
  productOptions.replaceChildren();

  Object.entries(config.options).forEach(([label, price]) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "product-option";
    option.textContent = label;
    const isAvailable = config.optionType !== "size" || price > 0;
    const isDefault = isAvailable && label === selectedOption?.label;
    option.disabled = !isAvailable;
    option.classList.toggle("is-selected", isDefault);
    option.setAttribute("aria-pressed", String(isDefault));
    if (!isAvailable) option.setAttribute("aria-label", `${label} size unavailable`);
    option.addEventListener("click", () => {
      selectedOption = { label, price };
      document.querySelector("#product-detail-price").textContent = formatPrice(price);
      productOptions.querySelectorAll(".product-option").forEach((button) => {
        const isSelected = button === option;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });
      optionMessage.textContent = `${config.optionType === "size" ? "Size" : "Material"} ${label} selected.`;
      optionMessage.classList.remove("is-error");
    });
    productOptions.append(option);
  });
  if (selectedOption) {
    optionMessage.textContent = `${config.optionType === "size" ? "Size" : "Material"} ${selectedOption.label} selected.`;
  }

  collectionToolbar.hidden = true;
  productGrid.hidden = true;
  emptyState.hidden = true;
  productDetail.hidden = false;
  productDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

productGrid.addEventListener("click", (event) => {
  const product = event.target.closest(".product-card");
  if (!product) return;
  if (event.target.closest(".quick-add")?.disabled) return;
  if (event.target.closest("a")) event.preventDefault();
  openProduct(product);
});

document.querySelector("#back-to-collection").addEventListener("click", () => {
  productDetail.hidden = true;
  collectionToolbar.hidden = false;
  productGrid.hidden = false;
  applyFilter(activeFilter);
  const lastFocusedLink = selectedProduct?.querySelector("[data-open-product]");
  lastFocusedLink?.focus({ preventScroll: true });
  document.querySelector("#collection").scrollIntoView({ behavior: "smooth", block: "start" });
});

detailAddButton.addEventListener("click", () => {
  if (!selectedProduct || !selectedOption || !productCatalog) {
    optionMessage.textContent = `Please choose a ${productCatalog?.products[selectedProduct?.dataset.name]?.optionType ?? "size"} before adding this dress to your bag.`;
    optionMessage.classList.add("is-error");
    productOptions.querySelector(".product-option")?.focus();
    return;
  }

  const config = productCatalog.products[selectedProduct.dataset.name];
  const key = `${selectedProduct.dataset.name}|${selectedOption.label}`;
  const item = cart.get(key);
  if (item) {
    item.quantity += 1;
  } else {
    cart.set(key, {
      key,
      name: selectedProduct.dataset.name,
      optionType: config.optionType,
      optionLabel: selectedOption.label,
      price: selectedOption.price,
      image: selectedProduct.querySelector("img").src,
      quantity: 1,
    });
  }
  renderCart();
  const optionName = config.optionType === "size" ? "size" : "material";
  showToast(`${selectedProduct.dataset.name}, ${optionName} ${selectedOption.label}, added to your bag`);
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
