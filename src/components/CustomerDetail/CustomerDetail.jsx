// CustomerDetail.js
import React, { useState, useEffect, useRef } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { handleScreenshot } from "../Utils/DownloadPng";
import "./Customer.css";
import Header from "../header/Header";
import {
  fetchcustomerdata,
  sendorder,
  setdata,
  sendInvoiceEmail,
  fetchOrders,
} from "../../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WhatsAppButton from "../Utils/WhatsappOrder";
import RawBTPrintButton from "../Utils/RawBTPrintButton";
import SmsOrder from "../Utils/SmsOrder";
import { handleScreenshotAsPDF } from "../Utils/DownloadPdf";

const toastOptions = {
  position: "bottom-right",
  autoClose: 2000,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
};

// Consistent number parsing function
const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Consistent calculation function
const calculateOrderTotals = (products, delivery, discount, applyGst, applyComission) => {
  let itemsTotal = products.reduce(
    (sum, product) =>
      sum + parseNumber(product.price) * parseNumber(product.quantity || 1),
    0
  );

  const deliveryAmount = parseNumber(delivery);
  const discountAmount = parseNumber(discount);

  let finalTotal = itemsTotal + deliveryAmount - discountAmount;

  // Calculate GST if applicable
  let gstAmount = 0;
  if (applyGst) {
    gstAmount = parseFloat((itemsTotal * 0.02).toFixed(2));
    finalTotal += gstAmount;
  }

    // Calculate GST if applicable
  let ComissionAmount = 0;
  if (applyComission) {
    ComissionAmount = parseFloat((itemsTotal * 0.05).toFixed(2));
    finalTotal += ComissionAmount;
  }

  return {
    itemsTotal: parseFloat(itemsTotal.toFixed(2)),
    deliveryAmount: parseFloat(deliveryAmount.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    gstAmount: gstAmount,
    ComissionAmount: ComissionAmount,
    finalTotal: parseFloat(finalTotal.toFixed(2)),
  };
};

const CustomerDetail = () => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [discount, setDiscount] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [productsToSend, setProductsToSend] = useState([]);
  const [orders, setOrders] = useState([]);
  const [savedCustomers, setSavedCustomers] = useState([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [totalCustomerCredit, setTotalCustomerCredit] = useState(0);
  const [applyGst, setApplyGst] = useState(false); // GST toggle state
  const [applyComission, setApplyComission] = useState(false); // GST toggle state
  const isValidPhone = (phone) => /^\d{10}$/.test(phone);
  const isValidGmail = (email) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
  const invoiceRef = useRef();
  const navigate = useNavigate();
  const [saleType, setSaleType] = useState("");
  const [paidAmount, setPaidAmount] = useState("");

  useEffect(() => {
    // Load selected products from localStorage
    const storedProducts =
      JSON.parse(localStorage.getItem("productsToSend")) || [];
    const savedOrders = JSON.parse(localStorage.getItem("orders")) || [];
    setOrders(savedOrders);
    setProductsToSend(storedProducts);
  }, []);

  useEffect(() => {
    // Fetch customer data from API
    const fetchData = async () => {
      try {
        const response = await fetchcustomerdata();
        const customersArray = Array.isArray(response)
          ? response
          : response.data || [];
        setSavedCustomers(customersArray);
      } catch (error) {
        console.error("Error fetching customer data:", error.message);
        const localStorageCustomers =
          JSON.parse(localStorage.getItem("customers")) || [];
        if (localStorageCustomers.length > 0) {
          setSavedCustomers(localStorageCustomers);
        }
      }
    };
    fetchData();
  }, []);

  // Update suggestions based on current phone input
  useEffect(() => {
    if (customerPhone.length >= 10) {
      setPhoneSuggestions([]);
    } else if (customerPhone.trim() !== "") {
      const suggestions = savedCustomers.filter((customer) =>
        String(customer.phone).trim().startsWith(customerPhone.trim())
      );
      setPhoneSuggestions(suggestions);
    } else {
      setPhoneSuggestions([]);
    }
  }, [customerPhone, savedCustomers]);

  // Update suggestions based on current name input
  useEffect(() => {
    if (customerName.trim() === "") {
      setNameSuggestions([]);
    } else {
      const suggestions = savedCustomers.filter((customer) =>
        customer.name
          .toLowerCase()
          .startsWith(customerName.trim().toLowerCase())
      );
      setNameSuggestions(suggestions);
    }
  }, [customerName, savedCustomers]);

  useEffect(() => {
    const calculateTotalCustomerCredit = async () => {
      if (customerPhone) {
        try {
          // Fetch all orders for this customer
          const allOrders = await fetchOrders();
          const customerOrders = allOrders.filter(
            (order) => String(order.phone) === String(customerPhone)
          );

          // Calculate total credit
          const totalCredit = customerOrders.reduce(
            (sum, order) => sum + (Number(order.creditAmount) || 0),
            0
          );

          setTotalCustomerCredit(totalCredit);
        } catch (error) {
          console.error("Error fetching orders for credit calculation:", error);
        }
      }
    };

    calculateTotalCustomerCredit();
  }, [customerPhone]);

  const handleSuggestionClick = (customer) => {
    setCustomerPhone(String(customer.phone));
    setCustomerName(customer.name);
    setCustomerAddress(customer.address);
    setPhoneSuggestions([]);
    setNameSuggestions([]);
  };

  const handleNameSuggestionClick = (customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(String(customer.phone));
    setCustomerAddress(customer.address);
    setNameSuggestions([]);
    setPhoneSuggestions([]);
  };

  const handleSendClick = async () => {
    if (!saleType) {
      toast.error("Please select a sale type before proceeding", toastOptions);
      return;
    }
    // Calculate totals using consistent function
    const totals = calculateOrderTotals(
      productsToSend,
      deliveryCharge,
      discount,
      applyGst,
      applyComission
    );
    const finalTotal = totals.finalTotal;

    // Compute paid/credit depending on sale type
    let resolvedPaid = 0;
    let resolvedCredit = 0;

    if (saleType === "cash") {
      resolvedPaid = finalTotal;
      resolvedCredit = 0;
    } else if (saleType === "credit") {
      resolvedPaid = 0;
      resolvedCredit = finalTotal;
    } else if (saleType === "partial") {
      const p = parseNumber(paidAmount);
      if (p <= 0 || p > finalTotal) {
        toast.error(
          "Please enter valid paid amount for partial payment",
          toastOptions
        );
        return;
      }
      resolvedPaid = p;
      resolvedCredit = parseFloat((finalTotal - p).toFixed(2));
    }

    // Validate that paid + credit equals total
    if (Math.abs(resolvedPaid + resolvedCredit - finalTotal) > 0.01) {
      console.error("Payment validation failed:", {
        paid: resolvedPaid,
        credit: resolvedCredit,
        total: finalTotal,
        difference: resolvedPaid + resolvedCredit - finalTotal,
      });
      toast.error("Payment calculation error. Please try again.", toastOptions);
      return;
    }

    if (!productsToSend || productsToSend.length === 0) {
      toast.error("Please add product before proceed", toastOptions);
      return;
    }

    setShowPopup(true);

    if (deliveryCharge) {
      localStorage.setItem("deliveryCharge", deliveryCharge);
    }

    const orderId = `order_${Date.now()}`;

    // Create an order object
    const order = {
      id: orderId,
      products: productsToSend,
      totalAmount: finalTotal,
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
      email: customerEmail,
      timestamp: new Date().toISOString(),
      discount: totals.discountAmount,
      delivery: totals.deliveryAmount,
      saleType,
      gstApplied: applyGst,
      gstAmount: gstAmount,
      ComissionApplied: applyComission,
      ComissionAmount: ComissionAmount,
      paidAmount: resolvedPaid,
      creditAmount: resolvedCredit,
    };

    console.log("Order being sent to DB:", order);

    const customerDataObject = {
      id: orderId,
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
      email: customerEmail,
      timestamp: new Date().toISOString(),
      paidAmount: resolvedPaid,
      creditAmount: resolvedCredit,
    };

    try {
      // Send the order to your backend to be saved in MongoDB
      const data = await sendorder(order);
      console.log("Order created:", data);

      // Verify the response matches what we sent
      if (data && data.totalAmount !== undefined) {
        const responseTotal = parseNumber(data.totalAmount);
        if (Math.abs(responseTotal - finalTotal) > 0.01) {
          console.error("Database response doesn't match sent total:", {
            sent: finalTotal,
            received: responseTotal,
          });
        }
      }
    } catch (error) {
      console.error("Error sending order:", error.message);
      if (error.response) {
        console.error("Error response:", error.response.data);
      }
    }

    if (customerEmail && customerEmail.trim() !== "") {
      try {
        await sendInvoiceEmail(order.id, customerEmail);
        console.log(`invoice sent to ${customerEmail}`);
      } catch (err) {
        console.error("Email send error", err);
        toast.error("Failed to send email", toastOptions);
      }
    }

    try {
      const customerDataResponse = await setdata(customerDataObject);
      if (
        customerDataResponse.message ===
        "Customer already exists, no changes made."
      ) {
        console.log(
          "Customer already exists in the database, no need to add again."
        );
      } else {
        console.log("Customer Data Added", customerDataResponse);
      }
    } catch (error) {
      console.error("Error sending customer data:", error.message);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    navigate("/invoice");
    window.location.reload();
  };

  const handlePdfDownload = () => {
    if (!invoiceRef.current) return;
    invoiceRef.current.style.display = "block";
    // small delay so DOM and styles render
    setTimeout(() => {
      handleScreenshotAsPDF("mobileinvoice");
      // hide after kicking off PDF generation
      invoiceRef.current.style.display = "none";
    }, 10);
  };

  const MobilePrint = async () => {
    try {
      const kotContent = document.getElementById("mobileinvoice").innerHTML;

      const newWindow = window.open("", "", "width=600,height=400");
      newWindow.document.write(`
        <html>
          <head>
            <title>KOT</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                margin: 3rem 0;
                padding: 0;
                width: 48mm;
              }
              table {
                width: 94%;
                border-collapse: collapse;
              }
              th, td {
                border: 2px solid black;
                padding: 2px;
                text-align: left;
                font-size: 10px;
                font-weight: bold;
              }
              .total {
                font-size: 13px;
                text-align: left;
                margin-top: 4px;
                display: flex;
                justify-content: space-between;
              }
              .totalAmount {
                font-size: 15px;
                font-weight: 800;
                border: 2px dashed;
                text-align: center;
                background: black;
                color: white;
                padding: 0.4rem;
              }
              .logo {
                display: flex;
                margin: auto;
              }
              .logo img {
                width: 40px;
                height: auto;
              }
              hr {
                border: 2px dashed;
              }
            </style>
          </head>
          <body>
            ${kotContent}
          </body>
        </html>
      `);

      newWindow.document.close();

      newWindow.onload = () => {
        newWindow.focus();
        newWindow.print();
        newWindow.close();
      };
    } catch (error) {
      console.error("Error generating printable content:", error);
    }
  };

  const handlePhoneChange = (e) => {
    // allow only digits, trim to max 10
    let v = (e.target.value || "").replace(/\D/g, "");
    if (v.length > 10) v = v.slice(0, 10);
    setCustomerPhone(v);

    // stop suggestions when exactly 10 digits
    if (v.length === 10) {
      setPhoneSuggestions([]);
    } else if (v.length > 0) {
      // update suggestions live (optional, mirrors useEffect)
      const suggestions = savedCustomers.filter((customer) =>
        String(customer.phone).startsWith(v)
      );
      setPhoneSuggestions(suggestions);
    } else {
      setPhoneSuggestions([]);
    }
  };

  const handlePhonePaste = (e) => {
    // sanitize pasted content to only digits and max 10
    e.preventDefault();
    const paste =
      (e.clipboardData || window.clipboardData).getData("text") || "";
    const cleaned = paste.replace(/\D/g, "").slice(0, 10);
    setCustomerPhone(cleaned);
    if (cleaned.length === 10) setPhoneSuggestions([]);
  };

  const handleEmailChange = (e) => {
    const v = e.target.value || "";
    setCustomerEmail(v);
  };

  // Calculate totals for UI display
  const totals = calculateOrderTotals(
    productsToSend,
    deliveryCharge,
    discount,
    applyGst,
    applyComission
  );
  const deliveryChargeAmount = totals.deliveryAmount;
  const parsedDiscount = totals.discountAmount;
  const gstAmount = totals.gstAmount;
  const ComissionAmount = totals.ComissionAmount;
  const finalTotal = totals.finalTotal;

  return (
    <div>
      <ToastContainer />
      <Header />
      <div className="cust-inputs" style={{ marginTop: "4rem" }}>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name..."
        />
        {nameSuggestions.length > 0 && (
          <ul
            className="suggestions"
            style={{
              background: "#fff",
              border: "2px solid black",
              zIndex: 10,
              listStyle: "none",
              padding: 0,
              margin: "auto",
              width: "90%",
              maxHeight: "150px",
              overflowY: "auto",
              borderRadius: "1rem",
            }}
          >
            {nameSuggestions.map((suggestion) => (
              <li
                key={suggestion.phone}
                onClick={() => handleNameSuggestionClick(suggestion)}
                style={{
                  padding: "0.5rem",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
              >
                {suggestion.name} - {suggestion.phone}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="cust-inputs">
        <input
          type="tel"
          inputMode="numeric"
          pattern="\d*"
          maxLength={10}
          value={customerPhone}
          onChange={handlePhoneChange}
          onPaste={handlePhonePaste}
          placeholder="Customer phone..."
        />
      </div>
      {phoneSuggestions.length > 0 && (
        <ul
          className="suggestions"
          style={{
            background: "#fff",
            border: "2px solid black",
            zIndex: 10,
            listStyle: "none",
            padding: 0,
            margin: "auto",
            width: "90%",
            maxHeight: "150px",
            overflowY: "auto",
            borderRadius: "1rem",
          }}
        >
          {phoneSuggestions.map((suggestion) => (
            <li
              key={suggestion.phone}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: "0.5rem",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {suggestion.phone} - {suggestion.name}
            </li>
          ))}
        </ul>
      )}
      <div className="cust-inputs">
        <input
          type="text"
          value={customerAddress}
          onChange={(e) => setCustomerAddress(e.target.value)}
          placeholder="Customer address..."
        />
      </div>
      <div className="cust-inputs">
        <input
          type="email"
          value={customerEmail}
          onChange={handleEmailChange}
          placeholder="Customer email..."
        />
      </div>
      <div className="cust-inputs">
        <input
          type="number"
          value={deliveryCharge}
          onChange={(e) => setDeliveryCharge(e.target.value)}
          placeholder="Delivery charge..."
        />
      </div>
      <div className="cust-inputs">
        <input
          type="number"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          placeholder="Discount amount..."
        />
      </div>

      {/* GST Toggle */}
      <div className="cust-inputs">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "#f8f9fa",
            borderRadius: "1rem",
            border: "2px solid black",
            margin: "8px auto 16px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            width: "90%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                border: "2px solid #4CAF50",
                marginRight: "12px",
                backgroundColor: applyGst ? "#4CAF50" : "white",
                transition: "all 0.2s ease",
              }}
            >
              {applyGst && (
                <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                  <path
                    d="M1 5L5 9L13 1"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              style={{
                fontWeight: "500",
                color: "#333",
                fontSize: "16px",
              }}
            >
              Apply 2% APMC
            </span>
          </div>

          <div
            onClick={() => setApplyGst(!applyGst)}
            style={{
              width: "48px",
              height: "24px",
              borderRadius: "12px",
              backgroundColor: applyGst ? "#4CAF50" : "#ccc",
              position: "relative",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: applyGst ? "26px" : "2px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "white",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        </div>
      </div>

 {/* Comission Toggle */}
      <div className="cust-inputs">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "#f8f9fa",
            borderRadius: "1rem",
            border: "2px solid black",
            margin: "8px auto 16px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            width: "90%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                border: "2px solid #4CAF50",
                marginRight: "12px",
                backgroundColor:  applyComission ? "#4CAF50" : "white",
                transition: "all 0.2s ease",
              }}
            >
              {applyComission && (
                <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                  <path
                    d="M1 5L5 9L13 1"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              style={{
                fontWeight: "500",
                color: "#333",
                fontSize: "16px",
              }}
            >
              Apply 5% Comission
            </span>
          </div>

          <div
            onClick={() => setApplyComission(!applyComission)}
            style={{
              width: "48px",
              height: "24px",
              borderRadius: "12px",
              backgroundColor: applyComission ? "#4CAF50" : "#ccc",
              position: "relative",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: applyComission ? "26px" : "2px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "white",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "8rem" }}>
        <div className="cust-inputs">
          <label style={{ display: "block", margin: "0 0 6px 21px" }}>
            Sale Type
          </label>
          <select
            className="SaleType"
            value={saleType}
            onChange={(e) => {
              setSaleType(e.target.value);
              if (e.target.value === "cash") setPaidAmount("");
            }}
            style={{ width: "90%", padding: "8px" }}
          >
            <option value="" disabled>
              -- Select Sale Type --
            </option>
            <option value="cash">Cash Sale*</option>
            <option value="credit">Credit Sale*</option>
            <option value="partial">Partial Payment*</option>
          </select>
        </div>

        {saleType === "partial" && (
          <div className="cust-inputs">
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="Amount paid now..."
            />
          </div>
        )}
      </div>

      {/* Hidden Invoice Content */}
      <div className="invoice-content" id="invoice" style={{ display: "none" }}>
        {/* ... existing invoice content ... */}
      </div>

      {/* mobile print content */}
      <div
        className="invoice-content"
        id="mobileinvoice"
        ref={invoiceRef}
        style={{ display: "none" }}
      >
        <img src="/logo.jpg" alt="Logo" width={100} className="logo" />
        <h1 style={{ textAlign: "center", margin: 0, fontSize: "25px" }}>
          Chhinnamastika Traders
        </h1>
        <p
          style={{
            textAlign: "center",
            margin: 0,
            fontSize: "14px",
            padding: "0 2px",
          }}
        >
          (Fruits & Vegetables Dealers)
        </p>
        <p
          style={{
            textAlign: "center",
            margin: 0,
            fontSize: "14px",
            padding: "0 2px",
          }}
        >
          Opp. Telephone Exchange,
        </p>
        <p
          style={{
            textAlign: "center",
            margin: 0,
            fontSize: "14px",
            padding: "0 2px",
          }}
        >
          Guru Har Sahai (Fzr.)
        </p>
        <p style={{ textAlign: "center", margin: 0, fontSize: "14px" }}>
          9815832778 7087432778 <br /> 9517543243 9858300043
        </p>
        <hr />
        <h2 style={{ textAlign: "center", margin: 0, fontSize: "20px" }}>
          Invoice Details
        </h2>
        <div className="customer-info">
          <p style={{ fontSize: "15px" }}>
            Bill No&nbsp;&nbsp;-&nbsp;&nbsp;
            {`#${Math.floor(1000 + Math.random() * 9000)}`}
          </p>
          <p style={{ fontSize: "13px" }}>
            Created On:&nbsp;
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }) +
              " " +
              new Date().toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
          </p>

          {customerPhone && (
            <p style={{ fontSize: "12px" }}>
              Phone Number &nbsp;- &nbsp;{customerPhone}
            </p>
          )}
          {customerAddress && (
            <p style={{ fontSize: "13px" }}>
              Address&nbsp;-&nbsp;{customerAddress}
            </p>
          )}
        </div>
        <table>
          <thead>
            <tr className="productname">
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {productsToSend.map((product, index) => (
              <tr key={index} className="productdetail">
                <td>
                  {product.size
                    ? `${product.name} (${product.size})`
                    : product.name}
                </td>
                <td style={{ textAlign: "Center" }}>{product.quantity || 1}</td>
                <td style={{ textAlign: "Center" }}>₹{product.price}</td>
                <td style={{ textAlign: "Center" }}>
                  ₹{product.price * (product.quantity || 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(deliveryChargeAmount !== 0 || parsedDiscount !== 0 || applyGst || applyComission) && (
          <>
            <div className="total">
              <p style={{ margin: "0" }}>Item Total</p>
              <p style={{ margin: "0" }}>{totals.itemsTotal.toFixed(2)}</p>
            </div>
            {applyGst && (
              <div className="total">
                <p style={{ margin: "0" }}>APMC (2%):</p>
                <p style={{ margin: "0" }}>+{gstAmount.toFixed(2)}</p>
              </div>
            )}
            {applyComission && (
              <div className="total">
                <p style={{ margin: "0" }}>Comission (5%):</p>
                <p style={{ margin: "0" }}>+{ComissionAmount.toFixed(2)}</p>
              </div>
            )}
            {deliveryChargeAmount !== 0 && (
              <div className="total">
                <p style={{ margin: "0" }}>Service Charge:</p>
                <p style={{ margin: "0" }}>
                  +{deliveryChargeAmount.toFixed(2)}
                </p>
              </div>
            )}
            {parsedDiscount !== 0 && (
              <div className="total">
                <p style={{ margin: "0" }}>Discount:</p>
                <p style={{ margin: "0" }}>-{parsedDiscount.toFixed(2)}</p>
              </div>
            )}
          </>
        )}
        <p className="totalAmount">Net Total: ₹{finalTotal.toFixed(2)}</p>
        {totalCustomerCredit > 0 && (
          <p
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              textAlign: "center",
              margin: "8px 0",
              color: "#ff0000",
            }}
          >
            Balance: ₹{totalCustomerCredit.toFixed(2)}
          </p>
        )}
        <div
          style={{
            textAlign: "center",
            fontSize: "15px",
            paddingBottom: "2rem",
          }}
        >
          Thank You visit again!
        </div>
        <div
          style={{
            textAlign: "center",
            color: "grey",
            fontSize: "10px",
            paddingBottom: ".5rem",
          }}
        >
          Powered&nbsp;By&nbsp;Billzo&nbsp;&nbsp;||&nbsp;7015823645
        </div>
        <hr />
      </div>
      <button onClick={handleSendClick} className="done">
        Send <FaArrowRight className="Invoice-arrow" />
      </button>
      {showPopup && (
        <div className="popupOverlay">
          <div className="popupContent">
            <h2>Select Action</h2>
            <WhatsAppButton
              productsToSend={productsToSend}
              deliveryChargeAmount={deliveryChargeAmount}
              deliveryCharge={deliveryCharge}
              parsedDiscount={parsedDiscount}
              customerPhone={customerPhone}
              customerName={customerName}
              customerAddress={customerAddress}
              totalCustomerCredit={totalCustomerCredit}
              gstAmount={gstAmount}
              applyGst={applyGst}
              ComissionAmount={ComissionAmount}
              applyComission={applyComission}
            />
            <SmsOrder
              productsToSend={productsToSend}
              deliveryChargeAmount={deliveryChargeAmount}
              parsedDiscount={parsedDiscount}
              customerPhone={customerPhone}
              customerName={customerName}
              customerAddress={customerAddress}
              totalCustomerCredit={totalCustomerCredit}
              gstAmount={gstAmount}
              applyGst={applyGst}
              ComissionAmount={ComissionAmount}
              applyComission={applyComission}
            />
            <button onClick={handlePdfDownload} className="popupButton">
              Download PDF
            </button>
            <RawBTPrintButton
              productsToSend={productsToSend}
              parsedDiscount={parsedDiscount}
              deliveryChargeAmount={deliveryChargeAmount}
              customerPhone={customerPhone}
              customerName={customerName}
              customerAddress={customerAddress}
              totalCustomerCredit={totalCustomerCredit}
              gstAmount={gstAmount}
              applyGst={applyGst}
              ComissionAmount={ComissionAmount}
              applyComission={applyComission}
            />
            <button onClick={MobilePrint} className="popupButton">
              Usb Print
            </button>

            <button onClick={handleClosePopup} className="popupCloseButton">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
