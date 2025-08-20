// CustomerInfoModal.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchcustomerdata, setdata } from "../api";
import WhatsAppButton from "./Utils/WhatsappOrder";
import SmsOrder from "./Utils/SmsOrder";
import RawBTPrintButton from "./Utils/RawBTPrintButton";

/**
 * Props:
 * - show: boolean
 * - total: number
 * - onSave: function(customer)  // called after successful save (optional)
 * - onClose: function()        // close the modal
 * - productsToSend: array (optional) // list of items, falls back to localStorage
 * - restaurantName: string (optional)
 */
export default function CustomerInfoModal({
  show,
  total,
  onSave,
  onClose,
  productsToSend: productsToSendProp,
  restaurantName = "Billzo",
}) {
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
  });

  const [savedCustomers, setSavedCustomers] = useState([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [showActionPopup, setShowActionPopup] = useState(false);

  // items source: prop or localStorage fallback
  const productsToSend =
    Array.isArray(productsToSendProp) && productsToSendProp.length > 0
      ? productsToSendProp
      : JSON.parse(localStorage.getItem("productsToSend") || "[]");

  useEffect(() => {
    if (!show) return;
    // Reset form when modal opens
    setCustomer({ name: "", phone: "", address: "", email: "" });
    setPhoneSuggestions([]);
    setNameSuggestions([]);
    // Fetch saved customers for suggestions
    const loadCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const resp = await fetchcustomerdata();
        const arr = Array.isArray(resp) ? resp : resp?.data ?? [];
        setSavedCustomers(arr);
        localStorage.setItem("customers", JSON.stringify(arr));
      } catch (err) {
        // fallback to local cache
        const local = JSON.parse(localStorage.getItem("customers") || "[]");
        if (local.length) setSavedCustomers(local);
      } finally {
        setLoadingCustomers(false);
      }
    };
    loadCustomers();
  }, [show]);

  // phone suggestions (prefix match)
  useEffect(() => {
    const v = (customer.phone || "").trim();
    if (!v) {
      setPhoneSuggestions([]);
      return;
    }
    const list = savedCustomers
      .filter((c) => String(c.phone || "").startsWith(v))
      .slice(0, 8);
    setPhoneSuggestions(list);
  }, [customer.phone, savedCustomers]);

  // name suggestions (startsWith)
  useEffect(() => {
    const v = (customer.name || "").trim().toLowerCase();
    if (!v) {
      setNameSuggestions([]);
      return;
    }
    const list = savedCustomers
      .filter((c) => (c.name || "").toLowerCase().startsWith(v))
      .slice(0, 8);
    setNameSuggestions(list);
  }, [customer.name, savedCustomers]);

  const handleChange = (e) =>
    setCustomer((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handlePhoneSuggestionClick = (c) => {
    setCustomer({
      name: c.name || "",
      phone: String(c.phone || ""),
      address: c.address || "",
      email: c.email || "",
    });
    setPhoneSuggestions([]);
    setNameSuggestions([]);
  };

  const handleNameSuggestionClick = (c) => {
    setCustomer({
      name: c.name || "",
      phone: String(c.phone || ""),
      address: c.address || "",
      email: c.email || "",
    });
    setPhoneSuggestions([]);
    setNameSuggestions([]);
  };

  // Save customer, then open action popup (Save & Print behavior)
  const handleSaveAndOpenActions = async () => {
    const name = (customer.name || "").trim();
    const phone = (customer.phone || "").trim();
    if (!name || !phone) {
      toast.error("Please enter customer name and phone");
      return;
    }

    const payload = {
      name,
      phone,
      address: (customer.address || "").trim(),
      email: (customer.email || "").trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      const resp = await setdata(payload);
      if (resp && resp.message && resp.message.toLowerCase().includes("exists")) {
        toast.info("Customer already exists.");
      } else {
        toast.success("Customer saved");
      }

      // Update local cache
      const updated = [
        ...savedCustomers.filter((c) => String(c.phone) !== String(phone)),
        payload,
      ];
      setSavedCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
    } catch (err) {
      // fallback: save locally
      const local = JSON.parse(localStorage.getItem("customers") || "[]");
      const exists = local.find((c) => String(c.phone) === String(payload.phone));
      if (!exists) {
        local.push(payload);
        localStorage.setItem("customers", JSON.stringify(local));
        setSavedCustomers(local);
        toast.warn("Saved locally (server unreachable).");
      } else {
        toast.info("Customer already saved locally.");
      }
    }

    // notify parent (parent may store customer in localStorage as well)
    try {
      if (typeof onSave === "function") {
        onSave(payload);
      } else {
        // fallback persist
        localStorage.setItem("billzo_customer", JSON.stringify(payload));
      }
    } catch (err) {
      console.warn("onSave error:", err);
    }

    // open action popup (do not close this modal — keep modal open and show actions)
    setShowActionPopup(true);
  };

  // Build minimal printable invoice HTML and open print window
  const openPrintWindow = () => {
    const itemsRows = (productsToSend || [])
      .map((p) => {
        const name = p.size ? `${p.name} (${p.size})` : p.name;
        const qty = p.quantity || 1;
        const total = Number(p.price || 0) * qty;
        return `<tr>
          <td style="padding:6px 8px;">${name}</td>
          <td style="padding:6px 8px;text-align:center">${qty}</td>
          <td style="padding:6px 8px;text-align:right">₹${Number(p.price).toFixed(2)}</td>
          <td style="padding:6px 8px;text-align:right">₹${total.toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    const itemsTotal = (productsToSend || []).reduce(
      (s, p) => s + Number(p.price || 0) * (p.quantity || 1),
      0
    );

    const html = `
      <html>
        <head>
          <title>Invoice</title>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>
          <style>
            body{font-family:Arial, Helvetica, sans-serif; font-size:13px; padding:12px; color:#111}
            table{width:100%; border-collapse: collapse; margin-top:8px}
            th,td{border-bottom:1px solid #ddd; padding:6px}
            th{ text-align:left }
            .total-row{ font-weight:700 }
            .center{text-align:center}
          </style>
        </head>
        <body>
          <div style="text-align:center">
            <h2 style="margin:6px 0">${restaurantName}</h2>
            <div>${new Date().toLocaleString()}</div>
            <div style="margin-top:8px;"><strong>Customer:</strong> ${customer.name || ""} ${customer.phone ? " | " + customer.phone : ""}</div>
            <div style="margin-bottom:6px;">${customer.address || ""}</div>
          </div>

          <table>
            <thead>
              <tr><th>Item</th><th class="center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="margin-top:10px; display:flex; justify-content:space-between;">
            <div>Items Total</div><div>₹${itemsTotal.toFixed(2)}</div>
          </div>

          <div style="margin-top:12px; text-align:center">Thank you!</div>
        </body>
      </html>
    `;

    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) {
      toast.error("Popup blocked. Allow popups for this site.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
      // keep the window open so users can save as PDF — they can close it manually
    };
  };

  // Close action popup and also close modal if desired
  const handleActionCancel = () => {
    setShowActionPopup(false);
    // optionally close parent modal too:
    if (typeof onClose === "function") onClose();
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop fade show" />

      {/* Modal */}
      <div className="modal fade show" tabIndex="-1" role="dialog" style={{ display: "block" }} aria-modal="true">
        <div className="modal-dialog modal-md modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Customer Details</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
            </div>

            <div className="modal-body">
              {/* Name + suggestions */}
              <div className="mb-3 position-relative">
                <label className="form-label">Customer name</label>
                <input name="name" className="form-control" placeholder="First / Full name" value={customer.name} onChange={handleChange} autoComplete="off" />
                {nameSuggestions.length > 0 && (
                  <ul className="list-group position-absolute" style={{ zIndex: 1055, width: "100%", maxHeight: 160, overflowY: "auto" }}>
                    {nameSuggestions.map((s, idx) => (
                      <li key={idx} className="list-group-item list-group-item-action" onClick={() => handleNameSuggestionClick(s)} style={{ cursor: "pointer" }}>
                        <strong>{s.name}</strong> <small className="text-muted">— {s.phone}</small>
                        <div className="small text-muted">{s.address}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Phone + suggestions */}
              <div className="mb-3 position-relative">
                <label className="form-label">Phone number</label>
                <input name="phone" className="form-control" placeholder="10-digit phone" value={customer.phone} onChange={handleChange} autoComplete="off" />
                {phoneSuggestions.length > 0 && (
                  <ul className="list-group position-absolute" style={{ zIndex: 1055, width: "100%", maxHeight: 160, overflowY: "auto" }}>
                    {phoneSuggestions.map((s, idx) => (
                      <li key={idx} className="list-group-item list-group-item-action" onClick={() => handlePhoneSuggestionClick(s)} style={{ cursor: "pointer" }}>
                        <strong>{s.phone}</strong> <small className="text-muted">— {s.name}</small>
                        <div className="small text-muted">{s.address}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Address (optional)</label>
                <input name="address" className="form-control" placeholder="Address" value={customer.address} onChange={handleChange} />
              </div>

              <div className="mb-3">
                <label className="form-label">Email (optional)</label>
                <input name="email" type="email" className="form-control" placeholder="Email" value={customer.email} onChange={handleChange} />
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <strong>Total:</strong>
                <span>₹{(Number(total) || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveAndOpenActions} disabled={loadingCustomers}>
                {loadingCustomers ? "Saving..." : "Save & Print"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action popup shown after save */}
      {showActionPopup && (
        <div className="popupOverlay">
          <div className="popupContent">
            <h2>Select Action</h2>

            <div style={{ display: "grid", gap: 8 }}>
              <WhatsAppButton
                productsToSend={productsToSend}
                customerPhone={customer.phone}
                customerAddress={customer.address}
                restaurantName={restaurantName}
              />

              <SmsOrder
                productsToSend={productsToSend}
                customerPhone={customer.phone}
                customerAddress={customer.address}
                restaurantName={restaurantName}
              />

              <button onClick={openPrintWindow} className="popupButton">
                Download / Print Invoice
              </button>

              <RawBTPrintButton
                productsToSend={productsToSend}
                customerPhone={customer.phone}
              />

              <button onClick={handleActionCancel} className="popupCloseButton">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
