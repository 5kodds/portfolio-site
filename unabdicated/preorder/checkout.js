/*
 * UNABDICATED direct pre-order checkout.
 * Markup: ODS radio cards, fields, alerts and a busy button (see /unabdicated/preorder/index.html).
 * Payment flow is unchanged: Paystack is initialised through the Cloudflare payment API and
 * confirmed server-side by webhook; crypto is the embedded NOWPayments widget (one eBook only).
 */
(function () {
  const PAYMENT_API = "https://unabdicated-payments.theolaseni.workers.dev";
  const USD_UNIT_PRICE = 3.69;
  const NGN_UNIT_PRICE = 4907.15;

  const state = { mode: "self", format: "ebook", giftQty: 1, sponsorQty: 5, busy: false };
  const prices = { ebook: USD_UNIT_PRICE, paperback: 14.99 };
  const modeLabels = { self: "For myself", gift: "Gift copies", sponsor: "Sponsor readers" };
  const formatLabels = { ebook: "Digital eBook", paperback: "Paperback" };

  const form = document.getElementById("checkoutForm");
  const modeInputs = [...document.querySelectorAll('input[name="mode"]')];
  const formatInputs = [...document.querySelectorAll('input[name="format"]')];
  const flows = {
    self: document.getElementById("selfFlow"),
    gift: document.getElementById("giftFlow"),
    sponsor: document.getElementById("sponsorFlow"),
  };
  const giftQty = document.getElementById("giftQty");
  const sponsorQty = document.getElementById("sponsorQty");
  const giftRecipients = document.getElementById("giftRecipients");
  const giftNote = document.getElementById("giftFulfilmentNote");
  const cryptoCheckout = document.getElementById("cryptoCheckout");
  const cryptoUnavailable = document.getElementById("cryptoUnavailable");
  const checkoutButton = document.getElementById("checkoutButton");
  const checkoutLabel = document.getElementById("checkoutLabel");
  const checkoutError = document.getElementById("checkoutError");
  const checkoutErrorBody = document.getElementById("checkoutErrorBody");
  const paperbackNote = document.getElementById("paperbackNote");

  /* ---------- Field errors (aria-invalid + linked message, never colour alone) ---------- */

  function messageFor(input) {
    return document.getElementById(input.id + "Msg");
  }

  function setError(input, text) {
    const message = messageFor(input);
    input.setAttribute("aria-invalid", "true");
    if (message) message.textContent = text;
  }

  function clearError(input) {
    const message = messageFor(input);
    input.removeAttribute("aria-invalid");
    if (message) message.textContent = "";
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function checkEmail(input, required) {
    const value = input.value.trim();
    if (!value) {
      if (required) {
        setError(input, "Enter an email address so we can send your copy.");
        return false;
      }
      clearError(input);
      return true;
    }
    if (!validEmail(value)) {
      setError(input, "Enter an email address in the format name@example.com.");
      return false;
    }
    clearError(input);
    return true;
  }

  /* Validate on blur; once a field shows an error, clear it as soon as the value is valid. */
  form.addEventListener("focusout", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.type === "email" && input.value.trim()) {
      checkEmail(input, false);
    }
  });

  form.addEventListener("input", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.type === "email" && input.getAttribute("aria-invalid") === "true") {
      if (validEmail(input.value.trim())) clearError(input);
    }
  });

  /* ---------- Gift recipients ---------- */

  function recipientTemplate(i) {
    return (
      '<div class="ods-card" data-variant="subtle"><fieldset class="ods-field site-recipient">' +
      '<legend class="site-recipient__legend">Recipient ' + i + "</legend>" +
      '<div class="ods-field"><label class="ods-field__label" for="recipientName' + i + '">Recipient name <span class="ods-field__optional">(optional)</span></label>' +
      '<div class="ods-input"><input id="recipientName' + i + '" autocomplete="off"></div></div>' +
      '<div class="ods-field"><label class="ods-field__label" for="recipientEmail' + i + '">Recipient email</label>' +
      '<div class="ods-input"><input id="recipientEmail' + i + '" type="email" autocomplete="off" aria-describedby="recipientEmail' + i + 'Msg"></div>' +
      '<p class="ods-field__message" id="recipientEmail' + i + 'Msg"></p></div>' +
      '<div class="ods-field"><label class="ods-field__label" for="recipientMessage' + i + '">Personal message <span class="ods-field__optional">(optional)</span></label>' +
      '<div class="ods-textarea" data-autosize><textarea id="recipientMessage' + i + '" placeholder="A note from you…"></textarea></div></div>' +
      "</fieldset></div>"
    );
  }

  function renderRecipients() {
    const count = Math.max(1, Math.min(20, Number(giftQty.value) || 1));
    state.giftQty = count;
    if (String(giftQty.value) !== String(count)) giftQty.value = count;

    const previous = {};
    [...giftRecipients.querySelectorAll("input,textarea")].forEach((el) => {
      previous[el.id] = { value: el.value, invalid: el.getAttribute("aria-invalid") === "true", message: (messageFor(el) || {}).textContent || "" };
    });

    giftRecipients.innerHTML = Array.from({ length: count }, (_, i) => recipientTemplate(i + 1)).join("");

    Object.keys(previous).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = previous[id].value;
      if (previous[id].invalid) setError(el, previous[id].message);
    });

    updateSummary();
  }

  /* ---------- Selection ---------- */

  function selectMode(mode) {
    state.mode = mode;
    Object.keys(flows).forEach((key) => {
      flows[key].hidden = key !== mode;
    });
    updateSummary();
  }

  function selectFormat(format) {
    state.format = format;
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

  function formatUsd(value) {
    return "US$" + value.toFixed(2);
  }

  function updateSummary() {
    const q = quantity();
    const total = prices[state.format] * q;

    document.getElementById("summaryMode").textContent = modeLabels[state.mode];
    document.getElementById("summaryFormat").textContent = formatLabels[state.format];
    document.getElementById("summaryQty").textContent = q;
    document.getElementById("qtyLabel").textContent = state.mode === "sponsor" ? "Readers sponsored" : "Quantity";
    document.getElementById("summaryHeading").textContent =
      state.mode === "self" ? "Your pre-order" : state.mode === "gift" ? "Your gift order" : "Your sponsorship";
    document.getElementById("summaryTotal").textContent = formatUsd(total) + (state.format === "paperback" ? "*" : "");
    paperbackNote.hidden = state.format !== "paperback";

    const cryptoEligible = state.mode === "self" && state.format === "ebook";
    cryptoCheckout.hidden = !cryptoEligible;
    cryptoUnavailable.hidden = cryptoEligible;

    if (state.busy) return;
    if (state.format === "ebook") {
      checkoutButton.disabled = false;
      checkoutLabel.textContent = "Pay with Paystack · " + formatNgn(NGN_UNIT_PRICE * q);
    } else {
      checkoutButton.disabled = true;
      checkoutLabel.textContent = "Paystack checkout for paperback coming soon";
    }
  }

  /* ---------- Collect and submit ---------- */

  function buyerFields() {
    if (state.mode === "gift") return { name: "giftBuyerName", email: "giftBuyerEmail" };
    if (state.mode === "sponsor") return { name: "sponsorName", email: "sponsorEmail" };
    return { name: "buyerName", email: "buyerEmail" };
  }

  function collectBuyer() {
    const ids = buyerFields();
    return {
      name: document.getElementById(ids.name).value.trim(),
      email: document.getElementById(ids.email).value.trim(),
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

  function validateForCheckout() {
    const invalid = [];
    const buyerEmail = document.getElementById(buyerFields().email);
    if (!checkEmail(buyerEmail, true)) invalid.push(buyerEmail);

    if (state.mode === "gift") {
      for (let i = 1; i <= state.giftQty; i += 1) {
        const input = document.getElementById("recipientEmail" + i);
        if (!input) continue;
        if (!input.value.trim()) {
          setError(input, "Enter recipient " + i + "’s email address so their copy can be delivered.");
          invalid.push(input);
        } else if (!checkEmail(input, true)) {
          invalid.push(input);
        }
      }
    }
    return invalid;
  }

  function showCheckoutError(text) {
    checkoutErrorBody.textContent = text;
    checkoutError.hidden = false;
  }

  function setBusy(busy) {
    state.busy = busy;
    if (busy) {
      checkoutButton.setAttribute("aria-busy", "true");
      checkoutLabel.textContent = "Opening secure Paystack checkout…";
    } else {
      checkoutButton.removeAttribute("aria-busy");
      updateSummary();
    }
  }

  async function startPaystackCheckout() {
    if (state.format !== "ebook" || state.busy) return;
    checkoutError.hidden = true;

    const invalid = validateForCheckout();
    if (invalid.length) {
      invalid[0].focus();
      return;
    }

    const buyer = collectBuyer();
    const recipients = collectGiftRecipients();
    setBusy(true);

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

      try {
        sessionStorage.setItem("unabdicated_paystack_reference", data.reference || "");
      } catch (storageError) {
        /* The reference is also confirmed server-side by webhook. */
      }
      window.location.assign(data.authorization_url);
    } catch (error) {
      setBusy(false);
      showCheckoutError((error && error.message) || "Unable to start Paystack checkout. Please try again.");
      checkoutError.focus();
    }
  }

  /* ---------- Wire up ---------- */

  modeInputs.forEach((input) => {
    input.addEventListener("change", () => input.checked && selectMode(input.value));
  });

  formatInputs.forEach((input) => {
    input.addEventListener("change", () => input.checked && selectFormat(input.value));
  });

  giftQty.addEventListener("change", renderRecipients);
  giftQty.addEventListener("input", () => {
    if (giftQty.value !== "") renderRecipients();
  });

  function syncSponsorQty() {
    state.sponsorQty = Math.max(1, Math.min(10000, Number(sponsorQty.value) || 1));
    updateSummary();
  }
  sponsorQty.addEventListener("input", syncSponsorQty);
  sponsorQty.addEventListener("change", () => {
    syncSponsorQty();
    sponsorQty.value = state.sponsorQty;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    startPaystackCheckout();
  });

  /* Restore the selection the browser may have kept (back/forward cache, autofill). */
  const checkedMode = modeInputs.find((input) => input.checked);
  const checkedFormat = formatInputs.find((input) => input.checked);
  if (checkedMode) state.mode = checkedMode.value;
  if (checkedFormat) state.format = checkedFormat.value;
  selectMode(state.mode);
  selectFormat(state.format);
  renderRecipients();
})();
