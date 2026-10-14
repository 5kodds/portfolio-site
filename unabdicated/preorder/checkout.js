(function () {
  const PAYMENT_API = "https://unabdicated-payments.theolaseni.workers.dev";
  const USD_UNIT_PRICE = 3.69;
  const NGN_UNIT_PRICE = 4907.15;

  const state = { mode: "self", format: "ebook", giftQty: 1, sponsorQty: 5 };
  const prices = { ebook: USD_UNIT_PRICE, paperback: 14.99 };
  const modeLabels = { self: "For myself", gift: "Gift copies", sponsor: "Sponsor readers" };
  const formatLabels = { ebook: "Digital eBook", paperback: "Paperback" };

  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const formatCards = [...document.querySelectorAll("[data-format]")];
  const selfFlow = document.getElementById("selfFlow");
  const giftFlow = document.getElementById("giftFlow");
  const sponsorFlow = document.getElementById("sponsorFlow");
  const giftQty = document.getElementById("giftQty");
  const sponsorQty = document.getElementById("sponsorQty");
  const giftRecipients = document.getElementById("giftRecipients");
  const giftNote = document.getElementById("giftFulfilmentNote");
  const cryptoCheckout = document.getElementById("cryptoCheckout");
  const cryptoUnavailable = document.getElementById("cryptoUnavailable");
  const checkoutButton = document.getElementById("checkoutButton");

  function recipientTemplate(i) {
    return '<div class="recipient-card"><div class="recipient-head"><strong>Recipient ' + i + '</strong><span>Gift copy</span></div><div class="field"><label for="recipientName' + i + '">Recipient name <span style="font-weight:500;color:var(--muted)">(optional)</span></label><input id="recipientName' + i + '" placeholder="Recipient name"></div><div class="field"><label for="recipientEmail' + i + '">Recipient email</label><input id="recipientEmail' + i + '" type="email" placeholder="recipient@example.com" required></div><div class="field"><label for="recipientMessage' + i + '">Personal message <span style="font-weight:500;color:var(--muted)">(optional)</span></label><textarea id="recipientMessage' + i + '" placeholder="A note from you..."></textarea></div></div>';
  }

  function renderRecipients() {
    const count = Math.max(1, Math.min(20, Number(giftQty.value) || 1));
    state.giftQty = count;
    giftQty.value = count;

    const previous = {};
    [...giftRecipients.querySelectorAll("input,textarea")].forEach((el) => {
      previous[el.id] = el.value;
    });

    giftRecipients.innerHTML = Array.from({ length: count }, (_, i) => recipientTemplate(i + 1)).join("");

    Object.keys(previous).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = previous[id];
    });

    updateSummary();
  }

  function selectMode(mode) {
    state.mode = mode;
    modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
    selfFlow.classList.toggle("hide", mode !== "self");
    giftFlow.classList.toggle("hide", mode !== "gift");
    sponsorFlow.classList.toggle("hide", mode !== "sponsor");
    updateSummary();
  }

  function selectFormat(format) {
    state.format = format;
    formatCards.forEach((card) => card.classList.toggle("active", card.dataset.format === format));

    giftNote.textContent =
      format === "ebook"
        ? "Digital recipients receive a secure download/access link by email after fulfilment opens."
        : "Paperback recipients receive a secure claim link by email so they can provide shipping details.";

    updateSummary();
  }

  function quantity() {
    if (state.mode === "gift") return state.giftQty;
    if (state.mode === "sponsor") return state.sponsorQty;
    return 1;
  }

  function formatNgn(value) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function updateSummary() {
    const q = quantity();
    const total = (prices[state.format] * q).toFixed(2);

    document.getElementById("summaryMode").textContent = modeLabels[state.mode];
    document.getElementById("summaryFormat").textContent = formatLabels[state.format];
    document.getElementById("summaryQty").textContent = q;
    document.getElementById("qtyLabel").textContent = state.mode === "sponsor" ? "Readers sponsored" : "Quantity";
    document.getElementById("summaryHeading").textContent =
      state.mode === "self" ? "Your pre-order" : state.mode === "gift" ? "Your gift order" : "Your sponsorship";
    document.getElementById("summaryTotal").textContent = "US$" + total + (state.format === "paperback" ? "*" : "");

    const cryptoEligible = state.mode === "self" && state.format === "ebook";
    cryptoCheckout.classList.toggle("hide", !cryptoEligible);
    cryptoUnavailable.classList.toggle("hide", cryptoEligible);

    if (state.format === "ebook") {
      checkoutButton.disabled = false;
      checkoutButton.textContent = "Pay with Paystack · " + formatNgn(NGN_UNIT_PRICE * q);
    } else {
      checkoutButton.disabled = true;
      checkoutButton.textContent = "Paystack checkout for paperback coming soon";
    }
  }

  function collectBuyer() {
    if (state.mode === "gift") {
      return {
        name: document.getElementById("giftBuyerName").value.trim(),
        email: document.getElementById("giftBuyerEmail").value.trim(),
      };
    }

    if (state.mode === "sponsor") {
      return {
        name: document.getElementById("sponsorName").value.trim(),
        email: document.getElementById("sponsorEmail").value.trim(),
      };
    }

    return {
      name: document.getElementById("buyerName").value.trim(),
      email: document.getElementById("buyerEmail").value.trim(),
    };
  }

  function collectGiftRecipients() {
    if (state.mode !== "gift") return [];

    const recipients = [];
    for (let i = 1; i <= state.giftQty; i += 1) {
      recipients.push({
        name: (document.getElementById("recipientName" + i)?.value || "").trim(),
        email: (document.getElementById("recipientEmail" + i)?.value || "").trim(),
        message: (document.getElementById("recipientMessage" + i)?.value || "").trim(),
      });
    }
    return recipients;
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function startPaystackCheckout() {
    if (state.format !== "ebook") return;

    const buyer = collectBuyer();
    const recipients = collectGiftRecipients();

    if (!validEmail(buyer.email)) {
      alert("Please enter a valid buyer email address before continuing.");
      return;
    }

    if (state.mode === "gift" && recipients.some((recipient) => !validEmail(recipient.email))) {
      alert("Please enter a valid email address for every gift recipient.");
      return;
    }

    const originalText = checkoutButton.textContent;
    checkoutButton.disabled = true;
    checkoutButton.textContent = "Opening secure Paystack checkout...";

    try {
      const response = await fetch(PAYMENT_API + "/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: buyer.name,
          email: buyer.email,
          purchase_mode: state.mode,
          quantity: quantity(),
          format: state.format,
          gift_recipients: recipients,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.authorization_url) {
        throw new Error(data.error || "Unable to initialize Paystack checkout.");
      }

      sessionStorage.setItem("unabdicated_paystack_reference", data.reference || "");
      window.location.assign(data.authorization_url);
    } catch (error) {
      alert(error.message || "Unable to start Paystack checkout. Please try again.");
      checkoutButton.disabled = false;
      checkoutButton.textContent = originalText;
    }
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => selectMode(button.dataset.mode));
  });

  formatCards.forEach((card) => {
    card.addEventListener("click", () => selectFormat(card.dataset.format));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectFormat(card.dataset.format);
      }
    });
  });

  giftQty.addEventListener("input", renderRecipients);

  sponsorQty.addEventListener("input", () => {
    state.sponsorQty = Math.max(1, Math.min(10000, Number(sponsorQty.value) || 1));
    sponsorQty.value = state.sponsorQty;
    updateSummary();
  });

  checkoutButton.addEventListener("click", startPaystackCheckout);

  renderRecipients();
  updateSummary();
})();
